import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateWallet } from '$lib/server/ethereum';

export const POST: RequestHandler = async () => {
	try {
		const wallet = generateWallet();
		return json({
			success: true,
			data: {
				address: wallet.address,
				privateKey: wallet.privateKey
			},
			warning: 'Store your private key securely. It cannot be recovered if lost.'
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to generate wallet'
			},
			{ status: 500 }
		);
	}
};
