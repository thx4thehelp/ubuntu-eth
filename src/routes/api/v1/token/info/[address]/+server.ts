import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTokenInfo, validateAddress } from '$lib/server/ethereum';

export const GET: RequestHandler = async ({ params }) => {
	const { address } = params;

	if (!validateAddress(address)) {
		return json({ error: 'Invalid token address' }, { status: 400 });
	}

	try {
		const info = await getTokenInfo(address);
		return json({
			success: true,
			data: info
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get token info'
			},
			{ status: 500 }
		);
	}
};
