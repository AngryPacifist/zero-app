// Zero App Configuration
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
    APP_SCHEME: 'zero-app',

    // Token mints (Devnet)
    TOKENS: {
        USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    },

    // Demo tip jar recipient
    TIP_JAR_RECIPIENT: '11111111111111111111111111111111',
};

// Zero color palette - Premium purple with depth
export const COLORS = {
    // Primary - Vibrant violet
    primary: '#7C3AED',
    primaryLight: '#A78BFA',
    primaryDark: '#5B21B6',
    primaryGlow: 'rgba(124, 58, 237, 0.3)',

    // Accent - Emerald
    accent: '#10B981',
    accentLight: '#34D399',

    // Background - Deep dark
    background: '#09090B',
    backgroundLight: '#18181B',
    backgroundCard: '#1C1C1F',
    backgroundElevated: '#27272A',

    // Text
    text: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',

    // Status
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',

    // Border
    border: '#27272A',
    borderLight: '#3F3F46',

    // Glass effect
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
};

// App branding
export const BRANDING = {
    name: 'Zero',
    symbol: 'Ø',
    tagline: 'Zero gas. Zero seed phrases. Zero friction.',
};
