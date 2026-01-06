import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import { COLORS } from '../config';
import { getSolBalance, formatAddress, formatSol } from '../utils/solana';
import { useManualWallet, RootStackParamList } from '../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { disconnect } = useWallet();
    const { smartWallet, clearSession } = useManualWallet();
    const walletAddress = smartWallet || '';

    const [balance, setBalance] = useState<number>(0);
    const [refreshing, setRefreshing] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (walletAddress) {
            fetchBalance();
        }
    }, [walletAddress]);

    const fetchBalance = async () => {
        if (!walletAddress) return;
        try {
            const bal = await getSolBalance(walletAddress);
            setBalance(bal);
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    };

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
        await disconnect({ onSuccess: () => { } });
        await clearSession();
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
            })
        );
    };

    // Feature grid data
    const features = [
        { name: 'Swap', icon: 'swap-horizontal', color: '#06b6d4', screen: 'Swap' as const },
        { name: 'NFT', icon: 'image', color: '#ec4899', screen: 'NFTGallery' as const },
        { name: 'Payment', icon: 'cart', color: '#f59e0b', screen: 'Payment' as const },
        { name: 'Tip Jar', icon: 'gift', color: '#22c55e', screen: 'TipJar' as const },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scroll}
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
                        <Ionicons name="log-out-outline" size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <LinearGradient
                        colors={['rgba(124, 58, 237, 0.15)', 'rgba(124, 58, 237, 0.05)']}
                        style={styles.cardGradient}
                    >
                        {/* Balance */}
                        <View style={styles.balanceSection}>
                            <Text style={styles.balanceLabel}>Total Balance</Text>
                            <Text style={styles.balanceAmount}>{formatSol(balance)} SOL</Text>
                        </View>

                        {/* Address */}
                        <TouchableOpacity onPress={copyAddress} style={styles.addressRow}>
                            <Text style={styles.address}>
                                {formatAddress(walletAddress, 6)}
                            </Text>
                            <Ionicons
                                name={copied ? 'checkmark' : 'copy-outline'}
                                size={16}
                                color={copied ? COLORS.success : COLORS.textSecondary}
                            />
                        </TouchableOpacity>

                        {/* Quick Actions */}
                        <View style={styles.quickActions}>
                            <TouchableOpacity
                                style={styles.quickAction}
                                onPress={() => navigation.navigate('Send')}
                            >
                                <View style={[styles.quickIcon, { backgroundColor: COLORS.primary }]}>
                                    <Ionicons name="arrow-up" size={20} color="#fff" />
                                </View>
                                <Text style={styles.quickLabel}>Send</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.quickAction}
                                onPress={() => navigation.navigate('Receive')}
                            >
                                <View style={[styles.quickIcon, { backgroundColor: COLORS.accent }]}>
                                    <Ionicons name="arrow-down" size={20} color="#fff" />
                                </View>
                                <Text style={styles.quickLabel}>Receive</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.quickAction}
                                onPress={() => navigation.navigate('QRScan')}
                            >
                                <View style={[styles.quickIcon, { backgroundColor: '#8b5cf6' }]}>
                                    <Ionicons name="qr-code" size={20} color="#fff" />
                                </View>
                                <Text style={styles.quickLabel}>Scan</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>

                {/* Features Section */}
                <Text style={styles.sectionTitle}>Features</Text>

                {/* 2x2 Grid */}
                <View style={styles.grid}>
                    {features.map((feature) => (
                        <TouchableOpacity
                            key={feature.name}
                            style={styles.gridItem}
                            onPress={() => navigation.navigate(feature.screen)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.gridIcon, { backgroundColor: feature.color }]}>
                                <Ionicons name={feature.icon as any} size={28} color="#fff" />
                            </View>
                            <Text style={styles.gridLabel}>{feature.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Info */}
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.infoText}>
                        All transactions are gasless on Devnet
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scroll: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    balanceCard: {
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    cardGradient: {
        padding: 24,
    },
    balanceSection: {
        marginBottom: 16,
    },
    balanceLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    balanceAmount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    address: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontFamily: 'monospace',
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    quickAction: {
        alignItems: 'center',
        gap: 8,
    },
    quickIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
    },
    gridItem: {
        width: '47%',
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    gridIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    infoText: {
        fontSize: 13,
        color: COLORS.textMuted,
        flex: 1,
    },
});
