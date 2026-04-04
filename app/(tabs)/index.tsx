import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

const LOGO_ICON = require('@/assets/icon_old.png');

// Navy surface colors — slightly lighter than the base so cards have depth
const NAV_BG     = '#0D1929';
const CARD_BG    = '#162438';
const CARD_ALT   = '#1A2C44';

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header — always navy */}
      <View style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <View style={styles.headerRow}>
              <Image source={LOGO_ICON} style={styles.headerLogo} />
              <View style={styles.logoTextContainer}>
                <Text style={styles.logoText}>OEM TechTalk</Text>
                <Text style={styles.tagline}>Professional Technical Documentation</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.title}>Find Answers Fast</Text>
          <Text style={styles.subtitle}>
            AI-powered search across official OEM documentation
          </Text>
        </View>

        {/* Action Cards — navy with brand-color accent bar + icon */}
        <View style={styles.actionCards}>
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardGreen]}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/search')}
          >
            {/* Colored top accent bar */}
            <View style={[styles.cardAccentBar, { backgroundColor: theme.colors.primary }]} />
            <View style={styles.cardBody}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '22' }]}>
                <Ionicons name="search" size={26} color={theme.colors.primary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.actionCardTitle}>Search Products</Text>
                <Text style={styles.actionCardDescription}>
                  Find technical specs and manuals instantly
                </Text>
              </View>
              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardBlue]}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/library')}
          >
            <View style={[styles.cardAccentBar, { backgroundColor: theme.colors.secondary }]} />
            <View style={styles.cardBody}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.secondary + '22' }]}>
                <Ionicons name="book" size={26} color={theme.colors.secondary} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.actionCardTitle}>Browse Library</Text>
                <Text style={styles.actionCardDescription}>
                  Explore your saved manuals and docs
                </Text>
              </View>
              <View style={styles.cardArrow}>
                <Ionicons name="arrow-forward" size={18} color={theme.colors.secondary} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats bar */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>1000+</Text>
            <Text style={styles.statLabel}>Manuals</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>50+</Text>
            <Text style={styles.statLabel}>OEM Brands</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>24/7</Text>
            <Text style={styles.statLabel}>Access</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Why OEM TechTalk?</Text>

          {[
            {
              icon: 'shield-checkmark' as const,
              color: theme.colors.primary,
              title: 'Source-Grounded',
              desc: 'Every answer linked directly to official documentation',
            },
            {
              icon: 'document-text' as const,
              color: theme.colors.secondary,
              title: 'Official OEM Docs',
              desc: 'Direct access to manufacturer specifications',
            },
            {
              icon: 'flash' as const,
              color: theme.colors.primary,
              title: 'AI-Powered Search',
              desc: 'Intelligent search understands your technical questions',
            },
          ].map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + '20' }]}>
                <Ionicons name={f.icon} size={22} color={f.color} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDescription}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAV_BG,
  },
  header: {
    backgroundColor: NAV_BG,
    borderBottomWidth: 1,
    borderBottomColor: '#1E3347',
  },
  headerContent: {
    paddingHorizontal: theme.spacing.sm,

  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 60,
    height: 60,
    borderRadius: 9,
  },
  logoTextContainer: {
    marginLeft: -8,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  tagline: {
    fontSize: 12,
    color: '#6E8DA8',
    marginTop: 1,
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
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6E8DA8',
  },
  actionCards: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  actionCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: '#1E3347',
  },
  actionCardGreen: {},
  actionCardBlue: {},
  cardAccentBar: {
    height: 3,
    width: '100%',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  actionCardDescription: {
    fontSize: 13,
    color: '#6E8DA8',
    lineHeight: 18,
  },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E3347',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#1E3347',
    padding: theme.spacing.lg,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6E8DA8',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#1E3347',
  },
  featuresSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: theme.spacing.md,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_ALT,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#1E3347',
    gap: theme.spacing.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  featureDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6E8DA8',
  },
});
