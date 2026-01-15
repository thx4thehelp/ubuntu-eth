import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ERIGON_RPC_URL } from '$env/static/private';
import { validateAddress } from '$lib/server/ethereum';

interface TraceAction {
	from: string;
	to: string;
	value: string;
	gas: string;
	input: string;
	callType?: string;
}

interface TraceResult {
	gasUsed: string;
	output: string;
}

interface Trace {
	action: TraceAction;
	blockHash: string;
	blockNumber: number;
	result: TraceResult | null;
	subtraces: number;
	traceAddress: number[];
	transactionHash: string;
	transactionPosition: number;
	type: string;
	error?: string;
}

// 트랜잭션 히스토리 조회 (trace_filter 기반)
export const GET: RequestHandler = async ({ params, url }) => {
	const { address } = params;

	if (!address || !validateAddress(address)) {
		return json({ error: 'Invalid address' }, { status: 400 });
	}

	const fromBlock = url.searchParams.get('fromBlock') || '0x0';
	const toBlock = url.searchParams.get('toBlock') || 'latest';
	const limit = parseInt(url.searchParams.get('limit') || '100');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	try {
		// 보낸 트랜잭션 조회
		const fromResponse = await fetch(ERIGON_RPC_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'trace_filter',
				params: [{
					fromBlock,
					toBlock,
					fromAddress: [address.toLowerCase()]
				}],
				id: 1
			})
		});

		// 받은 트랜잭션 조회
		const toResponse = await fetch(ERIGON_RPC_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'trace_filter',
				params: [{
					fromBlock,
					toBlock,
					toAddress: [address.toLowerCase()]
				}],
				id: 2
			})
		});

		if (!fromResponse.ok || !toResponse.ok) {
			return json({
				success: false,
				error: 'Failed to fetch from RPC node'
			}, { status: 502 });
		}

		const fromData = await fromResponse.json();
		const toData = await toResponse.json();

		if (fromData.error) {
			return json({
				success: false,
				error: fromData.error.message || 'trace_filter error'
			}, { status: 500 });
		}

		if (toData.error) {
			return json({
				success: false,
				error: toData.error.message || 'trace_filter error'
			}, { status: 500 });
		}

		const fromTraces: Trace[] = fromData.result || [];
		const toTraces: Trace[] = toData.result || [];

		// 중복 제거 및 병합
		const txMap = new Map<string, {
			hash: string;
			blockNumber: number;
			from: string;
			to: string;
			value: string;
			type: 'send' | 'receive' | 'self';
			error?: string;
		}>();

		const addressLower = address.toLowerCase();

		for (const trace of fromTraces) {
			if (trace.type === 'call' && trace.action) {
				const isSelf = trace.action.to?.toLowerCase() === addressLower;
				txMap.set(trace.transactionHash, {
					hash: trace.transactionHash,
					blockNumber: trace.blockNumber,
					from: trace.action.from,
					to: trace.action.to || '',
					value: trace.action.value,
					type: isSelf ? 'self' : 'send',
					error: trace.error
				});
			}
		}

		for (const trace of toTraces) {
			if (trace.type === 'call' && trace.action) {
				const existing = txMap.get(trace.transactionHash);
				if (!existing) {
					txMap.set(trace.transactionHash, {
						hash: trace.transactionHash,
						blockNumber: trace.blockNumber,
						from: trace.action.from,
						to: trace.action.to || '',
						value: trace.action.value,
						type: 'receive',
						error: trace.error
					});
				}
			}
		}

		// 블록 번호로 정렬 (최신순)
		const transactions = Array.from(txMap.values())
			.sort((a, b) => b.blockNumber - a.blockNumber)
			.slice(offset, offset + limit)
			.map(tx => ({
				...tx,
				value: tx.value ? (BigInt(tx.value) / BigInt(10 ** 18)).toString() + '.' +
					(BigInt(tx.value) % BigInt(10 ** 18)).toString().padStart(18, '0').slice(0, 6) + ' ETH' : '0 ETH'
			}));

		return json({
			success: true,
			data: {
				address,
				total: txMap.size,
				offset,
				limit,
				transactions
			}
		});

	} catch (error) {
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch transaction history'
		}, { status: 500 });
	}
};
