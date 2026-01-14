import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.DATA_DIR || './data';
const API_KEYS_FILE = join(DATA_DIR, 'api-keys.json');

// In-memory store
interface RateLimitEntry {
	count: number;
	expiresAt: number;
}

interface RateLimitStore {
	[key: string]: {
		per10Min?: RateLimitEntry;
		perDay?: RateLimitEntry;
		perMonth?: RateLimitEntry;
	};
}

interface ApiKeyData {
	key: string;
	name: string;
	createdAt: number;
	lastUsedAt?: number;
	isActive: boolean;
	customLimits?: {
		per10Min?: number;
		perDay?: number;
		perMonth?: number;
	};
	metadata?: Record<string, string>;
}

interface ApiKeysStore {
	[key: string]: ApiKeyData;
}

// Memory stores
let apiKeys: ApiKeysStore = {};
let rateLimits: RateLimitStore = {}; // 메모리에서만 관리, JSON 저장 안함

// Initialize data directory
function ensureDataDir() {
	if (!existsSync(DATA_DIR)) {
		mkdirSync(DATA_DIR, { recursive: true });
	}
}

// Load API keys from JSON file on startup
export function loadFromDisk() {
	ensureDataDir();

	try {
		if (existsSync(API_KEYS_FILE)) {
			apiKeys = JSON.parse(readFileSync(API_KEYS_FILE, 'utf-8'));
		}
	} catch (e) {
		console.error('Failed to load API keys:', e);
		apiKeys = {};
	}
}

// Save API keys to disk
function saveApiKeys() {
	ensureDataDir();
	writeFileSync(API_KEYS_FILE, JSON.stringify(apiKeys, null, 2));
}

// ============ API Keys ============

export function createApiKey(
	name: string,
	customLimits?: ApiKeyData['customLimits'],
	metadata?: Record<string, string>
): ApiKeyData {
	const key = `eth_${crypto.randomUUID().replace(/-/g, '')}`;
	const data: ApiKeyData = {
		key,
		name,
		createdAt: Date.now(),
		isActive: true,
		customLimits,
		metadata
	};
	apiKeys[key] = data;
	saveApiKeys();
	return data;
}

export function getApiKey(key: string): ApiKeyData | null {
	return apiKeys[key] || null;
}

export function validateApiKey(key: string): { valid: boolean; data?: ApiKeyData; error?: string } {
	if (!key) return { valid: false, error: 'API key is required' };

	const data = apiKeys[key];
	if (!data) return { valid: false, error: 'Invalid API key' };
	if (!data.isActive) return { valid: false, error: 'API key is deactivated' };

	// Update last used
	data.lastUsedAt = Date.now();
	saveApiKeys();

	return { valid: true, data };
}

export function deactivateApiKey(key: string): boolean {
	if (!apiKeys[key]) return false;
	apiKeys[key].isActive = false;
	saveApiKeys();
	return true;
}

export function activateApiKey(key: string): boolean {
	if (!apiKeys[key]) return false;
	apiKeys[key].isActive = true;
	saveApiKeys();
	return true;
}

export function deleteApiKey(key: string): boolean {
	if (!apiKeys[key]) return false;
	delete apiKeys[key];
	delete rateLimits[key];
	saveApiKeys();
	return true;
}

export function listApiKeys(): ApiKeyData[] {
	return Object.values(apiKeys).sort((a, b) => b.createdAt - a.createdAt);
}

export function updateApiKeyLimits(
	key: string,
	limits: ApiKeyData['customLimits']
): boolean {
	if (!apiKeys[key]) return false;
	apiKeys[key].customLimits = { ...apiKeys[key].customLimits, ...limits };
	saveApiKeys();
	return true;
}

// ============ Rate Limiting (메모리에서만 관리) ============

const WINDOW_10MIN = 10 * 60 * 1000; // ms
const WINDOW_DAY = 24 * 60 * 60 * 1000;
const WINDOW_MONTH = 30 * 24 * 60 * 60 * 1000;

interface RateLimitConfig {
	per10Min: number;
	perDay: number;
	perMonth: number;
}

const DEFAULT_LIMITS: RateLimitConfig = {
	per10Min: parseInt(process.env.API_RATE_LIMIT_PER_10MIN || '100'),
	perDay: parseInt(process.env.API_RATE_LIMIT_PER_DAY || '10000'),
	perMonth: parseInt(process.env.API_RATE_LIMIT_PER_MONTH || '300000')
};

