import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFeeHistory } from '$lib/server/ethereum';

export const GET: RequestHandler = async ({ url }) => {
	const blockCountParam = url.searchParams.get('blocks');
	const blockCount = blockCountParam ? parseInt(blockCountParam) : 10;

	if (blockCount < 1 || blockCount > 1024) {
		return json({ error: 'blocks must be between 1 and 1024' }, { status: 400 });
	}

	try {
		const history = await getFeeHistory(blockCount);
		return json({
			success: true,
			data: history
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get fee history'
			},
			{ status: 500 }
		);
	}
};
