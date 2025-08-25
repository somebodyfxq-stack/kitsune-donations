"use client";

import { useCallback, useRef, useState } from "react";

export interface YouTubeSettings {
  maxDurationMinutes: number;
  volume: number;
  showClipTitle: boolean;
  showDonorName: boolean;
  showControls: boolean;
  minLikes: number;
  minViews: number;
  minComments: number;
  showImmediately: boolean;
}

export interface PlayerError {
  type: 'blocked' | 'network' | 'invalid' | 'unknown';
  message: string;
  videoId?: string;
}

type PlayerState = "idle" | "loading" | "playing" | "error" | "ended";

export const useYouTubePlayer = (
  settings: YouTubeSettings,
  isOBSBrowser: boolean,
  onVideoEnd: () => void,
  onError: (error: PlayerError) => void
) => {
  const [playerState, setPlayerState] = useState<PlayerState>("idle");
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [currentError, setCurrentError] = useState<PlayerError | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [showBlockedMessage, setShowBlockedMessage] = useState(false);
  
  const finishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const extractVideoId = useCallback((url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }, []);

  const validateVideo = useCallback(async (videoId: string): Promise<boolean> => {
    try {
      console.log(`🔍 Validating video: ${videoId}`);
      
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      
      if (!response.ok) {
        console.error(`❌ Video validation failed: ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      console.log(`✅ Video validation successful: ${data.title}`);
      return true;
    } catch (error) {
      console.error("❌ Video validation error:", error);
      return false;
    }
  }, []);

  const scheduleVideoEnd = useCallback(() => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
    }
    
    const duration = settings.maxDurationMinutes * 60 * 1000;
    console.log(`⏰ Scheduling video end in ${duration}ms`);
    
    finishTimeoutRef.current = setTimeout(() => {
      console.log("⏰ Video duration limit reached - finishing");
      onVideoEnd();
    }, duration);
  }, [settings.maxDurationMinutes, onVideoEnd]);

  const getIframeSrc = useCallback((videoId: string): string => {
    const params = new URLSearchParams({
      v: videoId,
      autoplay: '1',
      controls: settings.showControls ? '1' : '0',
      disablekb: '1',
      fs: '0',
      iv_load_policy: '3',
      modestbranding: '1',
      playsinline: '1',
      rel: '0',
      showinfo: '0',
      start: '0',
      mute: '0',
      hl: 'und',
      cc_lang_pref: 'und',
      cc_load_policy: '0',
      ...(isOBSBrowser && {
        origin: typeof window !== 'undefined' ? window.location.origin : '',
        widget_referrer: typeof window !== 'undefined' ? window.location.origin : '',
        html5: '1',
        wmode: 'opaque'
      })
    });

    return `https://cdpn.io/pen/debug/oNPzxKo?${params.toString()}`;
  }, [settings.showControls, isOBSBrowser]);

  const handleIframeLoad = useCallback(() => {
    console.log("✅ CodePen proxy loaded successfully");
    setPlayerState("playing");
    setIsPlayerReady(true);
    scheduleVideoEnd();
    
    // Additional user interaction simulation for OBS after iframe loads
    if (isOBSBrowser) {
      setTimeout(() => {
        // Simulate additional interaction
        try {
          const clickEvent = new MouseEvent('click', { bubbles: true });
          document.body.dispatchEvent(clickEvent);
          console.log("🎮 Additional user interaction simulated for OBS");
        } catch (err) {
          console.warn("Could not simulate additional interaction:", err);
        }
      }, 500);
    }
  }, [scheduleVideoEnd, isOBSBrowser]);

  const handleIframeError = useCallback(() => {
    console.error("❌ CodePen proxy failed to load");
    const error: PlayerError = {
      type: 'network',
      message: 'CodePen proxy failed to load',
      videoId: currentVideoId || undefined
    };
    setCurrentError(error);
    onError(error);
  }, [currentVideoId, onError]);

  const startVideoPlayback = useCallback((videoId: string) => {
    console.log(`🎬 Starting video playback: ${videoId} (OBS mode: ${isOBSBrowser})`);
    
    setPlayerState("loading");
    setCurrentError(null);
    setCurrentVideoId(videoId);
    setShowBlockedMessage(false);
  }, [isOBSBrowser]);

  const showBlockedVideoMessage = useCallback((videoId: string) => {
    console.log(`🚫 Showing blocked video message for: ${videoId}`);
    
    setCurrentVideoId(videoId);
    setShowBlockedMessage(true);
    setPlayerState("error");
    
    // Auto finish after showing message
    setTimeout(() => {
      onVideoEnd();
    }, 5000);
  }, [onVideoEnd]);

  const playVideo = useCallback(async (videoUrl: string) => {
    const videoId = extractVideoId(videoUrl);
    
    if (!videoId) {
      const error: PlayerError = {
        type: 'invalid',
        message: 'Could not extract video ID from URL',
      };
      setCurrentError(error);
      onError(error);
      return;
    }

    try {
      const isValid = await validateVideo(videoId);
      
      if (!isValid) {
        const error: PlayerError = {
          type: 'invalid',
          message: 'Video not found or unavailable',
          videoId
        };
        setCurrentError(error);
        showBlockedVideoMessage(videoId);
        return;
      }

      startVideoPlayback(videoId);
    } catch (error) {
      console.error("❌ Video playback error:", error);
      const playerError: PlayerError = {
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        videoId
      };
      setCurrentError(playerError);
      onError(playerError);
    }
  }, [extractVideoId, validateVideo, startVideoPlayback, showBlockedVideoMessage, onError]);

  const stopVideo = useCallback(() => {
    console.log("⏹️ Stopping video");
    
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }
    
    setPlayerState("idle");
    setIsPlayerReady(false);
    setCurrentError(null);
    setCurrentVideoId(null);
    setShowBlockedMessage(false);
  }, []);

  const cleanup = useCallback(() => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
    }
    setPlayerState("idle");
    setIsPlayerReady(false);
    setCurrentError(null);
    setCurrentVideoId(null);
    setShowBlockedMessage(false);
  }, []);

  const getIframeProps = useCallback(() => {
    if (!currentVideoId || showBlockedMessage) return null;
    
    return {
      src: getIframeSrc(currentVideoId),
      width: '100%',
      height: '100%',
      style: {
        border: 'none',
        width: '100%',
        height: '100%'
      },
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
      allowFullscreen: !isOBSBrowser,
      ...(isOBSBrowser && {
        loading: 'eager' as const,
        importance: 'high' as const,
        sandbox: 'allow-scripts allow-same-origin allow-presentation allow-forms'
      }),
      onLoad: handleIframeLoad,
      onError: handleIframeError
    };
  }, [currentVideoId, showBlockedMessage, getIframeSrc, isOBSBrowser, handleIframeLoad, handleIframeError]);

  return {
    playerState,
    isPlayerReady,
    currentError,
    currentVideoId,
    showBlockedMessage,
    playVideo,
    stopVideo,
    cleanup,
    getIframeProps,
  };
};
