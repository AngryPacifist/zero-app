import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    AppState,
    AppStateStatus,
    Alert,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { COLORS, BRANDING } from '../config';

const { width } = Dimensions.get('window');

interface WelcomeScreenProps {
    onWalletCreated: (walletAddress?: string) => void;
}

export function WelcomeScreen({ onWalletCreated }: WelcomeScreenProps) {
    const { connect, wallet } = useWallet();
    const [isConnecting, setIsConnecting] = useState(false);

    // Get the proper redirect URL using expo-linking
    const redirectUrl = Linking.createURL('callback');

    // Watch for wallet changes - when wallet appears, we're connected
    React.useEffect(() => {
        if (wallet?.smartWallet) {
            console.log('Wallet connected!', wallet.smartWallet);
            setIsConnecting(false);
            onWalletCreated();
        }
    }, [wallet]);

    // Reset loading state when app comes back to foreground
    React.useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                // Give SDK a moment to process the redirect
                setTimeout(() => {
                    // If still no wallet after coming back, reset loading
                    if (!wallet?.smartWallet && isConnecting) {
                        console.log('App returned to foreground, checking wallet state...');
                    }
                }, 1000);
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [wallet, isConnecting]);

    const handleCreateWallet = async () => {
        if (isConnecting) return;

        setIsConnecting(true);
        console.log('Starting connection with redirect URL:', redirectUrl);

        try {
            await connect({
                redirectUrl,
                onSuccess: (connectedWallet) => {
                    console.log('Connect success callback:', connectedWallet.smartWallet);
                    setIsConnecting(false);
                    onWalletCreated(connectedWallet.smartWallet);
                },
                onFail: (error) => {
                    console.error('Connect failed:', error);
                    setIsConnecting(false);
                },
            });
        } catch (error) {
            console.error('Connection error:', error);
            setIsConnecting(false);
        }
    };

    const handleResetState = () => {
        setIsConnecting(false);
    };

    const handleClearData = async () => {
        Alert.alert(
            'Clear All Data',
            'This will clear your saved session and portal cache. You will need to create a new passkey.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Clear our saved session
                            await SecureStore.deleteItemAsync('lazorkit_wallet_address');
                            // Open portal to clear its cache
                            await WebBrowser.openBrowserAsync('https://portal.lazor.sh');
                            Alert.alert(
                                'Next Steps',
                                '1. In the browser, clear site data\n2. Return to app\n3. Tap "Create Wallet" for a fresh start'
                            );
                        } catch (error) {
                            console.error('Error clearing data:', error);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.background, COLORS.backgroundLight, COLORS.background]}
                style={styles.gradient}
            >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    {/* Decorative circles */}
                    <View style={styles.decorativeCircle1} />
                    <View style={styles.decorativeCircle2} />

                    {/* Logo/Icon area */}
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../assets/icon.png')}
                            style={styles.logoImage}
                        />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{BRANDING.name}</Text>
                    <Text style={styles.subtitle}>{BRANDING.tagline}</Text>
                </View>

                {/* Features */}
                <View style={styles.featuresSection}>
                    <FeatureItem
                        icon="finger-print-outline"
                        title="Passkey Security"
                        description="Your device is your wallet"
                    />
                    <FeatureItem
                        icon="flash-outline"
                        title="Zero Gas Fees"
                        description="Transactions are sponsored"
                    />
                    <FeatureItem
                        icon="key-outline"
                        title="No Seed Phrases"
                        description="Nothing to lose or forget"
                    />
                </View>

                {/* CTA Section */}
                <View style={styles.ctaSection}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleCreateWallet}
                        disabled={isConnecting}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.primaryDark]}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.buttonText}>
                                {isConnecting ? 'Connecting...' : 'Create Wallet'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {isConnecting ? (
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={handleResetState}
                        >
                            <Text style={styles.secondaryButtonText}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={handleCreateWallet}
                        >
                            <Text style={styles.secondaryButtonText}>
                                I already have a wallet
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>


                {/* Footer */}
                <Text style={styles.footer}>
                    Powered by Lazorkit SDK
                </Text>
            </LinearGradient>
        </View>
    );
}

interface FeatureItemProps {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
    return (
        <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
                <Ionicons name={icon} size={24} color={COLORS.primary} />
            </View>
            <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDescription}>{description}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    gradient: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 48,
        position: 'relative',
    },
    decorativeCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: COLORS.primary,
        opacity: 0.1,
        top: -50,
        left: -50,
    },
    decorativeCircle2: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: COLORS.accent,
        opacity: 0.08,
        top: 20,
        right: -30,
    },
    logoContainer: {
        marginBottom: 24,
    },
    logoImage: {
        width: 80,
        height: 80,
        borderRadius: 20,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 24,
        color: COLORS.textSecondary,
        fontWeight: '300',
    },
    featuresSection: {
        marginBottom: 48,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    featureIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: COLORS.glass,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    featureDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    ctaSection: {
        marginTop: 'auto',
    },
    primaryButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    buttonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    secondaryButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    debugSection: {
        marginTop: 16,
        alignItems: 'center',
    },
    debugText: {
        fontSize: 10,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
    clearDataText: {
        fontSize: 12,
        color: COLORS.error,
        textAlign: 'center',
        marginTop: 8,
        textDecorationLine: 'underline',
    },
    footer: {
        textAlign: 'center',
        color: COLORS.textMuted,
        fontSize: 12,
        marginTop: 24,
    },
});
