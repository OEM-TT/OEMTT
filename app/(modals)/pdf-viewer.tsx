import { View, StyleSheet, ActivityIndicator, Text, Share, TouchableOpacity, Dimensions, Platform, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import Pdf from 'react-native-pdf';
import { Ionicons } from '@expo/vector-icons';
import { savedUnitsService } from '@/services/api/savedUnits.service';

export default function PdfViewerScreen() {
    const params = useLocalSearchParams<{
        url: string;
        title?: string;
        mode?: string;
        manualData?: string;
        buttonText?: string;
        returnTo?: string;
        siteName?: string;
        page?: string; // NEW: Initial page to jump to
    }>();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [saving, setSaving] = useState(false);
    const pdfRef = useRef<any>(null); // NEW: Ref for PDF component

    const pdfUrl = typeof params.url === 'string' ? params.url : '';
    const title = typeof params.title === 'string' ? params.title : 'Manual';
    const mode = typeof params.mode === 'string' ? params.mode : 'view';
    const buttonText = typeof params.buttonText === 'string' ? params.buttonText : 'Continue';
    const isPreviewMode = mode === 'preview-to-save';
    const siteName = typeof params.siteName === 'string' ? params.siteName : '';
    const isAddingToSite = !!siteName;
    const initialPage = params.page ? parseInt(params.page) : 1; // NEW: Parse initial page

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

    const handleSaveManual = async () => {
        console.log('🔘 Save button pressed - confirming manual selection');

        // If adding to an existing site, save directly without going through add-unit
        if (isAddingToSite && params.manualData) {
            try {
                const manual = JSON.parse(params.manualData);
                console.log('💾 Saving to existing site:', siteName);

                setSaving(true);

                await savedUnitsService.create({
                    modelId: manual.model.id,
                    nickname: siteName,
                });

                setSaving(false);

                // Navigate back - this will close pdf-viewer and add-unit, returning to site-details
                // The site-details screen will auto-refresh via useFocusEffect
                console.log('✅ Model saved! Navigating back to site details...');
                router.back();
                router.back(); // Go back twice to close both pdf-viewer and add-unit

                // Show success message
                setTimeout(() => {
                    Alert.alert('Success', `${manual.model.modelNumber} added to ${siteName}!`);
                }, 300);

            } catch (error: any) {
                console.error('Save error:', error);
                setSaving(false);
                Alert.alert('Save Error', error?.response?.data?.message || 'Failed to add model. Please try again.');
            }
        } else {
            // Creating new site - go through add-unit to show details form
            router.push({
                pathname: '/(modals)/add-unit',
                params: {
                    manualConfirmed: 'true',
                    manualData: params.manualData,
                    allManualsForModel: params.allManualsForModel, // Pass through the manuals list
                    siteName: '',
                    mode: undefined,
                },
            });
        }
    };

    const source = {
        uri: pdfUrl,
        cache: true,
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: title,
                    headerRight: () => !isPreviewMode ? (
                        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                            <Ionicons name="share-outline" size={24} color="#F1F5F9" />
                        </TouchableOpacity>
                    ) : null,
                }}
            />

            {(loading || saving) && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#A78BFA" />
                    <Text style={styles.loadingText}>{saving ? 'Adding to site...' : 'Loading PDF...'}</Text>
                    <Text style={styles.loadingSubtext}>
                        {saving ? 'Just a moment...' : 'This may take a moment for large files'}
                    </Text>
                </View>
            )}

            {error && (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={48} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            setError(null);
                            setLoading(true);
                        }}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Pdf
                ref={pdfRef}
                trustAllCerts={false}
                source={source}
                page={initialPage}
                style={styles.pdf}
                onLoadComplete={(numberOfPages) => {
                    console.log(`PDF loaded with ${numberOfPages} pages`);
                    setTotalPages(numberOfPages);
                    setCurrentPage(initialPage); // Set to initial page
                    setLoading(false);
                    setError(null);

                    // Jump to page after load if not page 1
                    if (initialPage > 1 && pdfRef.current) {
                        console.log(`📄 Jumping to page ${initialPage}`);
                        setTimeout(() => {
                            pdfRef.current?.setPage(initialPage);
                        }, 100);
                    }
                }}
                onPageChanged={(page) => {
                    setCurrentPage(page);
                }}
                onError={(error) => {
                    console.error('PDF error:', error);
                    setLoading(false);
                    setError('Failed to load PDF. Please try again.');
                }}
                onLoadProgress={(percent) => {
                    console.log(`Loading: ${(percent * 100).toFixed(0)}%`);
                }}
                enablePaging={true}
                spacing={16}
                horizontal={false}
                fitPolicy={0} // 0 = fit width, 1 = fit height, 2 = fit both
            />

            {/* Page Indicator - Only show when loaded and not in error state */}
            {!loading && !error && totalPages > 0 && (
                <View style={styles.pageIndicator}>
                    <Text style={styles.pageIndicatorText}>
                        Page {currentPage} of {totalPages}
                    </Text>
                </View>
            )}

            {/* Save Manual Bottom Bar - Only show in preview mode */}
            {isPreviewMode && (
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSaveManual}
                        activeOpacity={0.8}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                        )}
                        <Text style={styles.saveButtonText}>{saving ? 'Adding...' : buttonText}</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    pdf: {
        flex: 1,
        width: Dimensions.get('window').width,
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
        fontWeight: '600',
    },
    loadingSubtext: {
        marginTop: 8,
        color: '#94A3B8',
        fontSize: 14,
    },
    errorContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        zIndex: 10,
        padding: 24,
    },
    errorText: {
        marginTop: 16,
        color: '#EF4444',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    retryButton: {
        backgroundColor: '#A78BFA',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    pageIndicator: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 20,
        right: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    pageIndicatorText: {
        color: '#F1F5F9',
        fontSize: 14,
        fontWeight: '600',
    },
    shareButton: {
        padding: 8,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1E293B',
        borderTopWidth: 1,
        borderTopColor: '#334155',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16, // Extra padding for iOS home indicator
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#A78BFA',
        borderRadius: 12,
        paddingVertical: 16,
        gap: 8,
    },
    saveButtonDisabled: {
        backgroundColor: '#6B7280',
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
    },
});
