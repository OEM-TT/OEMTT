import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { savedUnitsService, SavedUnitWithDetails } from '@/services/api/savedUnits.service';

interface Site {
  name: string; // nickname
  units: SavedUnitWithDetails[];
  modelCount: number;
}

export default function LibraryScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);

  // State
  const [savedUnits, setSavedUnits] = useState<SavedUnitWithDetails[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [navigating, setNavigating] = useState(false);

  // Load saved units and group by nickname (site name)
  const loadSavedUnits = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const units = await savedUnitsService.getAll();
      setSavedUnits(units);

      // Group units by nickname to create sites
      const siteMap = new Map<string, SavedUnitWithDetails[]>();
      units.forEach(unit => {
        const nickname = unit.nickname;
        if (!siteMap.has(nickname)) {
          siteMap.set(nickname, []);
        }
        siteMap.get(nickname)!.push(unit);
      });

      // Convert to site array
      const sitesArray: Site[] = Array.from(siteMap.entries()).map(([name, units]) => ({
        name,
        units,
        modelCount: units.length,
      }));

      setSites(sitesArray);
    } catch (error: any) {
      console.error('Error loading saved units:', error);
      Alert.alert('Error', 'Failed to load saved units. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load and refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSavedUnits();
    }, [])
  );

  // Pull to refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadSavedUnits(true);
  };

  // Navigate to site details with debounce
  const handleSitePress = (site: Site) => {
    if (navigating) {
      console.log('⏭️ Already navigating, ignoring tap');
      return;
    }

    console.log('🚀 Navigating to site:', site.name);
    setNavigating(true);

    // Pass the first unit ID from the site to load site details
    router.push({
      pathname: '/(modals)/unit-details',
      params: { id: site.units[0].id }
    });

    // Reset after 2 seconds
    setTimeout(() => {
      setNavigating(false);
    }, 2000);
  };

  // Delete entire site (all units with same nickname)
  const handleDeleteSite = (site: Site) => {
    const modelWord = site.modelCount === 1 ? 'model' : 'models';
    Alert.alert(
      'Delete Site',
      `Delete "${site.name}" and all ${site.modelCount} ${modelWord}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all units at this site
              await Promise.all(
                site.units.map(unit => savedUnitsService.delete(unit.id))
              );
              // Reload the list
              await loadSavedUnits();
              Alert.alert('Success', 'Site deleted successfully');
            } catch (error: any) {
              console.error('Error deleting site:', error);
              Alert.alert('Error', 'Failed to delete site. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Format install date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading your sites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Header Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="business" size={24} color={theme.colors.primary} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{sites.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Sites</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="help-circle" size={24} color={theme.colors.secondary} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>0</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Questions</Text>
          </View>
        </View>

        {/* Sites Section */}
        {sites.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>My Units</Text>
            </View>

            {sites.map((site) => (
              <View
                key={site.name}
                style={[styles.unitCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
              >
                <TouchableOpacity
                  style={styles.unitContent}
                  activeOpacity={0.7}
                  onPress={() => handleSitePress(site)}
                  disabled={navigating}
                >
                  <View style={[styles.unitIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Ionicons name="business" size={32} color={theme.colors.primary} />
                  </View>
                  <View style={styles.unitInfo}>
                    <Text style={[styles.unitNickname, { color: theme.colors.text }]}>{site.name}</Text>
                    <Text style={[styles.unitModel, { color: theme.colors.textSecondary }]}>
                      {site.units[0].model.productLine.oem.name} • {site.modelCount === 1 ? site.units[0].model.modelNumber : `${site.modelCount} Models`}
                    </Text>
                    <View style={styles.unitMeta}>
                      {site.modelCount > 1 && (
                        <View style={styles.metaItem}>
                          <Ionicons name="cube" size={14} color={theme.colors.textTertiary} />
                          <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>{site.modelCount} models</Text>
                        </View>
                      )}
                      {site.units[0].location && (
                        <View style={styles.metaItem}>
                          <Ionicons name="location-outline" size={14} color={theme.colors.textTertiary} />
                          <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>{site.units[0].location}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSite(site)}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Unit Button */}
            <TouchableOpacity
              style={[styles.addButton, { borderColor: theme.colors.border }]}
              onPress={() => router.push('/(modals)/add-unit')}
            >
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>Add New Unit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State (when no sites) */}
        {sites.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Saved Units</Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
              Add your first unit to start tracking manuals and asking questions
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push('/(modals)/add-unit')}
            >
              <Text style={styles.emptyButtonText}>Add Your First Unit</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: 16,
  },
  content: {
    padding: theme.spacing.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  unitContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  deleteButton: {
    padding: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  unitInfo: {
    flex: 1,
  },
  unitNickname: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  unitModel: {
    fontSize: 14,
    marginBottom: theme.spacing.xs,
  },
  unitMeta: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxxl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    maxWidth: 280,
  },
  emptyButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  emptyButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
