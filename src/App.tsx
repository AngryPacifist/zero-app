// Polyfills - MUST be at the very top
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus, ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LazorKitProvider, useWallet } from '@lazorkit/wallet-mobile-adapter';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

// Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { SendScreen } from './screens/SendScreen';
import { TipJarScreen } from './screens/TipJarScreen';
import { PaymentScreen } from './screens/PaymentScreen';
import { QRScanScreen, SolanaPayData } from './screens/QRScanScreen';
import { QRPaymentScreen } from './screens/QRPaymentScreen';
import { NFTGalleryScreen } from './screens/NFTGalleryScreen';
import { SwapScreen } from './screens/SwapScreen';

// Config
import { CONFIG, COLORS } from './config';

type Screen = 'welcome' | 'dashboard' | 'send' | 'tipjar' | 'payment' | 'qrscan' | 'qrpay' | 'nftgallery' | 'swap';

// Storage keys
const WALLET_ADDRESS_KEY = 'lazorkit_wallet_address';

// Manual wallet state context (workaround for SDK state not updating)
interface ManualWalletState {
    smartWallet: string | null;
    setSmartWallet: (address: string | null) => void;
}

const ManualWalletContext = createContext<ManualWalletState>({
    smartWallet: null,
    setSmartWallet: () => { },
});

export const useManualWallet = () => useContext(ManualWalletContext);

function AppContent() {
    const { wallet } = useWallet();
    const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
    const [manualSmartWallet, setManualSmartWallet] = useState<string | null>(null);
    const [isLoadingSession, setIsLoadingSession] = useState(true);

    // Try to get wallet address from either SDK or manual state
    const smartWalletAddress = wallet?.smartWallet || manualSmartWallet;

    // Restore session on app launch
    useEffect(() => {
        restoreSession();
    }, []);

    const restoreSession = async () => {
        try {
            console.log('[Session] Attempting to restore saved session...');
            const savedAddress = await SecureStore.getItemAsync(WALLET_ADDRESS_KEY);

            if (savedAddress) {
                console.log('[Session] ✓ Found saved wallet:', savedAddress);
                setManualSmartWallet(savedAddress);
                setCurrentScreen('dashboard');
            } else {
                console.log('[Session] No saved session found');
            }
        } catch (error) {
            console.error('[Session] Error restoring session:', error);
        } finally {
            setIsLoadingSession(false);
        }
    };

    const saveSession = async (address: string) => {
        try {
            console.log('[Session] Saving wallet address:', address);
            await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, address);
            console.log('[Session] ✓ Wallet address saved');
        } catch (error) {
            console.error('[Session] Error saving session:', error);
        }
    };

    const clearSession = async () => {
        try {
            console.log('[Session] Clearing saved session...');
            await SecureStore.deleteItemAsync(WALLET_ADDRESS_KEY);
            console.log('[Session] ✓ Session cleared');
        } catch (error) {
            console.error('[Session] Error clearing session:', error);
        }
    };

    // Watch for wallet state (from SDK or manual)
    useEffect(() => {
        console.log('[App] useEffect - wallet changed:', wallet?.smartWallet);
        console.log('[App] useEffect - manualSmartWallet:', manualSmartWallet);

        if (smartWalletAddress && currentScreen === 'welcome') {
            console.log('[App] ✓ Wallet connected! Navigating to dashboard');
            console.log('[App] Wallet address:', smartWalletAddress);
            setCurrentScreen('dashboard');
        }
    }, [wallet, manualSmartWallet, smartWalletAddress, currentScreen]);

    // Handle wallet created - receives address from onSuccess callback
    const handleWalletCreated = useCallback(async (walletAddress?: string) => {
        console.log('[App] handleWalletCreated called with:', walletAddress);

        if (walletAddress) {
            console.log('[App] ✓ Setting manual wallet address:', walletAddress);
            setManualSmartWallet(walletAddress);
            await saveSession(walletAddress); // Save to secure storage
            setCurrentScreen('dashboard');
        }
    }, []);

    const handleDisconnect = useCallback(async () => {
        console.log('[App] handleDisconnect called');
        setManualSmartWallet(null);
        await clearSession(); // Clear from secure storage
        setCurrentScreen('welcome');
    }, []);

    const handleNavigate = useCallback((screen: 'send' | 'tipjar' | 'payment' | 'qrscan' | 'nftgallery' | 'swap') => {
        setCurrentScreen(screen);
    }, []);

    const handleBack = useCallback(() => {
        setCurrentScreen('dashboard');
    }, []);

    // QR Payment state
    const [qrPaymentData, setQrPaymentData] = useState<SolanaPayData | null>(null);

    const handleQRPaymentScanned = useCallback((data: SolanaPayData) => {
        console.log('[App] QR Payment scanned:', data);
        setQrPaymentData(data);
        setCurrentScreen('qrpay');
    }, []);

    const handleQRPaymentComplete = useCallback(() => {
        setQrPaymentData(null);
        setCurrentScreen('dashboard');
    }, []);

    // Show loading while restoring session
    if (isLoadingSession) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Render current screen
    const renderScreen = () => {
        switch (currentScreen) {
            case 'welcome':
                return <WelcomeScreen onWalletCreated={handleWalletCreated} />;

            case 'dashboard':
                return (
                    <DashboardScreen
                        onNavigate={handleNavigate}
                        onDisconnect={handleDisconnect}
                    />
                );

            case 'send':
                return <SendScreen onBack={handleBack} />;

            case 'tipjar':
                return <TipJarScreen onBack={handleBack} />;

            case 'payment':
                return <PaymentScreen onBack={handleBack} />;

            case 'qrscan':
                return (
                    <QRScanScreen
                        onBack={handleBack}
                        onPaymentScanned={handleQRPaymentScanned}
                    />
                );

            case 'qrpay':
                return qrPaymentData ? (
                    <QRPaymentScreen
                        paymentData={qrPaymentData}
                        onBack={() => setCurrentScreen('qrscan')}
                        onComplete={handleQRPaymentComplete}
                    />
                ) : (
                    <DashboardScreen
                        onNavigate={handleNavigate}
                        onDisconnect={handleDisconnect}
                    />
                );

            case 'nftgallery':
                return <NFTGalleryScreen onBack={handleBack} />;

            case 'swap':
                return <SwapScreen onBack={handleBack} />;

            default:
                return <WelcomeScreen onWalletCreated={handleWalletCreated} />;
        }
    };

    return (
        <ManualWalletContext.Provider value={{
            smartWallet: smartWalletAddress,
            setSmartWallet: setManualSmartWallet
        }}>
            <StatusBar style="light" />
            {renderScreen()}
        </ManualWalletContext.Provider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
});

export default function App() {
    return (
        <SafeAreaProvider>
            <LazorKitProvider
                rpcUrl={CONFIG.RPC_URL}
                portalUrl={CONFIG.PORTAL_URL}
                configPaymaster={CONFIG.PAYMASTER}
                isDebug={true}
            >
                <AppContent />
            </LazorKitProvider>
        </SafeAreaProvider>
    );
}
