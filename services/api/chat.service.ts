/**
 * Chat Service
 * 
 * Handles AI chat requests with Server-Sent Events (SSE) streaming.
 */

import { supabase } from '@/services/supabase';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:3000/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatContext {
  unit: string;
  model: string;
  manualsCount: number;
  sectionsCount: number;
}

export interface ChatSource {
  title: string;
  section: string;
  page: string;
  type: string;
}

export interface ChatStats {
  inputTokens: number;
  outputTokens: number;
  processingTimeMs: number;
  cost: number;
}

export interface StreamCallbacks {
  onContext?: (context: ChatContext) => void;
  onToken?: (token: string) => void;
  onComplete?: (data: {
    questionId: string;
    stats: ChatStats;
    sources: ChatSource[];
  }) => void;
  onWarning?: (warning: string) => void;
  onError?: (error: string) => void;
}

/**
 * Ask a question about a unit with streaming response
 * 
 * @param unitId - Saved unit ID
 * @param question - User's question (legacy) OR
 * @param messages - Conversation history (new format)
 * @param callbacks - Streaming event callbacks
 */
export async function askQuestion(
  unitId: string,
  questionOrMessages: string | ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  // Support both legacy (string) and new (messages array) format
  const isMessagesArray = Array.isArray(questionOrMessages);
  const payload = isMessagesArray
    ? { unitId, messages: questionOrMessages.slice(-10).map(m => ({ role: m.role, content: m.content })) }
    : { unitId, question: questionOrMessages };
  
  console.log('🤖 Asking question:', isMessagesArray ? 'with conversation history' : questionOrMessages);
  console.log('🔗 API URL:', `${API_URL}/chat/ask`);
  console.log('📝 Payload:', JSON.stringify(payload).substring(0, 200));
  
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) {
      throw new Error('Not authenticated');
    }
    
    console.log('✅ Token found, making request...');
    
    // Use XMLHttpRequest for better React Native support with SSE
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('POST', `${API_URL}/chat/ask`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      let buffer = '';
      let currentEvent: string | null = null;
      
      xhr.onprogress = () => {
        // Get new data since last check
        const newData = xhr.responseText.substring(buffer.length);
        buffer = xhr.responseText;
        
        if (!newData) return;
        
        console.log('📦 New data:', newData.substring(0, 100));
        
        // Process complete SSE messages
        const lines = newData.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
            console.log('🎯 Event:', currentEvent);
          } else if (line.startsWith('data: ') && currentEvent) {
            const dataStr = line.substring(6);
            console.log('📝 Data for', currentEvent, ':', dataStr.substring(0, 50));
            
            try {
              const data = JSON.parse(dataStr);
              
              // Handle different event types
              switch (currentEvent) {
                case 'context':
                  console.log('📚 Calling onContext');
                  callbacks.onContext?.(data);
                  break;
                
                case 'token':
                  console.log('🔤 Token:', data.content);
                  callbacks.onToken?.(data.content);
                  break;
                
                case 'warning':
                  console.log('⚠️ Warning:', data.message);
                  callbacks.onWarning?.(data.message);
                  break;
                
                case 'complete':
                  console.log('✅ Calling onComplete');
                  callbacks.onComplete?.(data);
                  break;
                
                case 'error':
                  console.log('❌ Calling onError');
                  callbacks.onError?.(data.error);
                  break;
              }
              
              currentEvent = null; // Reset after processing
            } catch (e) {
              console.error('Failed to parse SSE data:', dataStr, e);
            }
          }
        }
      };
      
      xhr.onload = () => {
        console.log('✅ Stream complete, status:', xhr.status);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP error! status: ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        console.error('❌ XHR error');
        reject(new Error('Network request failed'));
      };
      
      xhr.send(JSON.stringify(payload));
    });
    
  } catch (error) {
    console.error('❌ Chat error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error('❌ Error message:', errorMessage);
    callbacks.onError?.(errorMessage);
    throw error;
  }
}

/**
 * Get a single question by ID
 * 
 * @param questionId - Question ID
 */
export async function getQuestionById(
  questionId: string
): Promise<{
  id: string;
  question: string;
  answer: string;
  confidence: number;
  processingTime: number;
  sources: ChatSource[];
  timestamp: Date;
  model: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(`${API_URL}/chat/question/${questionId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    ...data,
    timestamp: new Date(data.timestamp),
  };
}

/**
 * Get question history for a unit
 * 
 * @param unitId - Saved unit ID (optional)
 * @param limit - Number of questions to return
 */
export async function getQuestionHistory(
  unitId?: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  question: string;
  answer: string;
  confidence: number;
  processingTime: number;
  timestamp: Date;
  model: string;
}>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  const url = new URL(`${API_URL}/chat/history`);
  if (unitId) url.searchParams.set('unitId', unitId);
  url.searchParams.set('limit', limit.toString());
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  return data.questions.map((q: any) => ({
    ...q,
    timestamp: new Date(q.timestamp),
  }));
}
