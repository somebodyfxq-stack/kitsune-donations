"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnyServerMessage, AnyClientMessage, WebSocketState, WebSocketConfig } from '@/lib/websocket/types';

// =============================================
// OPTIMIZED WEBSOCKET-LIKE CLIENT HOOK
// =============================================

interface UseWebSocketReturn {
  state: WebSocketState;
  send: (message: AnyClientMessage) => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  lastMessage: AnyServerMessage | null;
  connectionInfo: {
    connectedAt: number | null;
    reconnectCount: number;
    latency: number;
  };
}

const DEFAULT_CONFIG: Partial<WebSocketConfig> = {
  reconnectInterval: 3000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  subscriptions: [],
};

export const useWebSocket = (
  streamerId?: string,
  config: Partial<WebSocketConfig> = {}
): UseWebSocketReturn => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config } as WebSocketConfig;
  
  const [state, setState] = useState<WebSocketState>('disconnected');
  const [lastMessage, setLastMessage] = useState<AnyServerMessage | null>(null);
  const [connectionInfo, setConnectionInfo] = useState({
    connectedAt: null as number | null,
    reconnectCount: 0,
    latency: 0,
  });

  // Refs for managing connection
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set(fullConfig.subscriptions));
  const messageHandlersRef = useRef<Map<string, ((message: AnyServerMessage) => void)[]>>(new Map());
  const pingTimeRef = useRef<number>(0);

  // =============================================
  // CORE CONNECTION FUNCTIONS
  // =============================================

  const connect = useCallback(() => {
    if (eventSourceRef.current || state === 'connecting' || state === 'connected') {
      return;
    }

    setState('connecting');
    console.log(`🔌 Connecting optimized WebSocket-like client for streamer: ${streamerId}`);

    try {
      // Create optimized SSE connection with cache busting and connection pooling
      const url = streamerId 
        ? `/api/stream?streamerId=${streamerId}&v=${Date.now()}&keepalive=true`
        : `/api/stream?v=${Date.now()}&keepalive=true`;
        
      const eventSource = new EventSource(url);
      eventSource.withCredentials = false; // Disable credentials for better performance
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ WebSocket-like client connected');
        setState('connected');
        setConnectionInfo(prev => ({
          ...prev,
          connectedAt: Date.now(),
          reconnectCount: 0,
        }));

        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Start heartbeat
        startHeartbeat();

        // Send initial subscription
        if (subscriptionsRef.current.size > 0) {
          sendSubscription(Array.from(subscriptionsRef.current));
        }
      };

      eventSource.onerror = () => {
        console.error('❌ WebSocket-like client error');
        setState('error');
        eventSource.close();
        handleReconnect();
      };

      // Handle all message types
      setupMessageHandlers(eventSource);

    } catch (error) {
      console.error('❌ Failed to create WebSocket-like connection:', error);
      setState('error');
      handleReconnect();
    }
  }, [streamerId, state]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket-like client');
    setState('disconnecting');

    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    // Close connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState('disconnected');
    setConnectionInfo(prev => ({
      ...prev,
      connectedAt: null,
    }));
  }, []);

  // =============================================
  // MESSAGE HANDLING
  // =============================================

  const setupMessageHandlers = useCallback((eventSource: EventSource) => {
    // Handle ping/pong for latency measurement
    eventSource.addEventListener('ping', (event) => {
      const serverTime = parseInt(event.data);
      const latency = Date.now() - serverTime;
      setConnectionInfo(prev => ({ ...prev, latency }));
      
      // Send pong response (simulate via localStorage for SSE)
      if (streamerId) {
        localStorage.setItem(`ws-pong-${streamerId}`, Date.now().toString());
      }
    });

    // Handle all defined message types
    const messageTypes = [
      'youtube-queue-updated',
      'video-status-changed', 
      'video-started',
      'video-completed',
      'tts-started',
      'tts-completed',
      'tts-error',
      'donation-received',
      'donations-paused',
      'donations-resumed',
      'connected',
      'error'
    ];

    messageTypes.forEach(type => {
      eventSource.addEventListener(type, (event) => {
        try {
          const message: AnyServerMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Call registered handlers
          const handlers = messageHandlersRef.current.get(type) || [];
          handlers.forEach(handler => handler(message));
          
          console.log(`📨 WebSocket-like message received: ${type}`);
        } catch (error) {
          console.error(`❌ Failed to parse ${type} message:`, error);
        }
      });
    });
  }, [streamerId]);

  const send = useCallback((message: AnyClientMessage) => {
    if (state !== 'connected') {
      console.warn('⚠️ Cannot send message - not connected');
      return;
    }

    // Simulate sending message via different mechanisms based on type
    switch (message.type) {
      case 'ping':
        pingTimeRef.current = Date.now();
        // SSE doesn't support client->server, so we use other mechanisms
        break;
        
      case 'subscribe':
        if ('data' in message && message.data.channels) {
          message.data.channels.forEach(channel => {
            subscriptionsRef.current.add(channel);
          });
          console.log(`📡 Subscribed to channels:`, message.data.channels);
        }
        break;
        
      case 'queue-action':
        // Handle queue actions via API calls
        if ('data' in message) {
          handleQueueAction(message.data);
        }
        break;
        
      default:
        console.warn(`🤷 Unsupported message type: ${message.type}`);
    }
  }, [state]);

  // =============================================
  // HELPER FUNCTIONS  
  // =============================================

  const handleQueueAction = async (data: any) => {
    try {
      let endpoint = '/api/youtube/queue';
      let method = 'POST';
      let body: any = { 
        streamerId: data.streamerId,
        identifier: data.identifier 
      };

      switch (data.action) {
        case 'next':
          method = 'PATCH';
          break;
        case 'complete':
          body.status = 'completed';
          break;
        case 'skip':
          body.status = 'skipped';
          break;
        case 'restart':
          body.status = 'pending';
          break;
        case 'clear':
          method = 'DELETE';
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Queue action failed: ${response.status}`);
      }

      console.log(`✅ Queue action ${data.action} completed`);
    } catch (error) {
      console.error(`❌ Queue action ${data.action} failed:`, error);
    }
  };

  const sendSubscription = (channels: string[]) => {
    channels.forEach(channel => {
      subscriptionsRef.current.add(channel);
    });
    console.log(`📡 Updated subscriptions:`, Array.from(subscriptionsRef.current));
  };

  const handleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return;

    setConnectionInfo(prev => ({
      ...prev,
      reconnectCount: prev.reconnectCount + 1,
    }));

    const attempt = connectionInfo.reconnectCount + 1;
    if (attempt > fullConfig.maxReconnectAttempts) {
      console.error(`❌ Max reconnect attempts (${fullConfig.maxReconnectAttempts}) reached`);
      setState('error');
      return;
    }

    const delay = Math.min(fullConfig.reconnectInterval * Math.pow(2, attempt - 1), 30000);
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${attempt})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connect();
    }, delay);
  }, [connectionInfo.reconnectCount, fullConfig.maxReconnectAttempts, fullConfig.reconnectInterval, connect]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (state === 'connected') {
        // Send ping via localStorage mechanism
        if (streamerId) {
          localStorage.setItem(`ws-ping-${streamerId}`, Date.now().toString());
        }
      }
    }, fullConfig.heartbeatInterval);
  }, [state, streamerId, fullConfig.heartbeatInterval]);

  const subscribe = useCallback((channels: string[]) => {
    channels.forEach(channel => {
      subscriptionsRef.current.add(channel);
    });
    
    if (state === 'connected') {
      sendSubscription(channels);
    }
  }, [state]);

  const unsubscribe = useCallback((channels: string[]) => {
    channels.forEach(channel => {
      subscriptionsRef.current.delete(channel);
    });
    
    console.log(`📡 Unsubscribed from channels:`, channels);
  }, []);

  // =============================================
  // EFFECTS
  // =============================================

  // Auto-connect when hook is used
  useEffect(() => {
    if (streamerId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [streamerId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    send,
    subscribe,
    unsubscribe,
    lastMessage,
    connectionInfo,
  };
};
