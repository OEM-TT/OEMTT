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
  Linking,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import * as chatService from '@/services/api/chat.service';
import { savedUnitsService } from '@/services/api/savedUnits.service';
import { getManualPublicUrl } from '@/services/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: chatService.ChatSource[] | string[]; // Store sources (manual pages or web URLs)
  webSources?: string[]; // Deprecated: use sources instead
}

export default function UnitChatScreen() {
  const router = useRouter();
  const { unitId, unitName, modelNumber, sessionId } = useLocalSearchParams<{
    unitId: string;
    unitName: string;
    modelNumber: string;
    sessionId?: string;  // Changed from questionId to sessionId
  }>();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: `system-welcome-${Date.now()}`,
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
  const streamingContentRef = useRef('');

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
      console.log('📜 Loaded chat session:', session);

      // Convert all questions in the session to messages
      const conversationMessages: Message[] = [];
      let messageCounter = Date.now();

      for (const msg of session.messages) {
        console.log('💬 Processing message:', msg.id);
        console.log('   Question:', msg.question);
        console.log('   Sources:', msg.sources);

        // User question - use unique timestamp-based ID
        conversationMessages.push({
          id: `history-user-${msg.id}-${messageCounter++}`,
          role: 'user',
          content: msg.question,
          timestamp: new Date(msg.timestamp),
        });

        // AI response - answer already has sources in it, don't add more!
        // Store sources data for clickable page numbers
        conversationMessages.push({
          id: `history-ai-${msg.id}-${messageCounter++}`,
          role: 'assistant',
          content: msg.answer, // DON'T append sources - they're already in the answer!
          timestamp: new Date(msg.timestamp),
          sources: msg.sources, // Store sources for clickable page numbers
        });

        console.log('✅ Added message with sources:', msg.sources?.length || 0, 'sources');
      }

      console.log('📤 Setting messages:', conversationMessages.length);
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

  useEffect(() => {
    // Auto-scroll during streaming
    if (streamingContent) {
      console.log('🟠 streamingContent updated, length:', streamingContent.length);
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [streamingContent]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const timestamp = Date.now();
    const userMessage: Message = {
      id: `user-${timestamp}`,
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
    streamingContentRef.current = '';

    try {
      // Create unique ID for the AI message (will be added when complete)
      const aiMessageId = `ai-${timestamp}`;
      console.log('🟣 Preparing AI message with ID:', aiMessageId);

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
            // Add warning message to chat with unique ID
            const warningMessage: Message = {
              id: `warning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: 'system',
              content: `⚠️ ${warning}`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, warningMessage]);
          },

          onToken: (token) => {
            // Accumulate tokens in ref for final message
            streamingContentRef.current += token;

            // Update streaming display (React may batch these, showing text in chunks)
            setStreamingContent(streamingContentRef.current);
          },

          onComplete: (data) => {
            console.log('✅ Complete:', data);

            // Store chat session ID for future messages in this conversation
            if (data.chatSessionId) {
              console.log('💾 Storing chat session ID:', data.chatSessionId);
              setChatSessionId(data.chatSessionId);
            }

            // Get the final content from the ref
            const finalContent = streamingContentRef.current;

            // Don't append sources - the AI already includes them in the response
            // This prevents duplicate "Sources:" sections

            // Add the complete AI message to the messages array
            setMessages((messages) => [...messages, {
              id: aiMessageId,
              role: 'assistant',
              content: finalContent,
              timestamp: new Date(),
              sources: data.sources, // Store sources for clickable page numbers
            }]);

            setIsLoading(false);
            setStreamingContent('');
            streamingContentRef.current = '';
          },

          onError: (error) => {
            console.error('❌ Chat error:', error);
            Alert.alert('Error', `Failed to get response: ${error}`);
            setIsLoading(false);
            setStreamingContent('');
            streamingContentRef.current = '';
          },
        },
        chatSessionId  // Pass existing session ID (undefined for first message)
      );
    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setIsLoading(false);
      setStreamingContent('');
      streamingContentRef.current = '';
    }
  };

  // Handle clicking a page number in sources
  const handlePageClick = async (pageNumber: number, manualId: string) => {
    try {
      console.log(`📄 Opening manual ${manualId} at page ${pageNumber}`);

      // Fetch the manual directly by ID
      const { manualsService } = await import('@/services/api/manuals.service');
      const manual = await manualsService.getById(manualId);
      console.log('Manual:', manual.title);

      if (!manual.storagePath && !manual.sourceUrl) {
        Alert.alert('Manual Not Available', 'This manual does not have a PDF file available.');
        return;
      }

      const pdfUrl = manual.storagePath
        ? getManualPublicUrl(manual.storagePath)
        : manual.sourceUrl;

      console.log('Opening PDF at page:', pageNumber);

      // Navigate to PDF viewer at specific page
      router.push({
        pathname: '/(modals)/pdf-viewer',
        params: {
          url: pdfUrl,
          title: manual.title || 'Manual',
          page: pageNumber.toString(),
          mode: 'view',
        },
      });
    } catch (error: any) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', `Failed to open manual: ${error.message || 'Unknown error'}`);
    }
  };

  // Render web sources with clickable URLs
  const renderWebSources = (content: string) => {
    // Check if this has web sources
    const webSourcesMatch = content.match(/\*\*Sources \(from web\):\*\*\n([\s\S]+?)(?:\n\n|$)/);
    
    if (!webSourcesMatch) {
      // No web sources, use regular rendering
      return null;
    }

    const beforeSources = content.substring(0, webSourcesMatch.index);
    const sourcesSection = webSourcesMatch[1];
    const afterSources = content.substring(webSourcesMatch.index! + webSourcesMatch[0].length);

    // Parse numbered URLs
    const urlPattern = /(\d+)\.\s+(https?:\/\/[^\s]+)/g;
    const urls: Array<{ number: string; url: string }> = [];
    let match;

    while ((match = urlPattern.exec(sourcesSection)) !== null) {
      urls.push({ number: match[1], url: match[2] });
    }

    return (
      <View>
        {/* Content before sources */}
        <Markdown
          style={{
            body: styles.markdownBody,
            paragraph: styles.markdownParagraph,
            heading1: styles.markdownHeading,
            heading2: styles.markdownHeading,
            strong: styles.markdownBold,
            em: styles.markdownItalic,
            code_inline: styles.markdownCodeInline,
            code_block: styles.markdownCodeBlock,
            fence: styles.markdownCodeBlock,
            list_item: styles.markdownListItem,
            bullet_list: styles.markdownList,
            ordered_list: styles.markdownList,
          }}
        >
          {beforeSources}
        </Markdown>

        {/* Web sources with clickable links */}
        <View style={styles.webSourcesContainer}>
          <Text style={[styles.sourcesLabel, { marginBottom: 8 }]}>Sources (from web):</Text>
          {urls.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={async () => {
                try {
                  const canOpen = await Linking.canOpenURL(item.url);
                  if (canOpen) {
                    await Linking.openURL(item.url);
                  } else {
                    Alert.alert('Error', 'Cannot open this URL');
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to open URL');
                }
              }}
              style={styles.webSourceLink}
            >
              <Text style={styles.webSourceNumber}>{item.number}.</Text>
              <Text style={styles.webSourceUrl} numberOfLines={2}>
                {item.url}
              </Text>
              <Ionicons name="open-outline" size={16} color="#60A5FA" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Content after sources (if any) */}
        {afterSources && (
          <Markdown
            style={{
              body: styles.markdownBody,
              paragraph: styles.markdownParagraph,
              heading1: styles.markdownHeading,
              heading2: styles.markdownHeading,
              strong: styles.markdownBold,
              em: styles.markdownItalic,
              code_inline: styles.markdownCodeInline,
              code_block: styles.markdownCodeBlock,
              fence: styles.markdownCodeBlock,
              list_item: styles.markdownListItem,
              bullet_list: styles.markdownList,
              ordered_list: styles.markdownList,
            }}
          >
            {afterSources}
          </Markdown>
        )}
      </View>
    );
  };

  // Render sources with clickable page numbers
  const renderSourcesWithClickablePages = (content: string, sources?: chatService.ChatSource[]) => {
    console.log('🔍 renderSourcesWithClickablePages called');
    console.log('   Sources data:', JSON.stringify(sources));
    console.log('   Content length:', content.length);

    // Check for web sources first
    const webSourcesRendering = renderWebSources(content);
    if (webSourcesRendering) {
      return webSourcesRendering;
    }

    // Extract the sources line from the content
    const sourcesMatch = content.match(/\*\*Sources:\*\*(.+?)(?:\n|$)/);
    console.log('   Sources match:', sourcesMatch);

    if (!sourcesMatch) {
      console.log('   ❌ No sources match in content, returning original with Markdown');
      // Return wrapped in Markdown component (React Native requires all text in components)
      return (
        <Markdown
          style={{
            body: styles.markdownBody,
            paragraph: styles.markdownParagraph,
            heading1: styles.markdownHeading,
            heading2: styles.markdownHeading,
            strong: styles.markdownBold,
            em: styles.markdownItalic,
            code_inline: styles.markdownCodeInline,
            code_block: styles.markdownCodeBlock,
            fence: styles.markdownCodeBlock,
            list_item: styles.markdownListItem,
            bullet_list: styles.markdownList,
            ordered_list: styles.markdownList,
          }}
        >
          {content}
        </Markdown>
      );
    }

    const beforeSources = content.substring(0, sourcesMatch.index);
    const sourcesLine = sourcesMatch[0];
    const afterSources = content.substring(sourcesMatch.index! + sourcesLine.length);

    console.log('   Sources line:', sourcesLine);

    // Split the sources line by "Page " to identify page numbers
    const parts = sourcesLine.split(/(Page \d+)/g);
    console.log('   Parts:', parts);

    return (
      <View>
        {/* Content before sources */}
        <Markdown
          style={{
            body: styles.markdownBody,
            paragraph: styles.markdownParagraph,
            heading1: styles.markdownHeading,
            heading2: styles.markdownHeading,
            strong: styles.markdownBold,
            em: styles.markdownItalic,
            code_inline: styles.markdownCodeInline,
            code_block: styles.markdownCodeBlock,
            fence: styles.markdownCodeBlock,
            list_item: styles.markdownListItem,
            bullet_list: styles.markdownList,
            ordered_list: styles.markdownList,
          }}
        >
          {beforeSources}
        </Markdown>

        {/* Sources section with clickable pages */}
        <View style={styles.sourcesContainer}>
          <Text style={styles.sourcesLabel}>Sources: </Text>
          {parts.map((part, index) => {
            const pageMatch = part.match(/Page (\d+)/);
            if (pageMatch) {
              const pageNumber = parseInt(pageMatch[1]);

              // Find the manual ID for this page from the sources array
              const sourceForPage = sources?.find(s =>
                s.pageReference?.includes(`Page ${pageNumber}`) ||
                s.pageReference?.includes(`${pageNumber}`)
              );
              const manualId = sourceForPage?.manualId || sources?.[0]?.manualId;

              console.log(`   📄 Page ${pageNumber} -> Manual ID: ${manualId}`);

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    console.log(`🖱️ Page ${pageNumber} clicked! Manual ID: ${manualId}`);
                    if (manualId) {
                      handlePageClick(pageNumber, manualId);
                    } else {
                      Alert.alert('Error', 'Could not determine which manual this page belongs to.');
                    }
                  }}
                  style={styles.pageButton}
                >
                  <Text style={styles.pageLink}>{part}</Text>
                </TouchableOpacity>
              );
            }
            return <Text key={index} style={styles.sourcesText}>{part}</Text>;
          })}
        </View>

        {/* Content after sources (if any) */}
        {afterSources && (
          <Markdown
            style={{
              body: styles.markdownBody,
              paragraph: styles.markdownParagraph,
              heading1: styles.markdownHeading,
              heading2: styles.markdownHeading,
              strong: styles.markdownBold,
              em: styles.markdownItalic,
              code_inline: styles.markdownCodeInline,
              code_block: styles.markdownCodeBlock,
              fence: styles.markdownCodeBlock,
              list_item: styles.markdownListItem,
              bullet_list: styles.markdownList,
              ordered_list: styles.markdownList,
            }}
          >
            {afterSources}
          </Markdown>
        )}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    // Debug logging for AI messages
    if (!isUser && !isSystem) {
      console.log('🎨 Rendering AI message:', item.id);
      console.log('   Has sources?', !!item.sources);
      console.log('   Sources length:', item.sources?.length || 0);
    }


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
          {!isUser && !isSystem ? (
            // Check if message has sources for clickable page numbers
            item.sources && item.sources.length > 0 ? (
              renderSourcesWithClickablePages(item.content, item.sources)
            ) : (
              <Markdown
                style={{
                  body: styles.markdownBody,
                  paragraph: styles.markdownParagraph,
                  heading1: styles.markdownHeading,
                  heading2: styles.markdownHeading,
                  strong: styles.markdownBold,
                  em: styles.markdownItalic,
                  code_inline: styles.markdownCodeInline,
                  code_block: styles.markdownCodeBlock,
                  fence: styles.markdownCodeBlock,
                  list_item: styles.markdownListItem,
                  bullet_list: styles.markdownList,
                  ordered_list: styles.markdownList,
                }}
              >
                {item.content}
              </Markdown>
            )
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

  const closeModal = () => {
    router.back();
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
        <TouchableOpacity style={styles.closeButton} onPress={() => {
          closeModal();
        }}>
          <Ionicons name="close" size={20} color="#A78BFA" />
        </TouchableOpacity>
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
          extraData={streamingContent}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Suggested Questions (show when no messages yet) */}
        {/* {messages.length === 1 && (
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
        )} */}

        {/* Streaming Message Display - Shows box with loading then streams content */}
        {isLoading && (
          <View style={styles.streamingMessageContainer}>
            <View style={styles.streamingMessageBubble}>
              <View style={styles.aiHeader}>
                <Ionicons name="sparkles" size={16} color="#A78BFA" />
                <Text style={styles.aiLabel}>OEM TechTalk AI Assistant</Text>
              </View>

              {streamingContent ? (
                // Render as plain text during streaming for instant character-by-character display
                // Markdown formatting will be applied after completion
                <Text style={styles.messageText}>
                  {streamingContent}
                </Text>
              ) : (
                <View style={{ paddingVertical: 12 }}>
                  <ActivityIndicator size="small" color="#A78BFA" />
                  <Text style={[styles.messageText, { color: '#999', fontSize: 12, marginTop: 8 }]}>
                    Searching manuals...
                  </Text>
                </View>
              )}

              {streamingContent && (
                <View style={styles.streamingIndicator}>
                  <View style={[styles.dot, styles.dot1]} />
                  <View style={[styles.dot, styles.dot2]} />
                  <View style={[styles.dot, styles.dot3]} />
                </View>
              )}
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
  streamingMessageContainer: {
    padding: 16,
    paddingTop: 8,
  },
  streamingMessageBubble: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  streamingIndicator: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
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
  // Markdown styles
  markdownBody: {
    color: '#F1F5F9',
  },
  markdownParagraph: {
    color: '#F1F5F9',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 0,
    marginBottom: 12,
  },
  markdownHeading: {
    color: '#F1F5F9',
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  markdownBold: {
    color: '#F1F5F9',
    fontWeight: '700',
  },
  markdownItalic: {
    color: '#F1F5F9',
    fontStyle: 'italic',
  },
  markdownCodeInline: {
    backgroundColor: '#334155',
    color: '#A78BFA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  markdownCodeBlock: {
    backgroundColor: '#0F172A',
    color: '#E2E8F0',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
  },
  markdownList: {
    marginBottom: 12,
  },
  markdownListItem: {
    color: '#F1F5F9',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
  },
  // Clickable sources styles
  sourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  sourcesLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    marginRight: 4,
  },
  sourcesText: {
    fontSize: 13,
    color: '#94A3B8',
    marginRight: 4,
  },
  pageButton: {
    marginHorizontal: 2,
  },
  pageLink: {
    fontSize: 13,
    color: '#60A5FA', // Blue for clickable links
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  // Web sources styles (for Perplexity results)
  webSourcesContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  webSourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#60A5FA',
  },
  webSourceNumber: {
    fontSize: 13,
    color: '#60A5FA',
    fontWeight: '600',
    marginRight: 8,
    minWidth: 20,
  },
  webSourceUrl: {
    flex: 1,
    fontSize: 12,
    color: '#60A5FA',
    textDecorationLine: 'underline',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 20,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
