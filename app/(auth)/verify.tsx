import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth';
import { supabase } from '@/services/supabase';

export default function VerifyScreen() {
  const { theme } = useTheme();
  const { refreshUser } = useAuth();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [checking, setChecking] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [devUrl, setDevUrl] = useState('');
  const [showDev, setShowDev] = useState(false);
  const styles = createStyles(theme);

  useEffect(() => {
    // Reset checking state on mount
    setChecking(false);

    const interval = setInterval(async () => {
      const session = await authService.getSession();
      if (session) {
        setIsVerified(true);
        setChecking(false);
        clearInterval(interval);

        // Refresh the AuthContext so it knows we're logged in
        await refreshUser();

        // Small delay to let context update, then navigate
        setTimeout(() => router.replace('/(tabs)'), 500);
      }
    }, 2000);
    const timeout = setTimeout(() => { clearInterval(interval); setChecking(false); }, 300000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [router, refreshUser]);

  const handleResendLink = async () => {
    try { if (email) await authService.sendMagicLink(email); } catch (e) { console.error(e); }
  };

  const handleDevVerify = async () => {
    setChecking(true);

    try {
      console.log('🔍 Dev Verify Started');
      console.log('🔍 Input URL:', devUrl);

      // Parse URL
      const cleanUrl = devUrl.trim();
      if (!cleanUrl) {
        Alert.alert('Empty URL', 'Please paste the magic link URL first');
        setChecking(false);
        return;
      }

      let url: URL;
      try {
        url = new URL(cleanUrl);
      } catch (e) {
        Alert.alert('Invalid URL', 'Could not parse URL. Make sure you copied the complete link from your email.');
        setChecking(false);
        return;
      }

      // Extract parameters
      const token = url.searchParams.get('token');
      const tokenHash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type');

      console.log('🔍 Extracted params:', { token: token?.substring(0, 10) + '...', tokenHash: tokenHash?.substring(0, 10), type });

      if (!token && !tokenHash) {
        Alert.alert('Missing Token', 'The URL does not contain a token parameter. Make sure you copied the full link.');
        setChecking(false);
        return;
      }

      if (!type) {
        Alert.alert('Missing Type', 'The URL does not contain a type parameter. Make sure you copied the full link.');
        setChecking(false);
        return;
      }

      // Verify with Supabase
      console.log('🔍 Calling Supabase verifyOtp...');
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash || token || '',
        type: type as any,
      });

      if (error) {
        console.error('❌ Verification error:', error);
        Alert.alert('Verification Failed', error.message || 'Unknown error from Supabase');
        setChecking(false);
        return;
      }

      console.log('✅ Verification successful');
      console.log('🔍 Checking for session...');

      // Check session
      const session = await authService.getSession();

      if (session) {
        console.log('✅ Session found!');
        setIsVerified(true);

        // Sync with backend (optional, may fail if backend not running)
        try {
          await authService.syncUserWithBackend();
        } catch (e) {
          console.log('Backend sync failed (optional):', e);
        }

        // Refresh the AuthContext so it knows we're logged in
        await refreshUser();
        console.log('✅ AuthContext refreshed');

        // Navigate to tabs
        setTimeout(() => {
          setChecking(false);
          router.replace('/(tabs)');
        }, 500);
      } else {
        console.error('❌ No session after verification');
        Alert.alert('Session Error', 'Verification succeeded but no session was created. This is unexpected.');
        setChecking(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('❌ Exception in handleDevVerify:', err);
      Alert.alert('Error', errorMsg);
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <LinearGradient colors={[theme.colors.primary, theme.colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={[styles.logo, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            {isVerified ? <Ionicons name="checkmark-circle" size={64} color={theme.colors.white} /> : <Ionicons name="mail" size={64} color={theme.colors.white} />}
          </View>
        </View>
      </LinearGradient>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 100 }}>
        {isVerified ? (
          <><Text style={[styles.title, { color: theme.colors.success }]}>Verified!</Text><Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Redirecting...</Text></>
        ) : (
          <>
            <Text style={[styles.title, { color: theme.colors.text }]}>Check Your Email</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Magic link sent to{'\n'}<Text style={{ fontWeight: '600', color: theme.colors.primary }}>{email}</Text>
            </Text>
            <View style={[styles.infoCard, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
              <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                <Text style={[{ fontSize: 16, fontWeight: '600', marginBottom: 4, color: theme.colors.text }]}>How to sign in:</Text>
                <Text style={[{ fontSize: 14, lineHeight: 22, color: theme.colors.textSecondary }]}>
                  1. Open the email{'\n'}2. Click the magic link{'\n'}3. Signed in automatically
                </Text>
              </View>
            </View>
            {checking && !showDev && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={{ marginLeft: 8, color: theme.colors.textSecondary }}>Waiting...</Text>
            </View>}
            <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.backgroundSecondary }]} onPress={handleResendLink}>
              <Ionicons name="refresh" size={20} color={theme.colors.primary} />
              <Text style={[styles.buttonText, { color: theme.colors.primary }]}>Resend</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, marginBottom: 16 }} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={theme.colors.textSecondary} />
              <Text style={{ marginLeft: 4, fontSize: 14, color: theme.colors.textSecondary }}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: theme.colors.backgroundSecondary, borderRadius: 8, marginBottom: 12 }} onPress={() => setShowDev(!showDev)}>
              <Ionicons name="code" size={16} color={theme.colors.textTertiary} />
              <Text style={{ marginLeft: 8, fontSize: 13, color: theme.colors.textTertiary }}>{showDev ? 'Hide' : 'Show'} Dev Mode</Text>
            </TouchableOpacity>
            {showDev && <View style={{ padding: 16, backgroundColor: theme.colors.backgroundSecondary, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8, color: theme.colors.text }}>🔧 Dev Mode - Manual Verification</Text>
              <Text style={{ fontSize: 12, marginBottom: 12, color: theme.colors.textSecondary, lineHeight: 18 }}>
                1. Check your email for the magic link{'\n'}
                2. Long press the link and copy{'\n'}
                3. Paste the full URL below{'\n'}
                4. Check the console for detailed logs
              </Text>
              <View style={{ marginBottom: 12 }}>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 11,
                    minHeight: 100,
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    fontFamily: 'monospace'
                  }}
                  placeholder="https://yoggiqlslhutwjhuhqda.supabase.co/auth/v1/verify?token=..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={devUrl}
                  onChangeText={setDevUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                />
                {devUrl.length > 0 && (
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: 8,
                      backgroundColor: theme.colors.backgroundSecondary,
                      borderRadius: 16,
                      width: 32,
                      height: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: theme.colors.border
                    }}
                    onPress={() => {
                      setDevUrl('');
                      setChecking(false);
                    }}
                  >
                    <Ionicons name="close" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 14,
                  backgroundColor: theme.colors.primary,
                  borderRadius: 8,
                  opacity: (!devUrl || checking) ? 0.5 : 1
                }}
                onPress={handleDevVerify}
                disabled={!devUrl || checking}
              >
                {checking ? (
                  <>
                    <ActivityIndicator size="small" color={theme.colors.white} />
                    <Text style={{ marginLeft: 8, fontSize: 14, color: theme.colors.white }}>Verifying... Check console</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
                    <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: theme.colors.white }}>Verify Token</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  header: { paddingVertical: theme.spacing.xxxl, paddingHorizontal: theme.spacing.lg },
  logoContainer: { alignItems: 'center' },
  logo: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 12, marginBottom: 24 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8, marginBottom: 12 },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
