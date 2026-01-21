import { View, StyleSheet, ActivityIndicator, Text, Share, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

export default function PdfViewerScreen() {
    const params = useLocalSearchParams<{ url: string; title?: string }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const pdfUrl = typeof params.url === 'string' ? params.url : '';
    const title = typeof params.title === 'string' ? params.title : 'Manual';

    // Use Google Docs PDF viewer for better mobile support
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`;

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this manual: ${pdfUrl}`,
                url: pdfUrl,
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: title,
                    headerRight: () => (
                        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                            <Ionicons name="share-outline" size={24} color="#F1F5F9" />
                        </TouchableOpacity>
                    ),
                }}
            />

            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#A78BFA" />
                    <Text style={styles.loadingText}>Loading PDF...</Text>
                </View>
            )}

            <WebView
                source={{ uri: viewerUrl }}
                style={styles.webview}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                onError={(error) => {
                    console.error('WebView error:', error);
                    setLoading(false);
                }}
                startInLoadingState={true}
                scalesPageToFit={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    webview: {
        flex: 1,
        backgroundColor: '#1E293B',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        zIndex: 10,
    },
    loadingText: {
        marginTop: 16,
        color: '#F1F5F9',
        fontSize: 16,
    },
    shareButton: {
        padding: 8,
    },
});
