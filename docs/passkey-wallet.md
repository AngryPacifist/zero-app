# Passkey Wallet Integration

This guide explains how to integrate passkey-based wallet creation and authentication using the Lazorkit SDK.

## What are Passkeys?

Passkeys are a modern authentication standard (FIDO2/WebAuthn) that replaces passwords and seed phrases:

| Feature | Traditional Wallets | Passkey Wallets |
|---------|--------------------|--------------------|
| Authentication | Seed phrase (12-24 words) | Biometric (Face ID, fingerprint) |
| Storage | User must backup | Synced via iCloud/Google |
| Security | Phishing vulnerable | Phishing resistant |
| UX | Complex | One-tap signing |

## How Lazorkit Passkeys Work

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Device                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │   Your App  │───▶│ Lazor Portal│───▶│  Biometric  │      │
│  │             │    │  (in iframe) │    │  Prompt     │      │
│  └─────────────┘    └─────────────┘    └─────────────┘      │
│                            │                                │
│                            ▼                                │
│                   ┌─────────────┐                          │
│                   │  P-256 Key  │                          │
│                   │  Generated  │                          │
│                   └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Solana Blockchain                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Smart Wallet Account (derived from passkey pubkey) │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

1. User taps "Create Wallet" in your app
2. Lazorkit opens a secure portal via iframe
3. Device prompts for biometric authentication
4. A P-256 keypair is generated and stored securely
5. A Solana smart wallet is derived from the passkey public key

## Implementation

### Step 1: Use the Wallet Hook

```typescript
import { useWallet } from '@lazorkit/wallet-mobile-adapter';

function MyComponent() {
    const { 
        createWallet, 
        signIn, 
        signAndSendTransaction, 
        wallet,
        disconnect 
    } = useWallet();
    
    // wallet.smartWallet contains the Solana address
    const walletAddress = wallet?.smartWallet;
}
```

### Step 2: Create a New Wallet

```typescript
const handleCreateWallet = async () => {
    try {
        await createWallet({
            onSuccess: (wallet) => {
                console.log('Wallet created:', wallet.smartWallet);
                // Navigate to dashboard
            },
            onFail: (error) => {
                console.error('Creation failed:', error);
            },
            redirectUrl: Linking.createURL('callback'),
        });
    } catch (error) {
        console.error('Error:', error);
    }
};
```

### Step 3: Sign In with Existing Passkey

```typescript
const handleSignIn = async () => {
    try {
        await signIn({
            onSuccess: (wallet) => {
                console.log('Signed in:', wallet.smartWallet);
            },
            onFail: (error) => {
                console.error('Sign in failed:', error);
            },
            redirectUrl: Linking.createURL('callback'),
        });
    } catch (error) {
        console.error('Error:', error);
    }
};
```

### Step 4: Disconnect

```typescript
const handleDisconnect = async () => {
    await disconnect();
    // Clear any locally stored state
};
```

## Session Persistence

The Lazorkit SDK doesn't persist sessions automatically. Implement your own using `expo-secure-store`:

```typescript
import * as SecureStore from 'expo-secure-store';

const WALLET_KEY = 'lazorkit_wallet_address';

// Save wallet after creation
async function saveWallet(address: string) {
    await SecureStore.setItemAsync(WALLET_KEY, address);
}

// Restore on app start
async function restoreWallet(): Promise<string | null> {
    return await SecureStore.getItemAsync(WALLET_KEY);
}

// Clear on disconnect
async function clearWallet() {
    await SecureStore.deleteItemAsync(WALLET_KEY);
}
```

## Deep Links and Callbacks

For the passkey flow to return to your app, configure deep linking:

```typescript
import * as Linking from 'expo-linking';

// In your wallet calls
redirectUrl: Linking.createURL('callback')

// This creates: exp://192.168.x.x:8081/--/callback
```

The SDK uses this URL to redirect back after authentication.

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `0x2` | Passkey/wallet mismatch | Clear portal cache, create new passkey |
| WebAuthn not available | HTTP context | Use HTTPS or Expo Go |
| Sign-in fails | Old passkey data | Clear `localStorage` on portal.lazor.sh |

### Handling the 0x2 Error

```typescript
const handleClearData = async () => {
    // Clear local storage
    await SecureStore.deleteItemAsync(WALLET_KEY);
    
    // Direct user to clear portal data
    await WebBrowser.openBrowserAsync('https://portal.lazor.sh');
    
    Alert.alert(
        'Clear Site Data',
        'In your browser, go to Settings > Clear Site Data, then return and create a new passkey.'
    );
};
```

## Multi-Device Support

Passkeys support two recovery mechanisms:

### 1. Cloud-Synced Passkeys
- Automatically backed up to iCloud Keychain (Apple) or Google Password Manager
- Accessible on any device with the same account

### 2. Hardware-Bound Recovery
- Register additional devices as backups
- Primary device must approve backup registration

## Full Example

See [WelcomeScreen.tsx](../src/screens/WelcomeScreen.tsx) for a complete implementation including:
- Create wallet button
- Sign in button  
- Error handling
- Session restoration
- Clear data fallback

## Next Steps

- [Gasless Transactions](./gasless-transactions.md) - Sign and send transactions without paying gas
- [Protocol Integrations](./protocol-integrations.md) - Build more complex transactions
