import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTransactionReceipt } from '$lib/server/ethereum';

export const GET: RequestHandler = async ({ params }) => {
	const { hash } = params;

	if (!hash || !hash.startsWith('0x') || hash.length !== 66) {
		return json({ error: 'Invalid transaction hash' }, { status: 400 });
	}

	try {
		const receipt = await getTransactionReceipt(hash);

		if (!receipt) {
			return json(
				{
					success: false,
					error: 'Transaction receipt not found (transaction may be pending)'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: receipt
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get transaction receipt'
			},
			{ status: 500 }
		);
	}
};
