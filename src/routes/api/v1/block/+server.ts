import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBlockNumber, getBlock } from '$lib/server/ethereum';

export const GET: RequestHandler = async ({ url }) => {
	const numberParam = url.searchParams.get('number');
	const hashParam = url.searchParams.get('hash');

	try {
		// If no params, return latest block number
		if (!numberParam && !hashParam) {
			const blockNumber = await getBlockNumber();
			return json({
				success: true,
				data: {
					latestBlock: blockNumber.toString()
				}
			});
		}

		let block;
		if (hashParam) {
			if (!hashParam.startsWith('0x') || hashParam.length !== 66) {
				return json({ error: 'Invalid block hash' }, { status: 400 });
			}
			block = await getBlock(hashParam);
		} else if (numberParam) {
			const blockNum = BigInt(numberParam);
			block = await getBlock(blockNum);
		}

		return json({
			success: true,
			data: block
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get block'
			},
			{ status: 500 }
		);
	}
};
