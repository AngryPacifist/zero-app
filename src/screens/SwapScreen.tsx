import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '../config';
import { formatAddress } from '../utils/solana';
import { useManualWallet, RootStackParamList } from '../App';
import { ScreenWrapper } from '../components/ScreenWrapper';
import {
    TOKENS,
    buildSwapInstructions,
    formatTokenAmount,
    SwapQuote,
} from '../utils/jupiterUtils';
import { isRetryableError } from '../utils/retryUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Swap pairs available
const SWAP_PAIRS = [
    {
        from: { symbol: 'SOL', mint: TOKENS.SOL, decimals: 9 },
        to: { symbol: 'USDC', mint: TOKENS.USDC_MAINNET, decimals: 6 },
    },
];

export function SwapScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { signAndSendTransaction, wallet } = useWallet();
    const { smartWallet: manualSmartWallet } = useManualWallet();
    const walletAddress = wallet?.smartWallet || manualSmartWallet;

    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState<SwapQuote | null>(null);
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [isSwapping, setIsSwapping] = useState(false);
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [retryStatus, setRetryStatus] = useState<string | null>(null);
    const [quoteError, setQuoteError] = useState<string | null>(null);

    const selectedPair = SWAP_PAIRS[0];

    // Debounced quote fetching
    useEffect(() => {
        const timer = setTimeout(() => {
            if (amount && parseFloat(amount) > 0) {
                fetchQuote();
            } else {
                setQuote(null);
                setQuoteError(null);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [amount]);

    const fetchQuote = async () => {
        if (!amount || parseFloat(amount) <= 0) return;

        setIsLoadingQuote(true);
        setQuoteError(null);

        try {
            const amountLamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
            const response = await fetch(
                `https://api.jup.ag/swap/v1/quote?inputMint=${selectedPair.from.mint}&outputMint=${selectedPair.to.mint}&amount=${amountLamports}&slippageBps=50`
            );

            if (!response.ok) {
                throw new Error('Failed to get quote');
            }

            const quoteData = await response.json();
            setQuote(quoteData);
        } catch (error) {
            console.error('Quote error:', error);
            setQuoteError('Could not get quote. Try a different amount.');
            setQuote(null);
        } finally {
            setIsLoadingQuote(false);
        }
    };

    const copySignature = async () => {
        if (txSignature) {
            await Clipboard.setStringAsync(txSignature);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const openExplorer = async () => {
        if (txSignature) {
            // Jupiter swaps happen on mainnet
            const url = `https://explorer.solana.com/tx/${txSignature}`;
            await WebBrowser.openBrowserAsync(url);
        }
    };

    const handleSwap = async () => {
        if (!walletAddress || !quote) return;

        const MAX_RETRIES = 3;
        let attempt = 0;

        setIsSwapping(true);
        setTxSignature(null);
        setRetryStatus(null);

        try {
            const amountLamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
            const { instructions } = await buildSwapInstructions(
                selectedPair.from.mint,
                selectedPair.to.mint,
                amountLamports,
                walletAddress,
                50
            );

            const executeTransaction = async (): Promise<void> => {
                return new Promise(async (resolve, reject) => {
                    try {
                        await signAndSendTransaction(
                            {
                                instructions: instructions,
                                transactionOptions: {
                                    clusterSimulation: 'mainnet',
                                },
                            },
                            {
                                redirectUrl: Linking.createURL('cb'),
                                onSuccess: (sig) => {
                                    console.log('[Swap] Success:', sig);
                                    setTxSignature(sig);
                                    setRetryStatus(null);
                                    resolve();
                                },
                                onFail: (error) => {
                                    console.error('[Swap] Failed:', error);
                                    reject(new Error(String(error)));
                                },
                            }
                        );
                    } catch (error) {
                        reject(error);
                    }
                });
            };

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
                        await new Promise(r => setTimeout(r, delay));
                    } else {
                        setRetryStatus(null);
                        Alert.alert('Swap Failed', errorMessage);
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('[Swap] Build error:', error);
            Alert.alert('Error', 'Failed to build swap transaction');
        } finally {
            setIsSwapping(false);
        }
    };

    const resetSwap = () => {
        setAmount('');
        setQuote(null);
        setTxSignature(null);
    };

    const isValidSwap = quote && parseFloat(amount) > 0;

    // Success view
    if (txSignature) {
        return (
            <ScreenWrapper>
                <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Swap</Text>
                        <View style={styles.headerPlaceholder} />
                    </View>

                    <View style={styles.successCard}>
                        <Text style={styles.successEmoji}>🎉</Text>
                        <Text style={styles.successTitle}>Swap Complete!</Text>
                        <Text style={styles.successAmount}>
                            {amount} {selectedPair.from.symbol} → {quote ? formatTokenAmount(quote.outAmount, selectedPair.to.decimals) : '?'} {selectedPair.to.symbol}
                        </Text>

                        <TouchableOpacity style={styles.signatureBox} onPress={copySignature}>
                            <Text style={styles.signatureLabel}>
                                {copied ? '✓ Copied!' : 'Transaction (tap to copy)'}
                            </Text>
                            <Text style={styles.signature}>{formatAddress(txSignature, 10)}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.explorerButton} onPress={openExplorer}>
                            <Text style={styles.explorerText}>View on Explorer ↗</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.newSwapButton} onPress={resetSwap}>
                            <Text style={styles.newSwapText}>New Swap</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Swap</Text>
                    <View style={styles.headerPlaceholder} />
                </View>

                {/* Swap Card */}
                <View style={styles.swapCard}>
                    {/* From */}
                    <View style={styles.tokenSection}>
                        <Text style={styles.sectionLabel}>From</Text>
                        <View style={styles.tokenRow}>
                            <View style={styles.tokenInfo}>
                                <Text style={styles.tokenSymbol}>{selectedPair.from.symbol}</Text>
                            </View>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0.00"
                                placeholderTextColor={COLORS.textMuted}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                            />
                        </View>
                    </View>

                    {/* Arrow */}
                    <View style={styles.arrowContainer}>
                        <Text style={styles.swapArrow}>↓</Text>
                    </View>

                    {/* To */}
                    <View style={styles.tokenSection}>
                        <Text style={styles.sectionLabel}>To</Text>
                        <View style={styles.tokenRow}>
                            <View style={styles.tokenInfo}>
                                <Text style={styles.tokenSymbol}>{selectedPair.to.symbol}</Text>
                            </View>
                            <View style={styles.outputContainer}>
                                {isLoadingQuote ? (
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                ) : quote ? (
                                    <Text style={styles.outputAmount}>
                                        {formatTokenAmount(quote.outAmount, selectedPair.to.decimals)}
                                    </Text>
                                ) : (
                                    <Text style={styles.outputPlaceholder}>-</Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Quote Info */}
                    {quote && (
                        <View style={styles.quoteInfo}>
                            <View style={styles.quoteRow}>
                                <Text style={styles.quoteLabel}>Price Impact</Text>
                                <Text style={styles.quoteValue}>
                                    {parseFloat(quote.priceImpactPct).toFixed(4)}%
                                </Text>
                            </View>
                            <View style={styles.quoteRow}>
                                <Text style={styles.quoteLabel}>Route</Text>
                                <Text style={styles.quoteValue}>
                                    {quote.routePlan?.map(r => r.swapInfo.label).join(' → ') || 'Direct'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {quoteError && (
                        <Text style={styles.errorText}>{quoteError}</Text>
                    )}
                </View>

                {/* Swap Button */}
                <TouchableOpacity
                    style={[styles.swapButton, !isValidSwap && styles.swapButtonDisabled]}
                    onPress={handleSwap}
                    disabled={!isValidSwap || isSwapping}
                >
                    <LinearGradient
                        colors={isValidSwap ? [COLORS.primary, COLORS.primaryDark] : [COLORS.backgroundCard, COLORS.backgroundCard]}
                        style={styles.swapButtonGradient}
                    >
                        {isSwapping ? (
                            <ActivityIndicator color={COLORS.text} />
                        ) : (
                            <Text style={styles.swapButtonText}>Swap with Passkey</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {retryStatus && (
                    <Text style={styles.retryStatus}>{retryStatus}</Text>
                )}

                {/* Info */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        ⚡ Swaps powered by Jupiter. This operates on Solana mainnet.
                    </Text>
                </View>

                <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                        ⚠️ Jupiter swaps require mainnet SOL. Ensure your wallet has sufficient balance.
                    </Text>
                </View>
            </ScrollView>
        </ScreenWrapper>
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
    headerPlaceholder: {
        width: 40,
    },
    swapCard: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    tokenSection: {
        marginBottom: 8,
    },
    sectionLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 8,
    },
    tokenRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    tokenInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tokenSymbol: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
    },
    amountInput: {
        fontSize: 24,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'right',
        flex: 1,
        marginLeft: 20,
    },
    outputContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    outputAmount: {
        fontSize: 24,
        fontWeight: '600',
        color: COLORS.text,
    },
    outputPlaceholder: {
        fontSize: 24,
        color: COLORS.textMuted,
    },
    arrowContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    swapArrow: {
        fontSize: 24,
        color: COLORS.textMuted,
    },
    quoteInfo: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.background,
    },
    quoteRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    quoteLabel: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    quoteValue: {
        fontSize: 14,
        color: COLORS.text,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        marginTop: 12,
        textAlign: 'center',
    },
    swapButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    swapButtonDisabled: {
        opacity: 0.7,
    },
    swapButtonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    swapButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    retryStatus: {
        color: '#f59e0b',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 16,
    },
    infoBox: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    infoText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    warningBox: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: '#f59e0b',
    },
    warningText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    successCard: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
    },
    successEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    successAmount: {
        fontSize: 18,
        color: COLORS.textSecondary,
        marginBottom: 24,
    },
    signatureBox: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
        width: '100%',
        alignItems: 'center',
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
    },
    explorerText: {
        color: COLORS.primary,
        fontSize: 16,
    },
    newSwapButton: {
        marginTop: 16,
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: COLORS.background,
        borderRadius: 12,
    },
    newSwapText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
    },
});
