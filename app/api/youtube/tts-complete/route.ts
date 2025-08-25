import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { wsBroadcaster } from "@/lib/websocket/broadcaster";
import { YouTubeQueueManager } from "@/lib/youtube/queue-manager";

export const runtime = "nodejs";

/**
 * Mark video as ready to play after TTS completion
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, streamerId } = body;

    if (!identifier || !streamerId) {
      return NextResponse.json({ error: "Missing identifier or streamerId" }, { status: 400 });
    }

    console.log(`🎵 TTS completed for ${identifier} (streamerId: ${streamerId}), marking video as pending`);

    // Update video status from 'waiting_for_tts' to 'pending'
    const updateResult = await prisma.donationEvent.updateMany({
      where: {
        streamerId: streamerId,
        identifier: identifier,
        youtubeUrl: {
          not: null
        },
        videoStatus: 'waiting_for_tts'
      },
      data: {
        videoStatus: 'pending'
      }
    });

    if (updateResult.count === 0) {
      console.warn(`⚠️ No waiting_for_tts video found for identifier: ${identifier}`);
      
      // Check if video exists with different status (might already be processed)
      const existingVideo = await prisma.donationEvent.findFirst({
        where: {
          streamerId: streamerId,
          identifier: identifier,
          youtubeUrl: {
            not: null
          }
        }
      });
      
      if (existingVideo) {
        console.log(`ℹ️ Video ${identifier} already has status: ${existingVideo.videoStatus}`);
        return NextResponse.json({ 
          success: true,
          message: "Video already processed",
          identifier,
          currentStatus: existingVideo.videoStatus,
          updatedCount: 0
        });
      } else {
        console.error(`❌ No video found at all for identifier: ${identifier}`);
        return NextResponse.json({ 
          error: "Video not found",
          identifier 
        }, { status: 404 });
      }
    }

    console.log(`✅ Video ${identifier} marked as pending - ready for playback (updated ${updateResult.count} records)`);
    
    // Get donation details for notification
    const donationEvent = await prisma.donationEvent.findFirst({
      where: {
        streamerId: streamerId,
        identifier: identifier,
        youtubeUrl: { not: null }
      },
      select: {
        nickname: true
      }
    });

    // Broadcast TTS completion event via WebSocket
    if (donationEvent) {
      wsBroadcaster.notifyTTSCompleted(streamerId, identifier, donationEvent.nickname);
    }

    // Broadcast queue update - video is now ready to play
    const queueManager = YouTubeQueueManager.getInstance();
    const queueData = await queueManager.getQueueData(streamerId);
    
    wsBroadcaster.notifyQueueUpdate(streamerId, {
      currentlyPlaying: queueData.currentlyPlaying,
      queueStats: queueData.statistics,
      pendingCount: queueData.statistics.pendingVideos,
    });
    
    return NextResponse.json({ 
      success: true, 
      message: "Video marked as pending",
      identifier,
      updatedCount: updateResult.count
    });

  } catch (error) {
    console.error("Failed to mark video as pending:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
