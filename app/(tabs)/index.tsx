import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <Text style={styles.logo}>OEM TechTalk</Text>
            <Text style={styles.tagline}>Professional Technical Documentation</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Find Answers Fast</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            AI-powered search across official OEM documentation
          </Text>
        </View>

        {/* Action Cards */}
        <View style={styles.actionCards}>
          <TouchableOpacity 
            style={[styles.actionCard, styles.primaryCard]}
            onPress={() => router.push('/(tabs)/search')}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="search" size={28} color={theme.colors.white} />
              </View>
              <Text style={styles.actionCardTitle}>Search Products</Text>
              <Text style={styles.actionCardDescription}>
                Find technical specs and manuals instantly
              </Text>
              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionCard, styles.secondaryCard]}
            onPress={() => router.push('/(tabs)/library')}
          >
            <LinearGradient
              colors={[theme.colors.secondary, theme.colors.secondaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="book" size={28} color={theme.colors.white} />
              </View>
              <Text style={styles.actionCardTitle}>Browse Library</Text>
              <Text style={styles.actionCardDescription}>
                Explore your saved manuals and docs
              </Text>
              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Why OEM TechTalk?</Text>
          
          <View style={[styles.featureCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <View style={[styles.featureIcon, { backgroundColor: theme.colors.feature1 + (isDark ? '30' : '15') }]}>
              <Ionicons name="shield-checkmark" size={24} color={theme.colors.feature1} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: theme.colors.text }]}>Source-Grounded</Text>
              <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                Every answer linked directly to official documentation
              </Text>
            </View>
          </View>

          <View style={[styles.featureCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <View style={[styles.featureIcon, { backgroundColor: theme.colors.feature2 + (isDark ? '30' : '15') }]}>
              <Ionicons name="document-text" size={24} color={theme.colors.feature2} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: theme.colors.text }]}>Official OEM Docs</Text>
              <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                Direct access to manufacturer specifications
              </Text>
            </View>
          </View>

          <View style={[styles.featureCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <View style={[styles.featureIcon, { backgroundColor: theme.colors.feature3 + (isDark ? '30' : '15') }]}>
              <Ionicons name="flash" size={24} color={theme.colors.feature3} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: theme.colors.text }]}>AI-Powered Search</Text>
              <Text style={[styles.featureDescription, { color: theme.colors.textSecondary }]}>
                Intelligent search understands your technical questions
              </Text>
            </View>
          </View>
        </View>

        {/* Stats/Trust Section */}
        <View style={[styles.statsSection, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>1000+</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Manuals</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>50+</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>OEM Brands</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>24/7</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Access</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: theme.spacing.xl,
  },
  headerContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
  },
  tagline: {
    fontSize: 14,
    color: theme.colors.white,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  hero: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionCards: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  actionCard: {
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  primaryCard: {
    height: 180,
  },
  secondaryCard: {
    height: 180,
  },
  cardGradient: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
  },
  actionCardDescription: {
    fontSize: 14,
    color: theme.colors.white,
    opacity: 0.9,
    lineHeight: 20,
  },
  cardArrow: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    right: theme.spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuresSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: theme.spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsSection: {
    flexDirection: 'row',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
  },
});
