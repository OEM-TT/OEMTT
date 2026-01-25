/**
 * Unit Details Modal
 * 
 * Shows full information about a saved unit including:
 * - Unit details (model, serial, location, etc.)
 * - Available manuals
 * - Actions (Ask AI, View Manual, Edit, Delete)
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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { savedUnitsService, SavedUnitWithDetails } from '@/services/api/savedUnits.service';
import { modelsService } from '@/services/api/models.service';
import * as chatService from '@/services/api/chat.service';

interface Manual {
  id: string;
  title: string;
  manualType: string;
  revision?: string;
  publishDate?: string;
  pageCount?: number;
  sourceUrl?: string;
  status: string;
}

interface ChatHistory {
  id: string;
  question: string;
  answer: string;
  confidence: number;
  processingTime: number;
  timestamp: Date;
  model: string;
  manualTitle?: string;
  modelNumber?: string;
}

export default function UnitDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const unitId = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();

  const [unit, setUnit] = useState<SavedUnitWithDetails | null>(null);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Simple useEffect - load once on mount
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!unitId) return;

      try {
        console.log('📦 Loading unit:', unitId);
        const unitData = await savedUnitsService.getById(unitId);
        if (!mounted) return;

        console.log('✅ Unit loaded:', unitData.nickname);
        setUnit(unitData);

        // Load manuals
        try {
          const manualsData = await modelsService.getManualsByModel(unitData.modelId);
          if (!mounted) return;
          console.log('✅ Manuals loaded:', manualsData.length);
          setManuals(manualsData);
        } catch (e) {
          console.error('Manual load error:', e);
        }

        // Load chat history
        try {
          const history = await chatService.getQuestionHistory(unitId, 5); // Last 5 chats
          if (!mounted) return;
          console.log('✅ Chat history loaded:', history.length);
          setChatHistory(history);
        } catch (e) {
          console.error('Chat history load error:', e);
        }
      } catch (error) {
        console.error('Unit load error:', error);
        if (mounted) {
          Alert.alert('Error', 'Failed to load unit details');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [unitId]);

  // Refresh chat history when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      if (!unitId) return;

      async function refreshChatHistory() {
        try {
          const history = await chatService.getQuestionHistory(unitId, 5);
          console.log('🔄 Refreshed chat history:', history.length);
          setChatHistory(history);
        } catch (e) {
          console.error('Chat history refresh error:', e);
        }
      }

      refreshChatHistory();
    }, [unitId])
  );

  const handleAskAI = () => {
    if (!unit) return;
    router.push({
      pathname: '/(modals)/unit-chat',
      params: {
        unitId: unit.id,
        unitName: unit.nickname,
        modelNumber: unit.model.modelNumber,
      },
    });
  };

  const handleViewChat = (chat: ChatHistory) => {
    if (!unit) return;
    router.push({
      pathname: '/(modals)/unit-chat',
      params: {
        unitId: unit.id,
        unitName: unit.nickname,
        modelNumber: unit.model.modelNumber,
        questionId: chat.id, // Pass question ID to load the conversation
      },
    });
  };

  const handleViewManual = (manual: Manual) => {
    if (manual.sourceUrl) {
      router.push({
        pathname: '/(modals)/pdf-viewer',
        params: {
          url: manual.sourceUrl,
          title: manual.title || 'Manual',
        },
      });
    } else {
      Alert.alert('Manual Not Available', 'This manual PDF has not been uploaded yet.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Unit',
      `Are you sure you want to delete "${unit?.nickname}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (unit) {
                await savedUnitsService.delete(unit.id);
                router.back();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete unit');
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
          <ActivityIndicator size="large" color="#A78BFA" />
        </View>
      </View>
    );
  }

  if (!unit) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Unit not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: unit.nickname,
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="cube" size={48} color="#A78BFA" />
          </View>
          <Text style={styles.unitName}>{unit.nickname}</Text>
          <Text style={styles.modelNumber}>
            {unit.model.productLine.oem.name} • {unit.model.modelNumber}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={handleAskAI}
          >
            <Ionicons name="chatbubbles" size={24} color="#8338ec" />
            <Text style={styles.actionButtonTextPrimary}>Ask AI About This Unit</Text>
          </TouchableOpacity>
        </View>

        {/* Unit Details */}
        {(!!unit.serialNumber || !!unit.location || !!unit.installDate || !!unit.notes) && (<View style={styles.section}>
          <Text style={styles.sectionTitle}>Unit Details</Text>

          {unit.serialNumber && (
            <View style={styles.detailRow}>
              <Ionicons name="barcode-outline" size={20} color="#9CA3AF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Serial Number</Text>
                <Text style={styles.detailValue}>{unit.serialNumber}</Text>
              </View>
            </View>
          )}

          {unit.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#9CA3AF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{unit.location}</Text>
              </View>
            </View>
          )}

          {unit.installDate && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#9CA3AF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Install Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(unit.installDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          {unit.notes && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={20} color="#9CA3AF" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{unit.notes}</Text>
              </View>
            </View>
          )}
        </View>
        )}

        {/* Available Manuals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Manuals</Text>

          {loading ? (
            <ActivityIndicator size="small" color="#A78BFA" style={styles.loader} />
          ) : manuals.length > 0 ? (
            manuals.map((manual) => (
              <TouchableOpacity
                key={manual.id}
                style={styles.manualCard}
                onPress={() => handleViewManual(manual)}
              >
                <View style={styles.manualIcon}>
                  <Ionicons name="document-text" size={24} color="#A78BFA" />
                </View>
                <View style={styles.manualInfo}>
                  <Text style={styles.manualTitle}>{manual.title}</Text>
                  <View style={styles.manualMeta}>
                    <Text style={styles.manualType}>{manual.manualType}</Text>
                    {manual.pageCount && (
                      <>
                        <Text style={styles.manualSeparator}>•</Text>
                        <Text style={styles.manualPages}>{manual.pageCount} pages</Text>
                      </>
                    )}
                    {manual.revision && (
                      <>
                        <Text style={styles.manualSeparator}>•</Text>
                        <Text style={styles.manualRevision}>Rev {manual.revision}</Text>
                      </>
                    )}
                  </View>
                  {manual.status === 'active' && manual.sourceUrl && (
                    <View style={styles.availableBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.availableText}>Available</Text>
                    </View>
                  )}
                  {manual.status === 'pending' && (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="time-outline" size={14} color="#F59E0B" />
                      <Text style={styles.pendingText}>Coming Soon</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color="#6B7280" />
              <Text style={styles.emptyText}>No manuals available</Text>
              <Text style={styles.emptySubtext}>
                We're working on adding manuals for this model
              </Text>
            </View>
          )}
        </View>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Previous Chats</Text>
            {chatHistory.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                style={styles.chatCard}
                onPress={() => handleViewChat(chat)}
              >
                <View style={styles.chatIcon}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#A78BFA" />
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatQuestion} numberOfLines={2}>
                    {chat.question}
                  </Text>
                  <Text style={styles.chatAnswer} numberOfLines={2}>
                    {chat.answer}
                  </Text>
                  <Text style={styles.chatTimestamp}>
                    {chat.timestamp.toLocaleDateString()} at {chat.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash-outline" size={20} color="#DC2626" />
          <Text style={styles.deleteButtonText}>Delete Unit</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  unitName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 8,
    textAlign: 'center',
  },
  modelNumber: {
    fontSize: 16,
    color: '#94A3B8',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  primaryAction: {
    backgroundColor: '#A78BFA',
  },
  actionButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#F1F5F9',
  },
  loader: {
    marginVertical: 20,
  },
  manualCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  manualIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualInfo: {
    flex: 1,
  },
  manualTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  manualMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  manualType: {
    fontSize: 14,
    color: '#94A3B8',
    textTransform: 'capitalize',
  },
  manualSeparator: {
    fontSize: 14,
    color: '#64748B',
  },
  manualPages: {
    fontSize: 14,
    color: '#94A3B8',
  },
  manualRevision: {
    fontSize: 14,
    color: '#94A3B8',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  availableText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pendingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInfo: {
    flex: 1,
  },
  chatQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 4,
  },
  chatAnswer: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 6,
  },
  chatTimestamp: {
    fontSize: 11,
    color: '#64748B',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
    gap: 8,
    marginTop: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  errorText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  bottomSpacer: {
    height: 40,
  },
});
