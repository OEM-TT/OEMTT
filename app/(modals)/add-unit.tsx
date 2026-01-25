import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { modelsService, ModelSearchResult } from '@/services/api/models.service';
import { savedUnitsService } from '@/services/api/savedUnits.service';

type Step = 'search' | 'select-model' | 'details';

export default function AddUnitModal() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);

  // State
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ModelSearchResult | null>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);

  // Unit details
  const [nickname, setNickname] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedModel) {
      const oemName = selectedModel.productLine?.oem?.name || '';
      const modelNumber = selectedModel.modelNumber || '';
      setNickname(`${oemName} ${modelNumber}`.trim());
    }
  }, [selectedModel]);

  // Search for models
  const handleSearch = async () => {
    if (searchQuery.trim().length === 0) return;

    setLoading(true);
    try {
      const results = await modelsService.search(searchQuery, 10);
      setSearchResults(results);

      if (results.count === 0) {
        Alert.alert('No Results', 'No models found matching your search. Try a different model number.');
      } else {
        setStep('select-model');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      Alert.alert('Search Error', error?.response?.data?.message || 'Failed to search models. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Select a model
  const handleSelectModel = (model: any) => {
    setSelectedModel(model);
    setStep('details');
  };

  // Save the unit
  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('Required Field', 'Please enter a nickname for this unit.');
      return;
    }

    setLoading(true);
    try {
      await savedUnitsService.create({
        modelId: selectedModel.id,
        nickname: nickname.trim(),
        serialNumber: serialNumber.trim() || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Unit saved successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Save Error', error?.response?.data?.message || 'Failed to save unit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render step 1: Search
  const renderSearchStep = () => (
    <>
      <Text style={[styles.title, { color: theme.colors.text }]}>Find Your Unit</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Enter the model number to get started
      </Text>

      <View style={[styles.searchContainer, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="e.g. ABC-123-4567"
          placeholderTextColor={theme.colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="characters"
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleSearch}
        disabled={loading || searchQuery.trim().length === 0}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.white} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Search</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
        <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>OR</Text>
        <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
      </View>

      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
      >
        <Ionicons name="camera-outline" size={24} color={theme.colors.primary} />
        <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>Scan Serial Plate</Text>
      </TouchableOpacity>
    </>
  );

  // Render step 2: Select model
  const renderSelectModelStep = () => (
    <>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('search')}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.colors.text }]}>Select Your Model</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Found {searchResults?.count || 0} {searchResults?.count === 1 ? 'result' : 'results'}
      </Text>

      <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
        {searchResults?.models.map((model) => (
          <TouchableOpacity
            key={model.id}
            style={[styles.modelCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
            onPress={() => handleSelectModel(model)}
          >
            <View style={styles.modelInfo}>
              <Text style={[styles.modelNumber, { color: theme.colors.text }]}>
                {model.modelNumber}
              </Text>
              <Text style={[styles.modelMeta, { color: theme.colors.textSecondary }]}>
                {model.productLine.oem.name} • {model.productLine.name}
              </Text>
              <View style={styles.modelBadges}>
                {model._count.manuals > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.success + '15' }]}>
                    <Ionicons name="document-text" size={12} color={theme.colors.success} />
                    <Text style={[styles.badgeText, { color: theme.colors.success }]}>
                      {model._count.manuals} {model._count.manuals === 1 ? 'manual' : 'manuals'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  // Render step 3: Unit details
  const renderDetailsStep = () => (
    <>


      {/* <Text style={[styles.title, { color: theme.colors.text }]}>Unit Details</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        {selectedModel?.productLine?.oem?.name} {selectedModel?.modelNumber}
      </Text> */}

      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Nickname <Text style={{ color: theme.colors.danger }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white, borderColor: theme.colors.border }]}
            placeholder="e.g. Johnson Residence"
            placeholderTextColor={theme.colors.textTertiary}
            value={nickname}
            onChangeText={setNickname}
            autoFocus
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Serial Number</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white, borderColor: theme.colors.border }]}
            placeholder=""
            placeholderTextColor={theme.colors.textTertiary}
            value={serialNumber}
            onChangeText={setSerialNumber}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Location</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text, backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white, borderColor: theme.colors.border }]}
            placeholder="e.g. Main House, Basement"
            placeholderTextColor={theme.colors.textTertiary}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Notes</Text>
          <TextInput
            style={[styles.textArea, { color: theme.colors.text, backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white, borderColor: theme.colors.border }]}
            placeholder="Add any notes about this unit..."
            placeholderTextColor={theme.colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
          disabled={loading || !nickname.trim()}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Save Unit</Text>
              <Ionicons name="checkmark" size={20} color={theme.colors.white} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Unit Details</Text>
          {/* <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            {selectedModel?.productLine?.oem?.name} {selectedModel?.modelNumber}
          </Text> */}
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {step === 'search' && renderSearchStep()}
          {step === 'select-model' && renderSelectModelStep()}
          {step === 'details' && renderDetailsStep()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    closeButton: {
      padding: theme.spacing.xs,
    },
    backButton: {
      position: 'absolute',
      top: 0,
      left: 0,
      padding: theme.spacing.xs,
      zIndex: 10,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: theme.spacing.xs,
    },
    description: {
      fontSize: 16,
      marginBottom: theme.spacing.xl,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.sm,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      gap: theme.spacing.sm,
    },
    primaryButtonText: {
      color: theme.colors.white,
      fontSize: 16,
      fontWeight: '600',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
    },
    dividerText: {
      fontSize: 14,
      fontWeight: '500',
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 2,
      gap: theme.spacing.sm,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    resultsList: {
      flex: 1,
      marginTop: theme.spacing.md,
    },
    modelCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    modelInfo: {
      flex: 1,
    },
    modelNumber: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    modelMeta: {
      fontSize: 14,
      marginBottom: theme.spacing.xs,
    },
    modelBadges: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.md,
      gap: 4,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '500',
    },
    formScroll: {
      flex: 1,
      marginTop: theme.spacing.md,
    },
    formGroup: {
      marginBottom: theme.spacing.lg,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: theme.spacing.sm,
    },
    input: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      fontSize: 16,
    },
    textArea: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      fontSize: 16,
      minHeight: 100,
    },
  });
