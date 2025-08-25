"use client";

import { useCallback, useEffect, useState } from "react";

export interface OBSDetectionResult {
  isOBSBrowser: boolean;
  obsCapabilities: {
    hasObsStudio: boolean;
    hasCEFUserAgent: boolean;
    hasOBSParams: boolean;
    hasFullscreenWindow: boolean;
  };
}

export const useOBSDetection = () => {
  const [obsData, setOBSData] = useState<OBSDetectionResult>({
    isOBSBrowser: false,
    obsCapabilities: {
      hasObsStudio: false,
      hasCEFUserAgent: false,
      hasOBSParams: false,
      hasFullscreenWindow: false,
    },
  });

  const detectOBS = useCallback((): OBSDetectionResult => {
    if (typeof window === 'undefined') {
      return {
        isOBSBrowser: false,
        obsCapabilities: {
          hasObsStudio: false,
          hasCEFUserAgent: false,
          hasOBSParams: false,
          hasFullscreenWindow: false,
        },
      };
    }

    // Check user agent for CEF or OBS
    const userAgent = navigator.userAgent.toLowerCase();
    const hasCEFUserAgent = userAgent.includes('cef') || userAgent.includes('obs');

    // Check for OBS-specific properties
    // @ts-expect-error - OBS Studio API not in standard window types
    const hasObsStudio = !!window.obsstudio;

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hasOBSParams = urlParams.get('obs') === 'true';

    // Check window properties typical for CEF
    const hasFullscreenWindow = window.outerWidth === window.innerWidth && 
                               window.outerHeight === window.innerHeight;

    const isOBSBrowser = hasCEFUserAgent || hasObsStudio || hasOBSParams || hasFullscreenWindow;

    return {
      isOBSBrowser,
      obsCapabilities: {
        hasObsStudio,
        hasCEFUserAgent,
        hasOBSParams,
        hasFullscreenWindow,
      },
    };
  }, []);

  const simulateUserInteraction = useCallback(() => {
    try {
      // Create and dispatch click event
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      document.body.dispatchEvent(clickEvent);

      // Create and dispatch touch event for mobile compatibility
      const touchEvent = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true
      });
      document.body.dispatchEvent(touchEvent);

      console.log('🎮 User interaction simulated for OBS');
    } catch (error) {
      console.error('Failed to simulate user interaction:', error);
    }
  }, []);

  const enableAudioContext = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log('🔊 AudioContext resumed for OBS');
        }
      }
    } catch (error) {
      console.error('Failed to enable AudioContext:', error);
    }
  }, []);

  const initializeOBSMode = useCallback(async () => {
    if (!obsData.isOBSBrowser) return;

    console.log("🎬 OBS Browser Source detected! Initializing OBS mode...");
    
    // Simulate user interaction for autoplay
    simulateUserInteraction();
    
    // Enable AudioContext for sound
    await enableAudioContext();
    
    // Override Page Visibility API for OBS
    try {
      Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: true
      });
      
      Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: true
      });
      
      console.log("👁️ Overrode Visibility API for OBS");
    } catch (error) {
      console.error("Failed to override Visibility API:", error);
    }
    
    // Add OBS-specific CSS class
    document.body.classList.add('obs-browser');
    
    console.log("✅ OBS mode fully initialized");
  }, [obsData.isOBSBrowser, simulateUserInteraction, enableAudioContext]);

  useEffect(() => {
    const detected = detectOBS();
    setOBSData(detected);
  }, [detectOBS]);

  useEffect(() => {
    initializeOBSMode();
  }, [initializeOBSMode]);

  return {
    ...obsData,
    simulateUserInteraction,
    enableAudioContext,
    initializeOBSMode,
  };
};
