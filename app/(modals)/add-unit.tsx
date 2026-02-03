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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { discoveryService } from '@/services/api/discovery.service';
import { savedUnitsService } from '@/services/api/savedUnits.service';
import { oemsService } from '@/services/api/oems.service';
import { OEM } from '@/types';
import { getManualPublicUrl } from '@/services/supabase';

type Step = 'search' | 'select-model' | 'select-manual' | 'details';

export default function AddUnitModal() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    siteName?: string;
    mode?: string;
    manualConfirmed?: string;
    manualData?: string;
  }>();
  const styles = createStyles(theme);

  // Check if we're adding to an existing site
  const isAddingToSite = params.mode === 'add-to-site';

  // State
  const [step, setStep] = useState<Step>('search');
  const [oems, setOems] = useState<OEM[]>([]);
  const [selectedOem, setSelectedOem] = useState<string>('');
  const [modelNumber, setModelNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [loadingOems, setLoadingOems] = useState(true);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [selectedManual, setSelectedManual] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [selectedModelForManuals, setSelectedModelForManuals] = useState<any>(null); // For showing manuals
  const [discoveryMessage, setDiscoveryMessage] = useState<string | null>(null);

  // Unit details
  const [nickname, setNickname] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Existing sites for quick selection
  const [existingSites, setExistingSites] = useState<string[]>([]);
  const [loadingExistingSites, setLoadingExistingSites] = useState(true);

  // Load OEMs on mount
  useEffect(() => {
    async function loadOems() {
      try {
        const data = await oemsService.getAll('HVAC');

        // ⚠️ TEMPORARY FILTER: Only showing Carrier for now
        // TO REMOVE THIS FILTER: 
        // 1. Replace the next line with: setOems(data);
        // 2. Remove the auto-select line below
        const filteredOems = data.filter(oem => oem.name === 'Carrier');
        setOems(filteredOems);

        // Auto-select Carrier since it's the only option
        if (filteredOems.length > 0) {
          setSelectedOem(filteredOems[0].id);
        }

      } catch (error) {
        console.error('Failed to load OEMs:', error);
        Alert.alert('Error', 'Failed to load manufacturers. Please try again.');
      } finally {
        setLoadingOems(false);
      }
    }
    loadOems();
  }, []);

  // Load existing sites on mount
  useEffect(() => {
    async function loadExistingSites() {
      try {
        const units = await savedUnitsService.getAll();
        // Extract unique nicknames (site names)
        const uniqueSites = [...new Set(units.map(unit => unit.nickname))];
        setExistingSites(uniqueSites);
      } catch (error) {
        console.error('Failed to load existing sites:', error);
      } finally {
        setLoadingExistingSites(false);
      }
    }
    loadExistingSites();
  }, []);

  // Pre-fill site name if provided (adding model to existing site)
  useEffect(() => {
    if (params.siteName && typeof params.siteName === 'string') {
      setNickname(params.siteName);
    }
  }, [params.siteName]);

  // useEffect(() => {
  //   if (selectedModel) {
  //     const oemName = selectedModel.productLine?.oem?.name || '';
  //     const modelNum = selectedModel.modelNumber || '';
  //     setNickname(`${oemName} ${modelNum}`.trim());
  //   }
  // }, [selectedModel]);

  // Check if user confirmed manual selection from PDF viewer
  useEffect(() => {
    if (params.manualConfirmed === 'true' && params.manualData) {
      try {
        const manual = JSON.parse(params.manualData as string);
        console.log('✅ Manual confirmed by user:', manual.model.modelNumber);

        if (isAddingToSite) {
          // Adding to existing site - save directly
          console.log('💾 Saving to existing site:', params.siteName);
          handleSaveToExistingSite(manual);
        } else {
          // Creating new site - show details form
          console.log('📝 Showing details form for new site');
          handleSelectManual(manual);
        }
      } catch (error) {
        console.error('Failed to parse manual data:', error);
      }
    }
  }, [params.manualConfirmed, params.manualData]);

  // Search for models with auto-discovery
  const handleSearch = async () => {
    // Validate inputs
    if (!selectedOem) {
      Alert.alert('Required Field', 'Please select a manufacturer.');
      return;
    }

    if (modelNumber.trim().length === 0) {
      Alert.alert('Required Field', 'Please enter a model number.');
      return;
    }

    setLoading(true);
    setDiscoveryMessage(null);

    // Simulate progressive loading messages to keep user informed
    const loadingMessages = [
      'Searching database...',
      'Manual not found, searching online...',
      'Downloading manual (this may take 30-60 seconds)...',
      'Processing PDF and extracting text...',
      'Analyzing content and creating searchable sections...',
      'Almost done, generating AI embeddings...',
    ];

    let messageIndex = 0;
    setLoadingMessage(loadingMessages[0]);

    // Update message every 8 seconds to show progress
    const messageInterval = setInterval(() => {
      messageIndex = Math.min(messageIndex + 1, loadingMessages.length - 1);
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 8000);

    try {
      const selectedOemData = oems.find(o => o.id === selectedOem);
      const oemName = selectedOemData?.name || '';

      console.log(`Searching: OEM="${oemName}", Model="${modelNumber}"`);
      const results = await discoveryService.search(modelNumber.trim(), oemName);

      clearInterval(messageInterval);

      console.log('Search results received:', results);
      console.log('Search results type:', typeof results);
      console.log('Search results keys:', results ? Object.keys(results) : 'undefined');

      if (!results) {
        Alert.alert('Error', 'No response from server. Please try again.');
        return;
      }

      if (!results.success) {
        Alert.alert(
          'Not Found',
          results.message || 'No manuals found for this model.'
        );
        return;
      }

      // Check if it was a discovery (new manual added)
      if (results.source === 'discovery' && results.message) {
        setDiscoveryMessage(results.message);
        Alert.alert('Success!', results.message);
      }

      // Handle results - could be manuals[] or manual
      if (results.manuals && results.manuals.length > 0) {
        setSearchResults(results);
        setStep('select-model');
      } else if (results.manual) {
        // Single manual discovered - auto-select it
        console.log('📦 Discovery response:', JSON.stringify(results.manual, null, 2));

        // Extract model info from discovery response
        const manualData: any = results.manual;
        const modelData = manualData.model;

        setSearchResults({
          manuals: [{
            id: manualData.id,
            title: manualData.title,
            type: 'service',
            pageCount: manualData.pageCount,
            sectionsCount: manualData.sectionsCreated,
            model: {
              id: modelData?.id || '',
              modelNumber: modelData?.modelNumber || modelNumber,
              productLine: modelData?.productLine || 'Unknown',
              oem: modelData?.oem || (selectedOem as any)?.name || 'Unknown',
            }
          }]
        });
        setStep('select-model');
      } else {
        Alert.alert('No Results', 'No manuals found for this model.');
      }
    } catch (error: any) {
      clearInterval(messageInterval);
      console.error('Search error:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        stack: error?.stack,
      });
      const errorMsg = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to search. Please try again.';
      Alert.alert('Search Error', errorMsg);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Select a manual/model
  const handleSelectManual = (manual: any) => {
    setSelectedManual(manual);

    console.log('📦 Selected manual:', JSON.stringify(manual, null, 2));

    // Extract model info from manual (including the model ID for saving)
    setSelectedModel({
      id: manual.model.id, // Important: model ID from database
      modelNumber: manual.model.modelNumber,
      productLine: {
        name: manual.model.productLine,
        oem: {
          name: manual.model.oem,
        },
      },
    });
    setStep('details');
  };

  // Save model to existing site (skip details form)
  const handleSaveToExistingSite = async (manual: any) => {
    if (!params.siteName) {
      Alert.alert('Error', 'Site name is missing.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Adding model to site...');

    try {
      await savedUnitsService.create({
        modelId: manual.model.id,
        nickname: params.siteName, // Use the existing site name
        // No serial, location, or notes - just add the model
      });

      setLoading(false);
      setLoadingMessage('');

      // Navigate back to site details (which will auto-refresh via useFocusEffect)
      console.log('✅ Model added to site! Navigating back to site details...');
      router.back(); // Close add-unit modal

      // Show success message
      setTimeout(() => {
        Alert.alert('Success', `${manual.model.modelNumber} added to ${params.siteName}!`);
      }, 300);
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Save Error', error?.response?.data?.message || 'Failed to add model. Please try again.');
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Save the unit (new site)
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

      // Close all modals and return to library
      console.log('✅ New site saved! Closing all modals and returning to library...');
      router.dismissAll();

      // Show success message after returning to library
      setTimeout(() => {
        Alert.alert('Success', `Site "${nickname.trim()}" created successfully!`);
      }, 500);
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Save Error', error?.response?.data?.message || 'Failed to save unit. Please try again.');
      setLoading(false);
    }
  };

  // Render step 1: Search
  const renderSearchStep = () => (
    <>
      <Text style={[styles.title, { color: theme.colors.text }]}>Find Your Unit</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        Select manufacturer and enter model number
      </Text>

      {/* Manufacturer Dropdown */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Manufacturer <Text style={{ color: theme.colors.danger }}>*</Text>
        </Text>
        {loadingOems ? (
          <View style={[styles.dropdownContainer, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.dropdownText, { color: theme.colors.textSecondary }]}>Loading...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.dropdownContainer, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
            onPress={() => {
              const oemButtons: any[] = oems.map(oem => ({
                text: oem.name,
                onPress: () => setSelectedOem(oem.id),
              }));
              oemButtons.push({ text: 'Cancel', style: 'cancel' });
              Alert.alert(
                'Select Manufacturer',
                'Choose a manufacturer',
                oemButtons
              );
            }}
          >
            <Ionicons name="business-outline" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.dropdownText, { color: selectedOem ? theme.colors.text : theme.colors.textTertiary }]}>
              {selectedOem ? oems.find(o => o.id === selectedOem)?.name : 'Select manufacturer...'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Model Number Input */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Model Number <Text style={{ color: theme.colors.danger }}>*</Text>
        </Text>
        <View style={[styles.searchContainer, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="e.g. 19XR, 25VNA8"
            placeholderTextColor={theme.colors.textTertiary}
            value={modelNumber}
            onChangeText={setModelNumber}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="characters"
          />
          {modelNumber.length > 0 && (
            <TouchableOpacity onPress={() => setModelNumber('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleSearch}
        disabled={loading || !selectedOem || modelNumber.trim().length === 0}
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

  // Render step 2: Select model (grouped by model, not individual manuals)
  const renderSelectModelStep = () => {
    const manuals = searchResults?.manuals || [];

    // Group manuals by model
    const modelGroups = manuals.reduce((acc: any, manual: any) => {
      const modelKey = manual.model.id || manual.model.modelNumber;
      if (!acc[modelKey]) {
        acc[modelKey] = {
          model: manual.model,
          manuals: [],
          totalSections: 0,
          totalPages: 0,
        };
      }
      acc[modelKey].manuals.push(manual);
      acc[modelKey].totalSections += manual.sectionsCount || 0;
      acc[modelKey].totalPages += manual.pageCount || 0;
      return acc;
    }, {});

    const models = Object.values(modelGroups);
    const count = models.length;

    return (
      <>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('search')}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.colors.text }]}>Select Your Model</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Found {count} {count === 1 ? 'model' : 'models'}
          {discoveryMessage && (
            <Text style={{ color: theme.colors.success }}> ✨ {discoveryMessage}</Text>
          )}
        </Text>

        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
          {models.map((modelGroup: any) => (
            <TouchableOpacity
              key={modelGroup.model.id || modelGroup.model.modelNumber}
              style={[styles.modelCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
              onPress={() => {
                setSelectedModelForManuals(modelGroup);
                setStep('select-manual');
              }}
            >
              <View style={styles.modelInfo}>
                <Text style={[styles.modelNumber, { color: theme.colors.text }]}>
                  {modelGroup.model.modelNumber}
                </Text>
                <Text style={[styles.modelMeta, { color: theme.colors.textSecondary }]}>
                  {modelGroup.model.oem} • {modelGroup.model.productLine}
                </Text>
                <View style={styles.modelBadges}>
                  <View style={[styles.badge, { backgroundColor: theme.colors.success + '15' }]}>
                    <Ionicons name="document-text" size={12} color={theme.colors.success} />
                    <Text style={[styles.badgeText, { color: theme.colors.success }]}>
                      {modelGroup.totalSections} sections • {modelGroup.totalPages} pages
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                      {modelGroup.manuals.length} {modelGroup.manuals.length === 1 ? 'manual' : 'manuals'}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </>
    );
  };

  // Render step 3: Select manual (for the chosen model)
  const renderSelectManualStep = () => {
    const manuals = selectedModelForManuals?.manuals || [];
    const model = selectedModelForManuals?.model;

    return (
      <>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep('select-model')}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          {model?.modelNumber}
        </Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {model?.oem} • {model?.productLine}
        </Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary, marginTop: 4 }]}>
          Select a manual to continue
        </Text>

        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
          {manuals.map((manual: any) => (
            <TouchableOpacity
              key={manual.id}
              style={[styles.modelCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}
              onPress={() => {
                // Navigate to PDF viewer for preview before saving
                if (manual.sourceUrl || manual.storagePath) {
                  const pdfPath = manual.sourceUrl || manual.storagePath;
                  const publicUrl = getManualPublicUrl(pdfPath);

                  // Navigate to PDF viewer in preview mode with appropriate button text
                  // Pass manual data as serialized JSON so we can recover it if button is pressed
                  router.push({
                    pathname: '/(modals)/pdf-viewer',
                    params: {
                      url: publicUrl,
                      title: manual.title || 'Manual',
                      mode: 'preview-to-save',
                      buttonText: isAddingToSite ? 'Add this model to my site' : 'Continue to Details',
                      returnTo: '/(modals)/add-unit', // Where to go back to
                      manualData: JSON.stringify(manual), // Pass manual data for confirmation
                      siteName: params.siteName || '', // Pass through site name if adding to existing site
                    },
                  });
                } else {
                  // No PDF available, go straight to details
                  Alert.alert('No PDF', 'This manual does not have a PDF available for preview.', [
                    {
                      text: 'Continue Anyway',
                      onPress: () => handleSelectManual(manual),
                    },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }
              }}
            >
              <View style={styles.modelInfo}>
                <Text style={[styles.modelNumber, { color: theme.colors.text }]}>
                  {manual.title}
                </Text>
                <View style={styles.modelBadges}>
                  <View style={[styles.badge, { backgroundColor: theme.colors.success + '15' }]}>
                    <Ionicons name="document-text" size={12} color={theme.colors.success} />
                    <Text style={[styles.badgeText, { color: theme.colors.success }]}>
                      {manual.sectionsCount} sections • {manual.pageCount || '?'} pages
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                      {manual.type}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </>
    );
  };

  // Render step 3: Unit details
  const renderDetailsStep = () => (
    <>


      {/* <Text style={[styles.title, { color: theme.colors.text }]}>Unit Details</Text>
      <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
        {selectedModel?.productLine?.oem?.name} {selectedModel?.modelNumber}
      </Text> */}

      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        {/* Check if adding to existing site */}
        {nickname && existingSites.includes(nickname) ? (
          <>
            {/* Existing Site Card */}
            <View style={[styles.existingSiteCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
              <View style={[styles.existingSiteIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="business" size={32} color={theme.colors.primary} />
              </View>
              <Text style={[styles.existingSiteCardTitle, { color: theme.colors.text }]}>Adding to Existing Site</Text>
              <Text style={[styles.existingSiteCardSite, { color: theme.colors.primary }]}>{nickname}</Text>
              <Text style={[styles.existingSiteCardDescription, { color: theme.colors.textSecondary }]}>
                This unit will be added to your existing site
              </Text>

              <TouchableOpacity
                style={[styles.changeSiteButton, { borderColor: theme.colors.border }]}
                onPress={() => setNickname('')}
              >
                <Ionicons name="swap-horizontal" size={18} color={theme.colors.textSecondary} />
                <Text style={[styles.changeSiteButtonText, { color: theme.colors.textSecondary }]}>
                  Change Site or Create New
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.colors.primary, marginTop: theme.spacing.xl }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Add to {nickname}</Text>
                  <Ionicons name="checkmark" size={20} color={theme.colors.white} />
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Add to Existing Site Option */}
            {!loadingExistingSites && existingSites.length > 0 && (
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Quick Add to Existing Site</Text>
                <TouchableOpacity
                  style={[styles.existingSiteButton, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white, borderColor: theme.colors.border }]}
                  onPress={() => {
                    const siteButtons = [
                      ...existingSites.map(site => ({
                        text: site,
                        onPress: () => setNickname(site),
                      })),
                      { text: 'Cancel', style: 'cancel' as const },
                    ];
                    Alert.alert(
                      'Select Existing Site',
                      'Choose a site to add this unit to',
                      siteButtons
                    );
                  }}
                >
                  <Ionicons name="folder-open-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={[styles.existingSiteButtonText, { color: theme.colors.textSecondary }]}>
                    Select from {existingSites.length} existing {existingSites.length === 1 ? 'site' : 'sites'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* New Site Form */}
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
          </>
        )}
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
          {step === 'select-manual' && renderSelectManualStep()}
          {step === 'details' && renderDetailsStep()}
        </View>
      </KeyboardAvoidingView>

      {/* Loading Overlay with Progress */}
      <Modal
        transparent
        visible={loading && loadingMessage.length > 0}
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingCard, { backgroundColor: theme.colors.backgroundSecondary }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingTitle, { color: theme.colors.text }]}>
              {loadingMessage}
            </Text>
            <Text style={[styles.loadingSubtitle, { color: theme.colors.textSecondary }]}>
              This may take up to 60 seconds for new manuals
            </Text>
          </View>
        </View>
      </Modal>
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
      gap: theme.spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
    },
    dropdownContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.sm,
      gap: theme.spacing.sm,
    },
    dropdownText: {
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
    existingSiteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      gap: theme.spacing.sm,
    },
    existingSiteButtonText: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
    },
    existingSiteCard: {
      padding: theme.spacing.xl,
      borderRadius: theme.borderRadius.xl,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      ...theme.shadows.md,
    },
    existingSiteIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    existingSiteCardTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    existingSiteCardSite: {
      fontSize: 22,
      fontWeight: '700',
      marginBottom: theme.spacing.sm,
    },
    existingSiteCardDescription: {
      fontSize: 14,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    changeSiteButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      gap: theme.spacing.xs,
    },
    changeSiteButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    loadingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    loadingCard: {
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl * 1.5,
      alignItems: 'center',
      maxWidth: 340,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    loadingTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: theme.spacing.lg,
      textAlign: 'center',
    },
    loadingSubtitle: {
      fontSize: 14,
      marginTop: theme.spacing.sm,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
