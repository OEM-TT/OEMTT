import { View, StyleSheet, ActivityIndicator, Text, Share, TouchableOpacity, Dimensions, Platform, Alert, TextInput, Modal } from 'react-native';
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
        allManualsForModel?: string;
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
    const [showPageJump, setShowPageJump] = useState(false);
    const [pageInput, setPageInput] = useState('');
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

    const handlePageJump = () => {
        const pageNum = parseInt(pageInput);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
            Alert.alert('Invalid Page', `Please enter a page number between 1 and ${totalPages}`);
            return;
        }

        console.log(`📄 Jumping to page ${pageNum}`);
        pdfRef.current?.setPage(pageNum);
        setShowPageJump(false);
        setPageInput('');
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

    const closeModal = () => {
        router.back();
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.closeButton} onPress={() => {
                closeModal();
            }}>
                <Ionicons name="close" size={20} color="#A78BFA" />
            </TouchableOpacity>
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

            {/* Page Jump Button - Floating button */}
            {!loading && !error && totalPages > 0 && !isPreviewMode && (
                <TouchableOpacity
                    style={styles.pageJumpButton}
                    onPress={() => {
                        setPageInput(currentPage.toString());
                        setShowPageJump(true);
                    }}
                >
                    <Ionicons name="search-outline" size={24} color="#FFF" />
                </TouchableOpacity>
            )}

            {/* Page Jump Modal */}
            <Modal
                visible={showPageJump}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPageJump(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPageJump(false)}
                >
                    <View style={styles.pageJumpModal} onStartShouldSetResponder={() => true}>
                        <Text style={styles.modalTitle}>Jump to Page</Text>
                        <Text style={styles.modalSubtitle}>Enter page number (1-{totalPages})</Text>

                        <TextInput
                            style={styles.pageInput}
                            value={pageInput}
                            onChangeText={setPageInput}
                            keyboardType="number-pad"
                            placeholder={currentPage.toString()}
                            placeholderTextColor="#64748B"
                            autoFocus={true}
                            selectTextOnFocus={true}
                            onSubmitEditing={handlePageJump}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setShowPageJump(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.goButton]}
                                onPress={handlePageJump}
                            >
                                <Text style={styles.goButtonText}>Go</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>

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
    pageJumpButton: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#A78BFA',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageJumpModal: {
        backgroundColor: '#1E293B',
        borderRadius: 16,
        padding: 24,
        width: '80%',
        maxWidth: 320,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F1F5F9',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 20,
        textAlign: 'center',
    },
    pageInput: {
        backgroundColor: '#0F172A',
        borderWidth: 2,
        borderColor: '#A78BFA',
        borderRadius: 12,
        padding: 16,
        fontSize: 24,
        fontWeight: '600',
        color: '#F1F5F9',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#334155',
    },
    cancelButtonText: {
        color: '#F1F5F9',
        fontSize: 16,
        fontWeight: '600',
    },
    goButton: {
        backgroundColor: '#A78BFA',
    },
    goButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 20,
        backgroundColor: 'rgba(167, 139, 250, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});
