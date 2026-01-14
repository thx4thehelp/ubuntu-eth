import type { Handle } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { validateApiKey, checkRateLimit } from '$lib/server/store';
import { ADMIN_SECRET } from '$env/static/private';

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	// Skip auth for non-API routes and health check
	if (!path.startsWith('/api/') || path === '/api/health') {
		return resolve(event);
	}

	// Admin routes - check admin secret
	if (path.startsWith('/api/admin/')) {
		const adminSecret = event.request.headers.get('x-admin-secret');
		if (adminSecret !== ADMIN_SECRET) {
			return json({ error: 'Unauthorized', message: 'Invalid admin secret' }, { status: 401 });
		}
		return resolve(event);
	}

	// API routes - check API key and rate limit
	const apiKey = event.request.headers.get('x-api-key');

	if (!apiKey) {
		return json(
			{ error: 'Unauthorized', message: 'API key required. Pass it via x-api-key header.' },
			{ status: 401 }
		);
	}

	// Validate API key
	const validation = validateApiKey(apiKey);
	if (!validation.valid) {
		return json({ error: 'Unauthorized', message: validation.error }, { status: 401 });
	}

	// Check rate limit
	const rateLimit = checkRateLimit(apiKey, validation.data?.customLimits);

	// Add rate limit headers
	event.locals.rateLimitInfo = rateLimit;
	event.locals.apiKeyData = validation.data;

	if (!rateLimit.allowed) {
		const retryAfter =
			rateLimit.limitExceeded === '10min'
				? rateLimit.resetTimes.per10Min
				: rateLimit.limitExceeded === 'day'
					? rateLimit.resetTimes.perDay
					: rateLimit.resetTimes.perMonth;

		return json(
			{
				error: 'Rate limit exceeded',
				limitExceeded: rateLimit.limitExceeded,
				retryAfter,
				remaining: rateLimit.remaining
			},
			{
				status: 429,
				headers: {
					'Retry-After': retryAfter.toString(),
					'X-RateLimit-Remaining-10Min': rateLimit.remaining.per10Min.toString(),
					'X-RateLimit-Remaining-Day': rateLimit.remaining.perDay.toString(),
					'X-RateLimit-Remaining-Month': rateLimit.remaining.perMonth.toString()
				}
			}
		);
	}

	const response = await resolve(event);

	// Add rate limit headers to successful responses
	const newHeaders = new Headers(response.headers);
	newHeaders.set('X-RateLimit-Remaining-10Min', rateLimit.remaining.per10Min.toString());
	newHeaders.set('X-RateLimit-Remaining-Day', rateLimit.remaining.perDay.toString());
	newHeaders.set('X-RateLimit-Remaining-Month', rateLimit.remaining.perMonth.toString());

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders
	});
};
