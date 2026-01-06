# Getting Started

This guide walks you through setting up the Lazorkit React Native example from scratch.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Expo Go app** - Available on [iOS App Store](https://apps.apple.com/app/expo-go/id982107779) and [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **Git** - For cloning the repository

## Step 1: Clone and Install

```bash
# Clone the repository
git clone https://github.com/AngryPacifist/zero-app.git
cd zero-app

# Install dependencies
npm install
```

## Step 2: Understand the Key Dependencies

The project uses these core packages:

```json
{
  "@lazorkit/wallet-mobile-adapter": "^1.5.1",
  "@solana/web3.js": "^1.98.0",
  "@solana/spl-token": "^0.4.13"
}
```

### Required Polyfills

React Native requires polyfills for Node.js APIs. These are configured at the top of `src/App.tsx`:

```typescript
// Polyfills - MUST be at the very top
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;
```

**Important:** These imports must come before any other imports.

## Step 3: Configure the App

Edit `src/config.ts` to customize the configuration:

```typescript
export const CONFIG = {
    // Solana RPC endpoint
    RPC_URL: 'https://api.devnet.solana.com',
    
    // Kora paymaster for gasless transactions
    PAYMASTER_URL: 'https://kora.devnet.lazorkit.com',
};
```

### Network Options

| Network | RPC URL | Paymaster URL | Notes |
|---------|---------|---------------|-------|
| Devnet | `https://api.devnet.solana.com` | `https://kora.devnet.lazorkit.com` | Free, no API key |
| Mainnet | `https://api.mainnet-beta.solana.com` | `https://kora.lazorkit.com` | Requires API key |

For mainnet, you must [apply for an API key](https://docs.google.com/forms/d/e/1FAIpQLScU5KZD_LR4I51ont3md30SViOsL6dfv16bTniLloOZr62fag/viewform).

## Step 4: Set Up LazorKitProvider

The app must be wrapped in `LazorKitProvider`. See `src/App.tsx`:

```typescript
import { LazorKitProvider } from '@lazorkit/wallet-mobile-adapter';

export default function App() {
    return (
        <LazorKitProvider
            config={{
                paymasterUrl: CONFIG.PAYMASTER_URL,
                rpcUrl: CONFIG.RPC_URL,
            }}
        >
            <SafeAreaProvider>
                <AppContent />
                <StatusBar style="light" />
            </SafeAreaProvider>
        </LazorKitProvider>
    );
}
```

## Step 5: Run the App

```bash
# Start the development server
npx expo start --clear
```

You'll see a QR code in your terminal. Scan it with:
- **iOS:** Camera app → tap the Expo Go banner
- **Android:** Expo Go app → Scan QR code

## Step 6: Test the App

1. **Create Wallet:** Tap "Create Wallet" and authenticate with your biometric
2. **Get Devnet SOL:** Use the [Solana Faucet](https://faucet.solana.com/) to airdrop SOL
3. **Send Transaction:** Try sending SOL to another address

## Project Structure

```
my-mobile-app/
├── src/
│   ├── App.tsx              # Main app entry
│   ├── config.ts            # Configuration
│   ├── screens/             # UI screens
│   └── utils/               # Helper functions
├── docs/                    # Documentation
├── package.json
├── metro.config.js          # Metro bundler config
└── tsconfig.json
```

## Next Steps

- [Passkey Wallet](./passkey-wallet.md) - Learn how passkey authentication works
- [Gasless Transactions](./gasless-transactions.md) - Understand the Kora paymaster
- [Protocol Integrations](./protocol-integrations.md) - Jupiter swap & Metaplex NFT examples
