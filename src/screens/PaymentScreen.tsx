import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '../config';
import { formatAddress } from '../utils/solana';
import { useManualWallet } from '../App';

interface PaymentScreenProps {
    onBack: () => void;
}

// Demo product
const DEMO_PRODUCT = {
    name: 'Premium NFT Access Pass',
    description: 'Exclusive access to the Lazorkit community and early features',
    price: 0.0001, // SOL - small amount for testing
    merchant: 'BVsfLRjj5LBYUxE39cr8uQF99BU1LxYUon4AqEEQhBxX',
    merchantName: 'Lazorkit Store',
};

export function PaymentScreen({ onBack }: PaymentScreenProps) {
    const { signAndSendTransaction, wallet } = useWallet();
    const { smartWallet: manualSmartWallet } = useManualWallet();

    // Use SDK wallet or manual wallet as fallback
    const walletAddress = wallet?.smartWallet || manualSmartWallet;

    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const copySignature = async () => {
        if (txSignature) {
            await Clipboard.setStringAsync(txSignature);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const openExplorer = async () => {
        if (txSignature) {
            const url = `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;
            await WebBrowser.openBrowserAsync(url);
        }
    };

    const handlePayment = async () => {
        if (!walletAddress) return;

        setStatus('processing');
        setTxSignature(null);

        try {
            const lamports = Math.floor(DEMO_PRODUCT.price * LAMPORTS_PER_SOL);

            const instruction = SystemProgram.transfer({
                fromPubkey: new PublicKey(walletAddress),
                toPubkey: new PublicKey(DEMO_PRODUCT.merchant),
                lamports,
            });

            await signAndSendTransaction(
                {
                    instructions: [instruction],
                    transactionOptions: {
                        clusterSimulation: 'devnet',
                    },
                },
                {
                    redirectUrl: Linking.createURL('cb'),
                    onSuccess: (sig) => {
                        setTxSignature(sig);
                        setStatus('success');
                    },
                    onFail: (error) => {
                        console.error('Payment failed:', error);
                        setStatus('error');
                        Alert.alert('Payment Failed', 'Please try again.');
                    },
                }
            );
        } catch (error) {
            console.error('Payment error:', error);
            setStatus('error');
        }
    };

    const resetPayment = () => {
        setStatus('idle');
        setTxSignature(null);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Pay with Solana</Text>
                <View style={{ width: 60 }} />
            </View>

            {status === 'success' ? (
                // Success state
                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <Text style={styles.successEmoji}>🎉</Text>
                    </View>
                    <Text style={styles.successTitle}>Payment Complete!</Text>
                    <Text style={styles.successSubtitle}>
                        Thank you for your purchase
                    </Text>

                    <View style={styles.receiptCard}>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Item</Text>
                            <Text style={styles.receiptValue}>{DEMO_PRODUCT.name}</Text>
                        </View>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Amount</Text>
                            <Text style={styles.receiptValue}>{DEMO_PRODUCT.price} SOL</Text>
                        </View>
                        <View style={styles.receiptRow}>
                            <Text style={styles.receiptLabel}>Merchant</Text>
                            <Text style={styles.receiptValue}>{DEMO_PRODUCT.merchantName}</Text>
                        </View>
                        <View style={styles.receiptDivider} />
                        <TouchableOpacity style={styles.receiptRow} onPress={copySignature}>
                            <Text style={styles.receiptLabel}>
                                {copied ? '✓ Copied!' : 'Transaction (tap)'}
                            </Text>
                            <Text style={[styles.receiptValue, styles.mono]}>
                                {formatAddress(txSignature || '', 8)}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.explorerButton} onPress={openExplorer}>
                        <Text style={styles.explorerText}>View on Solana Explorer ↗</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.doneButton}
                        onPress={resetPayment}
                    >
                        <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Product Display */}
                    <View style={styles.productCard}>
                        <View style={styles.productImage}>
                            <LinearGradient
                                colors={[COLORS.primary, COLORS.primaryDark]}
                                style={styles.productImageGradient}
                            >
                                <Text style={styles.productEmoji}>🎫</Text>
                            </LinearGradient>
                        </View>
                        <Text style={styles.productName}>{DEMO_PRODUCT.name}</Text>
                        <Text style={styles.productDescription}>{DEMO_PRODUCT.description}</Text>

                        <View style={styles.priceTag}>
                            <Text style={styles.priceLabel}>Price</Text>
                            <Text style={styles.priceValue}>{DEMO_PRODUCT.price} SOL</Text>
                        </View>
                    </View>

                    {/* Merchant info */}
                    <View style={styles.merchantInfo}>
                        <Text style={styles.merchantLabel}>Paying to</Text>
                        <View style={styles.merchantRow}>
                            <View style={styles.merchantAvatar}>
                                <Text>🏪</Text>
                            </View>
                            <View>
                                <Text style={styles.merchantName}>{DEMO_PRODUCT.merchantName}</Text>
                                <Text style={styles.merchantAddress}>
                                    {formatAddress(DEMO_PRODUCT.merchant, 6)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Payment Widget Demo */}
                    <View style={styles.widgetContainer}>
                        <Text style={styles.widgetLabel}>Payment Widget Preview</Text>

                        <View style={styles.widget}>
                            <View style={styles.widgetHeader}>
                                <Text style={styles.widgetLogo}>⚡ Solana Pay</Text>
                            </View>

                            <View style={styles.widgetBody}>
                                <Text style={styles.widgetAmount}>{DEMO_PRODUCT.price} SOL</Text>
                                <Text style={styles.widgetMerchant}>
                                    → {DEMO_PRODUCT.merchantName}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.payButton}
                                onPress={handlePayment}
                                disabled={status === 'processing' || !walletAddress}
                            >
                                <LinearGradient
                                    colors={[COLORS.primary, COLORS.primaryDark]}
                                    style={styles.payButtonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {status === 'processing' ? (
                                        <ActivityIndicator color={COLORS.text} />
                                    ) : (
                                        <>
                                            <Text style={styles.payButtonText}>🔐 Pay with Passkey</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            <Text style={styles.widgetFooter}>
                                Secured by Lazorkit • Gasless
                            </Text>
                        </View>
                    </View>

                    {/* Info */}
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>How it works</Text>
                        <Text style={styles.infoText}>
                            1. Tap "Pay with Passkey"{'\n'}
                            2. Authenticate with Face ID / Touch ID{'\n'}
                            3. Transaction sent instantly (no gas fees!)
                        </Text>
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 24,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
    },
    backText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
    },
    productCard: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    productImage: {
        marginBottom: 16,
    },
    productImageGradient: {
        width: 100,
        height: 100,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    productEmoji: {
        fontSize: 50,
    },
    productName: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    productDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 16,
    },
    priceTag: {
        backgroundColor: COLORS.backgroundLight,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginRight: 8,
    },
    priceValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.accent,
    },
    merchantInfo: {
        marginBottom: 24,
    },
    merchantLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 8,
    },
    merchantRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    merchantAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.backgroundCard,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    merchantName: {
        fontSize: 16,
        fontWeight: '500',
        color: COLORS.text,
    },
    merchantAddress: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontFamily: 'monospace',
    },
    widgetContainer: {
        marginBottom: 24,
    },
    widgetLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 8,
        textAlign: 'center',
    },
    widget: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    widgetHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    widgetLogo: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    widgetBody: {
        alignItems: 'center',
        marginBottom: 20,
    },
    widgetAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    widgetMerchant: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    payButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
    },
    payButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    payButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    widgetFooter: {
        textAlign: 'center',
        fontSize: 11,
        color: COLORS.textMuted,
    },
    infoBox: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    infoText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 20,
    },
    // Success styles
    successContainer: {
        alignItems: 'center',
        paddingTop: 40,
    },
    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${COLORS.success}20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successEmoji: {
        fontSize: 50,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 32,
    },
    receiptCard: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 16,
        padding: 20,
        width: '100%',
        marginBottom: 24,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    receiptLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    receiptValue: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    receiptDivider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 12,
    },
    mono: {
        fontFamily: 'monospace',
    },
    explorerButton: {
        marginBottom: 16,
    },
    explorerText: {
        color: COLORS.primary,
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    doneButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 12,
    },
    doneText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
});
