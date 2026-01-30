import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ERIGON_RPC_URL } from '$env/static/private';
import { validateAddress } from '$lib/server/ethereum';

// ERC-20 Transfer 이벤트 시그니처
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// 지원 토큰 목록 (심볼, 소수점 캐시)
const KNOWN_TOKENS: Record<string, { symbol: string; decimals: number }> = {
	'0xe7f99a362daa333803a0459fbbceec0b05c0a2b5': { symbol: 'MABTC', decimals: 18 },
	'0xe54613083f60bbabde389320074953562c685': { symbol: 'META', decimals: 18 },
	'0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6 },
	'0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', decimals: 8 }
};

interface TokenTransfer {
	hash: string;
	from: string;
	to: string;
	value: string;
	tokenAddress: string;
	tokenSymbol: string;
	tokenDecimals: number;
	blockNumber: number;
	timestamp?: number;
	type: 'send' | 'receive';
}

// 주소를 32바이트 토픽으로 변환
function addressToTopic(address: string): string {
	return '0x' + address.toLowerCase().replace('0x', '').padStart(64, '0');
}

// 토픽에서 주소 추출
function topicToAddress(topic: string): string {
	return '0x' + topic.slice(-40);
}

// 토큰 정보 조회 (캐시에 없으면 RPC로 조회)
async function getTokenInfo(tokenAddress: string): Promise<{ symbol: string; decimals: number }> {
	const cached = KNOWN_TOKENS[tokenAddress.toLowerCase()];
	if (cached) return cached;

	try {
		// symbol 조회
		const symbolRes = await fetch(ERIGON_RPC_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'eth_call',
				params: [{ to: tokenAddress, data: '0x95d89b41' }, 'latest'],
				id: 1
			})
		});
		const symbolData = await symbolRes.json();

		// decimals 조회
		const decimalsRes = await fetch(ERIGON_RPC_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'eth_call',
				params: [{ to: tokenAddress, data: '0x313ce567' }, 'latest'],
				id: 2
			})
		});
		const decimalsData = await decimalsRes.json();

		let symbol = 'UNKNOWN';
		let decimals = 18;

		if (symbolData.result && symbolData.result !== '0x') {
			// ABI 디코딩 (string)
			try {
				const hex = symbolData.result.slice(2);
				if (hex.length >= 128) {
					const length = parseInt(hex.slice(64, 128), 16);
					const strHex = hex.slice(128, 128 + length * 2);
					symbol = Buffer.from(strHex, 'hex').toString('utf8');
				} else {
					// bytes32 형식
					symbol = Buffer.from(hex.replace(/00+$/, ''), 'hex').toString('utf8');
				}
			} catch {
				symbol = 'UNKNOWN';
			}
		}

		if (decimalsData.result && decimalsData.result !== '0x') {
			decimals = parseInt(decimalsData.result, 16);
		}

		return { symbol, decimals };
	} catch {
		return { symbol: 'UNKNOWN', decimals: 18 };
	}
}

// 값을 소수점으로 포맷
function formatValue(hexValue: string, decimals: number): string {
	const value = BigInt(hexValue);
	const divisor = BigInt(10 ** decimals);
	const intPart = value / divisor;
	const fracPart = value % divisor;
	const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 6).replace(/0+$/, '');
	return fracStr ? `${intPart}.${fracStr}` : intPart.toString();
}

export const GET: RequestHandler = async ({ params, url }) => {
	const { address } = params;

	if (!address || !validateAddress(address)) {
		return json({ success: false, error: 'Invalid address' }, { status: 400 });
	}

	const tokenFilter = url.searchParams.get('token');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
	const offset = parseInt(url.searchParams.get('offset') || '0');

	try {
		// 최신 블록 번호 조회
		const blockNumRes = await fetch(ERIGON_RPC_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'eth_blockNumber',
				params: [],
				id: 0
			})
		});
		const blockNumData = await blockNumRes.json();
		const latestBlock = parseInt(blockNumData.result, 16);

		// 블록 범위 (기본: 최근 50만 블록, 약 2개월)
		const defaultFromBlock = Math.max(0, latestBlock - 500000);
		const fromBlock = url.searchParams.get('fromBlock') || '0x' + defaultFromBlock.toString(16);
		const toBlock = url.searchParams.get('toBlock') || 'latest';
		const walletTopic = addressToTopic(address);
		const tokenAddressFilter = tokenFilter ? [tokenFilter.toLowerCase()] : undefined;

		// 보낸 토큰 조회 (from = wallet)
		const sentLogsReq = fetch(ERIGON_RPC_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'eth_getLogs',
				params: [{
					fromBlock,
					toBlock,
					address: tokenAddressFilter,
					topics: [TRANSFER_TOPIC, walletTopic, null]
				}],
				id: 1
			})
		});

		// 받은 토큰 조회 (to = wallet)
		const receivedLogsReq = fetch(ERIGON_RPC_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				jsonrpc: '2.0',
				method: 'eth_getLogs',
				params: [{
					fromBlock,
					toBlock,
					address: tokenAddressFilter,
					topics: [TRANSFER_TOPIC, null, walletTopic]
				}],
				id: 2
			})
		});

		const [sentLogsRes, receivedLogsRes] = await Promise.all([sentLogsReq, receivedLogsReq]);
		const sentLogs = await sentLogsRes.json();
		const receivedLogs = await receivedLogsRes.json();

		if (sentLogs.error) {
			return json({ success: false, error: sentLogs.error.message }, { status: 500 });
		}
		if (receivedLogs.error) {
			return json({ success: false, error: receivedLogs.error.message }, { status: 500 });
		}

		// 로그 처리
		const transfers: TokenTransfer[] = [];
		const tokenInfoCache: Record<string, { symbol: string; decimals: number }> = {};

		const processLogs = async (logs: any[], type: 'send' | 'receive') => {
			for (const log of logs) {
				const tokenAddr = log.address.toLowerCase();

				if (!tokenInfoCache[tokenAddr]) {
					tokenInfoCache[tokenAddr] = await getTokenInfo(tokenAddr);
				}
				const tokenInfo = tokenInfoCache[tokenAddr];

				transfers.push({
					hash: log.transactionHash,
					from: topicToAddress(log.topics[1]),
					to: topicToAddress(log.topics[2]),
					value: formatValue(log.data, tokenInfo.decimals),
					tokenAddress: log.address,
					tokenSymbol: tokenInfo.symbol,
					tokenDecimals: tokenInfo.decimals,
					blockNumber: parseInt(log.blockNumber, 16),
					type
				});
			}
		};

		await Promise.all([
			processLogs(sentLogs.result || [], 'send'),
			processLogs(receivedLogs.result || [], 'receive')
		]);

		// 블록 번호로 정렬 (최신순) 및 중복 제거
		const uniqueTransfers = Array.from(
			new Map(transfers.map(t => [`${t.hash}-${t.from}-${t.to}-${t.value}`, t])).values()
		).sort((a, b) => b.blockNumber - a.blockNumber);

		const total = uniqueTransfers.length;
		const paginatedTransfers = uniqueTransfers.slice(offset, offset + limit);

		return json({
			success: true,
			data: {
				transactions: paginatedTransfers,
				pagination: {
					total,
					limit,
					offset,
					hasMore: offset + limit < total
				}
			}
		});

	} catch (error) {
		return json({
			success: false,
			error: error instanceof Error ? error.message : 'Failed to fetch token transfers'
		}, { status: 500 });
	}
};
