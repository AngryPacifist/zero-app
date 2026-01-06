# Lazorkit React Native Showcase

A comprehensive React Native (Expo) example demonstrating [Lazorkit SDK](https://docs.lazorkit.com) integration for passkey-powered Solana wallets with gasless transactions.

## Features

| Feature | Description |
|---------|-------------|
| 🔐 Passkey Authentication | Create and sign with biometric passkeys (Face ID, fingerprint, Windows Hello) |
| ⚡ Gasless Transactions | All transactions sponsored by Kora paymaster on devnet |
| 💸 Send SOL & SPL Tokens | Transfer native SOL and any SPL token |
| 📷 QR Code Payments | Scan Solana Pay QR codes for instant payments |
| 🔄 Token Swap | Swap tokens via Jupiter aggregator |
| 🎨 NFT Minting | Mint NFTs using Metaplex Core |
| 💾 Session Persistence | Wallet session persists across app restarts |

## Quick Start

### Prerequisites

- Node.js 18+
- Expo Go app on your mobile device
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/lazorkit-react-native-showcase.git
cd lazorkit-react-native-showcase

# Install dependencies
npm install

# Start the development server
npx expo start --clear
```

### Running the App

1. Scan the QR code with Expo Go (Android) or Camera app (iOS)
2. Tap "Create Wallet" to generate a new passkey wallet
3. Your passkey is secured by device biometrics

## Project Structure

```
src/
├── App.tsx                 # Main app with navigation
├── config.ts              # RPC endpoints, colors, constants
├── screens/
│   ├── WelcomeScreen.tsx   # Wallet creation
│   ├── DashboardScreen.tsx # Main dashboard
│   ├── SendScreen.tsx      # Send SOL/SPL tokens
│   ├── TipJarScreen.tsx    # One-tap tips
│   ├── PaymentScreen.tsx   # Payment widget
│   ├── QRScanScreen.tsx    # QR code scanner
│   ├── QRPaymentScreen.tsx # Process QR payments
│   ├── NFTGalleryScreen.tsx# NFT minting
│   └── SwapScreen.tsx      # Jupiter token swap
└── utils/
    ├── solana.ts           # SOL balance, formatting
    ├── tokenUtils.ts       # SPL token operations
    ├── jupiterUtils.ts     # Jupiter swap API
    ├── nftUtils.ts         # Metaplex Core helpers
    └── retryUtils.ts       # Transaction retry logic
```

## Documentation

Detailed tutorials and guides are available in the [docs/](./docs) folder:

- **[Getting Started](./docs/getting-started.md)** - Environment setup and configuration
- **[Passkey Wallet](./docs/passkey-wallet.md)** - Creating and managing passkey wallets
- **[Gasless Transactions](./docs/gasless-transactions.md)** - How gasless transactions work
- **[Protocol Integrations](./docs/protocol-integrations.md)** - Jupiter swap & Metaplex Core examples

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@lazorkit/wallet-mobile-adapter` | ^1.5.1 | Lazorkit SDK for React Native |
| `@solana/web3.js` | ^1.98.0 | Solana JavaScript API |
| `@solana/spl-token` | ^0.4.13 | SPL Token operations |
| `expo-camera` | ~16.1.4 | QR code scanning |
| `expo-secure-store` | ~14.2.3 | Session persistence |
| `@metaplex-foundation/mpl-core` | Latest | NFT minting |

## Configuration

The app uses devnet by default. Configuration is in `src/config.ts`:

```typescript
export const CONFIG = {
    RPC_URL: 'https://api.devnet.solana.com',
    PAYMASTER_URL: 'https://kora.devnet.lazorkit.com',
};
```

For mainnet, update the endpoints and obtain an API key from Lazorkit.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Passkey not working | Ensure HTTPS or use Expo Go |
| Transaction fails with 0x2 | Clear app data and create new passkey |
| "Transaction too large" | Retry - SDK handles chunked transactions |
| "Chunk not found" | Retry logic will handle this automatically |

For more troubleshooting tips, see [Lazorkit Troubleshooting](https://docs.lazorkit.com/troubleshooting).

## Resources

- [Lazorkit Documentation](https://docs.lazorkit.com)
- [Lazorkit GitHub](https://github.com/lazor-kit/lazor-kit)
- [Lazorkit Telegram](https://t.me/lazorkit)
- [Solana Web3.js Docs](https://solana.com/developers/cookbook)

## License

MIT
