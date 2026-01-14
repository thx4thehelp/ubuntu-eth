import {
	createPublicClient,
	http,
	formatEther,
	formatUnits,
	parseEther,
	isAddress,
	type PublicClient,
	type Hash,
	type TransactionReceipt,
	type Block
} from 'viem';
import { mainnet } from 'viem/chains';
import { ERIGON_RPC_URL } from '$env/static/private';

let client: PublicClient | null = null;

export function getClient(): PublicClient {
	if (!client) {
		client = createPublicClient({
			chain: mainnet,
			transport: http(ERIGON_RPC_URL || 'http://localhost:8545')
		});
	}
	return client;
}

// ERC-20 ABI (minimal)
const ERC20_ABI = [
	{
		name: 'balanceOf',
		type: 'function',
		stateMutability: 'view',
		inputs: [{ name: 'account', type: 'address' }],
		outputs: [{ name: '', type: 'uint256' }]
	},
	{
		name: 'decimals',
		type: 'function',
		stateMutability: 'view',
		inputs: [],
		outputs: [{ name: '', type: 'uint8' }]
	},
	{
		name: 'symbol',
		type: 'function',
		stateMutability: 'view',
		inputs: [],
		outputs: [{ name: '', type: 'string' }]
	},
	{
		name: 'name',
		type: 'function',
		stateMutability: 'view',
		inputs: [],
		outputs: [{ name: '', type: 'string' }]
	},
	{
		name: 'totalSupply',
		type: 'function',
		stateMutability: 'view',
		inputs: [],
		outputs: [{ name: '', type: 'uint256' }]
	},
	{
		name: 'transfer',
		type: 'function',
		stateMutability: 'nonpayable',
		inputs: [
			{ name: 'to', type: 'address' },
			{ name: 'amount', type: 'uint256' }
		],
		outputs: [{ name: '', type: 'bool' }]
	}
] as const;

// ERC-721 ABI (minimal)
const ERC721_ABI = [
	{
		name: 'balanceOf',
		type: 'function',
		stateMutability: 'view',
		inputs: [{ name: 'owner', type: 'address' }],
		outputs: [{ name: '', type: 'uint256' }]
	},
	{
		name: 'ownerOf',
		type: 'function',
		stateMutability: 'view',
		inputs: [{ name: 'tokenId', type: 'uint256' }],
		outputs: [{ name: '', type: 'address' }]
	},
	{
		name: 'tokenURI',
		type: 'function',
		stateMutability: 'view',
		inputs: [{ name: 'tokenId', type: 'uint256' }],
		outputs: [{ name: '', type: 'string' }]
	},
	{
		name: 'name',
		type: 'function',
		stateMutability: 'view',
		inputs: [],
		outputs: [{ name: '', type: 'string' }]
	},
	{
		name: 'symbol',
		type: 'function',
		stateMutability: 'view',
		inputs: [],
		outputs: [{ name: '', type: 'string' }]
	}
] as const;

// ============ Wallet Functions ============

export async function getBalance(address: string): Promise<{
	wei: string;
	ether: string;
}> {
	if (!isAddress(address)) {
		throw new Error('Invalid Ethereum address');
	}

	const client = getClient();
	const balance = await client.getBalance({ address: address as `0x${string}` });

	return {
		wei: balance.toString(),
		ether: formatEther(balance)
	};
}

export async function getTransactionCount(address: string): Promise<number> {
	if (!isAddress(address)) {
		throw new Error('Invalid Ethereum address');
	}

	const client = getClient();
	const count = await client.getTransactionCount({ address: address as `0x${string}` });
	return count;
}

export async function getTransaction(hash: string): Promise<{
	hash: string;
	from: string;
	to: string | null;
	value: string;
	valueEther: string;
	gasPrice: string | null;
	gas: string;
	nonce: number;
	blockNumber: string | null;
	blockHash: string | null;
	input: string;
}> {
	const client = getClient();
	const tx = await client.getTransaction({ hash: hash as Hash });

	return {
		hash: tx.hash,
		from: tx.from,
		to: tx.to,
		value: tx.value.toString(),
		valueEther: formatEther(tx.value),
		gasPrice: tx.gasPrice?.toString() || null,
		gas: tx.gas.toString(),
		nonce: tx.nonce,
		blockNumber: tx.blockNumber?.toString() || null,
		blockHash: tx.blockHash,
		input: tx.input
	};
}

