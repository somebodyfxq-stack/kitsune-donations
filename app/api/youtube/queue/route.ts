import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wsBroadcaster } from "@/lib/websocket/broadcaster";
import { YouTubeQueueManager } from "@/lib/youtube/queue-manager";

export const runtime = "nodejs";

// Valid video statuses
type VideoStatus = 'waiting_for_tts' | 'pending' | 'playing' | 'completed' | 'skipped';

// Get current queue
export async function GET(req: NextRequest) {
  try {
    // Try to get auth session first (for panel usage)
    const session = await getAuthSession();
    
    // If no session, check for streamerId query parameter (for OBS widget usage)
    const { searchParams } = new URL(req.url);
    const queryStreamerId = searchParams.get('streamerId');
    
    let streamerId: string;
    
    if (session?.user?.id) {
      // Use session user ID (panel access)
      streamerId = session.user.id;
    } else if (queryStreamerId) {
      // Use query parameter (OBS widget access)
      streamerId = queryStreamerId;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get recent donations with YouTube URLs from the database, excluding cleared ones
    const recentDonations = await prisma.donationEvent.findMany({
      where: {
        streamerId: streamerId,
        youtubeUrl: {
          not: null
        },
        cleared: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 200 // Increased limit to show all videos with controls
    });

    // Convert to queue format with status from database
    const queueFromDB = recentDonations.map(donation => ({
      id: donation.id,
      identifier: donation.identifier,
      nickname: donation.nickname,
      message: donation.message || "",
      amount: donation.amount,
      youtube_url: donation.youtubeUrl || "",
      createdAt: donation.createdAt.toISOString(),
      status: donation.videoStatus || 'pending',
      addedAt: donation.createdAt.toISOString()
    }));

    return NextResponse.json({
      queue: queueFromDB,
      totalVideos: queueFromDB.length,
      pendingVideos: queueFromDB.filter(v => v.status === 'pending').length,
      playingVideos: queueFromDB.filter(v => v.status === 'playing').length,
      completedVideos: queueFromDB.filter(v => v.status === 'completed').length,
      currentlyPlaying: queueFromDB.find(v => v.status === 'playing') || null
    });

  } catch (error) {
    console.error("Failed to get YouTube queue:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Update video status (start playing, stop, complete, skip)
export async function POST(req: NextRequest) {
  try {
    // Try to get auth session first (for panel usage)
    const session = await getAuthSession();
    
    // If no session, check for streamerId query parameter (for OBS widget usage)
    const { searchParams } = new URL(req.url);
    const queryStreamerId = searchParams.get('streamerId');
    
    let streamerId: string;
    
    if (session?.user?.id) {
      // Use session user ID (panel access)
      streamerId = session.user.id;
    } else if (queryStreamerId) {
      // Use query parameter (OBS widget access)
      streamerId = queryStreamerId;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, identifier, status } = body;

    // Validate status
    const validStatuses: VideoStatus[] = ['waiting_for_tts', 'pending', 'playing', 'completed', 'skipped'];
    const newStatus = action === 'stop' ? 'completed' : status;
    
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update video status in database
    const updateResult = await prisma.donationEvent.updateMany({
      where: {
        streamerId: streamerId,
        identifier: identifier,
        youtubeUrl: {
          not: null
        }
      },
      data: {
        videoStatus: newStatus
      }
    });

    if (updateResult.count === 0) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    console.log(`🔄 Updated video ${identifier} status to: ${newStatus}`);
    
    // Broadcast video status change event via WebSocket
    wsBroadcaster.notifyVideoStatusChange(streamerId, identifier, newStatus);
    
    // If video completed, also trigger queue update
    if (newStatus === 'completed' || newStatus === 'skipped') {
      const queueManager = YouTubeQueueManager.getInstance();
      const queueData = await queueManager.getQueueData(streamerId);
      
      wsBroadcaster.notifyQueueUpdate(streamerId, {
        currentlyPlaying: queueData.currentlyPlaying,
        queueStats: queueData.statistics,
        pendingCount: queueData.statistics.pendingVideos,
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Video status updated to: ${newStatus}`,
      identifier,
      status: newStatus
    });

  } catch (error) {
    console.error("Failed to update video status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Clear completed videos
export async function DELETE(req: NextRequest) {
  try {
    // Try to get auth session first (for panel usage)
    const session = await getAuthSession();
    
    // If no session, check for streamerId query parameter (for OBS widget usage)
    const { searchParams } = new URL(req.url);
    const queryStreamerId = searchParams.get('streamerId');
    
    let streamerId: string;
    
    if (session?.user?.id) {
      // Use session user ID (panel access)
      streamerId = session.user.id;
    } else if (queryStreamerId) {
      // Use query parameter (OBS widget access)
      streamerId = queryStreamerId;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mark all completed and skipped videos as cleared
    const updateResult = await prisma.donationEvent.updateMany({
      where: {
        streamerId: streamerId,
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

    console.log(`🧹 Marked ${updateResult.count} completed/skipped videos as cleared`);
    
    // Broadcast queue update after clearing via WebSocket
    const queueManager = YouTubeQueueManager.getInstance();
    const queueData = await queueManager.getQueueData(streamerId);
    
    wsBroadcaster.notifyQueueUpdate(streamerId, {
      currentlyPlaying: queueData.currentlyPlaying,
      queueStats: queueData.statistics,
      pendingCount: queueData.statistics.pendingVideos,
    });
    
    return NextResponse.json({ 
      success: true, 
      clearedCount: updateResult.count,
      message: `Очищено ${updateResult.count} завершених відео` 
    });

  } catch (error) {
    console.error("Failed to clear completed videos:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

    // Get next video in queue and mark it as playing
export async function PATCH(req: NextRequest) {
  try {
    // Try to get auth session first (for panel usage)
    const session = await getAuthSession();
    
    // If no session, check for streamerId query parameter (for OBS widget usage)
    const { searchParams } = new URL(req.url);
    const queryStreamerId = searchParams.get('streamerId');
    
    let streamerId: string;
    
    if (session?.user?.id) {
      // Use session user ID (panel access)
      streamerId = session.user.id;
    } else if (queryStreamerId) {
      // Use query parameter (OBS widget access)
      streamerId = queryStreamerId;
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First, mark any currently playing videos as completed
    await prisma.donationEvent.updateMany({
      where: {
        streamerId: streamerId,
        videoStatus: 'playing'
      },
      data: {
        videoStatus: 'completed'
      }
    });

    // Find next pending video in queue
    const nextVideo = await prisma.donationEvent.findFirst({
      where: {
        streamerId: streamerId,
        youtubeUrl: {
          not: null
        },
        videoStatus: 'pending',
        cleared: false
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    if (!nextVideo) {
      return NextResponse.json({ 
        nextVideo: null,
        message: "No videos in queue" 
      });
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

    const videoData = {
      id: nextVideo.id,
      identifier: nextVideo.identifier,
      nickname: nextVideo.nickname,
      message: nextVideo.message || "",
      amount: nextVideo.amount,
      youtube_url: nextVideo.youtubeUrl || "",
      createdAt: nextVideo.createdAt.toISOString(),
      status: 'playing',
      addedAt: nextVideo.createdAt.toISOString()
    };

    console.log(`▶️ Started playing video ${nextVideo.identifier} from ${nextVideo.nickname}`);
    
    // Broadcast video started and queue update via WebSocket
    wsBroadcaster.notifyVideoStarted(streamerId, videoData);
    
    const queueManager = YouTubeQueueManager.getInstance();
    const queueData = await queueManager.getQueueData(streamerId);
    
    wsBroadcaster.notifyQueueUpdate(streamerId, {
      currentlyPlaying: videoData,
      queueStats: queueData.statistics,
      pendingCount: queueData.statistics.pendingVideos,
    });
    
    return NextResponse.json({ 
      success: true,
      nextVideo: videoData,
      message: `Playing video from ${nextVideo.nickname}`
    });

  } catch (error) {
    console.error("Failed to get next video:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
