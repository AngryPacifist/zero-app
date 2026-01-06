import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS } from '../config';

interface QRScanScreenProps {
    onBack: () => void;
    onPaymentScanned: (paymentData: SolanaPayData) => void;
}

// Solana Pay URL format: solana:<recipient>?amount=<amount>&label=<label>&message=<message>
export interface SolanaPayData {
    recipient: string;
    amount?: number;
    label?: string;
    message?: string;
    memo?: string;
    splToken?: string; // For SPL token payments
}

/**
 * Parse a Solana Pay URL
 * Format: solana:<recipient>?amount=X&label=Y&message=Z
 */
function parseSolanaPayUrl(url: string): SolanaPayData | null {
    try {
        // Check if it starts with 'solana:'
        if (!url.startsWith('solana:')) {
            return null;
        }

        // Remove 'solana:' prefix
        const withoutPrefix = url.substring(7);

        // Split by '?' to get recipient and params
        const [recipientPart, paramsPart] = withoutPrefix.split('?');

        if (!recipientPart) {
            return null;
        }

        const data: SolanaPayData = {
            recipient: recipientPart,
        };

        // Parse query params if present
        if (paramsPart) {
            const params = new URLSearchParams(paramsPart);

            if (params.has('amount')) {
                data.amount = parseFloat(params.get('amount')!);
            }
            if (params.has('label')) {
                data.label = params.get('label')!;
            }
            if (params.has('message')) {
                data.message = params.get('message')!;
            }
            if (params.has('memo')) {
                data.memo = params.get('memo')!;
            }
            if (params.has('spl-token')) {
                data.splToken = params.get('spl-token')!;
            }
        }

        return data;
    } catch (error) {
        console.error('Error parsing Solana Pay URL:', error);
        return null;
    }
}

export function QRScanScreen({ onBack, onPaymentScanned }: QRScanScreenProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission, requestPermission]);

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;

        console.log('[QR] Scanned data:', data);

        // Try to parse as Solana Pay URL
        const paymentData = parseSolanaPayUrl(data);

        if (paymentData) {
            setScanned(true);
            console.log('[QR] ✓ Valid Solana Pay URL:', paymentData);
            onPaymentScanned(paymentData);
        } else {
            // Check if it's just a Solana address
            if (data.length >= 32 && data.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(data)) {
                setScanned(true);
                console.log('[QR] ✓ Scanned Solana address:', data);
                onPaymentScanned({ recipient: data });
            } else {
                Alert.alert(
                    'Invalid QR Code',
                    'This QR code is not a valid Solana Pay URL or address.',
                    [{ text: 'Try Again', onPress: () => setScanned(false) }]
                );
            }
        }
    };

    // Permission loading
    if (!permission) {
        return (
            <View style={styles.container}>
                <View style={styles.centerContent}>
                    <Text style={styles.permissionText}>Requesting camera permission...</Text>
                </View>
            </View>
        );
    }

    // Permission denied
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Text style={styles.backText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Scan QR</Text>
                    <View style={{ width: 60 }} />
                </View>
                <View style={styles.centerContent}>
                    <Text style={styles.permissionText}>Camera permission is required</Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Scan QR</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Camera */}
            <View style={styles.cameraContainer}>
                <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                />

                {/* Overlay with scanning frame */}
                <View style={styles.overlay}>
                    <View style={styles.overlayTop} />
                    <View style={styles.overlayMiddle}>
                        <View style={styles.overlaySide} />
                        <View style={styles.scanFrame}>
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />
                        </View>
                        <View style={styles.overlaySide} />
                    </View>
                    <View style={styles.overlayBottom} />
                </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
                <Text style={styles.instructionText}>
                    Point your camera at a Solana Pay QR code
                </Text>
                <Text style={styles.subInstructionText}>
                    Supports solana: URLs and wallet addresses
                </Text>
            </View>

            {/* Scan again button */}
            {scanned && (
                <TouchableOpacity
                    style={styles.scanAgainButton}
                    onPress={() => setScanned(false)}
                >
                    <Text style={styles.scanAgainText}>Scan Again</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const { width: screenWidth } = Dimensions.get('window');
const scanFrameSize = screenWidth * 0.7;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
        zIndex: 10,
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
    cameraContainer: {
        flex: 1,
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    overlayTop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    overlayMiddle: {
        flexDirection: 'row',
    },
    overlaySide: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    overlayBottom: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    scanFrame: {
        width: scanFrameSize,
        height: scanFrameSize,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: COLORS.primary,
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderLeftWidth: 4,
        borderTopWidth: 4,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderRightWidth: 4,
        borderTopWidth: 4,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderLeftWidth: 4,
        borderBottomWidth: 4,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderRightWidth: 4,
        borderBottomWidth: 4,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    permissionText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
    },
    permissionButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    permissionButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    instructions: {
        padding: 24,
        alignItems: 'center',
    },
    instructionText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: 8,
    },
    subInstructionText: {
        color: COLORS.textMuted,
        fontSize: 14,
        textAlign: 'center',
    },
    scanAgainButton: {
        marginHorizontal: 24,
        marginBottom: 24,
        backgroundColor: COLORS.backgroundCard,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    scanAgainText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
    },
});
