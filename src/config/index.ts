// App configuration
export const CONFIG = {
    // Solana network
    RPC_URL: 'https://api.devnet.solana.com',

    // Lazorkit portal
    PORTAL_URL: 'https://portal.lazor.sh',

    // Paymaster for gasless transactions
    PAYMASTER: {
        paymasterUrl: 'https://kora.devnet.lazorkit.com',
    },

    // Deep link scheme for passkey callbacks
    // Note: Use Linking.createURL('callback') for proper URL in components
    APP_SCHEME: 'lazorkit-demo',

    // Token mints (Devnet)
    TOKENS: {
        USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Devnet USDC
    },

    // Demo tip jar recipient (can be changed)
    TIP_JAR_RECIPIENT: '11111111111111111111111111111111', // Placeholder - update with real address
};

// Colors for the app theme
export const COLORS = {
    // Primary gradient
    primary: '#6366f1',
    primaryLight: '#818cf8',
    primaryDark: '#4f46e5',

    // Accent
    accent: '#22c55e',
    accentLight: '#4ade80',

    // Background
    background: '#0a0a0f',
    backgroundLight: '#18181b',
    backgroundCard: '#1f1f28',

    // Text
    text: '#ffffff',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',

    // Status
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',

    // Border
    border: '#27272a',
    borderLight: '#3f3f46',
};
