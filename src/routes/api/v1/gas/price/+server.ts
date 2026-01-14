import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGasPrice } from '$lib/server/ethereum';

export const GET: RequestHandler = async () => {
	try {
		const gasPrice = await getGasPrice();
		return json({
			success: true,
			data: gasPrice
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get gas price'
			},
			{ status: 500 }
		);
	}
};
