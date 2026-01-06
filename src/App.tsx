// Polyfills - MUST be at the very top
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

// Enable native screens with proper background
import { enableScreens } from 'react-native-screens';
enableScreens(true);

// Set native background color to prevent white flash
import * as SystemUI from 'expo-system-ui';
SystemUI.setBackgroundColorAsync('#09090B');

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LazorKitProvider, useWallet } from '@lazorkit/wallet-mobile-adapter';
import * as SecureStore from 'expo-secure-store';

// Screens
import { WelcomeScreen } from './screens/WelcomeScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { SendScreen } from './screens/SendScreen';
import { ReceiveScreen } from './screens/ReceiveScreen';
import { TipJarScreen } from './screens/TipJarScreen';
import { PaymentScreen } from './screens/PaymentScreen';
import { QRScanScreen, SolanaPayData } from './screens/QRScanScreen';
import { QRPaymentScreen } from './screens/QRPaymentScreen';
import { NFTGalleryScreen } from './screens/NFTGalleryScreen';
import { SwapScreen } from './screens/SwapScreen';

// Config
import { CONFIG, COLORS } from './config';

// Navigation types
export type RootStackParamList = {
    Welcome: undefined;
    Dashboard: undefined;
    Send: undefined;
    Receive: undefined;
    TipJar: undefined;
    Payment: undefined;
    QRScan: undefined;
    QRPayment: { paymentData: SolanaPayData };
    NFTGallery: undefined;
    Swap: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Storage keys
const WALLET_ADDRESS_KEY = 'lazorkit_wallet_address';

// Manual wallet state context
interface ManualWalletState {
    smartWallet: string | null;
    setSmartWallet: (address: string | null) => void;
    saveSession: (address: string) => Promise<void>;
    clearSession: () => Promise<void>;
}

const ManualWalletContext = createContext<ManualWalletState>({
    smartWallet: null,
    setSmartWallet: () => { },
    saveSession: async () => { },
    clearSession: async () => { },
});

export const useManualWallet = () => useContext(ManualWalletContext);

function AppContent() {
    const { wallet } = useWallet();
    const [manualSmartWallet, setManualSmartWallet] = useState<string | null>(null);
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [initialRoute, setInitialRoute] = useState<'Welcome' | 'Dashboard'>('Welcome');

    const smartWalletAddress = wallet?.smartWallet || manualSmartWallet;

    useEffect(() => {
        restoreSession();
    }, []);

    const restoreSession = async () => {
        try {
            const savedAddress = await SecureStore.getItemAsync(WALLET_ADDRESS_KEY);
            if (savedAddress) {
                setManualSmartWallet(savedAddress);
                setInitialRoute('Dashboard');
            }
        } catch (error) {
            console.error('[Session] Error restoring session:', error);
        } finally {
            setIsLoadingSession(false);
        }
    };

    const saveSession = async (address: string) => {
        try {
            await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, address);
            setManualSmartWallet(address);
        } catch (error) {
            console.error('[Session] Error saving session:', error);
        }
    };

    const clearSession = async () => {
        try {
            await SecureStore.deleteItemAsync(WALLET_ADDRESS_KEY);
            setManualSmartWallet(null);
        } catch (error) {
            console.error('[Session] Error clearing session:', error);
        }
    };

    if (isLoadingSession) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ManualWalletContext.Provider value={{
            smartWallet: smartWalletAddress,
            setSmartWallet: setManualSmartWallet,
            saveSession,
            clearSession,
        }}>
            <NavigationContainer
                theme={{
                    dark: true,
                    colors: {
                        primary: COLORS.primary,
                        background: COLORS.background,
                        card: COLORS.backgroundCard,
                        text: COLORS.text,
                        border: COLORS.border,
                        notification: COLORS.primary,
                    },
                    fonts: {
                        regular: { fontFamily: 'System', fontWeight: '400' },
                        medium: { fontFamily: 'System', fontWeight: '500' },
                        bold: { fontFamily: 'System', fontWeight: '700' },
                        heavy: { fontFamily: 'System', fontWeight: '800' },
                    },
                }}
            >
                <StatusBar style="light" />
                <Stack.Navigator
                    initialRouteName={initialRoute}
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: COLORS.background },
                        animation: 'none',
                        navigationBarColor: COLORS.background,
                    }}
                >
                    <Stack.Screen name="Welcome" component={WelcomeScreen} />
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
                    <Stack.Screen name="Send" component={SendScreen} />
                    <Stack.Screen name="Receive" component={ReceiveScreen} />
                    <Stack.Screen name="TipJar" component={TipJarScreen} />
                    <Stack.Screen name="Payment" component={PaymentScreen} />
                    <Stack.Screen name="QRScan" component={QRScanScreen} />
                    <Stack.Screen name="QRPayment" component={QRPaymentScreen} />
                    <Stack.Screen name="NFTGallery" component={NFTGalleryScreen} />
                    <Stack.Screen name="Swap" component={SwapScreen} />
                </Stack.Navigator>
            </NavigationContainer>
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
