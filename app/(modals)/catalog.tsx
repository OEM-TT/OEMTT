import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/services/api';
import { getManualPublicUrl } from '@/services/supabase';

type ViewMode = 'industries' | 'brands' | 'productLines' | 'models' | 'manuals';

interface OEM {
  id: string;
  name: string;
  vertical: string;
  logoUrl: string | null;
}

interface ProductLine {
  id: string;
  name: string;
  description: string | null;
}

interface Model {
  id: string;
  modelNumber: string;
  description: string | null;
  _count: {
    manuals: number;
  };
}

interface Manual {
  id: string;
  title: string;
  type: string;
  pageCount: number | null;
  storagePath: string;
  sourceUrl: string | null;
}

export default function CatalogScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);

  const [viewMode, setViewMode] = useState<ViewMode>('industries');
  const [loading, setLoading] = useState(false);

  // Navigation state
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedOEM, setSelectedOEM] = useState<OEM | null>(null);
  const [selectedProductLine, setSelectedProductLine] = useState<ProductLine | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);

  // Data state
  const [industries, setIndustries] = useState<string[]>([]);
  const [oems, setOEMs] = useState<OEM[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [manuals, setManuals] = useState<Manual[]>([]);

  // Load industries on mount
  useEffect(() => {
    loadIndustries();
  }, []);

  const loadIndustries = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: OEM[] }>('/oems');
      const allOEMs = response.data || [];
      
      // Extract unique industries (verticals)
      const uniqueIndustries = Array.from(new Set(allOEMs.map(oem => oem.vertical))).filter(Boolean);
      setIndustries(uniqueIndustries);
    } catch (error) {
      console.error('Error loading industries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIndustryPress = async (industry: string) => {
    setSelectedIndustry(industry);
    setViewMode('brands');
    setLoading(true);

    try {
      const response = await api.get<{ success: boolean; data: OEM[] }>('/oems');
      const filteredOEMs = (response.data || []).filter(oem => oem.vertical === industry);
      setOEMs(filteredOEMs);
    } catch (error) {
      console.error('Error loading OEMs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOEMPress = async (oem: OEM) => {
    setSelectedOEM(oem);
    setViewMode('productLines');
    setLoading(true);

    try {
      const response = await api.get<{ success: boolean; data: ProductLine[] }>(`/oems/${oem.id}/product-lines`);
      setProductLines(response.data || []);
    } catch (error) {
      console.error('Error loading product lines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductLinePress = async (productLine: ProductLine) => {
    setSelectedProductLine(productLine);
    setViewMode('models');
    setLoading(true);

    try {
      const response = await api.get<{ success: boolean; data: Model[] }>(`/oems/product-lines/${productLine.id}/models`);
      setModels(response.data || []);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModelPress = async (model: Model) => {
    setSelectedModel(model);
    setViewMode('manuals');
    setLoading(true);

    try {
      const response = await api.get<{ success: boolean; data: Manual[] }>(`/models/${model.id}/manuals`);
      setManuals(response.data || []);
    } catch (error) {
      console.error('Error loading manuals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualPress = (manual: Manual) => {
    // Get the public URL for the PDF
    const pdfUrl = getManualPublicUrl(manual.storagePath);
    
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
          modelId: selectedModel?.id,
        }),
      },
    });
  };

  const handleBack = () => {
    if (viewMode === 'brands') {
      setViewMode('industries');
      setSelectedIndustry(null);
    } else if (viewMode === 'productLines') {
      setViewMode('brands');
      setSelectedOEM(null);
    } else if (viewMode === 'models') {
      setViewMode('productLines');
      setSelectedProductLine(null);
    } else if (viewMode === 'manuals') {
      setViewMode('models');
      setSelectedModel(null);
    }
  };

  const getBreadcrumb = () => {
    const parts: string[] = [];
    if (selectedIndustry) parts.push(selectedIndustry);
    if (selectedOEM) parts.push(selectedOEM.name);
    if (selectedProductLine) parts.push(selectedProductLine.name);
    if (selectedModel) parts.push(selectedModel.modelNumber);
    return parts.join(' > ');
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
        </View>
      );
    }

    if (viewMode === 'industries') {
      return (
        <View style={styles.gridContainer}>
          {industries.map((industry) => (
            <TouchableOpacity
              key={industry}
              style={[styles.card, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
              onPress={() => handleIndustryPress(industry)}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
                <Ionicons name="business" size={28} color={theme.colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{industry}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (viewMode === 'brands') {
      return (
        <View style={styles.listContainer}>
          {oems.map((oem) => (
            <TouchableOpacity
              key={oem.id}
              style={[styles.listCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
              onPress={() => handleOEMPress(oem)}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.secondary + '15' }]}>
                <Ionicons name="business-outline" size={24} color={theme.colors.secondary} />
              </View>
              <View style={styles.listCardContent}>
                <Text style={[styles.listCardTitle, { color: theme.colors.text }]}>{oem.name}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (viewMode === 'productLines') {
      return (
        <View style={styles.listContainer}>
          {productLines.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No product lines available
            </Text>
          ) : (
            productLines.map((line) => (
              <TouchableOpacity
                key={line.id}
                style={[styles.listCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
                onPress={() => handleProductLinePress(line)}
              >
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.accent + '15' }]}>
                  <Ionicons name="albums-outline" size={24} color={theme.colors.accent} />
                </View>
                <View style={styles.listCardContent}>
                  <Text style={[styles.listCardTitle, { color: theme.colors.text }]}>{line.name}</Text>
                  {line.description && (
                    <Text style={[styles.listCardDescription, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {line.description}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ))
          )}
        </View>
      );
    }

    if (viewMode === 'models') {
      return (
        <View style={styles.listContainer}>
          {models.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No models available
            </Text>
          ) : (
            models.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[styles.listCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
                onPress={() => handleModelPress(model)}
              >
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Ionicons name="cube-outline" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.listCardContent}>
                  <Text style={[styles.listCardTitle, { color: theme.colors.text }]}>{model.modelNumber}</Text>
                  {model.description && (
                    <Text style={[styles.listCardDescription, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {model.description}
                    </Text>
                  )}
                  <Text style={[styles.manualCount, { color: theme.colors.textTertiary }]}>
                    {model._count.manuals} {model._count.manuals === 1 ? 'manual' : 'manuals'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            ))
          )}
        </View>
      );
    }

    if (viewMode === 'manuals') {
      return (
        <View style={styles.listContainer}>
          {manuals.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No manuals available
            </Text>
          ) : (
            manuals.map((manual) => (
              <TouchableOpacity
                key={manual.id}
                style={[styles.manualCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
                onPress={() => handleManualPress(manual)}
              >
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.error + '15' }]}>
                  <Ionicons name="document-text" size={24} color={theme.colors.error} />
                </View>
                <View style={styles.listCardContent}>
                  <Text style={[styles.listCardTitle, { color: theme.colors.text }]}>{manual.title}</Text>
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
            ))
          )}
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (viewMode === 'industries') {
              router.back();
            } else {
              handleBack();
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Browse Catalog</Text>
          {getBreadcrumb() && (
            <Text style={[styles.breadcrumb, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {getBreadcrumb()}
            </Text>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  breadcrumb: {
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  card: {
    width: '48%',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  listContainer: {
    gap: theme.spacing.sm,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  listCardContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  listCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  listCardDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  manualCount: {
    fontSize: 12,
    marginTop: 4,
  },
  manualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
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
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
});
