import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
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
import { SolanaPayData } from './QRScanScreen';

interface QRPaymentScreenProps {
    paymentData: SolanaPayData;
    onBack: () => void;
    onComplete: () => void;
}

export function QRPaymentScreen({ paymentData, onBack, onComplete }: QRPaymentScreenProps) {
    const { signAndSendTransaction } = useWallet();
    const { smartWallet } = useManualWallet();
    const walletAddress = smartWallet;

    const [amount, setAmount] = useState(paymentData.amount?.toString() || '');
    const [isLoading, setIsLoading] = useState(false);
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const isAmountFixed = paymentData.amount !== undefined;
    const isValidAmount = parseFloat(amount) > 0;

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

    const handlePay = async () => {
        if (!walletAddress || !isValidAmount) return;

        setIsLoading(true);
        setTxSignature(null);

        try {
            const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

            const instruction = SystemProgram.transfer({
                fromPubkey: new PublicKey(walletAddress),
                toPubkey: new PublicKey(paymentData.recipient),
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
                        console.log('[QRPay] Transaction success:', sig);
                        setTxSignature(sig);
                    },
                    onFail: (error) => {
                        console.error('[QRPay] Transaction failed:', error);
                        Alert.alert('Payment Failed', `${error}`);
                    },
                }
            );
        } catch (error) {
            console.error('[QRPay] Error:', error);
            Alert.alert('Error', 'Failed to process payment');
        } finally {
            setIsLoading(false);
        }
    };

    // Success state
    if (txSignature) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <View style={{ width: 60 }} />
                    <Text style={styles.title}>Payment Complete</Text>
                    <View style={{ width: 60 }} />
                </View>

                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <Text style={styles.successEmoji}>✅</Text>
                    </View>
                    <Text style={styles.successTitle}>Payment Sent!</Text>
                    <Text style={styles.successSubtitle}>
                        {amount} SOL sent to {paymentData.label || 'recipient'}
                    </Text>

                    <TouchableOpacity style={styles.signatureBox} onPress={copySignature}>
                        <Text style={styles.signatureLabel}>
                            {copied ? '✓ Copied!' : 'Transaction Signature (tap to copy)'}
                        </Text>
                        <Text style={styles.signature}>{formatAddress(txSignature, 12)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.explorerButton} onPress={openExplorer}>
                        <Text style={styles.explorerText}>View on Solana Explorer ↗</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.doneButton} onPress={onComplete}>
                        <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Confirm Payment</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Payment Details Card */}
            <View style={styles.detailsCard}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>💳</Text>
                </View>

                {paymentData.label && (
                    <Text style={styles.merchantName}>{paymentData.label}</Text>
                )}

                {paymentData.message && (
                    <Text style={styles.merchantMessage}>{paymentData.message}</Text>
                )}

                <View style={styles.separator} />

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To</Text>
                    <Text style={styles.detailValue}>{formatAddress(paymentData.recipient, 8)}</Text>
                </View>

                {paymentData.memo && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Memo</Text>
                        <Text style={styles.detailValue}>{paymentData.memo}</Text>
                    </View>
                )}
            </View>

            {/* Amount Section */}
            <View style={styles.amountSection}>
                <Text style={styles.label}>Amount (SOL)</Text>
                {isAmountFixed ? (
                    <View style={styles.amountFixed}>
                        <Text style={styles.amountFixedText}>{amount}</Text>
                        <Text style={styles.amountFixedLabel}>SOL</Text>
                    </View>
                ) : (
                    <TextInput
                        style={styles.input}
                        placeholder="Enter amount"
                        placeholderTextColor={COLORS.textMuted}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                    />
                )}
            </View>

            {/* From Wallet */}
            <View style={styles.fromSection}>
                <Text style={styles.label}>From</Text>
                <View style={styles.walletBox}>
                    <Text style={styles.walletAddress}>
                        {formatAddress(walletAddress || '', 12)}
                    </Text>
                    <Text style={styles.walletLabel}>Your Smart Wallet</Text>
                </View>
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    ⚡ This transaction is gasless. You won't pay any network fees.
                </Text>
            </View>

            {/* Pay Button */}
            <TouchableOpacity
                style={[styles.payButton, !isValidAmount && styles.payButtonDisabled]}
                onPress={handlePay}
                disabled={!isValidAmount || isLoading}
            >
                <LinearGradient
                    colors={isValidAmount ? [COLORS.primary, COLORS.primaryDark] : [COLORS.backgroundCard, COLORS.backgroundCard]}
                    style={styles.payButtonGradient}
                >
                    {isLoading ? (
                        <ActivityIndicator color={COLORS.text} />
                    ) : (
                        <Text style={styles.payButtonText}>
                            Pay {amount ? `${amount} SOL` : ''} with Passkey
                        </Text>
                    )}
                </LinearGradient>
            </TouchableOpacity>
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
        marginBottom: 32,
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
    detailsCard: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: `${COLORS.primary}20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    icon: {
        fontSize: 32,
    },
    merchantName: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    merchantMessage: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    separator: {
        height: 1,
        backgroundColor: COLORS.border,
        width: '100%',
        marginVertical: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 8,
    },
    detailLabel: {
        color: COLORS.textMuted,
        fontSize: 14,
    },
    detailValue: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '500',
    },
    amountSection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    amountFixed: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    amountFixedText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
        marginRight: 8,
    },
    amountFixedLabel: {
        fontSize: 18,
        color: COLORS.textSecondary,
    },
    fromSection: {
        marginBottom: 20,
    },
    walletBox: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
    },
    walletAddress: {
        fontSize: 14,
        color: COLORS.text,
        fontFamily: 'monospace',
        marginBottom: 4,
    },
    walletLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    infoBox: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accent,
    },
    infoText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    payButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    payButtonDisabled: {
        opacity: 0.5,
    },
    payButtonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    payButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    // Success styles
    successContainer: {
        alignItems: 'center',
        paddingTop: 40,
    },
    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${COLORS.success}20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successEmoji: {
        fontSize: 40,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 32,
        textAlign: 'center',
    },
    signatureBox: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 16,
    },
    signatureLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    signature: {
        fontSize: 14,
        color: COLORS.text,
        fontFamily: 'monospace',
    },
    explorerButton: {
        paddingVertical: 12,
        marginBottom: 24,
    },
    explorerText: {
        color: COLORS.primary,
        fontSize: 14,
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
