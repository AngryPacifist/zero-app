/**
 * NFT Utilities using Metaplex Core
 * Creates instructions compatible with Lazorkit's signAndSendTransaction
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
    create as createAsset,
    mplCore,
} from '@metaplex-foundation/mpl-core';
import {
    generateSigner,
    publicKey,
    createNoopSigner,
    signerIdentity,
} from '@metaplex-foundation/umi';
import {
    toWeb3JsInstruction,
    toWeb3JsKeypair,
} from '@metaplex-foundation/umi-web3js-adapters';
import { TransactionInstruction, Keypair } from '@solana/web3.js';
import { CONFIG } from '../config';

export interface MintNFTResult {
    instructions: TransactionInstruction[];
    assetAddress: string;
    assetKeypair: Keypair;
}

/**
 * Create a configured Umi instance for a specific wallet
 * Uses a noop signer since Lazorkit handles actual signing
 */
function createConfiguredUmi(walletAddress: string) {
    const umi = createUmi(CONFIG.RPC_URL)
        .use(mplCore())
        .use(signerIdentity(createNoopSigner(publicKey(walletAddress))));
    return umi;
}

/**
 * Build instructions for minting a Metaplex Core NFT
 * Returns web3.js compatible instructions for Lazorkit
 */
export async function buildMintNFTInstructions(
    ownerAddress: string,
    metadataUri: string,
    name: string,
    options: {
        soulbound?: boolean;
    } = {}
): Promise<MintNFTResult> {
    // Create Umi instance configured for this wallet
    const umi = createConfiguredUmi(ownerAddress);

    // Generate a new keypair for the asset account
    const assetSigner = generateSigner(umi);

    // Build the create instruction with optional plugins
    const plugins: any[] = [];

    // Add soulbound plugin if requested
    if (options.soulbound) {
        plugins.push({
            type: 'PermanentFreezeDelegate',
            frozen: true,
            authority: { type: 'None' },
        });
    }

    // Build the transaction
    const builder = createAsset(umi, {
        asset: assetSigner,
        name: name,
        uri: metadataUri,
        owner: publicKey(ownerAddress),
        plugins: plugins.length > 0 ? plugins : undefined,
    });

    // Get Umi instructions
    const umiInstructions = builder.getInstructions();

    // Convert to Web3.js instructions
    const web3Instructions = umiInstructions.map(toWeb3JsInstruction);

    // Get the asset keypair for signing
    const assetKeypair = toWeb3JsKeypair(assetSigner);

    return {
        instructions: web3Instructions,
        assetAddress: assetSigner.publicKey.toString(),
        assetKeypair: assetKeypair,
    };
}
