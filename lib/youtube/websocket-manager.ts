"use client";

// =============================================
// WEBSOCKET QUEUE MANAGER (CLIENT-SIDE)
// =============================================

export interface WebSocketMessage {
  type: 'queue_update' | 'video_started' | 'video_finished' | 'error';
  data: any;
  timestamp: string;
}

export class WebSocketQueueManager {
  private static instance: WebSocketQueueManager;
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  public static getInstance(): WebSocketQueueManager {
    if (!WebSocketQueueManager.instance) {
      WebSocketQueueManager.instance = new WebSocketQueueManager();
    }
    return WebSocketQueueManager.instance;
  }

  // =============================================
  // CONNECTION MANAGEMENT
  // =============================================

  connect(streamerId: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("🔌 WebSocket already connected");
      return;
    }

    if (typeof window === 'undefined') {
      console.warn("⚠️ WebSocket can only be used in browser environment");
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/websocket?streamerId=${streamerId}`;
      
      console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected");
        this.reconnectAttempts = 0;
        this.emit('connected', { streamerId });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log("📨 WebSocket message received:", message.type);
          this.emit(message.type, message.data);
        } catch (error) {
          console.error("❌ Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        this.emit('error', { error: 'WebSocket connection error' });
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
        this.ws = null;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        this.scheduleReconnect(streamerId);
      };

    } catch (error) {
      console.error("❌ Failed to create WebSocket connection:", error);
      this.emit('error', { error: 'Failed to create WebSocket connection' });
      this.scheduleReconnect(streamerId);
    }
  }

  disconnect(): void {
    console.log("🔌 Disconnecting WebSocket");
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.reconnectAttempts = 0;
  }

  // =============================================
  // MESSAGE SENDING
  // =============================================

  send(type: string, data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("⚠️ WebSocket not connected, cannot send message");
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: type as any,
        data,
        timestamp: new Date().toISOString()
      };

      this.ws.send(JSON.stringify(message));
      console.log(`📤 WebSocket message sent: ${type}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send WebSocket message:", error);
      return false;
    }
  }

  // =============================================
  // EVENT HANDLING
  // =============================================

  on(eventType: string, callback: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(callback);
  }

  off(eventType: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(eventType: string, data: any): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in WebSocket event listener for ${eventType}:`, error);
        }
      });
    }
  }

  // =============================================
  // RECONNECTION LOGIC
  // =============================================

  private scheduleReconnect(streamerId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.emit('max_reconnect_attempts', { attempts: this.reconnectAttempts });
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000,
      30000 // Max 30 seconds
    );

    console.log(`🔄 Scheduling reconnect in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(streamerId);
    }, delay);
  }

  // =============================================
  // CONNECTION STATE
  // =============================================

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'unknown';
    }
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

