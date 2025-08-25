"use client";

import { useCallback, useEffect, useState } from "react";
import { useOBSDetection } from "@/hooks/use-obs-detection";
import { useYouTubePlayer, type YouTubeSettings } from "@/hooks/use-youtube-player";
import { useVideoQueue } from "@/hooks/use-video-queue";
import { useSSEConnection } from "@/hooks/use-sse-connection";

// =============================================
// TYPES & INTERFACES
// =============================================

interface YouTubeWidgetProps {
  streamerId?: string;
  token?: string;
  settings?: YouTubeSettings;
}

// =============================================
// DEFAULT SETTINGS
// =============================================

const DEFAULT_SETTINGS: YouTubeSettings = {
  maxDurationMinutes: 5,
  volume: 50,
  showClipTitle: true,
  showDonorName: true,
  showControls: true,
  minLikes: 0,
  minViews: 0,
  minComments: 0,
  showImmediately: false
};

// =============================================
// MAIN COMPONENT
// =============================================

export const YouTubeWidgetRefactored = ({ 
  streamerId, 
  token: _token, 
  settings = DEFAULT_SETTINGS 
}: YouTubeWidgetProps) => {
  
  const [videoTitle, setVideoTitle] = useState("");
  
  // =============================================
  // CUSTOM HOOKS
  // =============================================
  
  const { 
    isOBSBrowser, 
    obsCapabilities,
    simulateUserInteraction 
  } = useOBSDetection();
  
  const { 
    connectionState, 
    isConnected 
  } = useSSEConnection(streamerId);
  
  const {
    currentVideo,
    isProcessing,
    hasError,
    errorMessage,
    processNextVideo,
    finishCurrentVideo,
  } = useVideoQueue(streamerId);

  // =============================================
  // VIDEO LIFECYCLE HANDLERS
  // =============================================
  
  const handleVideoEnd = useCallback(async () => {
    console.log("🛑 Video ended, finishing current video");
    await finishCurrentVideo();
    
    // Start next video after a short delay
    setTimeout(() => {
      processNextVideo().then((nextVideo) => {
        if (nextVideo) {
          console.log("🎬 Starting next video from queue");
        }
      });
    }, 600);
  }, [finishCurrentVideo, processNextVideo]);

  const handleVideoError = useCallback((error: any) => {
    console.error("❌ Video player error:", error);
    
    // Auto-advance to next video on error
    setTimeout(() => {
      handleVideoEnd();
    }, 2000);
  }, [handleVideoEnd]);

  const {
    playerState,
    isPlayerReady,
    currentError,
    currentVideoId,
    showBlockedMessage,
    playVideo,
    stopVideo,
    cleanup,
    getIframeProps,
  } = useYouTubePlayer(settings, isOBSBrowser, handleVideoEnd, handleVideoError);

  // =============================================
  // VIDEO PLAYBACK EFFECTS
  // =============================================
  
  // Start playing when new video is available
  useEffect(() => {
    if (currentVideo && currentVideo.youtube_url && playerState === "idle") {
      console.log(`🎬 Starting video: ${currentVideo.identifier} from ${currentVideo.nickname}`);
      setVideoTitle(`Video from ${currentVideo.nickname}`);
      
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        playVideo(currentVideo.youtube_url);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentVideo, playerState, playVideo]);

  // Process queue when no video is playing
  useEffect(() => {
    if (!currentVideo && !isProcessing && playerState === "idle") {
      console.log("🔄 No current video, checking for next video in queue");
      processNextVideo();
    }
  }, [currentVideo, isProcessing, playerState, processNextVideo]);

  // =============================================
  // CLEANUP
  // =============================================
  
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // =============================================
  // DEBUG INFO (ONLY IN DEBUG MODE)
  // =============================================
  
  const isDebugMode = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('debug') === 'true';

  if (isDebugMode) {
    console.log("🐛 YouTube Widget Debug Info:", {
      streamerId,
      currentVideo: currentVideo?.identifier,
      playerState,
      isPlayerReady,
      connectionState,
      isConnected,
      isProcessing,
      hasError,
      errorMessage,
      isOBSBrowser,
      obsCapabilities
    });
  }

  // =============================================
  // RENDER
  // =============================================

  return (
    <div className="youtube-widget" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'transparent',
      pointerEvents: 'none',
      zIndex: 1000
    }}>

      {/* OBS Debug Indicator */}
      {isOBSBrowser && isDebugMode && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: '#00ff00',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 2000,
          border: '1px solid #00ff00'
        }}>
          🎬 OBS MODE ACTIVE
          {obsCapabilities.hasObsStudio && <div>• OBS Studio API</div>}
          {obsCapabilities.hasCEFUserAgent && <div>• CEF User Agent</div>}
          {obsCapabilities.hasOBSParams && <div>• OBS URL Param</div>}
          {obsCapabilities.hasFullscreenWindow && <div>• Fullscreen Window</div>}
        </div>
      )}

      {/* Connection Status (Debug) */}
      {isDebugMode && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: connectionState === 'connected' ? '#00ff00' : '#ffaa00',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 2000,
          border: `1px solid ${connectionState === 'connected' ? '#00ff00' : '#ffaa00'}`
        }}>
          📡 SSE: {connectionState.toUpperCase()}
        </div>
      )}

      {/* Error Display */}
      {hasError && errorMessage && (
        <div style={{
          position: 'fixed',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(220, 38, 38, 0.9)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontFamily: 'Arial, sans-serif',
          zIndex: 2000,
          maxWidth: '90vw'
        }}>
          ❌ {errorMessage}
        </div>
      )}

      {/* Video Title and Donor Name */}
      {currentVideo && (settings.showClipTitle || settings.showDonorName) && (
        <div style={{
          position: 'absolute',
          top: 'calc(50% - 285px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          maxWidth: '90vw',
          textAlign: 'center',
          zIndex: 1003
        }}>
          {settings.showDonorName && (
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#ff6b6b',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}>
              {currentVideo.nickname} • {currentVideo.amount}₴
            </div>
          )}
          {settings.showClipTitle && videoTitle && (
            <div style={{
              fontSize: '18px',
              fontWeight: '500',
              color: 'white',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
            }}>
              {videoTitle}
            </div>
          )}
        </div>
      )}

      {/* Video Player Container */}
      {currentVideo && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '450px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          background: '#000',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '2px solid #ff6b6b',
          boxShadow: '0 0 30px rgba(255, 107, 107, 0.3), 0 20px 40px rgba(0,0,0,0.4)',
          pointerEvents: 'auto',
          zIndex: 1002
        }}>
          
          {/* Player Container */}
          <div style={{
            width: '100%',
            height: '100%',
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            
            {/* YouTube Video iframe */}
            {(() => {
              const iframeProps = getIframeProps();
              return iframeProps ? (
                <iframe
                  key={currentVideoId} // Force re-render when video changes
                  {...iframeProps}
                />
              ) : null;
            })()}
            
            {/* Blocked Video Message */}
            {showBlockedMessage && currentVideoId && (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #ff0000, #cc0000)',
                color: 'white',
                textAlign: 'center',
                fontFamily: 'Arial, sans-serif',
                padding: '20px',
                boxSizing: 'border-box'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🚫</div>
                <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
                  Відео не може бути відтворене
                </div>
                <div style={{ fontSize: '0.9rem', marginBottom: '20px', opacity: 0.9 }}>
                  Власник заборонив вбудовування
                </div>
                <a
                  href={`https://www.youtube.com/watch?v=${currentVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'white',
                    color: '#ff0000',
                    padding: '10px 20px',
                    textDecoration: 'none',
                    borderRadius: '5px',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#f0f0f0'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'white'; }}
                >
                  Відкрити на YouTube
                </a>
              </div>
            )}
            
            {/* Loading State */}
            {!isPlayerReady && playerState === "loading" && !showBlockedMessage && (
              <div style={{
                color: 'white',
                textAlign: 'center',
                fontFamily: 'Arial, sans-serif'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                <div>Завантаження відео...</div>
              </div>
            )}
            
            {/* Idle State */}
            {playerState === "idle" && !isProcessing && !showBlockedMessage && (
              <div style={{
                color: 'white',
                textAlign: 'center',
                fontFamily: 'Arial, sans-serif'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎬</div>
                <div>Очікування відео...</div>
              </div>
            )}
            
            {/* Processing State */}
            {isProcessing && !showBlockedMessage && (
              <div style={{
                color: 'white',
                textAlign: 'center',
                fontFamily: 'Arial, sans-serif'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔄</div>
                <div>Обробка черги...</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Queue Status (Only when no video playing and debug mode) */}
      {!currentVideo && isDebugMode && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🎬</div>
          <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
            YouTube Widget Active
          </div>
          <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
            Waiting for donation with YouTube video...
          </div>
          {isProcessing && (
            <div style={{ fontSize: '0.9rem', color: '#00ff00', marginTop: '10px' }}>
              🔄 Processing queue...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
