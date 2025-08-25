"use client";

// Note: This component is deprecated - use YouTube Widget Client instead

interface VideoClientProps {
  streamerId?: string;
  token?: string;
}

export function VideoClient({ streamerId: _streamerId, token: _token }: VideoClientProps) {
  return (
    <div className="video-widget-deprecated" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    }}>
      <div>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⚠️</div>
        <div style={{ fontSize: '2rem', marginBottom: '20px' }}>
          Deprecated Component
        </div>
        <div style={{ fontSize: '1.2rem', marginBottom: '30px', opacity: 0.8 }}>
          This VideoClient component is no longer used.<br/>
          Please use the YouTube Widget Client instead.
        </div>
        <div style={{ 
          fontSize: '14px', 
          opacity: 0.6,
          background: 'rgba(255,255,255,0.1)',
          padding: '10px',
          borderRadius: '5px',
          maxWidth: '500px'
        }}>
          Path: /app/obs/youtube-widget-client.tsx
        </div>
      </div>
    </div>
  );
}