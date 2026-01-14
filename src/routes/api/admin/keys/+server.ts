import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createApiKey, listApiKeys } from '$lib/server/store';

// List all API keys
export const GET: RequestHandler = async () => {
	const keys = listApiKeys();
	const safeKeys = keys.map((k) => ({
		...k,
		key: `${k.key.slice(0, 8)}...${k.key.slice(-4)}`
	}));

	return json({
		success: true,
		data: safeKeys
	});
};

// Create new API key
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { name, customLimits, metadata } = body;

	if (!name) {
		return json({ error: 'name is required' }, { status: 400 });
	}

	const apiKey = createApiKey(name, customLimits, metadata);

	return json({
		success: true,
		data: apiKey,
		message: 'Store this API key securely. It will not be shown again in full.'
	});
};
