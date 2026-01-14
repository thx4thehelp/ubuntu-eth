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
	const rateLimit = checkRateLimit(apiKey, validation.data?.customLimits?.per10Min);

	// Store for use in routes
	event.locals.rateLimitInfo = rateLimit;
	event.locals.apiKeyData = validation.data;

	if (!rateLimit.allowed) {
		return json(
			{
				error: 'Rate limit exceeded',
				retryAfter: rateLimit.resetTime,
				remaining: rateLimit.remaining
			},
			{
				status: 429,
				headers: {
					'Retry-After': rateLimit.resetTime.toString(),
					'X-RateLimit-Remaining': rateLimit.remaining.toString(),
					'X-RateLimit-Reset': rateLimit.resetTime.toString()
				}
			}
		);
	}

	const response = await resolve(event);

	// Add rate limit headers to successful responses
	const newHeaders = new Headers(response.headers);
	newHeaders.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
	newHeaders.set('X-RateLimit-Reset', rateLimit.resetTime.toString());

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders
	});
};
