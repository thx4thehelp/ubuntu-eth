import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { estimateGas, validateAddress } from '$lib/server/ethereum';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { from, to, value, data } = body;

		if (!to) {
			return json({ error: 'to address is required' }, { status: 400 });
		}

		if (!validateAddress(to)) {
			return json({ error: 'Invalid to address' }, { status: 400 });
		}

		if (from && !validateAddress(from)) {
			return json({ error: 'Invalid from address' }, { status: 400 });
		}

		const estimate = await estimateGas({ from, to, value, data });
		return json({
			success: true,
			data: estimate
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to estimate gas'
			},
			{ status: 500 }
		);
	}
};
