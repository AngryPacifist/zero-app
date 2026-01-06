// Type declarations for @lazorkit/wallet-mobile-adapter
// Based on the official documentation at https://docs.lazorkit.com/react-native-sdk
declare module '@lazorkit/wallet-mobile-adapter' {
    import { ReactNode } from 'react';
    import { TransactionInstruction, AddressLookupTableAccount } from '@solana/web3.js';

    // WalletInfo as per docs
    export interface WalletInfo {
        readonly credentialId: string;
        readonly passkeyPubkey: number[];
        readonly smartWallet: string;
        readonly walletDevice: string;
        readonly platform: string;
    }

    // Sign options
    export interface SignOptions {
        redirectUrl: string;
        onSuccess?: (result: any) => void;
        onFail?: (error: Error) => void;
    }

    // Transaction payload
    export interface SignAndSendTransactionPayload {
        readonly instructions: TransactionInstruction[];
        readonly transactionOptions: {
            readonly feeToken?: string;
            readonly addressLookupTableAccounts?: AddressLookupTableAccount[];
            readonly computeUnitLimit?: number;
            readonly clusterSimulation: 'devnet' | 'mainnet';
        };
    }

    // Connect options
    export interface ConnectOptions {
        redirectUrl: string;
        onSuccess?: (wallet: WalletInfo) => void;
        onFail?: (error: Error) => void;
    }

    // Disconnect options
    export interface DisconnectOptions {
        onSuccess?: () => void;
        onFail?: (error: Error) => void;
    }

    // useWallet hook return type
    export interface UseWalletReturn {
        connect: (options: ConnectOptions) => Promise<void>;
        disconnect: (options?: DisconnectOptions) => Promise<void>;
        signMessage: (message: string, options: SignOptions) => Promise<{ signature: string; signedPayload: string }>;
        signAndSendTransaction: (
            payload: SignAndSendTransactionPayload,
            options: SignOptions
        ) => Promise<string>;
        wallet: WalletInfo | null;
    }

    export function useWallet(): UseWalletReturn;

    // Provider props
    export interface LazorKitProviderProps {
        rpcUrl?: string;
        portalUrl?: string;
        configPaymaster?: {
            paymasterUrl: string;
            apiKey?: string;
        };
        isDebug?: boolean;
        children: ReactNode;
    }

    export function LazorKitProvider(props: LazorKitProviderProps): JSX.Element;
}
