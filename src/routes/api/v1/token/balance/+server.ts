import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTokenBalance, validateAddress } from '$lib/server/ethereum';

export const GET: RequestHandler = async ({ url }) => {
	const tokenAddress = url.searchParams.get('token');
	const walletAddress = url.searchParams.get('wallet');

	if (!tokenAddress || !walletAddress) {
		return json(
			{ error: 'Both token and wallet query parameters are required' },
			{ status: 400 }
		);
	}

	if (!validateAddress(tokenAddress)) {
		return json({ error: 'Invalid token address' }, { status: 400 });
	}

	if (!validateAddress(walletAddress)) {
		return json({ error: 'Invalid wallet address' }, { status: 400 });
	}

	try {
		const balance = await getTokenBalance(tokenAddress, walletAddress);
		return json({
			success: true,
			data: {
				token: tokenAddress,
				wallet: walletAddress,
				...balance
			}
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get token balance'
			},
			{ status: 500 }
		);
	}
};
