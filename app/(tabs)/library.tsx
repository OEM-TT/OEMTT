import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { savedUnitsService, SavedUnitWithDetails } from '@/services/api/savedUnits.service';

export default function LibraryScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);

  // State
  const [savedUnits, setSavedUnits] = useState<SavedUnitWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [navigating, setNavigating] = useState(false);

  // Load saved units
  const loadSavedUnits = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      const units = await savedUnitsService.getAll();
      setSavedUnits(units);
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

  // Navigate to unit details with debounce
  const handleUnitPress = (unitId: string) => {
    if (navigating) {
      console.log('⏭️ Already navigating, ignoring tap');
      return;
    }
    
    console.log('🚀 Navigating to unit:', unitId);
    setNavigating(true);
    
    router.push({
      pathname: '/(modals)/unit-details',
      params: { id: unitId }
    });
    
    // Reset after 2 seconds
    setTimeout(() => {
      setNavigating(false);
    }, 2000);
  };

  // Delete unit
  const handleDeleteUnit = (unitId: string, nickname: string) => {
    Alert.alert(
      'Delete Unit',
      `Are you sure you want to delete "${nickname}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await savedUnitsService.delete(unitId);
              setSavedUnits((prev) => prev.filter((u) => u.id !== unitId));
              Alert.alert('Success', 'Unit deleted successfully');
            } catch (error: any) {
              console.error('Error deleting unit:', error);
              Alert.alert('Error', 'Failed to delete unit. Please try again.');
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
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading your units...</Text>
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
            <Ionicons name="cube" size={24} color={theme.colors.primary} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{savedUnits.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Saved Units</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="help-circle" size={24} color={theme.colors.secondary} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>0</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Questions</Text>
          </View>
        </View>

        {/* Saved Units Section */}
        {savedUnits.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>My Units</Text>
            </View>

            {savedUnits.map((unit) => (
              <View
                key={unit.id}
                style={[styles.unitCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
              >
                <TouchableOpacity 
                  style={styles.unitContent} 
                  activeOpacity={0.7}
                  onPress={() => handleUnitPress(unit.id)}
                  disabled={navigating}
                >
                  <View style={[styles.unitIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Ionicons name="cube-outline" size={32} color={theme.colors.primary} />
                  </View>
                  <View style={styles.unitInfo}>
                    <Text style={[styles.unitNickname, { color: theme.colors.text }]}>{unit.nickname}</Text>
                    <Text style={[styles.unitModel, { color: theme.colors.textSecondary }]}>
                      {unit.model.productLine.oem.name} • {unit.model.modelNumber}
                    </Text>
                    <View style={styles.unitMeta}>
                      {unit.location && (
                        <View style={styles.metaItem}>
                          <Ionicons name="location-outline" size={14} color={theme.colors.textTertiary} />
                          <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>{unit.location}</Text>
                        </View>
                      )}
                      {unit.installDate && (
                        <View style={styles.metaItem}>
                          <Ionicons name="calendar-outline" size={14} color={theme.colors.textTertiary} />
                          <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>{formatDate(unit.installDate)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteUnit(unit.id, unit.nickname)}
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

        {/* Empty State (when no units) */}
        {savedUnits.length === 0 && (
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
