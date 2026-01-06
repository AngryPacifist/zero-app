# Gasless Transactions

This guide explains how to send transactions without paying gas fees using the Lazorkit SDK and Kora paymaster.

## How Gasless Works

```
┌─────────────────────────────────────────────────────────────┐
│                     Your App                                │
│  1. Build transaction instructions                          │
│  2. Call signAndSendTransaction()                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Lazorkit SDK                               │
│  3. Splits into verification + execution chunks             │
│  4. User signs with passkey (biometric)                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Kora Paymaster                             │
│  5. Sponsors the transaction fee                            │
│  6. Submits to Solana network                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Solana Network                             │
│  7. Transaction confirmed                                   │
│  8. Success callback triggered                              │
└─────────────────────────────────────────────────────────────┘
```

The user never needs SOL for gas—the paymaster covers it.

## Basic Usage

### Step 1: Build Your Instruction

Use `@solana/web3.js` to create transaction instructions:

```typescript
import { 
    SystemProgram, 
    PublicKey, 
    LAMPORTS_PER_SOL 
} from '@solana/web3.js';

// SOL transfer instruction
const instruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(walletAddress),
    toPubkey: new PublicKey(recipientAddress),
    lamports: amount * LAMPORTS_PER_SOL,
});
```

### Step 2: Sign and Send

```typescript
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import * as Linking from 'expo-linking';

const { signAndSendTransaction } = useWallet();

await signAndSendTransaction(
    {
        instructions: [instruction],
        transactionOptions: {
            clusterSimulation: 'devnet', // or 'mainnet'
        },
    },
    {
        redirectUrl: Linking.createURL('callback'),
        onSuccess: (signature) => {
            console.log('Transaction confirmed:', signature);
        },
        onFail: (error) => {
            console.error('Transaction failed:', error);
        },
    }
);
```

### Step 3: Handle the Result

The `onSuccess` callback receives the transaction signature. Use it to:

```typescript
onSuccess: (signature) => {
    // Show success UI
    setTxSignature(signature);
    
    // Open in explorer
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    WebBrowser.openBrowserAsync(explorerUrl);
}
```

## SPL Token Transfers

For SPL tokens, build instructions using `@solana/spl-token`:

```typescript
import { 
    createTransferInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';

// Get token accounts
const senderAta = await getAssociatedTokenAddress(
    new PublicKey(tokenMint),
    new PublicKey(senderAddress)
);

const recipientAta = await getAssociatedTokenAddress(
    new PublicKey(tokenMint),
    new PublicKey(recipientAddress)
);

// Create transfer instruction
const transferIx = createTransferInstruction(
    senderAta,
    recipientAta,
    new PublicKey(senderAddress),
    amount * Math.pow(10, decimals)
);

// Send via Lazorkit
await signAndSendTransaction(
    { instructions: [transferIx], transactionOptions: { clusterSimulation: 'devnet' } },
    { redirectUrl: Linking.createURL('cb'), onSuccess, onFail }
);
```

## Multiple Instructions

You can include multiple instructions in one transaction:

```typescript
const instructions = [
    createAccountInstruction,
    initializeInstruction,
    transferInstruction,
];

await signAndSendTransaction(
    { instructions, transactionOptions: { clusterSimulation: 'devnet' } },
    { redirectUrl: Linking.createURL('cb'), onSuccess, onFail }
);
```

## Retry Logic

Some errors are transient and can be resolved by retrying:

```typescript
const RETRYABLE_ERRORS = [
    'Transaction too large',
    'Chunk not found',
    'BlockhashNotFound',
];

function isRetryableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return RETRYABLE_ERRORS.some(e => 
        message.toLowerCase().includes(e.toLowerCase())
    );
}

// Retry with exponential backoff
async function executeWithRetry(
    fn: () => Promise<void>,
    maxRetries: number = 3
): Promise<void> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
        try {
            await fn();
            return;
        } catch (error) {
            if (isRetryableError(error) && attempt < maxRetries - 1) {
                attempt++;
                const delay = 1000 * Math.pow(2, attempt - 1);
                await new Promise(r => setTimeout(r, delay));
            } else {
                throw error;
            }
        }
    }
}
```

## Transaction Options

| Option | Type | Description |
|--------|------|-------------|
| `clusterSimulation` | `'devnet' \| 'mainnet'` | Which cluster to simulate on |
| `computeUnitLimit` | `number` | Max compute units (increase for complex txs) |

## Paymaster Configuration

### Devnet (Free)
```typescript
PAYMASTER_URL: 'https://kora.devnet.lazorkit.com'
```

### Mainnet (Requires API Key)
```typescript
PAYMASTER_URL: 'https://kora.lazorkit.com'
// API key configured in LazorKitProvider
```

For mainnet access, [apply for an API key](https://docs.google.com/forms/d/e/1FAIpQLScU5KZD_LR4I51ont3md30SViOsL6dfv16bTniLloOZr62fag/viewform).

## Error Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `Transaction too large` | Payload exceeds limit | Retry (SDK chunks automatically) |
| `Chunk not found` | Timing issue on-chain | Retry |
| `Missing required signature` | Additional signer needed | Check instruction requirements |
| `Insufficient funds` | User lacks tokens | UX: Show balance warning |

## Full Examples

- **SOL Transfer:** [SendScreen.tsx](../src/screens/SendScreen.tsx)
- **Tip Jar:** [TipJarScreen.tsx](../src/screens/TipJarScreen.tsx)
- **Payment Widget:** [PaymentScreen.tsx](../src/screens/PaymentScreen.tsx)
- **QR Payment:** [QRPaymentScreen.tsx](../src/screens/QRPaymentScreen.tsx)

## Next Steps

- [Protocol Integrations](./protocol-integrations.md) - Jupiter swap & Metaplex NFT examples
