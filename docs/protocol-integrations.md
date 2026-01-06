# Protocol Integrations

This guide demonstrates how to integrate external Solana protocols with Lazorkit, using Jupiter and Metaplex Core as examples.

## Overview

The key to integrating any protocol with Lazorkit is:

1. **Build standard `TransactionInstruction` objects** using the protocol's SDK
2. **Pass instructions to `signAndSendTransaction()`** — Lazorkit handles signing and gas

```typescript
// Generic pattern
const instruction = await someProtocol.buildInstruction(...);

await signAndSendTransaction(
    { instructions: [instruction], transactionOptions: { clusterSimulation: 'devnet' } },
    { redirectUrl: Linking.createURL('cb'), onSuccess, onFail }
);
```

---

## Jupiter Token Swap

[Jupiter](https://jup.ag) is Solana's leading DEX aggregator. We use their Quote and Swap Instructions APIs.

### Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Get Quote  │────▶│ Get Swap Ix  │────▶│   Lazorkit   │
│   /quote     │     │/swap-instrs  │     │    Signs     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Step 1: Get a Quote

```typescript
const JUPITER_API = 'https://api.jup.ag/swap/v1';

interface SwapQuote {
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    priceImpactPct: string;
    routePlan: Array<{ swapInfo: { label: string } }>;
}

async function getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50
): Promise<SwapQuote> {
    const url = `${JUPITER_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Quote failed');
    
    return response.json();
}
```

### Step 2: Get Swap Instructions

```typescript
interface InstructionData {
    programId: string;
    accounts: Array<{ pubkey: string; isSigner: boolean; isWritable: boolean }>;
    data: string;
}

async function getSwapInstructions(
    quote: SwapQuote,
    userPublicKey: string
): Promise<{ setupInstructions: InstructionData[]; swapInstruction: InstructionData }> {
    const response = await fetch(`${JUPITER_API}/swap-instructions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey,
            wrapAndUnwrapSol: true,
        }),
    });
    
    if (!response.ok) throw new Error('Swap instructions failed');
    return response.json();
}
```

### Step 3: Deserialize Instructions

```typescript
import { TransactionInstruction, PublicKey } from '@solana/web3.js';

function deserializeInstruction(data: InstructionData): TransactionInstruction {
    return new TransactionInstruction({
        programId: new PublicKey(data.programId),
        keys: data.accounts.map(acc => ({
            pubkey: new PublicKey(acc.pubkey),
            isSigner: acc.isSigner,
            isWritable: acc.isWritable,
        })),
        data: Buffer.from(data.data, 'base64'),
    });
}
```

### Step 4: Execute the Swap

```typescript
async function executeSwap(
    inputMint: string,
    outputMint: string,
    amount: number,
    walletAddress: string
) {
    // Get quote
    const quote = await getQuote(inputMint, outputMint, amount);
    
    // Get instructions
    const ixData = await getSwapInstructions(quote, walletAddress);
    
    // Deserialize all instructions
    const instructions = [
        ...ixData.setupInstructions.map(deserializeInstruction),
        deserializeInstruction(ixData.swapInstruction),
    ];
    
    // Execute via Lazorkit
    await signAndSendTransaction(
        { 
            instructions, 
            transactionOptions: { clusterSimulation: 'mainnet' } 
        },
        {
            redirectUrl: Linking.createURL('cb'),
            onSuccess: (sig) => console.log('Swap complete:', sig),
            onFail: (err) => console.error('Swap failed:', err),
        }
    );
}
```

### Common Token Mints

```typescript
const TOKENS = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
};
```

### Important Notes

- **Jupiter only has liquidity on mainnet** — devnet quotes may fail or return empty routes
- Use `clusterSimulation: 'mainnet'` for Jupiter transactions
- The Quote API is free; no API key required

**Full implementation:** [SwapScreen.tsx](../src/screens/SwapScreen.tsx), [jupiterUtils.ts](../src/utils/jupiterUtils.ts)

---

## Metaplex Core NFT

[Metaplex Core](https://developers.metaplex.com/core) is the newest, most efficient NFT standard on Solana.

### Dependencies

```bash
npm install @metaplex-foundation/mpl-core @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults @metaplex-foundation/umi-web3js-adapters
```

### Metro Configuration

Add ESM support for Metaplex packages in `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
```

### Step 1: Initialize Umi

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { createNoopSigner, publicKey, signerIdentity } from '@metaplex-foundation/umi';

function createConfiguredUmi(walletAddress: string) {
    return createUmi('https://api.devnet.solana.com')
        .use(mplCore())
        .use(signerIdentity(createNoopSigner(publicKey(walletAddress))));
}
```

### Step 2: Build Mint Instructions

```typescript
import { create as createAsset, generateSigner } from '@metaplex-foundation/mpl-core';
import { toWeb3JsInstruction, toWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';

async function buildMintInstructions(
    ownerAddress: string,
    name: string,
    metadataUri: string,
    soulbound: boolean = false
) {
    const umi = createConfiguredUmi(ownerAddress);
    const assetSigner = generateSigner(umi);
    
    // Build plugins
    const plugins = [];
    if (soulbound) {
        plugins.push({
            type: 'PermanentFreezeDelegate',
            frozen: true,
            authority: { type: 'None' },
        });
    }
    
    // Create mint instruction
    const builder = createAsset(umi, {
        asset: assetSigner,
        name,
        uri: metadataUri,
        owner: publicKey(ownerAddress),
        plugins: plugins.length > 0 ? plugins : undefined,
    });
    
    // Convert to web3.js instructions
    const umiInstructions = builder.getInstructions();
    const instructions = umiInstructions.map(toWeb3JsInstruction);
    const assetKeypair = toWeb3JsKeypair(assetSigner);
    
    return { instructions, assetKeypair, assetAddress: assetSigner.publicKey.toString() };
}
```

### Step 3: Execute Mint

```typescript
async function mintNFT(walletAddress: string) {
    const metadataUri = 'https://arweave.net/your-metadata-json';
    
    const { instructions, assetAddress } = await buildMintInstructions(
        walletAddress,
        'My NFT',
        metadataUri,
        false // not soulbound
    );
    
    await signAndSendTransaction(
        { instructions, transactionOptions: { clusterSimulation: 'devnet' } },
        {
            redirectUrl: Linking.createURL('cb'),
            onSuccess: (sig) => {
                console.log('NFT minted!');
                console.log('Asset address:', assetAddress);
            },
            onFail: (err) => console.error('Mint failed:', err),
        }
    );
}
```

### Creating Metadata

NFT metadata should be a JSON file hosted on IPFS, Arweave, or any public URL:

```json
{
    "name": "My NFT",
    "description": "A description of my NFT",
    "image": "https://arweave.net/image-url.png",
    "attributes": [
        { "trait_type": "Type", "value": "Collectible" }
    ]
}
```

For demos, you can use a data URI:

```typescript
const metadata = {
    name: 'Demo NFT',
    description: 'Test NFT',
    image: 'https://example.com/image.png',
};

const metadataUri = 'data:application/json;base64,' + btoa(JSON.stringify(metadata));
```

### Current Limitation

> **Note:** Metaplex Core minting requires the asset account to sign the transaction. Lazorkit SDK v1.5.1 doesn't support additional signers. This feature is scheduled for the next SDK release.

**Full implementation:** [NFTGalleryScreen.tsx](../src/screens/NFTGalleryScreen.tsx), [nftUtils.ts](../src/utils/nftUtils.ts)

---

## Best Practices

### 1. Always Handle Errors

```typescript
try {
    await signAndSendTransaction(...);
} catch (error) {
    if (isRetryableError(error)) {
        // Retry logic
    } else {
        // Show user-friendly error
    }
}
```

### 2. Show Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

async function handleTransaction() {
    setIsLoading(true);
    try {
        await signAndSendTransaction(...);
    } finally {
        setIsLoading(false);
    }
}
```

### 3. Validate Before Sending

```typescript
// Check balance
const balance = await getSolBalance(walletAddress);
if (balance < requiredAmount) {
    Alert.alert('Insufficient Balance');
    return;
}

// Validate addresses
try {
    new PublicKey(recipientAddress);
} catch {
    Alert.alert('Invalid Address');
    return;
}
```

### 4. Use Retry Logic

See [retryUtils.ts](../src/utils/retryUtils.ts) for exponential backoff implementation.

---

## Adding New Protocol Integrations

To integrate any new Solana protocol:

1. **Install the protocol's SDK**
2. **Build `TransactionInstruction` objects** using their helpers
3. **Pass instructions to Lazorkit's `signAndSendTransaction()`**
4. **Handle success/failure in callbacks**

The pattern is always the same—Lazorkit handles signing and gas sponsorship.
