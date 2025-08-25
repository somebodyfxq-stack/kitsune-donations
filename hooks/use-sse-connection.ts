"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createEventSource } from "@/lib/fetch";

type ConnectionState = "connecting" | "connected" | "error" | "disconnected";

export const useSSEConnection = (streamerId?: string) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connectSSE = useCallback(() => {
    if (!streamerId) {
      console.error("❌ No streamer ID provided for SSE connection");
      return;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState("connecting");
    console.log(`🔌 Connecting to SSE for streamer: ${streamerId}`);
    
    try {
      const eventSource = createEventSource(`/api/stream?streamerId=${streamerId}`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log("✅ SSE connection opened");
        setConnectionState("connected");

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      eventSource.onerror = (error) => {
        console.error("❌ SSE connection error:", error);
        setConnectionState("error");
        
        eventSource.close();
        
        // Exponential backoff reconnection
        if (!reconnectTimeoutRef.current) {
          const reconnectDelay = 5000; // 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log("🔄 Attempting to reconnect SSE...");
            reconnectTimeoutRef.current = null;
            connectSSE();
          }, reconnectDelay);
        }
      };
      
      console.log("🎬 YouTube widget SSE ready, waiting for donation signals");

    } catch (error) {
      console.error("❌ Failed to create SSE connection:", error);
      setConnectionState("error");
    }
  }, [streamerId]);

  const disconnectSSE = useCallback(() => {
    console.log("🔌 Disconnecting SSE");
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setConnectionState("disconnected");
  }, []);

  // Connect when streamerId is available
  useEffect(() => {
    if (streamerId) {
      connectSSE();
    }
    
    return () => {
      disconnectSSE();
    };
  }, [streamerId, connectSSE, disconnectSSE]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSSE();
    };
  }, [disconnectSSE]);

  return {
    connectionState,
    connectSSE,
    disconnectSSE,
    isConnected: connectionState === "connected",
  };
};

