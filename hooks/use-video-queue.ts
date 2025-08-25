"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface YouTubeEvent {
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  createdAt: string;
  youtube_url: string;
  videoUrl?: string;
}

export interface QueueState {
  currentVideo: YouTubeEvent | null;
  isProcessing: boolean;
  hasError: boolean;
  errorMessage: string | null;
}

export const useVideoQueue = (streamerId?: string) => {
  console.log("🎬 useVideoQueue initialized with streamerId:", streamerId);
  const [queueState, setQueueState] = useState<QueueState>({
    currentVideo: null,
    isProcessing: false,
    hasError: false,
    errorMessage: null,
  });

  const isProcessingRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateCurrentVideo = useCallback((video: YouTubeEvent | null) => {
    setQueueState(prev => ({
      ...prev,
      currentVideo: video,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setQueueState(prev => ({
      ...prev,
      hasError: !!error,
      errorMessage: error,
    }));
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    isProcessingRef.current = processing;
    setQueueState(prev => ({
      ...prev,
      isProcessing: processing,
    }));
  }, []);

  const loadInitialQueue = useCallback(async () => {
    try {
      console.log("🔄 Loading initial queue from API");
      const url = streamerId ? `/api/youtube/queue?streamerId=${streamerId}` : '/api/youtube/queue';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();
      
      if (data.currentlyPlaying) {
        console.log("🎬 Found currently playing video:", data.currentlyPlaying.identifier);
        updateCurrentVideo(data.currentlyPlaying);
      } else {
        console.log("🔄 No currently playing video, ready for new videos");
        updateCurrentVideo(null);
      }
      
      setError(null);
    } catch (error) {
      console.error("❌ Failed to load initial queue:", error);
      setError(error instanceof Error ? error.message : 'Failed to load queue');
    }
  }, [streamerId, updateCurrentVideo, setError]);

  const getNextVideo = useCallback(async (): Promise<YouTubeEvent | null> => {
    try {
      console.log("🎬 Getting next video from API queue");
      
      const url = streamerId ? `/api/youtube/queue?streamerId=${streamerId}` : '/api/youtube/queue';
      const response = await fetch(url, {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.nextVideo) {
        console.log("🔄 No videos in queue");
        return null;
      }

      const nextVideo = data.nextVideo;
      console.log(`🎬 Got next video: ${nextVideo.identifier} from ${nextVideo.nickname}`);
      
      return {
        identifier: nextVideo.identifier,
        nickname: nextVideo.nickname,
        message: nextVideo.message || "",
        amount: nextVideo.amount,
        createdAt: nextVideo.createdAt,
        youtube_url: nextVideo.youtube_url,
        videoUrl: nextVideo.youtube_url
      };
    } catch (error) {
      console.error("❌ Failed to get next video:", error);
      throw error;
    }
  }, [streamerId]);

  const markVideoCompleted = useCallback(async (identifier: string) => {
    try {
      const url = streamerId ? `/api/youtube/queue?streamerId=${streamerId}` : '/api/youtube/queue';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          status: 'completed'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update video status: ${response.status}`);
      }

      console.log("✅ Video marked as completed:", identifier);
      setError(null);
    } catch (error) {
      console.error("❌ Failed to mark video as completed:", error);
      setError(error instanceof Error ? error.message : 'Failed to update video status');
    }
  }, [streamerId, setError]);

  const processNextVideo = useCallback(async (): Promise<YouTubeEvent | null> => {
    if (isProcessingRef.current) {
      console.log("🔄 Already processing, skipping");
      return null;
    }

    if (queueState.currentVideo) {
      console.log("🔄 Video currently playing, skipping");
      return null;
    }

    setProcessing(true);
    setError(null);

    try {
      const nextVideo = await getNextVideo();
      
      if (nextVideo) {
        updateCurrentVideo(nextVideo);
        console.log(`🎬 Set current video: ${nextVideo.identifier}`);
      }
      
      return nextVideo;
    } catch (error) {
      console.error("❌ Failed to process next video:", error);
      setError(error instanceof Error ? error.message : 'Failed to process queue');
      return null;
    } finally {
      setProcessing(false);
    }
  }, [queueState.currentVideo, setProcessing, setError, getNextVideo, updateCurrentVideo]);

  const finishCurrentVideo = useCallback(async () => {
    if (!queueState.currentVideo) {
      console.log("🔄 No current video to finish");
      return;
    }

    console.log("🛑 Finishing current video:", queueState.currentVideo.identifier);

    try {
      await markVideoCompleted(queueState.currentVideo.identifier);
    } catch (error) {
      console.error("❌ Failed to mark video as completed, but continuing...", error);
    }

    updateCurrentVideo(null);
    console.log("🛑 Current video finished and cleared");
  }, [queueState.currentVideo, markVideoCompleted, updateCurrentVideo]);

  // Listen for localStorage signals from donation widget
  const handleStorageSignal = useCallback((event: StorageEvent) => {
    if (event.key === 'kitsune-youtube-signal' && event.newValue) {
      try {
        const signal = JSON.parse(event.newValue);
        
        if (signal.action === 'START_VIDEO' && signal.videoData) {
          console.log("🎬 Received YouTube signal:", signal.videoData.youtube_url);
          
          // Clear signal immediately with error handling
          try {
            localStorage.removeItem('kitsune-youtube-signal');
          } catch (storageError) {
            console.warn("Could not clear localStorage signal:", storageError);
          }
          
          // Signal will be picked up by the polling system
          console.log("🎬 Video signal received - will be processed by queue polling");
        }
      } catch (error) {
        console.error("❌ YouTube signal parse error:", error);
      }
    }
  }, []);

  // Check for existing signals on mount
  const checkExistingSignal = useCallback(() => {
    try {
      if (typeof localStorage === 'undefined') return;
      
      const existingSignal = localStorage.getItem('kitsune-youtube-signal');
      if (existingSignal) {
        const signal = JSON.parse(existingSignal);
        if (signal.action === 'START_VIDEO' && signal.videoData) {
          console.log("🎬 Found existing signal on startup");
          handleStorageSignal({ 
            key: 'kitsune-youtube-signal', 
            newValue: existingSignal 
          } as StorageEvent);
        }
      }
    } catch (error) {
      console.error("❌ Error checking existing signal:", error);
    }
  }, [handleStorageSignal]);

  // Sync with API for queue changes
  const syncWithAPI = useCallback(async () => {
    try {
      const url = streamerId ? `/api/youtube/queue?streamerId=${streamerId}` : '/api/youtube/queue';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();
      
      // Check if our current video status needs to be updated
      if (queueState.currentVideo) {
        const currentVideoInAPI = data.queue.find((v: any) => 
          v.identifier === queueState.currentVideo?.identifier
        );
        
        if (currentVideoInAPI && currentVideoInAPI.status === 'completed') {
          console.log("🔄 Current video marked as completed in API, finishing...");
          updateCurrentVideo(null);
          return;
        }
      }
      
      // If no video is playing and there are pending videos, signal to process
      if (!queueState.currentVideo && data.queue.some((v: any) => v.status === 'pending')) {
        console.log("🔄 Found pending videos in sync, ready to process...");
      }
      
      setError(null);
    } catch (error) {
      console.error("❌ Error syncing with API:", error);
      setError(error instanceof Error ? error.message : 'Sync error');
    }
  }, [streamerId, queueState.currentVideo, updateCurrentVideo, setError]);

  // Initialize queue
  useEffect(() => {
    if (streamerId) {
      loadInitialQueue();
      checkExistingSignal();
    }
  }, [streamerId, loadInitialQueue, checkExistingSignal]);

  // Set up storage listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleStorageWithErrorBoundary = (event: StorageEvent) => {
      try {
        handleStorageSignal(event);
      } catch (error) {
        console.error("❌ Error in storage listener:", error);
      }
    };
    
    window.addEventListener('storage', handleStorageWithErrorBoundary);
    
    return () => {
      window.removeEventListener('storage', handleStorageWithErrorBoundary);
    };
  }, [handleStorageSignal]);

  // Set up periodic sync (reduced frequency - every 5 seconds instead of 3)
  useEffect(() => {
    const startPolling = () => {
      // Initial sync
      syncWithAPI();
      
      // Set up interval
      pollingIntervalRef.current = setInterval(syncWithAPI, 5000);
    };

    startPolling();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [syncWithAPI]);

  return {
    ...queueState,
    processNextVideo,
    finishCurrentVideo,
    loadInitialQueue,
  };
};
