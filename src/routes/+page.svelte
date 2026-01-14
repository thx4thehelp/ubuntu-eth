<script lang="ts">
	let healthStatus = $state<{status: string; ethereum?: {connected: boolean; blockNumber?: string}} | null>(null);
	let loading = $state(false);

	async function checkHealth() {
		loading = true;
		try {
			const res = await fetch('/api/health');
			healthStatus = await res.json();
		} catch (e) {
			healthStatus = { status: 'error' };
		}
		loading = false;
	}
</script>

<div class="container">
	<h1>Ethereum Wallet API</h1>
	<p>Erigon Node based Ethereum API Service</p>

	<div class="health-check">
		<button onclick={checkHealth} disabled={loading}>
			{loading ? 'Checking...' : 'Check Node Status'}
		</button>

		{#if healthStatus}
			<div class="status" class:ok={healthStatus.status === 'ok'} class:error={healthStatus.status !== 'ok'}>
				<p>Status: {healthStatus.status}</p>
				{#if healthStatus.ethereum}
					<p>Ethereum Connected: {healthStatus.ethereum.connected}</p>
					{#if healthStatus.ethereum.blockNumber}
						<p>Latest Block: {healthStatus.ethereum.blockNumber}</p>
					{/if}
				{/if}
			</div>
		{/if}
	</div>

	<div class="api-docs">
		<h2>API Endpoints</h2>

		<h3>Wallet</h3>
		<ul>
			<li><code>GET /api/v1/wallet/balance/:address</code> - Get ETH balance</li>
			<li><code>GET /api/v1/wallet/nonce/:address</code> - Get transaction count</li>
			<li><code>POST /api/v1/wallet/generate</code> - Generate new wallet</li>
		</ul>

		<h3>Transactions</h3>
		<ul>
			<li><code>GET /api/v1/tx/:hash</code> - Get transaction details</li>
			<li><code>GET /api/v1/tx/:hash/receipt</code> - Get transaction receipt</li>
		</ul>

		<h3>Blocks</h3>
		<ul>
			<li><code>GET /api/v1/block</code> - Get latest block number</li>
			<li><code>GET /api/v1/block?number=123</code> - Get block by number</li>
			<li><code>GET /api/v1/block?hash=0x...</code> - Get block by hash</li>
		</ul>

		<h3>ERC-20 Tokens</h3>
		<ul>
			<li><code>GET /api/v1/token/balance?token=0x...&wallet=0x...</code> - Get token balance</li>
			<li><code>GET /api/v1/token/info/:address</code> - Get token info</li>
		</ul>

		<h3>NFTs (ERC-721)</h3>
		<ul>
			<li><code>GET /api/v1/nft/balance?contract=0x...&wallet=0x...</code> - Get NFT balance</li>
			<li><code>GET /api/v1/nft/owner?contract=0x...&tokenId=1</code> - Get NFT owner</li>
		</ul>

		<h3>Gas</h3>
		<ul>
			<li><code>GET /api/v1/gas/price</code> - Get current gas price</li>
			<li><code>POST /api/v1/gas/estimate</code> - Estimate gas for transaction</li>
			<li><code>GET /api/v1/gas/history?blocks=10</code> - Get fee history</li>
		</ul>

		<h3>Usage</h3>
		<ul>
			<li><code>GET /api/v1/usage</code> - Get your API usage stats</li>
		</ul>

		<h3>Authentication</h3>
		<p>All API requests require an API key passed via <code>x-api-key</code> header.</p>
	</div>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: system-ui, -apple-system, sans-serif;
	}

	h1 {
		color: #333;
	}

	.health-check {
		margin: 2rem 0;
		padding: 1rem;
		background: #f5f5f5;
		border-radius: 8px;
	}

	button {
		background: #0066cc;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}

	button:disabled {
		background: #ccc;
	}

	.status {
		margin-top: 1rem;
		padding: 1rem;
		border-radius: 4px;
	}

	.status.ok {
		background: #d4edda;
		color: #155724;
	}

	.status.error {
		background: #f8d7da;
		color: #721c24;
	}

	.api-docs {
		margin-top: 2rem;
	}

	.api-docs h3 {
		margin-top: 1.5rem;
		color: #555;
	}

	.api-docs ul {
		list-style: none;
		padding: 0;
	}

	.api-docs li {
		padding: 0.5rem 0;
		border-bottom: 1px solid #eee;
	}

	code {
		background: #e9ecef;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-size: 0.9em;
	}
</style>
