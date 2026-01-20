import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/services/auth';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devMode, setDevMode] = useState(false);
  const styles = createStyles(theme);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleDevModeLogin = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('🔧 DEV MODE: Direct login for:', email);
      
      // Call backend dev login endpoint
      const response = await fetch('http://localhost:3000/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Dev login failed');
      }

      console.log('✅ Dev login successful!');
      console.log('  - User:', data.user.email);
      console.log('  - User ID:', data.user.id);

      // Set the session in Supabase client
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        throw sessionError;
      }

      console.log('✅ Session set successfully!');
      
      // Refresh the auth context
      await refreshUser();

      console.log('✅ Auth context refreshed - navigating to tabs...');
      
      // Navigate to the app
      router.replace('/(tabs)');

    } catch (err: any) {
      console.error('❌ Dev mode login failed:', err);
      const errorMessage = err.message || 'Dev mode login failed';
      setError(errorMessage);
      Alert.alert('Dev Mode Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('📧 Sending OTP to:', email);
      await authService.sendMagicLink(email);
      console.log('✅ OTP sent successfully! Check your email.');
      router.push({ pathname: '/(auth)/verify', params: { email } });
    } catch (err: any) {
      console.error('❌ Failed to send OTP:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
      const errorMessage = err.message || err.response?.data?.message || 'Failed to send login code';
      setError(errorMessage);
      Alert.alert('Error', errorMessage + '\n\nPlease try again or check your email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header Gradient */}
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <View style={[styles.logo, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="shield-checkmark" size={48} color={theme.colors.white} />
            </View>
            <Text style={styles.appName}>OEM TechTalk</Text>
            <Text style={styles.tagline}>Professional Technical Documentation</Text>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Sign in with your email to continue
          </Text>

          {/* Email Input */}
          <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Enter your email"
              placeholderTextColor={theme.colors.textTertiary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            {email.length > 0 && (
              <TouchableOpacity onPress={() => setEmail('')} disabled={loading}>
                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {error ? (
            <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>
          ) : null}

          {/* Dev Mode Toggle */}
          <TouchableOpacity
            onPress={() => setDevMode(!devMode)}
            style={styles.devModeToggle}
          >
            <Ionicons 
              name={devMode ? "checkmark-circle" : "ellipse-outline"} 
              size={20} 
              color={devMode ? theme.colors.success : theme.colors.textSecondary} 
            />
            <Text style={[styles.devModeText, { color: theme.colors.textSecondary }]}>
              Dev Mode (Skip Email)
            </Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={devMode ? handleDevModeLogin : handleSendMagicLink}
            disabled={loading || !email}
          >
            <LinearGradient
              colors={loading || !email ? [theme.colors.disabled, theme.colors.disabled] : devMode ? [theme.colors.warning, theme.colors.warningDark] : [theme.colors.primary, theme.colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <Text style={styles.buttonText}>Processing...</Text>
              ) : devMode ? (
                <>
                  <Ionicons name="bug" size={20} color={theme.colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Dev Login</Text>
                  <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
                </>
              ) : (
                <>
                  <Text style={styles.buttonText}>Send Magic Link</Text>
                  <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.info}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.textTertiary} />
            <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
              We'll send you a magic link to sign in securely without a password
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
  },
  tagline: {
    fontSize: 14,
    color: theme.colors.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: theme.spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
  },
  error: {
    fontSize: 14,
    marginBottom: theme.spacing.md,
    marginTop: -theme.spacing.xs,
  },
  devModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  devModeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    flexDirection: 'row',
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: theme.spacing.sm,
    lineHeight: 20,
  },
});
