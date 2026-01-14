import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsageStats } from '$lib/server/store';
import { API_RATE_LIMIT_PER_10MIN } from '$env/static/private';

// Get usage stats for current API key
export const GET: RequestHandler = async ({ request }) => {
	const apiKey = request.headers.get('x-api-key');

	if (!apiKey) {
		return json({ error: 'API key required' }, { status: 401 });
	}

	const usage = getUsageStats(apiKey);

	return json({
		success: true,
		data: {
			usage,
			limit: parseInt(API_RATE_LIMIT_PER_10MIN || '30000')
		}
	});
};
