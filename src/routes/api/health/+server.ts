import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getClient, getBlockNumber } from '$lib/server/ethereum';

export const GET: RequestHandler = async () => {
	try {
		const blockNumber = await getBlockNumber();
		return json({
			status: 'ok',
			timestamp: Date.now(),
			ethereum: {
				connected: true,
				blockNumber: blockNumber.toString()
			}
		});
	} catch (error) {
		return json(
			{
				status: 'error',
				timestamp: Date.now(),
				ethereum: {
					connected: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				}
			},
			{ status: 503 }
		);
	}
};
