import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Keyboard, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { discoveryService } from '@/services/api/discovery.service';
import { oemsService } from '@/services/api/oems.service';
import { OEM } from '@/types';
import { getManualPublicUrl } from '@/services/supabase';

interface PopularSearch {
  displayText: string;
  oem: string;
  model: string;
  searchCount: number;
}

type ViewState = 'search' | 'results' | 'model-manuals';

export default function SearchScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);

  // View state
  const [viewState, setViewState] = useState<ViewState>('search');

  // Search form
  const [oems, setOems] = useState<OEM[]>([]);
  const [selectedOem, setSelectedOem] = useState<string>('');
  const [modelNumber, setModelNumber] = useState('');
  const [loadingOems, setLoadingOems] = useState(true);

  // Search state
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  // Results
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [modelManuals, setModelManuals] = useState<any[]>([]);

  // Popular searches
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // Load OEMs and popular searches on mount
  useEffect(() => {
    loadOems();
    loadPopularSearches();
  }, []);

  const loadOems = async () => {
    try {
      const data = await oemsService.getAll('HVAC');
      // Show all OEMs from database
      setOems(data);

      // Auto-select first OEM (typically Carrier)
      if (data.length > 0) {
        setSelectedOem(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load OEMs:', error);
      Alert.alert('Error', 'Failed to load manufacturers. Please try again.');
    } finally {
      setLoadingOems(false);
    }
  };

  const loadPopularSearches = async () => {
    try {
      const searches = await discoveryService.getPopularSearches();
      setPopularSearches(searches);
    } catch (error) {
      console.error('Error loading popular searches:', error);
    } finally {
      setLoadingPopular(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedOem) {
      Alert.alert('Required Field', 'Please select a manufacturer.');
      return;
    }

    if (!modelNumber.trim()) {
      Alert.alert('Required Field', 'Please enter a model number.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    // Progressive loading messages
    const loadingMessages = [
      'Searching database...',
      'Manual not found, searching online...',
      'Downloading manual (this may take 30-60 seconds)...',
      'Processing PDF and extracting text...',
      'Analyzing content and creating searchable sections...',
      'Almost done, generating AI embeddings...',
    ];

    let messageIndex = 0;
    setLoadingMessage(loadingMessages[0]);

    const messageInterval = setInterval(() => {
      messageIndex = Math.min(messageIndex + 1, loadingMessages.length - 1);
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 8000);

    try {
      const selectedOemData = oems.find(o => o.id === selectedOem);
      const oemName = selectedOemData?.name || '';

      console.log(`Searching: OEM="${oemName}", Model="${modelNumber}"`);
      const results = await discoveryService.search(modelNumber.trim(), oemName);

      clearInterval(messageInterval);

      if (!results || !results.success) {
        Alert.alert(
          'Not Found',
          results?.message || 'No manuals found for this model.'
        );
        setLoading(false);
        return;
      }

      // Show success message if it was a discovery
      if (results.source === 'discovery' && results.message) {
        Alert.alert('Success!', results.message);
      }

      // Handle results
      if (results.manuals && results.manuals.length > 0) {
        setSearchResults(results);
        setViewState('results');
      } else if (results.manual) {
        // Single manual discovered
        const manualData: any = results.manual;
        const modelData = manualData.model;

        setSearchResults({
          manuals: [{
            id: manualData.id,
            title: manualData.title,
            type: 'service',
            pageCount: manualData.pageCount,
            sectionsCount: manualData.sectionsCreated,
            storagePath: manualData.storagePath,
            model: {
              id: modelData?.id || '',
              modelNumber: modelData?.modelNumber || modelNumber,
              productLine: modelData?.productLine || 'Unknown',
              oem: modelData?.oem || oemName,
            }
          }]
        });
        setViewState('results');
      } else {
        Alert.alert('No Results', 'No manuals found for this model.');
      }
    } catch (error: any) {
      clearInterval(messageInterval);
      console.error('Search error:', error);
      Alert.alert(
        'Search Error',
        error?.response?.data?.message || error?.message || 'Failed to search. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePopularSearchPress = (search: PopularSearch) => {
    const oem = oems.find(o => o.name === search.oem);
    if (oem) {
      setSelectedOem(oem.id);
      setModelNumber(search.model);
      // Small delay to show the fields populated, then search
      setTimeout(() => handleSearch(), 300);
    }
  };

  const handleModelPress = (model: any) => {
    setSelectedModel(model);
    // Group manuals by this model
    const manuals = searchResults.manuals.filter((m: any) =>
      m.model.modelNumber === model.modelNumber
    );
    setModelManuals(manuals);
    setViewState('model-manuals');
  };

  const handleManualPress = (manual: any) => {
    // Get the public URL for the PDF
    const pdfUrl = getManualPublicUrl(manual.storagePath);

    console.log('📄 Opening PDF:', {
      storagePath: manual.storagePath,
      publicUrl: pdfUrl,
      title: manual.title,
    });

    // Navigate to PDF viewer
    router.push({
      pathname: '/(modals)/pdf-viewer',
      params: {
        url: pdfUrl, // PDF viewer expects 'url' not 'pdfUrl'
        title: manual.title,
        buttonText: 'Save Manual',
        mode: 'preview-to-save',
        manualData: JSON.stringify({
          id: manual.id,
          title: manual.title,
          type: manual.type,
          modelId: manual.model.id,
          model: manual.model,
        }),
      },
    });
  };

  const handleBackToSearch = () => {
    setViewState('search');
    setSearchResults(null);
    setSelectedModel(null);
    setModelManuals([]);
    setModelNumber('');
  };

  const handleBackToResults = () => {
    setViewState('results');
    setSelectedModel(null);
    setModelManuals([]);
  };

  // Render search form view
  const renderSearchView = () => (
    <>
      {/* Manufacturer Selector */}
      <View style={styles.formSection}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Manufacturer</Text>
        {loadingOems ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <View style={styles.oemGrid}>
            {oems.map((oem) => (
              <TouchableOpacity
                key={oem.id}
                style={[
                  styles.oemCard,
                  {
                    backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white,
                    borderColor: selectedOem === oem.id ? theme.colors.primary : theme.colors.border,
                    borderWidth: selectedOem === oem.id ? 2 : 1,
                  }
                ]}
                onPress={() => setSelectedOem(oem.id)}
              >
                <Text style={[styles.oemName, { color: theme.colors.text }]}>{oem.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Model Number Input */}
      <View style={styles.formSection}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Model Number</Text>
        <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="e.g., 19XR, 50P3, AquaEdge..."
            placeholderTextColor={theme.colors.textTertiary}
            value={modelNumber}
            onChangeText={setModelNumber}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            editable={!loading}
            autoCapitalize="characters"
          />
          {modelNumber.length > 0 && !loading && (
            <TouchableOpacity onPress={() => setModelNumber('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Button */}
      <TouchableOpacity
        style={[
          styles.searchButton,
          {
            backgroundColor: loading || !selectedOem || !modelNumber.trim()
              ? theme.colors.disabled
              : theme.colors.primary
          }
        ]}
        onPress={handleSearch}
        disabled={!selectedOem || !modelNumber.trim() || loading}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color={theme.colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.searchButtonText}>{loadingMessage}</Text>
          </>
        ) : (
          <>
            <Text style={styles.searchButtonText}>Find Product</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
          </>
        )}
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
          onPress={() => Alert.alert('Coming Soon', 'Serial plate scanning will be available in a future update.')}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.colors.secondary + '15' }]}>
            <Ionicons name="camera" size={24} color={theme.colors.secondary} />
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Scan Serial Plate</Text>
            <Text style={[styles.actionDescription, { color: theme.colors.textSecondary }]}>
              Use your camera to identify the unit
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
          onPress={() => router.push('/(modals)/catalog')}
        >
          <View style={[styles.actionIcon, { backgroundColor: theme.colors.accent + '15' }]}>
            <Ionicons name="list" size={24} color={theme.colors.accent} />
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Browse OEMs</Text>
            <Text style={[styles.actionDescription, { color: theme.colors.textSecondary }]}>
              Explore manufacturers and models
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Popular Searches */}
      <View style={styles.popularSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Popular Searches</Text>
        {loadingPopular ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : popularSearches.length > 0 ? (
          <View style={styles.chipContainer}>
            {popularSearches.map((search, index) => (
              <TouchableOpacity
                key={`${search.oem}-${search.model}-${index}`}
                style={[styles.chip, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white, borderColor: theme.colors.border }]}
                onPress={() => handlePopularSearchPress(search)}
              >
                <Text style={[styles.chipText, { color: theme.colors.text }]}>{search.displayText}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No popular searches yet. Be the first to search!
          </Text>
        )}
      </View>
    </>
  );

  // Render results view (grouped models)
  const renderResultsView = () => {
    if (!searchResults || !searchResults.manuals) return null;

    // Group manuals by model
    const modelGroups: Record<string, any[]> = {};
    searchResults.manuals.forEach((manual: any) => {
      const modelKey = manual.model.modelNumber;
      if (!modelGroups[modelKey]) {
        modelGroups[modelKey] = [];
      }
      modelGroups[modelKey].push(manual);
    });

    const models = Object.keys(modelGroups).map(modelNumber => ({
      modelNumber,
      manuals: modelGroups[modelNumber],
      model: modelGroups[modelNumber][0].model, // Use first manual's model data
    }));

    return (
      <>
        {/* Header with back button */}
        <View style={styles.resultsHeader}>
          <TouchableOpacity onPress={handleBackToSearch} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.resultsHeaderContent}>
            <Text style={[styles.resultsTitle, { color: theme.colors.text }]}>Search Results</Text>
            <Text style={[styles.resultsSubtitle, { color: theme.colors.textSecondary }]}>
              {models.length} {models.length === 1 ? 'model' : 'models'} found
            </Text>
          </View>
        </View>

        {/* Model list */}
        <View style={styles.resultsList}>
          {models.map((model, index) => (
            <TouchableOpacity
              key={`${model.modelNumber}-${index}`}
              style={[styles.modelCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
              onPress={() => handleModelPress(model)}
            >
              <View style={[styles.modelIconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
                <Ionicons name="cube" size={28} color={theme.colors.primary} />
              </View>
              <View style={styles.modelCardContent}>
                <Text style={[styles.modelNumber, { color: theme.colors.text }]}>{model.modelNumber}</Text>
                <Text style={[styles.modelOem, { color: theme.colors.textSecondary }]}>
                  {model.model.oem}
                  {model.model.category && ` • ${model.model.category}`}
                  {model.model.productLine && ` • ${model.model.productLine}`}
                </Text>
                <Text style={[styles.modelManualCount, { color: theme.colors.textTertiary }]}>
                  {model.manuals.length} {model.manuals.length === 1 ? 'manual' : 'manuals'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  };

  // Render model-manuals view
  const renderModelManualsView = () => {
    if (!selectedModel || modelManuals.length === 0) return null;

    return (
      <>
        {/* Header with back button */}
        <View style={styles.resultsHeader}>
          <TouchableOpacity onPress={handleBackToResults} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View style={styles.resultsHeaderContent}>
            <Text style={[styles.resultsTitle, { color: theme.colors.text }]}>{selectedModel.modelNumber}</Text>
            <Text style={[styles.resultsSubtitle, { color: theme.colors.textSecondary }]}>
              {selectedModel.model.oem}
              {selectedModel.model.category && ` • ${selectedModel.model.category}`}
              {selectedModel.model.productLine && ` • ${selectedModel.model.productLine}`}
            </Text>
          </View>
        </View>

        {/* Manual list */}
        <View style={styles.resultsList}>
          {modelManuals.map((manual, index) => (
            <TouchableOpacity
              key={`${manual.id}-${index}`}
              style={[styles.manualCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
              onPress={() => handleManualPress(manual)}
            >
              <View style={[styles.manualIconCircle, { backgroundColor: theme.colors.danger + '15' }]}>
                <Ionicons name="document-text" size={24} color={theme.colors.danger} />
              </View>
              <View style={styles.manualCardContent}>
                <Text style={[styles.manualTitle, { color: theme.colors.text }]}>{manual.title}</Text>
                <View style={styles.manualMeta}>
                  <Text style={[styles.manualType, { color: theme.colors.textTertiary }]}>
                    {manual.type.toUpperCase()}
                  </Text>
                  {manual.pageCount && (
                    <Text style={[styles.manualPages, { color: theme.colors.textTertiary }]}>
                      • {manual.pageCount} pages
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="eye-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          ))}
        </View>
      </>
    );
  };

  // Main render
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {viewState === 'search' && renderSearchView()}
        {viewState === 'results' && renderResultsView()}
        {viewState === 'model-manuals' && renderModelManualsView()}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: -60,
  },
  content: {
    padding: theme.spacing.lg,
  },
  // Form styles
  formSection: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  oemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  oemCard: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  oemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: theme.spacing.xs,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  searchButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Results view styles
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  resultsHeaderContent: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  resultsSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  resultsList: {
    gap: theme.spacing.sm,
  },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  modelIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelCardContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  modelNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  modelOem: {
    fontSize: 14,
    marginTop: 2,
  },
  modelManualCount: {
    fontSize: 12,
    marginTop: 4,
  },
  // Manual card styles
  manualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  manualIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualCardContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  manualMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  manualType: {
    fontSize: 12,
    fontWeight: '600',
  },
  manualPages: {
    fontSize: 12,
    marginLeft: 4,
  },
  quickActions: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  popularSection: {
    marginBottom: theme.spacing.xl,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
});
