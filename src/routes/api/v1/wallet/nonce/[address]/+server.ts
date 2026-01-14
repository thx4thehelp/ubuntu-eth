import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTransactionCount, validateAddress } from '$lib/server/ethereum';

export const GET: RequestHandler = async ({ params }) => {
	const { address } = params;

	if (!validateAddress(address)) {
		return json({ error: 'Invalid Ethereum address' }, { status: 400 });
	}

	try {
		const nonce = await getTransactionCount(address);
		return json({
			success: true,
			data: {
				address,
				nonce
			}
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get nonce'
			},
			{ status: 500 }
		);
	}
};
