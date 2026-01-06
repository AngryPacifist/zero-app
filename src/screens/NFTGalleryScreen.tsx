import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../config';
import { formatAddress } from '../utils/solana';
import { useManualWallet, RootStackParamList } from '../App';
import { buildMintNFTInstructions } from '../utils/nftUtils';
import { isRetryableError } from '../utils/retryUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// The NFT available for minting
const TINKERER_NFT = {
    name: 'The Tinkerer',
    description: 'A badge for builders who explore new frontiers in Solana development with passkey-powered wallets.',
    image: 'https://i.ibb.co/d4BmM146/image-2026-01-06-132112107.png',
};

// Storage key for tracking minted status
const MINTED_KEY = 'tinkerer_nft_minted';

export function NFTGalleryScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { signAndSendTransaction, wallet } = useWallet();
    const { smartWallet: manualSmartWallet } = useManualWallet();
    const walletAddress = wallet?.smartWallet || manualSmartWallet;

    const [isLoading, setIsLoading] = useState(false);
    const [hasMinted, setHasMinted] = useState(false);
    const [mintedAssetAddress, setMintedAssetAddress] = useState<string | null>(null);
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [retryStatus, setRetryStatus] = useState<string | null>(null);

    // Check if user has already minted
    useEffect(() => {
        checkMintedStatus();
    }, [walletAddress]);

    const checkMintedStatus = async () => {
        if (!walletAddress) return;
        try {
            const mintedData = await AsyncStorage.getItem(`${MINTED_KEY}_${walletAddress}`);
            if (mintedData) {
                const parsed = JSON.parse(mintedData);
                setHasMinted(true);
                setMintedAssetAddress(parsed.assetAddress);
            }
        } catch (error) {
            console.error('Error checking minted status:', error);
        }
    };

    const saveMintedStatus = async (assetAddress: string) => {
        if (!walletAddress) return;
        try {
            await AsyncStorage.setItem(
                `${MINTED_KEY}_${walletAddress}`,
                JSON.stringify({ assetAddress, mintedAt: Date.now() })
            );
        } catch (error) {
            console.error('Error saving minted status:', error);
        }
    };

    const copyAddress = async (address: string) => {
        await Clipboard.setStringAsync(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const openExplorer = async () => {
        if (txSignature) {
            const url = `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;
            await WebBrowser.openBrowserAsync(url);
        }
    };

    const viewAssetOnExplorer = async () => {
        if (mintedAssetAddress) {
            const url = `https://explorer.solana.com/address/${mintedAssetAddress}?cluster=devnet`;
            await WebBrowser.openBrowserAsync(url);
        }
    };

    // Create metadata URI (data URI with JSON)
    const createMetadataUri = () => {
        const metadata = {
            name: TINKERER_NFT.name,
            description: TINKERER_NFT.description,
            image: TINKERER_NFT.image,
            attributes: [
                { trait_type: 'Type', value: 'Achievement Badge' },
                { trait_type: 'Collection', value: 'Lazorkit Pioneers' },
                { trait_type: 'Minted With', value: 'Passkey Wallet' },
            ],
        };
        return 'data:application/json;base64,' + btoa(JSON.stringify(metadata));
    };

    const handleMint = async () => {
        if (!walletAddress || hasMinted) return;

        const MAX_RETRIES = 3;
        let attempt = 0;

        setIsLoading(true);
        setTxSignature(null);
        setRetryStatus(null);

        try {
            // Build the mint instructions
            const metadataUri = createMetadataUri();
            const { instructions, assetAddress } = await buildMintNFTInstructions(
                walletAddress,
                metadataUri,
                TINKERER_NFT.name,
                { soulbound: false }
            );

            const executeTransaction = async (): Promise<void> => {
                return new Promise(async (resolve, reject) => {
                    try {
                        await signAndSendTransaction(
                            {
                                instructions: instructions,
                                transactionOptions: {
                                    clusterSimulation: 'devnet',
                                },
                            },
                            {
                                redirectUrl: Linking.createURL('cb'),
                                onSuccess: async (sig) => {
                                    console.log('[NFT] Mint success:', sig);
                                    setTxSignature(sig);
                                    setMintedAssetAddress(assetAddress);
                                    setHasMinted(true);
                                    await saveMintedStatus(assetAddress);
                                    setRetryStatus(null);
                                    resolve();
                                },
                                onFail: (error) => {
                                    console.error('[NFT] Mint failed:', error);
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
                        console.log(`[Retry] Attempt ${attempt}, waiting ${delay}ms...`);
                        await new Promise(r => setTimeout(r, delay));
                    } else {
                        setRetryStatus(null);
                        Alert.alert('Mint Failed', errorMessage);
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('[NFT] Error building instructions:', error);
            Alert.alert('Error', 'Failed to build mint transaction');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>NFT Gallery</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* NFT Card */}
            <View style={styles.nftCard}>
                <Image
                    source={{ uri: TINKERER_NFT.image }}
                    style={styles.nftImage}
                    resizeMode="cover"
                />
                <View style={styles.nftInfo}>
                    <Text style={styles.nftName}>{TINKERER_NFT.name}</Text>
                    <Text style={styles.nftDescription}>{TINKERER_NFT.description}</Text>

                    <View style={styles.tagRow}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>Metaplex Core</Text>
                        </View>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>Free Mint</Text>
                        </View>
                    </View>
                </View>

                {/* Mint Button or Minted Status */}
                {hasMinted ? (
                    <View style={styles.mintedContainer}>
                        <Text style={styles.mintedText}>✓ Minted!</Text>
                        <TouchableOpacity onPress={viewAssetOnExplorer}>
                            <Text style={styles.viewAssetText}>View on Explorer ↗</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.mintButton, isLoading && styles.mintButtonDisabled]}
                        onPress={handleMint}
                        disabled={isLoading}
                    >
                        <LinearGradient
                            colors={[COLORS.primary, COLORS.primaryDark]}
                            style={styles.mintButtonGradient}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={COLORS.text} />
                            ) : (
                                <Text style={styles.mintButtonText}>Mint with Passkey</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {retryStatus && (
                    <Text style={styles.retryStatus}>{retryStatus}</Text>
                )}
            </View>

            {/* Success Transaction Info */}
            {txSignature && (
                <View style={styles.successBox}>
                    <Text style={styles.successTitle}>🎉 NFT Minted Successfully!</Text>

                    <TouchableOpacity
                        style={styles.signatureBox}
                        onPress={() => copyAddress(txSignature)}
                    >
                        <Text style={styles.signatureLabel}>
                            {copied ? '✓ Copied!' : 'Transaction Signature (tap to copy)'}
                        </Text>
                        <Text style={styles.signature}>{formatAddress(txSignature, 12)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.explorerButton} onPress={openExplorer}>
                        <Text style={styles.explorerText}>View Transaction ↗</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Info */}
            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    ⚡ Minting is gasless! This NFT is minted using Metaplex Core on Solana devnet.
                </Text>
            </View>

            {/* My Collection */}
            {hasMinted && mintedAssetAddress && (
                <View style={styles.collectionSection}>
                    <Text style={styles.sectionTitle}>📦 Your Collection</Text>
                    <View style={styles.collectionItem}>
                        <Image
                            source={{ uri: TINKERER_NFT.image }}
                            style={styles.collectionImage}
                        />
                        <View style={styles.collectionInfo}>
                            <Text style={styles.collectionName}>{TINKERER_NFT.name}</Text>
                            <Text style={styles.collectionAddress}>
                                {formatAddress(mintedAssetAddress, 8)}
                            </Text>
                        </View>
                        <Text style={styles.ownedBadge}>Owned</Text>
                    </View>
                </View>
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
    nftCard: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
    },
    nftImage: {
        width: '100%',
        height: 280,
        backgroundColor: COLORS.background,
    },
    nftInfo: {
        padding: 20,
    },
    nftName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    nftDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: 16,
    },
    tagRow: {
        flexDirection: 'row',
        gap: 8,
    },
    tag: {
        backgroundColor: `${COLORS.primary}20`,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    tagText: {
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '500',
    },
    mintButton: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
    },
    mintButtonDisabled: {
        opacity: 0.7,
    },
    mintButtonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    mintButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    mintedContainer: {
        marginHorizontal: 20,
        marginBottom: 20,
        alignItems: 'center',
    },
    mintedText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.success,
        marginBottom: 8,
    },
    viewAssetText: {
        color: COLORS.primary,
        fontSize: 14,
    },
    retryStatus: {
        color: '#f59e0b',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 16,
    },
    successBox: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.success,
    },
    successTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 16,
    },
    signatureBox: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    signatureLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    signature: {
        fontSize: 14,
        color: COLORS.text,
        fontFamily: 'monospace',
    },
    explorerButton: {
        paddingVertical: 8,
        alignItems: 'center',
    },
    explorerText: {
        color: COLORS.primary,
        fontSize: 14,
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
    collectionSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 16,
    },
    collectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 12,
    },
    collectionImage: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: COLORS.background,
    },
    collectionInfo: {
        flex: 1,
        marginLeft: 12,
    },
    collectionName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    collectionAddress: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontFamily: 'monospace',
    },
    ownedBadge: {
        backgroundColor: `${COLORS.success}20`,
        color: COLORS.success,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        fontSize: 12,
        fontWeight: '500',
        overflow: 'hidden',
    },
});
