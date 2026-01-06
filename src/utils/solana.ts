import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CONFIG } from '../config';

// Create connection to Solana
export const connection = new Connection(CONFIG.RPC_URL, 'confirmed');

/**
 * Get SOL balance for an address
 */
export async function getSolBalance(address: string): Promise<number> {
    try {
        const pubkey = new PublicKey(address);
        const balance = await connection.getBalance(pubkey);
        return balance / LAMPORTS_PER_SOL;
    } catch (error) {
        console.error('Error fetching SOL balance:', error);
        return 0;
    }
}

/**
 * Format address for display (truncate middle)
 */
export function formatAddress(address: string, chars: number = 4): string {
    if (!address || address.length < chars * 2 + 3) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format SOL amount for display
 */
export function formatSol(amount: number, decimals: number = 4): string {
    return amount.toFixed(decimals);
}

/**
 * Validate a Solana address
 */
export function isValidAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
    return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
    return lamports / LAMPORTS_PER_SOL;
}
