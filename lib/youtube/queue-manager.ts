import { prisma } from "@/lib/db";

// =============================================
// TYPES
// =============================================

export interface QueueItem {
  id: string;
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  youtube_url: string;
  createdAt: string;
  status: 'waiting_for_tts' | 'pending' | 'playing' | 'completed' | 'skipped';
  addedAt: string;
}

export interface QueueStatistics {
  totalVideos: number;
  pendingVideos: number;
  playingVideos: number;
  completedVideos: number;
  skippedVideos: number;
  totalAmount: number;
  averageAmount: number;
  uniqueDonors: number;
}

export interface QueueData {
  queue: QueueItem[];
  statistics: QueueStatistics;
  currentlyPlaying: QueueItem | null;
}

// =============================================
// QUEUE MANAGER CLASS
// =============================================

export class YouTubeQueueManager {
  private static instance: YouTubeQueueManager;
  
  public static getInstance(): YouTubeQueueManager {
    if (!YouTubeQueueManager.instance) {
      YouTubeQueueManager.instance = new YouTubeQueueManager();
    }
    return YouTubeQueueManager.instance;
  }

  // =============================================
  // PUBLIC METHODS
  // =============================================

  async getQueueData(streamerId: string): Promise<QueueData> {
    try {
      console.log(`📊 Getting queue data for streamer: ${streamerId}`);
      
      // Get recent donations with YouTube URLs from the database
      const donations = await prisma.donationEvent.findMany({
        where: {
          streamerId,
          youtubeUrl: {
            not: null
          },
          cleared: false
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 200 // Increased limit to match API and show all videos with controls
      });

      // Convert to queue format
      const queue: QueueItem[] = donations.map(donation => ({
        id: donation.id.toString(),
        identifier: donation.identifier,
        nickname: donation.nickname,
        message: donation.message || "",
        amount: donation.amount,
        youtube_url: donation.youtubeUrl || "",
        createdAt: donation.createdAt.toISOString(),
        status: (donation.videoStatus || 'pending') as 'waiting_for_tts' | 'pending' | 'playing' | 'completed' | 'skipped',
        addedAt: donation.createdAt.toISOString()
      }));

      // Calculate statistics
      const statistics = this.calculateStatistics(queue);
      
      // Find currently playing video
      const currentlyPlaying = queue.find(v => v.status === 'playing') || null;

      console.log(`📊 Queue data retrieved: ${queue.length} videos, ${statistics.pendingVideos} pending`);

      return {
        queue,
        statistics,
        currentlyPlaying
      };
    } catch (error) {
      console.error("❌ Failed to get queue data:", error);
      throw error;
    }
  }

  async updateVideoStatus(
    streamerId: string, 
    identifier: string, 
    status: 'waiting_for_tts' | 'pending' | 'playing' | 'completed' | 'skipped'
  ): Promise<boolean> {
    try {
      console.log(`🔄 Updating video ${identifier} status to: ${status}`);
      
      // Update video status in database
      const updateResult = await prisma.donationEvent.updateMany({
        where: {
          streamerId,
          identifier,
          youtubeUrl: {
            not: null
          }
        },
        data: {
          videoStatus: status
        }
      });

      if (updateResult.count === 0) {
        console.warn(`⚠️ No video found to update: ${identifier}`);
        return false;
      }

      console.log(`✅ Updated video ${identifier} status to: ${status}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to update video status:", error);
      throw error;
    }
  }

  async getNextVideo(streamerId: string): Promise<QueueItem | null> {
    try {
      console.log(`🎬 Getting next video for streamer: ${streamerId}`);

      // First, mark any currently playing videos as completed
      await prisma.donationEvent.updateMany({
        where: {
          streamerId,
          videoStatus: 'playing'
        },
        data: {
          videoStatus: 'completed'
        }
      });

      // Find next pending video in queue
      const nextVideo = await prisma.donationEvent.findFirst({
        where: {
          streamerId,
          youtubeUrl: {
            not: null
          },
          videoStatus: 'pending',
          cleared: false
        },
        orderBy: {
          createdAt: 'asc' // FIFO: First In, First Out
        }
      });

      if (!nextVideo) {
        console.log("🔄 No videos in queue");
        return null;
      }

      // Mark as playing
      await prisma.donationEvent.update({
        where: {
          id: nextVideo.id
        },
        data: {
          videoStatus: 'playing'
        }
      });

      const queueItem: QueueItem = {
        id: nextVideo.id.toString(),
        identifier: nextVideo.identifier,
        nickname: nextVideo.nickname,
        message: nextVideo.message || "",
        amount: nextVideo.amount,
        youtube_url: nextVideo.youtubeUrl || "",
        createdAt: nextVideo.createdAt.toISOString(),
        status: 'playing',
        addedAt: nextVideo.createdAt.toISOString()
      };

      console.log(`▶️ Next video: ${nextVideo.identifier} from ${nextVideo.nickname}`);
      return queueItem;
    } catch (error) {
      console.error("❌ Failed to get next video:", error);
      throw error;
    }
  }

  async clearCompletedVideos(streamerId: string): Promise<number> {
    try {
      console.log(`🧹 Clearing completed videos for streamer: ${streamerId}`);
      
      // Mark all completed and skipped videos as cleared
      const updateResult = await prisma.donationEvent.updateMany({
        where: {
          streamerId,
          youtubeUrl: {
            not: null
          },
          videoStatus: {
            in: ['completed', 'skipped']
          },
          cleared: false
        },
        data: {
          cleared: true
        }
      });

      console.log(`🧹 Cleared ${updateResult.count} completed/skipped videos`);
      return updateResult.count;
    } catch (error) {
      console.error("❌ Failed to clear completed videos:", error);
      throw error;
    }
  }

  async validateVideo(videoUrl: string): Promise<{
    valid: boolean;
    videoId?: string;
    title?: string;
    author?: string;
    error?: string;
  }> {
    try {
      // Extract video ID
      const videoId = this.extractVideoId(videoUrl);
      
      if (!videoId) {
        return {
          valid: false,
          error: "Invalid YouTube URL"
        };
      }

      // Use YouTube oEmbed API for validation
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );

      if (!oembedResponse.ok) {
        return {
          valid: false,
          videoId,
          error: "Video not found or unavailable"
        };
      }

      const oembedData = await oembedResponse.json();

      return {
        valid: true,
        videoId,
        title: oembedData.title,
        author: oembedData.author_name
      };
    } catch (error) {
      console.error("❌ Video validation error:", error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Validation failed"
      };
    }
  }

  // =============================================
  // PRIVATE METHODS
  // =============================================

  private calculateStatistics(queue: QueueItem[]): QueueStatistics {
    const totalVideos = queue.length;
    const pendingVideos = queue.filter(v => v.status === 'pending').length;
    const playingVideos = queue.filter(v => v.status === 'playing').length;
    const completedVideos = queue.filter(v => v.status === 'completed').length;
    const skippedVideos = queue.filter(v => v.status === 'skipped').length;
    
    const totalAmount = queue.reduce((sum, item) => sum + item.amount, 0);
    const averageAmount = totalVideos > 0 ? Math.round(totalAmount / totalVideos) : 0;
    const uniqueDonors = new Set(queue.map(item => item.nickname.toLowerCase())).size;

    return {
      totalVideos,
      pendingVideos,
      playingVideos,
      completedVideos,
      skippedVideos,
      totalAmount,
      averageAmount,
      uniqueDonors
    };
  }

  private extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
}
