/**
 * Site Details Modal (formerly Unit Details)
 * 
 * Shows all models at a site (grouped by nickname):
 * - Site name (nickname)
 * - Expandable model cards with their manuals
 * - Actions: Ask AI (with model selector if multiple), Add Model, Delete Model, Delete Site
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  TextInput,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { savedUnitsService, SavedUnitWithDetails } from '@/services/api/savedUnits.service';
import { modelsService } from '@/services/api/models.service';
import * as chatService from '@/services/api/chat.service';
import { getManualPublicUrl } from '@/services/supabase';
import { theme } from '@/utils/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface Manual {
  id: string;
  title: string;
  manualType: string;
  revision?: string;
  publishDate?: string;
  pageCount?: number;
  sourceUrl?: string;
  status: string;
  storagePath?: string;
}

interface ModelWithManuals {
  unit: SavedUnitWithDetails;
  manuals: Manual[];
  expanded: boolean;
  chatHistory: any[];
}

export default function SiteDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string; siteName?: string }>();
  const unitId = typeof params.id === 'string' ? params.id : '';
  const siteNameParam = typeof params.siteName === 'string' ? params.siteName : '';
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [siteName, setSiteName] = useState<string>(siteNameParam);
  const [models, setModels] = useState<ModelWithManuals[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedSiteName, setEditedSiteName] = useState('');
  const [savingSiteName, setSavingSiteName] = useState(false);

  // Load all units with the same nickname (site name)
  const loadSite = useCallback(async () => {
    // Must have either unitId or siteName to proceed
    if (!unitId && !siteNameParam) return;

    try {
      let nickname = siteNameParam;

      // If we have unitId but not siteName, look up the nickname
      if (unitId && !siteNameParam) {
        console.log('📦 Loading site for unit:', unitId);
        const initialUnit = await savedUnitsService.getById(unitId);
        nickname = initialUnit.nickname;
        setSiteName(nickname);
      } else {
        console.log('📦 Loading site by name:', nickname);
      }

      // Get all units and filter by nickname
      const allUnits = await savedUnitsService.getAll();
      const siteUnits = allUnits.filter(u => u.nickname === nickname);
      console.log(`✅ Found ${siteUnits.length} model(s) at site "${nickname}"`);

      // Load manuals and chat history for each unit
      const modelsWithData = await Promise.all(
        siteUnits.map(async (unit) => {
          let manuals: Manual[] = [];
          let chatHistory: any[] = [];

          try {
            // Load all manuals for the model
            const allManuals = await modelsService.getManualsByModel(unit.modelId);

            // Filter by selectedManualIds if they exist (user selected specific manuals)
            // @ts-ignore - selectedManualIds is a JSON field from database
            const selectedIds = unit.selectedManualIds as string[] | null;

            if (selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0) {
              console.log(`📋 Filtering ${allManuals.length} manuals by ${selectedIds.length} selected IDs for ${unit.model.modelNumber}`);
              manuals = allManuals.filter(m => selectedIds.includes(m.id));
              console.log(`✅ Filtered down to ${manuals.length} manuals`);
            } else {
              // No filter - show all manuals (backward compatibility)
              console.log(`📋 No manual filter for ${unit.model.modelNumber}, showing all ${allManuals.length} manuals`);
              manuals = allManuals;
            }
          } catch (e) {
            console.error(`Manual load error for ${unit.model.modelNumber}:`, e);
          }

          try {
            chatHistory = await chatService.getQuestionHistory(unit.id, 5);
          } catch (e) {
            console.error(`Chat history load error for ${unit.model.modelNumber}:`, e);
          }

          return {
            unit,
            manuals,
            chatHistory,
            expanded: false, // Start collapsed
          };
        })
      );

      setModels(modelsWithData);
    } catch (error) {
      console.error('Site load error:', error);
      Alert.alert('Error', 'Failed to load site details');
    } finally {
      setLoading(false);
    }
  }, [unitId, siteNameParam]);

  useEffect(() => {
    loadSite();
  }, [loadSite]);

  // Refresh site when screen comes back into focus (e.g., after adding a model)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Site details screen focused - refreshing data...');
      loadSite();
    }, [loadSite])
  );

  const toggleModelExpanded = (unitId: string) => {
    setModels(prev =>
      prev.map(m =>
        m.unit.id === unitId ? { ...m, expanded: !m.expanded } : m
      )
    );
  };

  const handleAskAI = () => {
    if (models.length === 0) return;

    if (models.length === 1) {
      // Single model - go straight to chat
      const model = models[0];
      router.push({
        pathname: '/(modals)/unit-chat',
        params: {
          unitId: model.unit.id,
          unitName: siteName,
          modelNumber: model.unit.model.modelNumber,
        },
      });
    } else {
      // Multiple models - show picker
      setShowModelPicker(true);
    }
  };

  const handleModelSelected = (unitId: string) => {
    const model = models.find(m => m.unit.id === unitId);
    if (!model) return;

    setShowModelPicker(false);
    router.push({
      pathname: '/(modals)/unit-chat',
      params: {
        unitId: model.unit.id,
        unitName: siteName,
        modelNumber: model.unit.model.modelNumber,
      },
    });
  };

  const handleViewManual = (manual: Manual) => {
    // Check both storagePath (uploaded PDFs) and sourceUrl (external PDFs)
    const pdfPath = manual.storagePath || manual.sourceUrl;

    if (pdfPath) {
      const publicUrl = getManualPublicUrl(pdfPath);
      router.push({
        pathname: '/(modals)/pdf-viewer',
        params: {
          url: publicUrl,
          title: manual.title || 'Manual',
        },
      });
    } else {
      Alert.alert('Manual Not Available', 'This manual PDF has not been uploaded yet.');
    }
  };

  const handleViewChat = (chat: any, unitId: string) => {
    const model = models.find(m => m.unit.id === unitId);
    if (!model) return;

    router.push({
      pathname: '/(modals)/unit-chat',
      params: {
        unitId: model.unit.id,
        unitName: siteName,
        modelNumber: model.unit.model.modelNumber,
        sessionId: chat.id,
      },
    });
  };

  const handleAddModel = () => {
    // Navigate to add-unit modal with pre-filled nickname and 'add-to-site' mode
    router.push({
      pathname: '/(modals)/add-unit',
      params: {
        siteName: siteName, // Pass site name to pre-fill
        mode: 'add-to-site', // Indicate we're adding to existing site
      },
    });
  };

  const handleDeleteModel = (unitId: string) => {
    const model = models.find(m => m.unit.id === unitId);
    if (!model) return;

    Alert.alert(
      'Delete Model',
      `Remove ${model.unit.model.modelNumber} from this site?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️  Deleting model:', unitId);
              setDeletingModelId(unitId);

              await savedUnitsService.delete(unitId);

              // If this was the last model, go back to library
              if (models.length === 1) {
                router.back();
              } else {
                // Reload site to show updated list
                await loadSite();
              }

              setDeletingModelId(null);
            } catch (error) {
              console.error('Delete error:', error);
              setDeletingModelId(null);
              Alert.alert('Error', 'Failed to delete model');
            }
          },
        },
      ]
    );
  };

  const handleEditSite = () => {
    setEditedSiteName(siteName);
    setShowEditModal(true);
  };

  const handleSaveSiteName = async () => {
    if (!editedSiteName.trim()) {
      Alert.alert('Required Field', 'Please enter a site name.');
      return;
    }

    if (editedSiteName.trim() === siteName) {
      setShowEditModal(false);
      return;
    }

    setSavingSiteName(true);

    try {
      // Update all units with the old nickname to have the new nickname
      await Promise.all(
        models.map(m =>
          savedUnitsService.update(m.unit.id, {
            nickname: editedSiteName.trim(),
          })
        )
      );

      setSiteName(editedSiteName.trim());
      setShowEditModal(false);
      setSavingSiteName(false);

      // Reload site to reflect changes
      await loadSite();

      Alert.alert('Success', 'Site name updated successfully!');
    } catch (error: any) {
      console.error('Save site name error:', error);
      setSavingSiteName(false);
      Alert.alert('Save Error', error?.message || 'Failed to update site name. Please try again.');
    }
  };

  const handleDeleteSite = () => {
    Alert.alert(
      'Delete Entire Site',
      `Delete "${siteName}" and all ${models.length} model(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all units with this nickname
              await Promise.all(
                models.map(m => savedUnitsService.delete(m.unit.id))
              );
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete site');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (models.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Site not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: siteName,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Site Header */}
        <View style={styles.headerCard}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditSite}
          >
            <Ionicons name="pencil" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <Ionicons name="business" size={48} color={theme.colors.backgroundSecondary} />
          </View>
          <Text style={styles.siteName}>{siteName}</Text>
          <Text style={styles.modelCount}>
            {models.length} {models.length === 1 ? 'Model' : 'Models'}
          </Text>
        </View>

        {/* Quick Action: Ask AI */}
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryAction]}
          onPress={handleAskAI}
        >
          <Ionicons name="chatbubbles" size={24} color={theme.colors.textSecondary} />
          <Text style={styles.actionButtonTextPrimary}>Ask AI About This Unit</Text>
        </TouchableOpacity>

        {/* Models Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Models at This Site</Text>

          {models.map((modelData) => (
            <View key={modelData.unit.id}>
              {/* Model Card Header */}
              <TouchableOpacity
                style={styles.modelCard}
                onPress={() => toggleModelExpanded(modelData.unit.id)}
              >
                <View style={styles.modelIconWrapper}>
                <View style={styles.modelIcon}>
                  <Ionicons name="cube" size={28} color={theme.colors.primary} />
                </View>
                </View>
                <View style={styles.modelInfo}>
                  <Text style={styles.modelNumber}>{modelData.unit.model.modelNumber}</Text>
                  <Text style={styles.modelMeta}>
                    {modelData.unit.model.productLine.oem.name} • {modelData.unit.model.productLine.name}
                  </Text>
                </View>
                <View style={styles.modelActions}>
                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    onPress={() => handleDeleteModel(modelData.unit.id)}
                    disabled={deletingModelId === modelData.unit.id}
                  >
                    {deletingModelId === modelData.unit.id ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                    )}
                  </TouchableOpacity>
                  <Ionicons
                    name={modelData.expanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color="#94A3B8"
                  />
                </View>
              </TouchableOpacity>

              {/* Expanded Content */}
              {modelData.expanded && (
                <View style={styles.expandedContent}>
                  {/* Unit Details */}
                  {(modelData.unit.serialNumber || modelData.unit.location || modelData.unit.notes) && (
                    <View style={styles.expandedSection}>
                      <Text style={styles.expandedSectionTitle}>Details</Text>
                      {modelData.unit.serialNumber && (
                        <View style={styles.detailRow}>
                          <Ionicons name="barcode-outline" size={16} color="#9CA3AF" />
                          <Text style={styles.detailLabel}>Serial:</Text>
                          <Text style={styles.detailValue}>{modelData.unit.serialNumber}</Text>
                        </View>
                      )}
                      {modelData.unit.location && (
                        <View style={styles.detailRow}>
                          <Ionicons name="location-outline" size={16} color="#9CA3AF" />
                          <Text style={styles.detailLabel}>Location:</Text>
                          <Text style={styles.detailValue}>{modelData.unit.location}</Text>
                        </View>
                      )}
                      {modelData.unit.notes && (
                        <View style={styles.detailRow}>
                          <Ionicons name="document-text-outline" size={16} color="#9CA3AF" />
                          <Text style={styles.detailLabel}>Notes:</Text>
                          <Text style={styles.detailValue}>{modelData.unit.notes}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Manuals */}
                  <View style={styles.expandedSection}>
                    <Text style={styles.expandedSectionTitle}>
                      Manuals ({modelData.manuals.length})
                    </Text>
                    {modelData.manuals.length === 0 ? (
                      <View style={styles.pendingBanner}>
                        <Ionicons name="globe-outline" size={20} color="#44AAE8" />
                        <View style={styles.pendingBannerText}>
                          <Text style={styles.pendingBannerTitle}>No Manuals Yet</Text>
                          <Text style={styles.pendingBannerDesc}>
                            We're working on adding documentation. Chat uses web search in the meantime.
                          </Text>
                        </View>
                      </View>
                    ) : (
                      modelData.manuals.map((manual) => (
                        <TouchableOpacity
                          key={manual.id}
                          style={styles.manualRow}
                          onPress={() => handleViewManual(manual)}
                        >
                          <Ionicons name="document-text" size={20} color="#A78BFA" />
                          <View style={styles.manualRowInfo}>
                            <Text style={styles.manualRowTitle}>{manual.title}</Text>
                            <Text style={styles.manualRowMeta}>
                              {manual.manualType} • {manual.pageCount || '?'} pages
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>

                  {/* Previous Chats */}
                  {modelData.chatHistory.length > 0 && (
                    <View style={styles.expandedSection}>
                      <Text style={styles.expandedSectionTitle}>
                        Previous Chats ({modelData.chatHistory.length})
                      </Text>
                      {modelData.chatHistory.map((chat) => (
                        <TouchableOpacity
                          key={chat.id}
                          style={styles.chatRow}
                          onPress={() => handleViewChat(chat, modelData.unit.id)}
                        >
                          <Ionicons name="chatbubble-ellipses" size={18} color="#A78BFA" />
                          <View style={styles.chatRowInfo}>
                            <Text style={styles.chatRowQuestion} numberOfLines={1}>
                              {chat.question}
                            </Text>
                            <Text style={styles.chatRowTimestamp}>
                              {new Date(chat.timestamp).toLocaleDateString()}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Add Model Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryAction]}
          onPress={handleAddModel}
        >
          <Ionicons name="add-circle-outline" size={24} color={theme.colors.secondary} />
          <Text style={styles.actionButtonTextSecondary}>Add Model to Site</Text>
        </TouchableOpacity>

        {/* Delete Site Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteSite}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
          <Text style={styles.deleteButtonText}>Delete Entire Site</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Model Picker Modal */}
      <Modal
        visible={showModelPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModelPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Model</Text>
            <Text style={styles.modalSubtitle}>Which model do you want to ask about?</Text>

            <ScrollView style={styles.modalList}>
              {models.map((modelData) => (
                <TouchableOpacity
                  key={modelData.unit.id}
                  style={styles.modalItem}
                  onPress={() => handleModelSelected(modelData.unit.id)}
                >
                  <Ionicons name="cube" size={24} color={theme.colors.primary} />
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemTitle}>
                      {modelData.unit.model.modelNumber}
                    </Text>
                    <Text style={styles.modalItemSubtitle}>
                      {modelData.unit.model.productLine.oem.name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowModelPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Site Name Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => !savingSiteName && setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.editModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.editModalOverlay}
            activeOpacity={1}
            onPress={() => !savingSiteName && setShowEditModal(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.editModalContent}
            >
              <Text style={styles.editModalTitle}>Edit Site Name</Text>

              <TextInput
                style={styles.editInput}
                value={editedSiteName}
                onChangeText={setEditedSiteName}
                placeholder="Enter site name"
                placeholderTextColor="#6B7280"
                autoCapitalize="words"
                autoCorrect={false}
                editable={!savingSiteName}
              />

              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalCancelButton]}
                  onPress={() => setShowEditModal(false)}
                  disabled={savingSiteName}
                >
                  <Text style={styles.editModalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalSaveButton]}
                  onPress={handleSaveSiteName}
                  disabled={savingSiteName || !editedSiteName.trim()}
                >
                  {savingSiteName ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.editModalSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 60,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  siteName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  modelCount: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  section: {
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  primaryAction: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryAction: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  actionButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.secondary,
  },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 2,
    gap: 12,
  },
  modelIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.backgroundTertiary + '90',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelInfo: {
    flex: 1,
  },
  modelNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  modelMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  modelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteIconButton: {
    padding: 8,
  },
  expandedContent: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  expandedSection: {
    marginTop: 16,
  },
  expandedSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  manualRowInfo: {
    flex: 1,
  },
  manualRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  manualRowMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  pendingBannerText: {
    flex: 1,
  },
  pendingBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.secondary,
    marginBottom: 3,
  },
  pendingBannerDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  chatRowInfo: {
    flex: 1,
  },
  chatRowQuestion: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  chatRowTimestamp: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    gap: 8,
    marginTop: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  bottomSpacer: {
    height: 40,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  modalItemSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  modalCancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  // Edit button styles
  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  // Edit modal styles (bottom sheet)
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 20,
  },
  editInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalCancelButton: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
  editModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  editModalSaveButton: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  }, 
  editModalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