export async function getTransactionReceipt(hash: string): Promise<{
	transactionHash: string;
	blockNumber: string;
	blockHash: string;
	from: string;
	to: string | null;
	status: 'success' | 'reverted';
	gasUsed: string;
	effectiveGasPrice: string;
	logs: Array<{
		address: string;
		topics: string[];
		data: string;
	}>;
} | null> {
	const client = getClient();
	const receipt = await client.getTransactionReceipt({ hash: hash as Hash });

	if (!receipt) return null;

	return {
		transactionHash: receipt.transactionHash,
		blockNumber: receipt.blockNumber.toString(),
		blockHash: receipt.blockHash,
		from: receipt.from,
		to: receipt.to,
		status: receipt.status,
		gasUsed: receipt.gasUsed.toString(),
		effectiveGasPrice: receipt.effectiveGasPrice.toString(),
		logs: receipt.logs.map((log) => ({
			address: log.address,
			topics: log.topics as string[],
			data: log.data
		}))
	};
}

// ============ Block Functions ============

export async function getBlockNumber(): Promise<bigint> {
	const client = getClient();
	return await client.getBlockNumber();
}

export async function getBlock(
	blockNumberOrHash?: bigint | string
): Promise<{
	number: string;
	hash: string;
	timestamp: string;
	gasUsed: string;
	gasLimit: string;
	baseFeePerGas: string | null;
	transactionCount: number;
	miner: string;
}> {
	const client = getClient();
	let block: Block;

	if (typeof blockNumberOrHash === 'bigint') {
		block = await client.getBlock({ blockNumber: blockNumberOrHash });
	} else if (typeof blockNumberOrHash === 'string') {
		block = await client.getBlock({ blockHash: blockNumberOrHash as Hash });
	} else {
		block = await client.getBlock();
	}

	return {
		number: block.number?.toString() || '0',
		hash: block.hash || '',
		timestamp: block.timestamp.toString(),
		gasUsed: block.gasUsed.toString(),
		gasLimit: block.gasLimit.toString(),
		baseFeePerGas: block.baseFeePerGas?.toString() || null,
		transactionCount: block.transactions.length,
		miner: block.miner
	};
}

// ============ Gas Functions ============

export async function getGasPrice(): Promise<{
	wei: string;
	gwei: string;
}> {
	const client = getClient();
	const gasPrice = await client.getGasPrice();

	return {
		wei: gasPrice.toString(),
		gwei: formatUnits(gasPrice, 9)
	};
}

export async function estimateGas(params: {
	from?: string;
	to: string;
	value?: string;
	data?: string;
}): Promise<{
	gas: string;
	estimatedCostWei: string;
	estimatedCostEther: string;
}> {
	const client = getClient();

	const gas = await client.estimateGas({
		account: params.from as `0x${string}` | undefined,
		to: params.to as `0x${string}`,
		value: params.value ? parseEther(params.value) : undefined,
		data: params.data as `0x${string}` | undefined
	});

	const gasPrice = await client.getGasPrice();
	const estimatedCost = gas * gasPrice;

	return {
		gas: gas.toString(),
		estimatedCostWei: estimatedCost.toString(),
		estimatedCostEther: formatEther(estimatedCost)
	};
}

export async function getFeeHistory(blockCount: number = 10): Promise<{
	baseFeePerGas: string[];
	gasUsedRatio: number[];
	oldestBlock: string;
	reward?: string[][];
}> {
	const client = getClient();
	const feeHistory = await client.getFeeHistory({
		blockCount,
		rewardPercentiles: [25, 50, 75]
	});

	return {
		baseFeePerGas: feeHistory.baseFeePerGas.map((fee) => fee.toString()),
		gasUsedRatio: feeHistory.gasUsedRatio,
		oldestBlock: feeHistory.oldestBlock.toString(),
		reward: feeHistory.reward?.map((r) => r.map((v) => v.toString()))
	};
}

// ============ ERC-20 Token Functions ============

