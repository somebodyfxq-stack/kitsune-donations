// =============================================
// WEBSOCKET EVENT BROADCASTER
// =============================================

import { AnyServerMessage } from './types';
import { broadcastToClients } from '../sse'; // Use optimized SSE as transport

class WebSocketBroadcaster {
  private static instance: WebSocketBroadcaster;

  public static getInstance(): WebSocketBroadcaster {
    if (!WebSocketBroadcaster.instance) {
      WebSocketBroadcaster.instance = new WebSocketBroadcaster();
    }
    return WebSocketBroadcaster.instance;
  }

  /**
   * Broadcast message to specific streamer
   */
  public broadcastToStreamer(streamerId: string, message: AnyServerMessage): void {
    const messageData = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    console.log(`📡 WebSocket broadcast ${message.type} to streamer ${streamerId}`);
    
    try {
      broadcastToClients(streamerId, message.type, JSON.stringify(messageData));
      console.log(`✅ WebSocket event ${message.type} sent successfully`);
    } catch (error) {
      console.error(`❌ Failed to broadcast ${message.type}:`, error);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  public broadcastToAll(message: AnyServerMessage): void {
    const messageData = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    console.log(`📡 WebSocket broadcast ${message.type} to all clients`);
    
    try {
      broadcastToClients(null, message.type, JSON.stringify(messageData));
      console.log(`✅ WebSocket event ${message.type} sent to all clients`);
    } catch (error) {
      console.error(`❌ Failed to broadcast ${message.type} to all:`, error);
    }
  }

  // =============================================
  // YOUTUBE EVENTS
  // =============================================

  public notifyQueueUpdate(streamerId: string, data: {
    currentlyPlaying?: any;
    queueStats?: any;
    pendingCount?: number;
  }): void {
    this.broadcastToStreamer(streamerId, {
      type: 'youtube-queue-updated',
      timestamp: new Date().toISOString(),
      data: {
        streamerId,
        currentlyPlaying: data.currentlyPlaying || null,
        queueStats: data.queueStats || {
          totalVideos: 0,
          pendingVideos: 0,
          playingVideos: 0,
          completedVideos: 0,
        },
        pendingCount: data.pendingCount || 0,
      },
    });
  }

  public notifyVideoStatusChange(
    streamerId: string, 
    identifier: string, 
    status: 'waiting_for_tts' | 'pending' | 'playing' | 'completed' | 'skipped',
    previousStatus?: string
  ): void {
    this.broadcastToStreamer(streamerId, {
      type: 'video-status-changed',
      timestamp: new Date().toISOString(),
      data: {
        streamerId,
        identifier,
        status,
        previousStatus,
      },
    });
  }

  public notifyVideoStarted(streamerId: string, videoData: any): void {
    this.broadcastToStreamer(streamerId, {
      type: 'video-started',
      timestamp: new Date().toISOString(),
      data: {
        streamerId,
        ...videoData,
      },
    });
  }

  public notifyVideoCompleted(streamerId: string, identifier: string): void {
    this.broadcastToStreamer(streamerId, {
      type: 'video-completed',
      timestamp: new Date().toISOString(),
      data: {
        streamerId,
        identifier,
      },
    });
  }

  // =============================================
  // TTS EVENTS
  // =============================================

  public notifyTTSStarted(streamerId: string, identifier: string, nickname: string, message?: string): void {
    this.broadcastToStreamer(streamerId, {
      type: 'tts-started',
      timestamp: new Date().toISOString(),
      data: {
        streamerId,
        identifier,
        nickname,
        message,
      },
    });
  }

  public notifyTTSCompleted(streamerId: string, identifier: string, nickname: string, duration?: number): void {
    this.broadcastToStreamer(streamerId, {
      type: 'tts-completed',
      timestamp: new Date().toISOString(),
      data: {
        streamerId,
        identifier,
        nickname,
        duration,
      },
    });
  }

  public notifyTTSError(streamerId: string, identifier: string, nickname: string, error: string): void {
    this.broadcastToStreamer(streamerId, {
      type: 'tts-error',
      timestamp: new Date().toISOString(),
      data: {
        streamerId,
        identifier,
        nickname,
        error,
      },
    });
  }

  // =============================================
  // DONATION EVENTS
  // =============================================

  public notifyDonationReceived(streamerId: string, donationData: {
    identifier: string;
    nickname: string;
    message: string;
    amount: number;
    youtubeUrl?: string;
    createdAt: string;
  }): void {
    this.broadcastToStreamer(streamerId, {
      type: 'donation-received',
      timestamp: new Date().toISOString(),
      data: {
        streamerId,
        ...donationData,
      },
    });
  }

  public notifyDonationsPaused(streamerId: string): void {
    this.broadcastToStreamer(streamerId, {
      type: 'donations-paused',
      timestamp: new Date().toISOString(),
      data: {
        streamerId,
      },
    });
  }

  public notifyDonationsResumed(streamerId: string): void {
    this.broadcastToStreamer(streamerId, {
      type: 'donations-resumed',
      timestamp: new Date().toISOString(),
      data: {
        streamerId,
      },
    });
  }

  // =============================================
  // SYSTEM EVENTS
  // =============================================

  public sendError(streamerId: string, code: string, message: string, details?: any): void {
    this.broadcastToStreamer(streamerId, {
      type: 'error',
      timestamp: new Date().toISOString(),
      data: {
        code,
        message,
        details,
      },
    });
  }

  // =============================================
  // BATCH OPERATIONS
  // =============================================

  public batchBroadcast(messages: Array<{
    streamerId?: string;
    message: AnyServerMessage;
  }>): void {
    console.log(`📡 Batch broadcasting ${messages.length} messages`);
    
    messages.forEach(({ streamerId, message }) => {
      if (streamerId) {
        this.broadcastToStreamer(streamerId, message);
      } else {
        this.broadcastToAll(message);
      }
    });
  }

  // =============================================
  // ANALYTICS & MONITORING
  // =============================================

  public getConnectionStats(): { message: string; timestamp: string } {
    // This would integrate with SSE stats for now
    return {
      message: 'WebSocket broadcaster active',
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const wsBroadcaster = WebSocketBroadcaster.getInstance();
