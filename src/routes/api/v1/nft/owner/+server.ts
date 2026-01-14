import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getNFTOwner, validateAddress } from '$lib/server/ethereum';

export const GET: RequestHandler = async ({ url }) => {
	const contractAddress = url.searchParams.get('contract');
	const tokenId = url.searchParams.get('tokenId');

	if (!contractAddress || !tokenId) {
		return json(
			{ error: 'Both contract and tokenId query parameters are required' },
			{ status: 400 }
		);
	}

	if (!validateAddress(contractAddress)) {
		return json({ error: 'Invalid contract address' }, { status: 400 });
	}

	try {
		const owner = await getNFTOwner(contractAddress, tokenId);
		return json({
			success: true,
			data: {
				contract: contractAddress,
				tokenId,
				...owner
			}
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get NFT owner'
			},
			{ status: 500 }
		);
	}
};
