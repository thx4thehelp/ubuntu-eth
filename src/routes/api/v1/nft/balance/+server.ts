import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getNFTBalance, validateAddress } from '$lib/server/ethereum';

export const GET: RequestHandler = async ({ url }) => {
	const contractAddress = url.searchParams.get('contract');
	const walletAddress = url.searchParams.get('wallet');

	if (!contractAddress || !walletAddress) {
		return json(
			{ error: 'Both contract and wallet query parameters are required' },
			{ status: 400 }
		);
	}

	if (!validateAddress(contractAddress)) {
		return json({ error: 'Invalid contract address' }, { status: 400 });
	}

	if (!validateAddress(walletAddress)) {
		return json({ error: 'Invalid wallet address' }, { status: 400 });
	}

	try {
		const balance = await getNFTBalance(contractAddress, walletAddress);
		return json({
			success: true,
			data: {
				contract: contractAddress,
				wallet: walletAddress,
				...balance
			}
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get NFT balance'
			},
			{ status: 500 }
		);
	}
};
