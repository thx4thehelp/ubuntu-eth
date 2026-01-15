import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ERIGON_RPC_URL } from '$env/static/private';

// JSON-RPC 프록시 - Infura/Alchemy 호환
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// 배열 요청 (batch) 또는 단일 요청 처리
		const isBatch = Array.isArray(body);
		const requests = isBatch ? body : [body];

		// 기본 검증
		for (const req of requests) {
			if (!req.jsonrpc || req.jsonrpc !== '2.0') {
				return json({
					jsonrpc: '2.0',
					error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' },
					id: req.id || null
				}, { status: 400 });
			}

			if (!req.method || typeof req.method !== 'string') {
				return json({
					jsonrpc: '2.0',
					error: { code: -32600, message: 'Invalid Request: method is required' },
					id: req.id || null
				}, { status: 400 });
			}
		}

		// 에리곤 노드로 프록시
		const response = await fetch(ERIGON_RPC_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(isBatch ? requests : requests[0])
		});

		if (!response.ok) {
			return json({
				jsonrpc: '2.0',
				error: { code: -32603, message: 'Internal error: RPC node unavailable' },
				id: null
			}, { status: 502 });
		}

		const result = await response.json();
		return json(result);

	} catch (error) {
		return json({
			jsonrpc: '2.0',
			error: {
				code: -32603,
				message: error instanceof Error ? error.message : 'Internal error'
			},
			id: null
		}, { status: 500 });
	}
};
