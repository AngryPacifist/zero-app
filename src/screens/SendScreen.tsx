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
    Modal,
    FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import { SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '../config';
import { isValidAddress, formatAddress } from '../utils/solana';
import { useManualWallet } from '../App';
import {
    TokenInfo,
    SOL_TOKEN,
    fetchSolBalance,
    fetchUserTokens,
    buildTokenTransferInstruction,
    formatTokenBalance,
} from '../utils/tokenUtils';
import { isRetryableError } from '../utils/retryUtils';

interface SendScreenProps {
    onBack: () => void;
}

export function SendScreen({ onBack }: SendScreenProps) {
    const { signAndSendTransaction, wallet } = useWallet();
    const { smartWallet: manualSmartWallet } = useManualWallet();
    const walletAddress = wallet?.smartWallet || manualSmartWallet;

    // Token state
    const [tokens, setTokens] = useState<TokenInfo[]>([]);
    const [selectedToken, setSelectedToken] = useState<TokenInfo>(SOL_TOKEN);
    const [isLoadingTokens, setIsLoadingTokens] = useState(true);
    const [showTokenPicker, setShowTokenPicker] = useState(false);

    // Form state
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [retryStatus, setRetryStatus] = useState<string | null>(null);

    // Fetch tokens on mount
    useEffect(() => {
        if (walletAddress) {
            loadTokens();
        }
    }, [walletAddress]);

    const loadTokens = async () => {
        if (!walletAddress) return;

        setIsLoadingTokens(true);
        try {
            // Fetch SOL balance
            const solBalance = await fetchSolBalance(walletAddress);
            const solToken = { ...SOL_TOKEN, balance: solBalance };

            // Fetch SPL tokens
            const splTokens = await fetchUserTokens(walletAddress);

            // Combine: SOL first, then SPL tokens
            setTokens([solToken, ...splTokens]);
            setSelectedToken(solToken);
        } catch (error) {
            console.error('Error loading tokens:', error);
            setTokens([SOL_TOKEN]);
        } finally {
            setIsLoadingTokens(false);
        }
    };

    const isValidForm = isValidAddress(recipient) && parseFloat(amount) > 0 && parseFloat(amount) <= selectedToken.balance;

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

    const handleSend = async () => {
        if (!walletAddress || !isValidForm) return;

        const MAX_RETRIES = 3;
        let attempt = 0;

        const executeTransaction = async (): Promise<void> => {
            return new Promise(async (resolve, reject) => {
                try {
                    let instruction;

                    if (selectedToken.mint === 'SOL') {
                        const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
                        instruction = SystemProgram.transfer({
                            fromPubkey: new PublicKey(walletAddress),
                            toPubkey: new PublicKey(recipient),
                            lamports,
                        });
                    } else {
                        instruction = await buildTokenTransferInstruction(
                            walletAddress,
                            recipient,
                            selectedToken.mint,
                            parseFloat(amount),
                            selectedToken.decimals
                        );
                    }

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
                                console.log('Transaction success:', sig);
                                setTxSignature(sig);
                                setRetryStatus(null);
                                resolve();
                            },
                            onFail: (error) => {
                                console.error('Transaction failed:', error);
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
                break; // Success, exit loop
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);

                // Check if it's a retryable error
                if (isRetryableError(error) && attempt < MAX_RETRIES - 1) {
                    attempt++;
                    const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
                    setRetryStatus(`Retry ${attempt}/${MAX_RETRIES - 1}... (${errorMessage.substring(0, 40)})`);
                    console.log(`[Retry] Attempt ${attempt}, waiting ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                } else {
                    // Non-retryable error or max retries reached
                    setRetryStatus(null);
                    Alert.alert('Error', `Transaction failed: ${errorMessage}`);
                    break;
                }
            }
        }

        setIsLoading(false);
    };

    const resetForm = () => {
        setRecipient('');
        setAmount('');
        setTxSignature(null);
        loadTokens(); // Refresh balances
    };

    const renderTokenItem = ({ item }: { item: TokenInfo }) => (
        <TouchableOpacity
            style={styles.tokenItem}
            onPress={() => {
                setSelectedToken(item);
                setShowTokenPicker(false);
            }}
        >
            <View style={styles.tokenIcon}>
                <Text style={styles.tokenIconText}>
                    {item.symbol.slice(0, 2)}
                </Text>
            </View>
            <View style={styles.tokenInfo}>
                <Text style={styles.tokenSymbol}>{item.symbol}</Text>
                <Text style={styles.tokenName}>{item.name}</Text>
            </View>
            <Text style={styles.tokenBalance}>
                {formatTokenBalance(item.balance)}
            </Text>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Send Tokens</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Success state */}
            {txSignature ? (
                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <Text style={styles.successEmoji}>✅</Text>
                    </View>
                    <Text style={styles.successTitle}>Transaction Sent!</Text>
                    <Text style={styles.successSubtitle}>
                        Your {selectedToken.symbol} is on its way
                    </Text>

                    <TouchableOpacity style={styles.signatureBox} onPress={copySignature}>
                        <Text style={styles.signatureLabel}>
                            {copied ? '✓ Copied!' : 'Transaction Signature (tap to copy)'}
                        </Text>
                        <Text style={styles.signature}>{formatAddress(txSignature, 12)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.explorerButton} onPress={openExplorer}>
                        <Text style={styles.explorerText}>
                            View on Solana Explorer ↗
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.newTxButton} onPress={resetForm}>
                        <Text style={styles.newTxText}>Send Another</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Token Picker */}
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Token</Text>
                        <TouchableOpacity
                            style={styles.tokenPicker}
                            onPress={() => setShowTokenPicker(true)}
                            disabled={isLoadingTokens}
                        >
                            {isLoadingTokens ? (
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            ) : (
                                <>
                                    <View style={styles.tokenPickerLeft}>
                                        <View style={styles.tokenIcon}>
                                            <Text style={styles.tokenIconText}>
                                                {selectedToken.symbol.slice(0, 2)}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text style={styles.tokenPickerSymbol}>
                                                {selectedToken.symbol}
                                            </Text>
                                            <Text style={styles.tokenPickerBalance}>
                                                Balance: {formatTokenBalance(selectedToken.balance)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.tokenPickerArrow}>▼</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Recipient */}
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Recipient Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Solana address"
                            placeholderTextColor={COLORS.textMuted}
                            value={recipient}
                            onChangeText={setRecipient}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {recipient && !isValidAddress(recipient) && (
                            <Text style={styles.errorText}>Invalid address</Text>
                        )}
                    </View>

                    {/* Amount */}
                    <View style={styles.formSection}>
                        <Text style={styles.label}>Amount ({selectedToken.symbol})</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            placeholderTextColor={COLORS.textMuted}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                        />
                        {parseFloat(amount) > selectedToken.balance && (
                            <Text style={styles.errorText}>Insufficient balance</Text>
                        )}
                    </View>

                    {/* Quick amounts */}
                    <View style={styles.quickAmounts}>
                        {['25%', '50%', '75%', 'MAX'].map((label, index) => {
                            const percentage = [0.25, 0.5, 0.75, 1][index];
                            return (
                                <TouchableOpacity
                                    key={label}
                                    style={styles.quickAmount}
                                    onPress={() => {
                                        const quickAmount = selectedToken.balance * percentage;
                                        setAmount(quickAmount.toFixed(selectedToken.decimals > 4 ? 4 : selectedToken.decimals));
                                    }}
                                >
                                    <Text style={styles.quickAmountText}>{label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Info */}
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            ⚡ This transaction is gasless. You won't pay any network fees.
                        </Text>
                    </View>

                    {/* Send button */}
                    <TouchableOpacity
                        style={[styles.sendButton, !isValidForm && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!isValidForm || isLoading}
                    >
                        <LinearGradient
                            colors={isValidForm ? [COLORS.primary, COLORS.primaryDark] : [COLORS.backgroundCard, COLORS.backgroundCard]}
                            style={styles.sendButtonGradient}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.text} />
                            ) : (
                                <Text style={styles.sendButtonText}>
                                    Send with Passkey
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Retry status */}
                    {retryStatus && (
                        <Text style={styles.retryStatus}>{retryStatus}</Text>
                    )}
                </>
            )}

            {/* Token Picker Modal */}
            <Modal
                visible={showTokenPicker}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTokenPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Token</Text>
                            <TouchableOpacity onPress={() => setShowTokenPicker(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        {tokens.length === 0 ? (
                            <View style={styles.emptyTokens}>
                                <Text style={styles.emptyTokensText}>No tokens found</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={tokens}
                                renderItem={renderTokenItem}
                                keyExtractor={(item) => item.mint}
                                style={styles.tokenList}
                            />
                        )}
                    </View>
                </View>
            </Modal>
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
    formSection: {
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
    errorText: {
        color: COLORS.error,
        fontSize: 12,
        marginTop: 4,
    },
    // Token picker
    tokenPicker: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tokenPickerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tokenIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    tokenIconText: {
        color: COLORS.text,
        fontWeight: '600',
        fontSize: 14,
    },
    tokenPickerSymbol: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    tokenPickerBalance: {
        color: COLORS.textMuted,
        fontSize: 12,
    },
    tokenPickerArrow: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    // Quick amounts
    quickAmounts: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    quickAmount: {
        flex: 1,
        backgroundColor: COLORS.backgroundCard,
        paddingVertical: 12,
        marginHorizontal: 4,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    quickAmountText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '500',
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
    sendButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    sendButtonText: {
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
    newTxButton: {
        backgroundColor: COLORS.backgroundCard,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
    },
    newTxText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.backgroundCard,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    modalClose: {
        fontSize: 20,
        color: COLORS.textSecondary,
    },
    tokenList: {
        padding: 12,
    },
    tokenItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: COLORS.background,
    },
    tokenInfo: {
        flex: 1,
    },
    tokenSymbol: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    tokenName: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    tokenBalance: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    emptyTokens: {
        padding: 40,
        alignItems: 'center',
    },
    emptyTokensText: {
        color: COLORS.textMuted,
        fontSize: 16,
    },
    retryStatus: {
        color: COLORS.warning || '#f59e0b',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 12,
    },
});
