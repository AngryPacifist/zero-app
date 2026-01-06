/**
 * Jupiter Swap Utilities
 * Uses Jupiter's Quote and Swap Instructions API
 * Returns raw instructions compatible with Lazorkit
 */

import { TransactionInstruction, PublicKey, AddressLookupTableAccount, Connection } from '@solana/web3.js';
import { CONFIG } from '../config';

// Jupiter API base URL
const JUPITER_API_BASE = 'https://api.jup.ag/swap/v1';

// Common token mints on devnet and mainnet
export const TOKENS = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC_MAINNET: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDC_DEVNET: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    BONK_MAINNET: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
};

export interface SwapQuote {
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    priceImpactPct: string;
    routePlan: Array<{
        swapInfo: {
            label: string;
        };
    }>;
    contextSlot: number;
    timeTaken: number;
}

export interface SwapInstructionsResponse {
    setupInstructions: InstructionData[];
    swapInstruction: InstructionData;
    cleanupInstruction?: InstructionData;
    addressLookupTableAddresses: string[];
}

interface InstructionData {
    programId: string;
    accounts: Array<{
        pubkey: string;
        isSigner: boolean;
        isWritable: boolean;
    }>;
    data: string;
}

/**
 * Get a swap quote from Jupiter
 */
export async function getSwapQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50
): Promise<SwapQuote> {
    const url = new URL(`${JUPITER_API_BASE}/quote`);
    url.searchParams.set('inputMint', inputMint);
    url.searchParams.set('outputMint', outputMint);
    url.searchParams.set('amount', amount.toString());
    url.searchParams.set('slippageBps', slippageBps.toString());

    const response = await fetch(url.toString());

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Jupiter quote failed: ${error}`);
    }

    return response.json();
}

/**
 * Get swap instructions from Jupiter
 * Returns raw instructions that can be passed to Lazorkit
 */
export async function getSwapInstructions(
    quote: SwapQuote,
    userPublicKey: string
): Promise<SwapInstructionsResponse> {
    const response = await fetch(`${JUPITER_API_BASE}/swap-instructions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: userPublicKey,
            wrapAndUnwrapSol: true,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Jupiter swap-instructions failed: ${error}`);
    }

    return response.json();
}

/**
 * Deserialize instruction data from Jupiter format to TransactionInstruction
 */
function deserializeInstruction(instruction: InstructionData): TransactionInstruction {
    return new TransactionInstruction({
        programId: new PublicKey(instruction.programId),
        keys: instruction.accounts.map(account => ({
            pubkey: new PublicKey(account.pubkey),
            isSigner: account.isSigner,
            isWritable: account.isWritable,
        })),
        data: Buffer.from(instruction.data, 'base64'),
    });
}

/**
 * Build all swap instructions for Lazorkit
 */
export async function buildSwapInstructions(
    inputMint: string,
    outputMint: string,
    amountLamports: number,
    userPublicKey: string,
    slippageBps: number = 50
): Promise<{
    instructions: TransactionInstruction[];
    quote: SwapQuote;
}> {
    // Get quote
    const quote = await getSwapQuote(inputMint, outputMint, amountLamports, slippageBps);

    // Get instructions
    const swapInstructionsResponse = await getSwapInstructions(quote, userPublicKey);

    // Convert to TransactionInstruction objects
    const instructions: TransactionInstruction[] = [];

    // Add setup instructions
    if (swapInstructionsResponse.setupInstructions) {
        for (const ix of swapInstructionsResponse.setupInstructions) {
            instructions.push(deserializeInstruction(ix));
        }
    }

    // Add swap instruction
    instructions.push(deserializeInstruction(swapInstructionsResponse.swapInstruction));

    // Add cleanup instruction if present
    if (swapInstructionsResponse.cleanupInstruction) {
        instructions.push(deserializeInstruction(swapInstructionsResponse.cleanupInstruction));
    }

    return { instructions, quote };
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: string, decimals: number): string {
    const num = parseInt(amount) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, { maximumFractionDigits: decimals > 6 ? 6 : decimals });
}
