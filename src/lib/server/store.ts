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
	[key: string]: RateLimitEntry;
}

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

// ============ Rate Limiting (10분만, 메모리에서만 관리) ============

const WINDOW_10MIN = 10 * 60 * 1000; // ms

const DEFAULT_LIMIT = parseInt(process.env.API_RATE_LIMIT_PER_10MIN || '30000');

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetTime: number;
}

export function checkRateLimit(
	apiKey: string,
	customLimit?: number
): RateLimitResult {
	const now = Date.now();
	const limit = customLimit ?? DEFAULT_LIMIT;

	// Clean expired
	if (rateLimits[apiKey] && rateLimits[apiKey].expiresAt < now) {
		delete rateLimits[apiKey];
	}

	const entry = rateLimits[apiKey];
	const count = entry?.count || 0;
	const resetTime = entry ? Math.ceil((entry.expiresAt - now) / 1000) : WINDOW_10MIN / 1000;

	// Check limit
	if (count >= limit) {
		return {
			allowed: false,
			remaining: 0,
			resetTime
		};
	}

	// Increment counter
	if (!rateLimits[apiKey]) {
		rateLimits[apiKey] = { count: 0, expiresAt: now + WINDOW_10MIN };
	}
	rateLimits[apiKey].count++;

	return {
		allowed: true,
		remaining: limit - rateLimits[apiKey].count,
		resetTime: Math.ceil((rateLimits[apiKey].expiresAt - now) / 1000)
	};
}

export function getUsageStats(apiKey: string): number {
	const now = Date.now();
	const entry = rateLimits[apiKey];

	if (!entry || entry.expiresAt < now) {
		return 0;
	}

	return entry.count;
}

// Initialize on module load
loadFromDisk();
