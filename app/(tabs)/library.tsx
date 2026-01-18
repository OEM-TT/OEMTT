import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

// Mock data - will be replaced with real data from API
const MOCK_SAVED_UNITS = [
  {
    id: '1',
    nickname: 'Johnson Residence',
    oem: 'Carrier',
    modelNumber: 'ABC-123-4567',
    installDate: '2020-03-15',
    location: 'Main House',
    manualCount: 3,
  },
  {
    id: '2',
    nickname: 'Smith HVAC Service',
    oem: 'Trane',
    modelNumber: 'XYZ-789-0123',
    installDate: '2018-07-22',
    location: 'Commercial Building',
    manualCount: 5,
  },
];

const MOCK_RECENT_QUESTIONS = [
  {
    id: '1',
    question: 'How do I reset the fault code?',
    unit: 'Johnson Residence',
    timestamp: '2 hours ago',
  },
  {
    id: '2',
    question: 'What is the refrigerant type?',
    unit: 'Smith HVAC Service',
    timestamp: '1 day ago',
  },
];

export default function LibraryScreen() {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="cube" size={24} color={theme.colors.primary} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{MOCK_SAVED_UNITS.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Saved Units</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="help-circle" size={24} color={theme.colors.secondary} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>{MOCK_RECENT_QUESTIONS.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Questions</Text>
          </View>
        </View>

        {/* Saved Units Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>My Units</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {MOCK_SAVED_UNITS.map((unit) => (
            <TouchableOpacity
              key={unit.id}
              style={[styles.unitCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
            >
              <View style={[styles.unitIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                <Ionicons name="cube-outline" size={32} color={theme.colors.primary} />
              </View>
              <View style={styles.unitInfo}>
                <Text style={[styles.unitNickname, { color: theme.colors.text }]}>{unit.nickname}</Text>
                <Text style={[styles.unitModel, { color: theme.colors.textSecondary }]}>
                  {unit.oem} {unit.modelNumber}
                </Text>
                <View style={styles.unitMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.textTertiary} />
                    <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>{unit.location}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="document-text-outline" size={14} color={theme.colors.textTertiary} />
                    <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>{unit.manualCount} manuals</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}

          {/* Add Unit Button */}
          <TouchableOpacity style={[styles.addButton, { borderColor: theme.colors.border }]}>
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>Add New Unit</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Questions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Questions</Text>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {MOCK_RECENT_QUESTIONS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.questionCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
            >
              <View style={[styles.questionIcon, { backgroundColor: theme.colors.secondary + '15' }]}>
                <Ionicons name="help-circle-outline" size={20} color={theme.colors.secondary} />
              </View>
              <View style={styles.questionInfo}>
                <Text style={[styles.questionText, { color: theme.colors.text }]} numberOfLines={2}>
                  {item.question}
                </Text>
                <Text style={[styles.questionMeta, { color: theme.colors.textTertiary }]}>
                  {item.unit} • {item.timestamp}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty State (when no units) */}
        {MOCK_SAVED_UNITS.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Saved Units</Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
              Add your first unit to start tracking manuals and asking questions
            </Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}>
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
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
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
  questionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  questionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  questionInfo: {
    flex: 1,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  questionMeta: {
    fontSize: 12,
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
