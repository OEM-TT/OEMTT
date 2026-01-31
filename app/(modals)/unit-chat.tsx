/**
 * Unit Chat Modal
 * 
 * AI-powered chat interface for asking questions about a specific unit.
 * Context-aware of the unit's model and available manuals.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as chatService from '@/services/api/chat.service';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export default function UnitChatScreen() {
  const { unitId, unitName, modelNumber, sessionId } = useLocalSearchParams<{
    unitId: string;
    unitName: string;
    modelNumber: string;
    sessionId?: string;  // Changed from questionId to sessionId
  }>();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'system',
      content: `I'm your AI assistant for the ${unitName} (${modelNumber}). Ask me anything about troubleshooting, maintenance, specifications, or service procedures. I have access to the official service manual!`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(undefined);  // NEW: Track chat session
  const flatListRef = useRef<FlatList>(null);

  // Load previous chat session if sessionId is provided
  useEffect(() => {
    if (sessionId) {
      loadPreviousChat(sessionId);
      setChatSessionId(sessionId);  // Set the session ID so follow-up questions continue the conversation
    }
  }, [sessionId]);

  const loadPreviousChat = async (sId: string) => {
    setLoadingHistory(true);
    try {
      const session = await chatService.getChatSession(sId);

      // Convert all questions in the session to messages
      const conversationMessages: Message[] = [];
      
      for (const msg of session.messages) {
        // User question
        conversationMessages.push({
          id: `user-${msg.id}`,
          role: 'user',
          content: msg.question,
          timestamp: new Date(msg.timestamp),
        });

        // AI response with sources
        const sourcesText = msg.sources && msg.sources.length > 0
          ? `\n\n📖 Sources:\n${msg.sources.map((s: any) =>
            `• ${s.sectionTitle || 'Manual'}, ${s.pageReference || 'Unknown page'}`
          ).join('\n')}`
          : '';

        conversationMessages.push({
          id: `ai-${msg.id}`,
          role: 'assistant',
          content: msg.answer + sourcesText,
          timestamp: new Date(msg.timestamp),
        });
      }

      setMessages((prev) => [...prev, ...conversationMessages]);
    } catch (error) {
      console.error('Failed to load previous chat:', error);
      Alert.alert('Error', 'Failed to load previous conversation');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    // Build messages array with new user message
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);
    setStreamingContent('');

    try {
      // Create placeholder for AI message
      const aiMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      // Stream the response - send full conversation history (last 10 messages)
      // Filter out system messages (welcome message) - only send user/assistant
      const conversationMessages = updatedMessages
        .filter(m => m.role !== 'system')
        .slice(-10); // Last 10 messages
      
      await chatService.askQuestion(
        unitId,
        conversationMessages,
        {
          onContext: (context) => {
            console.log('📚 Context:', context);
            // Could show this in UI (e.g., "Searching 3 manuals...")
          },

          onWarning: (warning) => {
            console.warn('⚠️ Warning:', warning);
            // Add warning message to chat
            const warningMessage: Message = {
              id: `warning-${Date.now()}`,
              role: 'system',
              content: `⚠️ ${warning}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, warningMessage]);
          },

          onToken: (token) => {
            setStreamingContent((prev) => {
              const newContent = prev + token;
              // Update the AI message with streamed content
              setMessages((messages) =>
                messages.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: newContent }
                    : msg
                )
              );
              return newContent;
            });
          },

          onComplete: (data) => {
            console.log('✅ Complete:', data);
            
            // Store chat session ID for future messages in this conversation
            if (data.chatSessionId) {
              console.log('💾 Storing chat session ID:', data.chatSessionId);
              setChatSessionId(data.chatSessionId);
            }
            
            setIsLoading(false);
            setStreamingContent('');

            // Show sources in a subtle way
            if (data.sources.length > 0) {
              const sourcesText = `\n\n📖 Sources:\n${data.sources.map(s =>
                `• ${s.title}, ${s.page}`
              ).join('\n')}`;

              setMessages((messages) =>
                messages.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: msg.content + sourcesText }
                    : msg
                )
              );
            }
          },

          onError: (error) => {
            console.error('❌ Chat error:', error);
            Alert.alert('Error', `Failed to get response: ${error}`);
            setIsLoading(false);
            setStreamingContent('');

            // Remove failed AI message
            setMessages((prev) => prev.filter(msg => msg.id !== aiMessageId));
          },
        },
        chatSessionId  // Pass existing session ID (undefined for first message)
      );
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    return (
      <View
        style={[
          styles.messageContainer,
          isUser && styles.userMessageContainer,
          isSystem && styles.systemMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser && styles.userMessageBubble,
            isSystem && styles.systemMessageBubble,
          ]}
        >
          {!isUser && !isSystem && (
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={16} color="#A78BFA" />
              <Text style={styles.aiLabel}>OEM TechTalk AI Assistant</Text>
            </View>
          )}
          {!isUser && !isSystem && item.content === '' ? (
            <View style={{ paddingVertical: 12 }}>
              <ActivityIndicator size="small" color="#A78BFA" />
              <Text style={[styles.messageText, { color: '#999', fontSize: 12, marginTop: 8 }]}>
                Searching manuals...
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.messageText,
                isUser && styles.userMessageText,
                isSystem && styles.systemMessageText,
              ]}
            >
              {item.content}
            </Text>
          )}
          <Text
            style={[
              styles.timestamp,
              isUser && styles.userTimestamp,
            ]}
          >
            {item.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const suggestedQuestions = [
    'How do I reset this unit?',
    'What are common error codes?',
    'How do I check refrigerant levels?',
    'Troubleshoot heating issue',
  ];

  const handleSuggestion = (question: string) => {
    setInputText(question);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <Stack.Screen
        options={{
          title: `Chat: ${unitName}`,
          presentation: 'modal',
        }}
      />

      <View style={styles.chatContainer}>
        {/* Loading History Indicator */}
        {loadingHistory && (
          <View style={styles.loadingHistoryOverlay}>
            <ActivityIndicator size="large" color="#A78BFA" />
            <Text style={styles.loadingHistoryText}>Loading conversation...</Text>
          </View>
        )}

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Suggested Questions (show when no messages yet) */}
        {messages.length === 1 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>Suggested Questions:</Text>
            {suggestedQuestions.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => handleSuggestion(question)}
              >
                <Text style={styles.suggestionText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about this unit..."
              placeholderTextColor="#64748B"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? '#FFF' : '#64748B'}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>
            AI responses are generated and may contain errors. Always verify
            with official documentation.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  chatContainer: {
    flex: 1,
  },
  loadingHistoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    gap: 16,
  },
  loadingHistoryText: {
    fontSize: 16,
    color: '#A78BFA',
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  systemMessageContainer: {
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#1E293B',
  },
  userMessageBubble: {
    backgroundColor: '#A78BFA',
    borderBottomRightRadius: 4,
  },
  systemMessageBubble: {
    backgroundColor: '#1E3A5F',
    maxWidth: '90%',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A78BFA',
  },
  messageText: {
    fontSize: 16,
    color: '#F1F5F9',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFF',
  },
  systemMessageText: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  timestamp: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  userTimestamp: {
    color: '#E9D5FF',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'flex-start',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#64748B',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
  },
  suggestionsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
  },
  suggestionChip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  inputContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#F1F5F9',
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#A78BFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1E293B',
  },
  disclaimer: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
});
