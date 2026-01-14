import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getApiKey,
	deleteApiKey,
	activateApiKey,
	deactivateApiKey,
	updateApiKeyLimits,
	getUsageStats
} from '$lib/server/store';

// Get single API key details with usage stats
export const GET: RequestHandler = async ({ params }) => {
	const { key } = params;
	const apiKeyData = getApiKey(key);

	if (!apiKeyData) {
		return json({ error: 'API key not found' }, { status: 404 });
	}

	const usage = getUsageStats(key);

	return json({
		success: true,
		data: {
			...apiKeyData,
			key: `${apiKeyData.key.slice(0, 8)}...${apiKeyData.key.slice(-4)}`,
			usage
		}
	});
};

// Update API key (activate/deactivate or update limits)
export const PATCH: RequestHandler = async ({ params, request }) => {
	const { key } = params;
	const body = await request.json();
	const { action, limits } = body;

	if (action === 'activate') {
		const success = activateApiKey(key);
		if (!success) {
			return json({ error: 'API key not found' }, { status: 404 });
		}
		return json({ success: true, message: 'API key activated' });
	}

	if (action === 'deactivate') {
		const success = deactivateApiKey(key);
		if (!success) {
			return json({ error: 'API key not found' }, { status: 404 });
		}
		return json({ success: true, message: 'API key deactivated' });
	}

	if (limits) {
		const success = updateApiKeyLimits(key, limits);
		if (!success) {
			return json({ error: 'API key not found' }, { status: 404 });
		}
		return json({ success: true, message: 'API key limits updated' });
	}

	return json({ error: 'Invalid action. Use activate, deactivate, or provide limits' }, { status: 400 });
};

// Delete API key
export const DELETE: RequestHandler = async ({ params }) => {
	const { key } = params;
	const success = deleteApiKey(key);

	if (!success) {
		return json({ error: 'API key not found' }, { status: 404 });
	}

	return json({
		success: true,
		message: 'API key deleted'
	});
};
