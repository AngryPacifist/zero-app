import { Connection, PublicKey } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createTransferInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { CONFIG } from '../config';

// Token info interface
export interface TokenInfo {
    mint: string;
    symbol: string;
    name: string;
    balance: number;
    decimals: number;
    logoUri?: string;
}

// SOL as a "token" for unified handling
export const SOL_TOKEN: TokenInfo = {
    mint: 'SOL',
    symbol: 'SOL',
    name: 'Solana',
    balance: 0,
    decimals: 9,
    logoUri: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
};

// Known devnet tokens for display names
const KNOWN_TOKENS: Record<string, { symbol: string; name: string; logoUri?: string }> = {
    // Devnet USDC
    '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': {
        symbol: 'USDC',
        name: 'USD Coin (Devnet)',
    },
    // Add more known tokens as needed
};

/**
 * Fetch user's SOL balance
 */
export async function fetchSolBalance(walletAddress: string): Promise<number> {
    try {
        const connection = new Connection(CONFIG.RPC_URL);
        const pubkey = new PublicKey(walletAddress);
        const balance = await connection.getBalance(pubkey);
        return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
        console.error('Error fetching SOL balance:', error);
        return 0;
    }
}

/**
 * Fetch all SPL token accounts for a wallet
 */
export async function fetchUserTokens(walletAddress: string): Promise<TokenInfo[]> {
    try {
        const connection = new Connection(CONFIG.RPC_URL);
        const pubkey = new PublicKey(walletAddress);

        // Get all token accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
            programId: TOKEN_PROGRAM_ID,
        });

        const tokens: TokenInfo[] = [];

        for (const account of tokenAccounts.value) {
            const parsedInfo = account.account.data.parsed.info;
            const mintAddress = parsedInfo.mint;
            const balance = parsedInfo.tokenAmount.uiAmount || 0;
            const decimals = parsedInfo.tokenAmount.decimals;

            // Skip zero balance tokens
            if (balance === 0) continue;

            // Get known token info or use defaults
            const knownToken = KNOWN_TOKENS[mintAddress];

            tokens.push({
                mint: mintAddress,
                symbol: knownToken?.symbol || mintAddress.slice(0, 4) + '...',
                name: knownToken?.name || 'Unknown Token',
                balance,
                decimals,
                logoUri: knownToken?.logoUri,
            });
        }

        return tokens;
    } catch (error) {
        console.error('Error fetching user tokens:', error);
        return [];
    }
}

/**
 * Build SPL token transfer instruction
 */
export async function buildTokenTransferInstruction(
    senderWallet: string,
    recipientWallet: string,
    mintAddress: string,
    amount: number,
    decimals: number
) {
    const connection = new Connection(CONFIG.RPC_URL);
    const senderPubkey = new PublicKey(senderWallet);
    const recipientPubkey = new PublicKey(recipientWallet);
    const mintPubkey = new PublicKey(mintAddress);

    // Get associated token accounts
    const senderAta = await getAssociatedTokenAddress(
        mintPubkey,
        senderPubkey,
        true // Allow owner off curve (for smart wallets)
    );

    const recipientAta = await getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey,
        true
    );

    // Convert amount to token units
    const tokenAmount = Math.floor(amount * Math.pow(10, decimals));

    // Create transfer instruction
    const instruction = createTransferInstruction(
        senderAta,
        recipientAta,
        senderPubkey,
        tokenAmount
    );

    return instruction;
}

/**
 * Format token balance for display
 */
export function formatTokenBalance(balance: number, decimals: number = 9): string {
    if (balance === 0) return '0';
    if (balance < 0.0001) return '<0.0001';
    return balance.toFixed(Math.min(decimals, 4));
}
