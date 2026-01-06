import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Share,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../config';
import { useManualWallet } from '../App';
import { RootStackParamList } from '../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function ReceiveScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { smartWallet } = useManualWallet();
    const [copied, setCopied] = React.useState(false);

    const walletAddress = smartWallet || '';

    const handleCopy = async () => {
        if (walletAddress) {
            await Clipboard.setStringAsync(walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `My Solana wallet address:\n${walletAddress}`,
            });
        } catch (error) {
            Alert.alert('Error', 'Failed to share address');
        }
    };

    const formatAddress = (address: string) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-6)}`;
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Receive</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Content */}
            <View style={styles.content}>
                {/* QR Code Card */}
                <View style={styles.qrCard}>
                    <View style={styles.qrContainer}>
                        <QRCode
                            value={walletAddress || 'empty'}
                            size={200}
                            backgroundColor="white"
                            color="black"
                        />
                    </View>
                    <Text style={styles.instruction}>
                        Scan this QR code to send tokens to this wallet
                    </Text>
                </View>

                {/* Address Section */}
                <View style={styles.addressSection}>
                    <Text style={styles.addressLabel}>Wallet Address</Text>
                    <TouchableOpacity onPress={handleCopy} style={styles.addressBox}>
                        <Text style={styles.addressText}>
                            {formatAddress(walletAddress)}
                        </Text>
                        <Ionicons
                            name={copied ? 'checkmark' : 'copy-outline'}
                            size={20}
                            color={copied ? COLORS.success : COLORS.textSecondary}
                        />
                    </TouchableOpacity>
                    {copied && (
                        <Text style={styles.copiedText}>Copied to clipboard!</Text>
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
                        <Ionicons name="copy-outline" size={24} color={COLORS.primary} />
                        <Text style={styles.actionText}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                        <Ionicons name="share-outline" size={24} color={COLORS.primary} />
                        <Text style={styles.actionText}>Share</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        alignItems: 'center',
        paddingTop: 24,
    },
    qrCard: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    qrContainer: {
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 16,
    },
    instruction: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    addressSection: {
        width: '100%',
        marginBottom: 32,
    },
    addressLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 8,
    },
    addressBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    addressText: {
        fontSize: 16,
        color: COLORS.text,
        fontFamily: 'monospace',
    },
    copiedText: {
        fontSize: 12,
        color: COLORS.success,
        marginTop: 8,
        textAlign: 'center',
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    actionText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
});
