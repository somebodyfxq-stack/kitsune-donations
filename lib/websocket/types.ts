// =============================================
// WEBSOCKET MESSAGE TYPES FOR REAL-TIME COMMUNICATION
// =============================================

// Base WebSocket message
export interface BaseWebSocketMessage {
  type: string;
  timestamp: string;
  id?: string; // Message ID for acknowledgment
}

// Client-to-Server messages
export interface ClientMessage extends BaseWebSocketMessage {
  type: 
    | 'ping'
    | 'subscribe' 
    | 'unsubscribe'
    | 'queue-action'
    | 'tts-action'
    | 'donation-action';
}

export interface SubscribeMessage extends ClientMessage {
  type: 'subscribe';
  data: {
    streamerId: string;
    channels: string[]; // ['youtube-queue', 'donations', 'tts']
  };
}

export interface QueueActionMessage extends ClientMessage {
  type: 'queue-action';
  data: {
    action: 'next' | 'complete' | 'skip' | 'restart' | 'clear';
    identifier?: string;
    streamerId: string;
  };
}

// Server-to-Client messages
export interface ServerMessage extends BaseWebSocketMessage {
  type: 
    | 'pong'
    | 'connected'
    | 'error'
    | 'youtube-queue-updated'
    | 'video-status-changed'
    | 'video-started'
    | 'video-completed'
    | 'tts-started'
    | 'tts-completed'
    | 'tts-error'
    | 'donation-received'
    | 'donations-paused'
    | 'donations-resumed';
}

// Specific server messages
export interface ConnectedMessage extends ServerMessage {
  type: 'connected';
  data: {
    clientId: string;
    serverTime: string;
    subscribedChannels: string[];
  };
}

export interface ErrorMessage extends ServerMessage {
  type: 'error';
  data: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface YouTubeQueueUpdateMessage extends ServerMessage {
  type: 'youtube-queue-updated';
  data: {
    streamerId: string;
    currentlyPlaying?: {
      id: string;
      identifier: string;
      nickname: string;
      message: string;
      amount: number;
      youtube_url: string;
      status: string;
    } | null;
    queueStats: {
      totalVideos: number;
      pendingVideos: number;
      playingVideos: number;
      completedVideos: number;
    };
    pendingCount: number;
  };
}

export interface VideoStatusChangedMessage extends ServerMessage {
  type: 'video-status-changed';
  data: {
    streamerId: string;
    identifier: string;
    status: 'waiting_for_tts' | 'pending' | 'playing' | 'completed' | 'skipped';
    previousStatus?: string;
  };
}

export interface TTSMessage extends ServerMessage {
  type: 'tts-started' | 'tts-completed' | 'tts-error';
  data: {
    streamerId: string;
    identifier: string;
    nickname: string;
    message?: string;
    error?: string;
    duration?: number;
  };
}

export interface DonationMessage extends ServerMessage {
  type: 'donation-received';
  data: {
    streamerId: string;
    identifier: string;
    nickname: string;
    message: string;
    amount: number;
    youtubeUrl?: string;
    createdAt: string;
  };
}

// Union types
export type WebSocketMessage = ClientMessage | ServerMessage;
export type AnyClientMessage = SubscribeMessage | QueueActionMessage | ClientMessage;
export type AnyServerMessage = ConnectedMessage | ErrorMessage | YouTubeQueueUpdateMessage | VideoStatusChangedMessage | TTSMessage | DonationMessage | ServerMessage;

// Connection state
export type WebSocketState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'error';

// WebSocket client configuration
export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  subscriptions: string[];
  streamerId?: string;
}

// WebSocket client interface
export interface WebSocketClient {
  state: WebSocketState;
  connect: () => void;
  disconnect: () => void;
  send: (message: AnyClientMessage) => void;
  subscribe: (channels: string[]) => void;
  unsubscribe: (channels: string[]) => void;
  on: (type: string, handler: (message: AnyServerMessage) => void) => void;
  off: (type: string, handler: (message: AnyServerMessage) => void) => void;
}

// Server-side WebSocket client representation
export interface WSClient {
  id: string;
  socket: WebSocket;
  streamerId?: string;
  subscriptions: Set<string>;
  lastPing: number;
  metadata: {
    userAgent?: string;
    ip?: string;
    connectedAt: number;
  };
}
