import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTransaction } from '$lib/server/ethereum';

export const GET: RequestHandler = async ({ params }) => {
	const { hash } = params;

	if (!hash || !hash.startsWith('0x') || hash.length !== 66) {
		return json({ error: 'Invalid transaction hash' }, { status: 400 });
	}

	try {
		const tx = await getTransaction(hash);
		return json({
			success: true,
			data: tx
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get transaction'
			},
			{ status: 500 }
		);
	}
};
