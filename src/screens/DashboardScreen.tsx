import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import { COLORS } from '../config';
import { getSolBalance, formatAddress, formatSol } from '../utils/solana';
import { useManualWallet } from '../App';

interface DashboardScreenProps {
    onNavigate: (screen: 'send' | 'tipjar' | 'payment' | 'qrscan' | 'nftgallery' | 'swap') => void;
    onDisconnect: () => void;
}

export function DashboardScreen({ onNavigate, onDisconnect }: DashboardScreenProps) {
    const { wallet, disconnect } = useWallet();
    const { smartWallet: manualSmartWallet } = useManualWallet();
    const [balance, setBalance] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [copied, setCopied] = useState(false);

    // Use SDK wallet or manual wallet as fallback
    const walletAddress = wallet?.smartWallet || manualSmartWallet || '';

    const fetchBalance = async () => {
        if (walletAddress) {
            const bal = await getSolBalance(walletAddress);
            setBalance(bal);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [walletAddress]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchBalance();
        setRefreshing(false);
    };

    const copyAddress = async () => {
        await Clipboard.setStringAsync(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDisconnect = async () => {
        await disconnect({
            onSuccess: () => {
                onDisconnect();
            },
        });
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={COLORS.primary}
                />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.greeting}>Welcome back</Text>
                <TouchableOpacity onPress={handleDisconnect}>
                    <Text style={styles.disconnectText}>Disconnect</Text>
                </TouchableOpacity>
            </View>

            {/* Wallet Card */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.walletCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.cardLabel}>Smart Wallet</Text>
                    <View style={styles.networkBadge}>
                        <Text style={styles.networkText}>Devnet</Text>
                    </View>
                </View>

                <TouchableOpacity onPress={copyAddress} style={styles.addressRow}>
                    <Text style={styles.address}>
                        {formatAddress(walletAddress, 8)}
                    </Text>
                    <Text style={styles.copyIcon}>{copied ? '✓' : '📋'}</Text>
                </TouchableOpacity>

                <View style={styles.balanceSection}>
                    <Text style={styles.balanceLabel}>Balance</Text>
                    <Text style={styles.balanceValue}>
                        {balance !== null ? `${formatSol(balance)} SOL` : '...'}
                    </Text>
                </View>
            </LinearGradient>

            {/* Features */}
            <Text style={styles.sectionTitle}>Features</Text>

            <TouchableOpacity
                style={styles.featureCard}
                onPress={() => onNavigate('send')}
                activeOpacity={0.7}
            >
                <View style={[styles.featureIcon, { backgroundColor: '#3b82f6' }]}>
                    <Text style={styles.featureEmoji}>💸</Text>
                </View>
                <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Send Tokens</Text>
                    <Text style={styles.featureDescription}>
                        Transfer SOL or SPL tokens — no gas fees required
                    </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.featureCard}
                onPress={() => onNavigate('tipjar')}
                activeOpacity={0.7}
            >
                <View style={[styles.featureIcon, { backgroundColor: '#22c55e' }]}>
                    <Text style={styles.featureEmoji}>☕</Text>
                </View>
                <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Tip Jar</Text>
                    <Text style={styles.featureDescription}>
                        One-tap donations with passkey approval
                    </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.featureCard}
                onPress={() => onNavigate('payment')}
                activeOpacity={0.7}
            >
                <View style={[styles.featureIcon, { backgroundColor: '#f59e0b' }]}>
                    <Text style={styles.featureEmoji}>🛒</Text>
                </View>
                <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Pay with Solana</Text>
                    <Text style={styles.featureDescription}>
                        E-commerce checkout widget demo
                    </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.featureCard}
                onPress={() => onNavigate('qrscan')}
                activeOpacity={0.7}
            >
                <View style={[styles.featureIcon, { backgroundColor: '#8b5cf6' }]}>
                    <Text style={styles.featureEmoji}>📷</Text>
                </View>
                <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Scan QR to Pay</Text>
                    <Text style={styles.featureDescription}>
                        Scan Solana Pay QR codes for instant payments
                    </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.featureCard}
                onPress={() => onNavigate('nftgallery')}
                activeOpacity={0.7}
            >
                <View style={[styles.featureIcon, { backgroundColor: '#ec4899' }]}>
                    <Text style={styles.featureEmoji}>🎨</Text>
                </View>
                <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>NFT Gallery</Text>
                    <Text style={styles.featureDescription}>
                        Mint NFTs with Metaplex Core
                    </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.featureCard}
                onPress={() => onNavigate('swap')}
                activeOpacity={0.7}
            >
                <View style={[styles.featureIcon, { backgroundColor: '#06b6d4' }]}>
                    <Text style={styles.featureEmoji}>🔄</Text>
                </View>
                <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Token Swap</Text>
                    <Text style={styles.featureDescription}>
                        Swap tokens via Jupiter (mainnet)
                    </Text>
                </View>
                <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            {/* Info */}
            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    💡 All transactions are gasless on Devnet. Your passkey secures every action.
                </Text>
            </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    greeting: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    disconnectText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    walletCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 32,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    networkBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    networkText: {
        fontSize: 12,
        color: COLORS.text,
        fontWeight: '600',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    address: {
        fontSize: 18,
        color: COLORS.text,
        fontFamily: 'monospace',
        flex: 1,
    },
    copyIcon: {
        fontSize: 16,
    },
    balanceSection: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
        paddingTop: 16,
    },
    balanceLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 4,
    },
    balanceValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 16,
    },
    featureCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    featureIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureEmoji: {
        fontSize: 24,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 2,
    },
    featureDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    arrow: {
        fontSize: 20,
        color: COLORS.textMuted,
    },
    infoBox: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
});
