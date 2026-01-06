import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../config';

interface ScreenWrapperProps {
    children: React.ReactNode;
    useSafeArea?: boolean;
}

/**
 * Wrapper component that ensures screens have a dark background
 * immediately on mount to prevent white flash during navigation.
 */
export function ScreenWrapper({ children, useSafeArea = false }: ScreenWrapperProps) {
    if (useSafeArea) {
        return (
            <SafeAreaView style={styles.container}>
                {children}
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
});
