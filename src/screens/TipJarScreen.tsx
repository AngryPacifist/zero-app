import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '../config';
import { formatAddress } from '../utils/solana';
import { useManualWallet, RootStackParamList } from '../App';
import { isRetryableError } from '../utils/retryUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Tip amounts in SOL - small amounts for testing
const TIP_AMOUNTS = [
    { label: '☕', amount: 0.0001, description: 'Coffee' },
    { label: '🍕', amount: 0.0005, description: 'Pizza' },
    { label: '🎉', amount: 0.001, description: 'Party' },
    { label: '🚀', amount: 0.005, description: 'Launch' },
];

// Demo recipient - your wallet address
const CREATOR_ADDRESS = 'BVsfLRjj5LBYUxE39cr8uQF99BU1LxYUon4AqEEQhBxX';
const CREATOR_NAME = 'Lazorkit Demo Creator';

export function TipJarScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { signAndSendTransaction, wallet } = useWallet();
    const { smartWallet: manualSmartWallet } = useManualWallet();

    // Use SDK wallet or manual wallet as fallback
    const walletAddress = wallet?.smartWallet || manualSmartWallet;

    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [retryStatus, setRetryStatus] = useState<string | null>(null);

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

    const handleTip = async () => {
        if (!walletAddress || selectedAmount === null) return;

        const MAX_RETRIES = 3;
        let attempt = 0;

        const executeTransaction = async (): Promise<void> => {
            return new Promise(async (resolve, reject) => {
                try {
                    const lamports = Math.floor(selectedAmount * LAMPORTS_PER_SOL);

                    const instruction = SystemProgram.transfer({
                        fromPubkey: new PublicKey(walletAddress),
                        toPubkey: new PublicKey(CREATOR_ADDRESS),
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
                                setRetryStatus(null);
                                resolve();
                            },
                            onFail: (error) => {
                                console.error('Tip failed:', error);
                                reject(new Error(String(error)));
                            },
                        }
                    );
                } catch (error) {
                    reject(error);
                }
            });
        };

        setIsLoading(true);
        setTxSignature(null);
        setRetryStatus(null);

        while (attempt < MAX_RETRIES) {
            try {
                await executeTransaction();
                break;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);

                if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
                    attempt++;
                    const delay = 1000 * Math.pow(2, attempt - 1);
                    setRetryStatus(`Retry ${attempt}/${MAX_RETRIES - 1}...`);
                    console.log(`[Retry] Attempt ${attempt}, waiting ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    setRetryStatus(null);
                    Alert.alert('Error', `Tip failed: ${errorMessage}`);
                    break;
                }
            }
        }

        setIsLoading(false);
    };

    const resetTip = () => {
        setSelectedAmount(null);
        setTxSignature(null);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Tip Jar</Text>
                <View style={{ width: 60 }} />
            </View>

            {txSignature ? (
                // Success state
                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <Text style={styles.successEmoji}>💝</Text>
                    </View>
                    <Text style={styles.successTitle}>Thank you!</Text>
                    <Text style={styles.successSubtitle}>
                        Your tip of {selectedAmount} SOL was sent
                    </Text>

                    <TouchableOpacity style={styles.signatureBox} onPress={copySignature}>
                        <Text style={styles.signatureLabel}>
                            {copied ? '✓ Copied!' : 'Transaction (tap to copy)'}
                        </Text>
                        <Text style={styles.signature}>{formatAddress(txSignature, 10)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.explorerButton} onPress={openExplorer}>
                        <Text style={styles.explorerText}>View on Solana Explorer ↗</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.againButton}
                        onPress={resetTip}
                    >
                        <Text style={styles.againText}>Tip Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Creator Card */}
                    <View style={styles.creatorCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarEmoji}>👨‍💻</Text>
                        </View>
                        <Text style={styles.creatorName}>{CREATOR_NAME}</Text>
                        <Text style={styles.creatorAddress}>
                            {formatAddress(CREATOR_ADDRESS, 6)}
                        </Text>
                        <Text style={styles.creatorBio}>
                            Building awesome things on Solana with Lazorkit
                        </Text>
                    </View>

                    {/* Tip Amounts */}
                    <Text style={styles.sectionTitle}>Choose an amount</Text>
                    <View style={styles.tipGrid}>
                        {TIP_AMOUNTS.map((tip) => (
                            <TouchableOpacity
                                key={tip.amount}
                                style={[
                                    styles.tipCard,
                                    selectedAmount === tip.amount && styles.tipCardActive
                                ]}
                                onPress={() => setSelectedAmount(tip.amount)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.tipEmoji}>{tip.label}</Text>
                                <Text style={[
                                    styles.tipAmount,
                                    selectedAmount === tip.amount && styles.tipAmountActive
                                ]}>
                                    {tip.amount} SOL
                                </Text>
                                <Text style={styles.tipDescription}>{tip.description}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Info */}
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            ☕ One tap to tip! Gasless and secure with your passkey.
                        </Text>
                    </View>

                    {/* Tip button */}
                    <TouchableOpacity
                        style={[
                            styles.tipButton,
                            selectedAmount === null && styles.tipButtonDisabled
                        ]}
                        onPress={handleTip}
                        disabled={selectedAmount === null || isLoading}
                    >
                        <LinearGradient
                            colors={selectedAmount !== null
                                ? [COLORS.accent, '#16a34a']
                                : [COLORS.backgroundCard, COLORS.backgroundCard]
                            }
                            style={styles.tipButtonGradient}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.text} />
                            ) : (
                                <Text style={styles.tipButtonText}>
                                    {selectedAmount !== null
                                        ? `Send ${selectedAmount} SOL Tip`
                                        : 'Select an amount'
                                    }
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
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
    creatorCard: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarEmoji: {
        fontSize: 40,
    },
    creatorName: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    creatorAddress: {
        fontSize: 14,
        color: COLORS.textMuted,
        fontFamily: 'monospace',
        marginBottom: 12,
    },
    creatorBio: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 16,
    },
    tipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 24,
    },
    tipCard: {
        width: '48%',
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 16,
        padding: 20,
        margin: '1%',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    tipCardActive: {
        borderColor: COLORS.accent,
        backgroundColor: `${COLORS.accent}15`,
    },
    tipEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    tipAmount: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    tipAmountActive: {
        color: COLORS.accent,
    },
    tipDescription: {
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
    tipButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    tipButtonDisabled: {
        opacity: 0.5,
    },
    tipButtonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    tipButtonText: {
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
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${COLORS.accent}20`,
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
    signatureBox: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        width: '100%',
        marginBottom: 24,
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
        marginBottom: 16,
    },
    explorerText: {
        color: COLORS.primary,
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    againButton: {
        backgroundColor: COLORS.backgroundCard,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    againText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
    },
});
