// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { RateLimitResult } from '$lib/server/store';

interface ApiKeyData {
	key: string;
	name: string;
	createdAt: number;
	lastUsedAt?: number;
	isActive: boolean;
	customLimits?: {
		per10Min?: number;
	};
	metadata?: Record<string, string>;
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			rateLimitInfo?: RateLimitResult;
			apiKeyData?: ApiKeyData;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
