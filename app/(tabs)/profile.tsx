import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// Mock user data - will be replaced with real data from API/Auth
const MOCK_USER = {
  name: 'John Technician',
  email: 'john@example.com',
  tier: 'free',
  questionsUsed: 23,
  questionsLimit: 50,
};

export default function ProfileScreen() {
  const { theme, isDark } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const styles = createStyles(theme);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => {
          // TODO: Implement logout
          console.log('Logging out...');
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>
              {MOCK_USER.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <Text style={[styles.userName, { color: theme.colors.text }]}>{MOCK_USER.name}</Text>
          <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{MOCK_USER.email}</Text>
          
          {/* Subscription Badge */}
          <View style={[styles.tierBadge, { backgroundColor: theme.colors.primary + '15' }]}>
            <Text style={[styles.tierText, { color: theme.colors.primary }]}>
              {MOCK_USER.tier.toUpperCase()} TIER
            </Text>
          </View>
        </View>

        {/* Usage Stats */}
        <View style={[styles.usageCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
          <View style={styles.usageHeader}>
            <Text style={[styles.usageTitle, { color: theme.colors.text }]}>Monthly Usage</Text>
            <TouchableOpacity>
              <Text style={[styles.upgradeText, { color: theme.colors.primary }]}>Upgrade</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: theme.colors.primary,
                    width: `${(MOCK_USER.questionsUsed / MOCK_USER.questionsLimit) * 100}%`
                  }
                ]} 
              />
            </View>
            <Text style={[styles.usageText, { color: theme.colors.textSecondary }]}>
              {MOCK_USER.questionsUsed} / {MOCK_USER.questionsLimit} questions
            </Text>
          </View>
        </View>

        {/* Settings Sections */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>ACCOUNT</Text>
          
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="person-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="card-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Subscription</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="receipt-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Billing History</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>PREFERENCES</Text>
          
          <View style={[styles.settingItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="notifications-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
            />
          </View>

          <TouchableOpacity style={[styles.settingItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="language-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Language</Text>
            <View style={styles.settingValue}>
              <Text style={[styles.settingValueText, { color: theme.colors.textSecondary }]}>English</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.settingItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={theme.colors.primary} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Theme</Text>
            <Text style={[styles.settingValueText, { color: theme.colors.textSecondary }]}>System</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>SUPPORT</Text>
          
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="help-circle-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Help Center</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="mail-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.settingItem, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="document-text-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.settingText, { color: theme.colors.text }]}>Terms & Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, { borderColor: theme.colors.danger }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color={theme.colors.danger} />
          <Text style={[styles.logoutText, { color: theme.colors.danger }]}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={[styles.versionText, { color: theme.colors.textTertiary }]}>
          Version 0.2.0
        </Text>
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
  profileHeader: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.white,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: theme.spacing.md,
  },
  tierBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
  },
  usageCard: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    gap: theme.spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.borderRadius.full,
  },
  usageText: {
    fontSize: 14,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xs,
    ...theme.shadows.sm,
    gap: theme.spacing.md,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  settingValueText: {
    fontSize: 14,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: theme.spacing.lg,
  },
});