export async function getTokenBalance(
	tokenAddress: string,
	walletAddress: string
): Promise<{
	balance: string;
	formatted: string;
	decimals: number;
	symbol: string;
	name: string;
}> {
	if (!isAddress(tokenAddress) || !isAddress(walletAddress)) {
		throw new Error('Invalid address');
	}

	const client = getClient();

	const [balance, decimals, symbol, name] = await Promise.all([
		client.readContract({
			address: tokenAddress as `0x${string}`,
			abi: ERC20_ABI,
			functionName: 'balanceOf',
			args: [walletAddress as `0x${string}`]
		}),
		client.readContract({
			address: tokenAddress as `0x${string}`,
			abi: ERC20_ABI,
			functionName: 'decimals'
		}),
		client.readContract({
			address: tokenAddress as `0x${string}`,
			abi: ERC20_ABI,
			functionName: 'symbol'
		}),
		client.readContract({
			address: tokenAddress as `0x${string}`,
			abi: ERC20_ABI,
			functionName: 'name'
		})
	]);

	return {
		balance: balance.toString(),
		formatted: formatUnits(balance, decimals),
		decimals,
		symbol,
		name
	};
}

export async function getTokenInfo(tokenAddress: string): Promise<{
	address: string;
	name: string;
	symbol: string;
	decimals: number;
	totalSupply: string;
	totalSupplyFormatted: string;
}> {
	if (!isAddress(tokenAddress)) {
		throw new Error('Invalid token address');
	}

	const client = getClient();

	const [name, symbol, decimals, totalSupply] = await Promise.all([
		client.readContract({
			address: tokenAddress as `0x${string}`,
			abi: ERC20_ABI,
			functionName: 'name'
		}),
		client.readContract({
			address: tokenAddress as `0x${string}`,
			abi: ERC20_ABI,
			functionName: 'symbol'
		}),
		client.readContract({
			address: tokenAddress as `0x${string}`,
			abi: ERC20_ABI,
			functionName: 'decimals'
		}),
		client.readContract({
			address: tokenAddress as `0x${string}`,
			abi: ERC20_ABI,
			functionName: 'totalSupply'
		})
	]);

	return {
		address: tokenAddress,
		name,
		symbol,
		decimals,
		totalSupply: totalSupply.toString(),
		totalSupplyFormatted: formatUnits(totalSupply, decimals)
	};
}

// ============ ERC-721 NFT Functions ============

export async function getNFTBalance(
	contractAddress: string,
	walletAddress: string
): Promise<{
	balance: string;
	name: string;
	symbol: string;
}> {
	if (!isAddress(contractAddress) || !isAddress(walletAddress)) {
		throw new Error('Invalid address');
	}

	const client = getClient();

	const [balance, name, symbol] = await Promise.all([
		client.readContract({
			address: contractAddress as `0x${string}`,
			abi: ERC721_ABI,
			functionName: 'balanceOf',
			args: [walletAddress as `0x${string}`]
		}),
		client.readContract({
			address: contractAddress as `0x${string}`,
			abi: ERC721_ABI,
			functionName: 'name'
		}),
		client.readContract({
			address: contractAddress as `0x${string}`,
			abi: ERC721_ABI,
			functionName: 'symbol'
		})
	]);

	return {
		balance: balance.toString(),
		name,
		symbol
	};
}

export async function getNFTOwner(
	contractAddress: string,
	tokenId: string
): Promise<{
	owner: string;
	tokenURI: string;
}> {
	if (!isAddress(contractAddress)) {
		throw new Error('Invalid contract address');
	}

	const client = getClient();

	const [owner, tokenURI] = await Promise.all([
		client.readContract({
			address: contractAddress as `0x${string}`,
			abi: ERC721_ABI,
			functionName: 'ownerOf',
			args: [BigInt(tokenId)]
		}),
		client.readContract({
			address: contractAddress as `0x${string}`,
			abi: ERC721_ABI,
			functionName: 'tokenURI',
			args: [BigInt(tokenId)]
		})
	]);

	return {
		owner,
		tokenURI
	};
}

// ============ Wallet Generation ============

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export function generateWallet(): {
	address: string;
	privateKey: string;
} {
	const privateKey = generatePrivateKey();
	const account = privateKeyToAccount(privateKey);

	return {
		address: account.address,
		privateKey
	};
}

// ============ Utility Functions ============

export function validateAddress(address: string): boolean {
	return isAddress(address);
}

export { formatEther, formatUnits, parseEther };
