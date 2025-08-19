"use client";

import { useState, useRef } from "react";

export default function DebugTTSPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [...prev, logMessage]);
  };

  const enableAudio = async () => {
    try {
      // Спробуємо відтворити тихий звук для активації аудіо контексту
      const audio = new Audio();
      audio.volume = 0.1;
      await audio.play();
      audio.pause();
      setAudioEnabled(true);
      log("✅ Audio context enabled successfully");
    } catch (err: any) {
      log(`❌ Failed to enable audio: ${err.message}`);
    }
  };

  const testDirectTTS = async () => {
    try {
      log("🔊 Testing direct TTS playback...");
      
      const testText = "Тест звуку";
      const url = `/api/tts?text=${encodeURIComponent(testText)}&voice=uk-UA-Standard-A`;
      
      log(`📡 TTS URL: ${url}`);
      
      // Створюємо аудіо елемент
      const audio = new Audio(url);
      audioRef.current = audio;
      
      // Додаємо всі можливі event listeners
      audio.addEventListener("loadstart", () => log("🔄 Audio loading started"));
      audio.addEventListener("loadeddata", () => log("📊 Audio data loaded"));
      audio.addEventListener("loadedmetadata", () => {
        log(`📈 Audio metadata loaded - duration: ${audio.duration}s`);
      });
      audio.addEventListener("canplay", () => log("▶️ Audio can start playing"));
      audio.addEventListener("canplaythrough", () => log("⏭️ Audio can play through"));
      audio.addEventListener("play", () => log("🎵 Audio play started"));
      audio.addEventListener("playing", () => log("🎶 Audio is playing"));
      audio.addEventListener("pause", () => log("⏸️ Audio paused"));
      audio.addEventListener("ended", () => log("🏁 Audio playback ended"));
      audio.addEventListener("error", (e: any) => {
        log(`❌ Audio error: ${e.error?.message || 'Unknown error'}`);
        console.error("Audio error details:", e);
      });
      
      // Спробуємо відтворити
      log("▶️ Attempting to play audio...");
      await audio.play();
      
    } catch (err: any) {
      log(`❌ TTS test failed: ${err.message}`);
      console.error("TTS test error:", err);
    }
  };

  const testAudioPermissions = () => {
    log("🔍 Testing audio permissions and capabilities...");
    
    // Перевіряємо user agent
    log(`🌐 User Agent: ${navigator.userAgent}`);
    
    // Перевіряємо Audio API підтримку
    if (typeof Audio !== 'undefined') {
      log("✅ Audio API supported");
    } else {
      log("❌ Audio API not supported");
    }
    
    // Перевіряємо AudioContext
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const audioContext = new AudioContext();
        log(`🎛️ AudioContext state: ${audioContext.state}`);
        if (audioContext.state === 'suspended') {
          log("⚠️ AudioContext is suspended - user interaction required");
        }
      }
    } catch (err: any) {
      log(`❌ AudioContext error: ${err.message}`);
    }
    
    // Перевіряємо autoplay policy
    log("🔍 Testing autoplay capabilities...");
    const testAudio = new Audio();
    testAudio.muted = true;
    testAudio.play().then(() => {
      log("✅ Autoplay allowed (muted)");
    }).catch(() => {
      log("❌ Autoplay blocked");
    });
  };

  const clearLogs = () => {
    setLogs([]);
    console.clear();
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      log("⏹️ Audio stopped");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">TTS Debug Console</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Audio Controls</h2>
            <div className="space-y-3">
              <button
                onClick={enableAudio}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                disabled={audioEnabled}
              >
                {audioEnabled ? "✅ Audio Enabled" : "🔊 Enable Audio"}
              </button>
              
              <button
                onClick={testAudioPermissions}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                🔍 Test Permissions
              </button>
              
              <button
                onClick={testDirectTTS}
                className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
              >
                🎵 Test TTS Playback
              </button>
              
              <button
                onClick={stopAudio}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                ⏹️ Stop Audio
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">System Info</h2>
            <div className="text-sm space-y-2">
              <div><strong>Audio Enabled:</strong> {audioEnabled ? "✅ Yes" : "❌ No"}</div>
              <div><strong>Page:</strong> {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</div>
              <div><strong>Audio Support:</strong> {typeof Audio !== 'undefined' ? "✅ Yes" : "❌ No"}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Debug Logs</h2>
            <button
              onClick={clearLogs}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Clear Logs
            </button>
          </div>
          
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click buttons above to start testing.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