export interface RateLimitResult {
	allowed: boolean;
	remaining: {
		per10Min: number;
		perDay: number;
		perMonth: number;
	};
	resetTimes: {
		per10Min: number;
		perDay: number;
		perMonth: number;
	};
	limitExceeded?: '10min' | 'day' | 'month';
}

export function checkRateLimit(
	apiKey: string,
	customLimits?: Partial<RateLimitConfig>
): RateLimitResult {
	const now = Date.now();
	const limits = { ...DEFAULT_LIMITS, ...customLimits };

	if (!rateLimits[apiKey]) {
		rateLimits[apiKey] = {};
	}

	const entry = rateLimits[apiKey];

	// Clean expired
	if (entry.per10Min && entry.per10Min.expiresAt < now) delete entry.per10Min;
	if (entry.perDay && entry.perDay.expiresAt < now) delete entry.perDay;
	if (entry.perMonth && entry.perMonth.expiresAt < now) delete entry.perMonth;

	// Get current counts
	const count10Min = entry.per10Min?.count || 0;
	const countDay = entry.perDay?.count || 0;
	const countMonth = entry.perMonth?.count || 0;

	// Calculate reset times (in seconds)
	const reset10Min = entry.per10Min ? Math.ceil((entry.per10Min.expiresAt - now) / 1000) : WINDOW_10MIN / 1000;
	const resetDay = entry.perDay ? Math.ceil((entry.perDay.expiresAt - now) / 1000) : WINDOW_DAY / 1000;
	const resetMonth = entry.perMonth ? Math.ceil((entry.perMonth.expiresAt - now) / 1000) : WINDOW_MONTH / 1000;

	// Check limits
	if (count10Min >= limits.per10Min) {
		return {
			allowed: false,
			remaining: { per10Min: 0, perDay: limits.perDay - countDay, perMonth: limits.perMonth - countMonth },
			resetTimes: { per10Min: reset10Min, perDay: resetDay, perMonth: resetMonth },
			limitExceeded: '10min'
		};
	}

	if (countDay >= limits.perDay) {
		return {
			allowed: false,
			remaining: { per10Min: limits.per10Min - count10Min, perDay: 0, perMonth: limits.perMonth - countMonth },
			resetTimes: { per10Min: reset10Min, perDay: resetDay, perMonth: resetMonth },
			limitExceeded: 'day'
		};
	}

	if (countMonth >= limits.perMonth) {
		return {
			allowed: false,
			remaining: { per10Min: limits.per10Min - count10Min, perDay: limits.perDay - countDay, perMonth: 0 },
			resetTimes: { per10Min: reset10Min, perDay: resetDay, perMonth: resetMonth },
			limitExceeded: 'month'
		};
	}

	// Increment counters
	if (!entry.per10Min) entry.per10Min = { count: 0, expiresAt: now + WINDOW_10MIN };
	if (!entry.perDay) entry.perDay = { count: 0, expiresAt: now + WINDOW_DAY };
	if (!entry.perMonth) entry.perMonth = { count: 0, expiresAt: now + WINDOW_MONTH };

	entry.per10Min.count++;
	entry.perDay.count++;
	entry.perMonth.count++;

	return {
		allowed: true,
		remaining: {
			per10Min: limits.per10Min - entry.per10Min.count,
			perDay: limits.perDay - entry.perDay.count,
			perMonth: limits.perMonth - entry.perMonth.count
		},
		resetTimes: {
			per10Min: Math.ceil((entry.per10Min.expiresAt - now) / 1000),
			perDay: Math.ceil((entry.perDay.expiresAt - now) / 1000),
			perMonth: Math.ceil((entry.perMonth.expiresAt - now) / 1000)
		}
	};
}

export function getUsageStats(apiKey: string): {
	per10Min: number;
	perDay: number;
	perMonth: number;
} {
	const now = Date.now();
	const entry = rateLimits[apiKey];

	if (!entry) {
		return { per10Min: 0, perDay: 0, perMonth: 0 };
	}

	return {
		per10Min: (entry.per10Min && entry.per10Min.expiresAt > now) ? entry.per10Min.count : 0,
		perDay: (entry.perDay && entry.perDay.expiresAt > now) ? entry.perDay.count : 0,
		perMonth: (entry.perMonth && entry.perMonth.expiresAt > now) ? entry.perMonth.count : 0
	};
}

// Initialize on module load
loadFromDisk();
