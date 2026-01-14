import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUsageStats } from '$lib/server/store';
import {
	API_RATE_LIMIT_PER_10MIN,
	API_RATE_LIMIT_PER_DAY,
	API_RATE_LIMIT_PER_MONTH
} from '$env/static/private';

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
			limits: {
				per10Min: parseInt(API_RATE_LIMIT_PER_10MIN || '100'),
				perDay: parseInt(API_RATE_LIMIT_PER_DAY || '10000'),
				perMonth: parseInt(API_RATE_LIMIT_PER_MONTH || '300000')
			}
		}
	});
};
