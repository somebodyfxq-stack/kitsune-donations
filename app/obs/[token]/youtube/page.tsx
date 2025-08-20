import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { YouTubeWidgetClient } from "../../youtube-widget-client";

interface YouTubePageProps {
  params: {
    token: string;
  };
  searchParams: {
    debug?: string;
  };
}

export default async function YouTubePage({ params, searchParams }: YouTubePageProps) {
  const { token } = params;
  const debug = searchParams.debug === "true";

  // Знаходимо користувача за OBS токеном
  let streamerId: string | undefined;
  
  console.log("🎬 YouTube Widget - Looking for user with token:", token);
  
  try {
    const user = await prisma.monobankSettings.findFirst({
      where: { obsWidgetToken: token },
      select: { userId: true }
    });
    
    console.log("🎬 Database query result:", user);
    
    if (!user) {
      console.log("❌ User not found for token:", token);
      console.log("🔍 Available tokens in database:");
      const allTokens = await prisma.monobankSettings.findMany({
        select: { obsWidgetToken: true, userId: true }
      });
      console.log(allTokens);
      
      // Тимчасово показуємо детальну помилку замість redirect
      return (
        <html lang="uk">
          <head><title>Помилка - YouTube Віджет</title></head>
          <body style={{ padding: '20px', fontFamily: 'monospace', background: '#000', color: '#fff' }}>
            <h1>🔍 Debug Info - YouTube Widget</h1>
            <p><strong>Token from URL:</strong> {token}</p>
            <p><strong>Available tokens in database:</strong></p>
            <pre>{JSON.stringify(allTokens, null, 2)}</pre>
            <p><strong>Issue:</strong> No user found with this OBS token.</p>
            <p><strong>Solution:</strong> Check if the token is correct or generate a new one in /panel</p>
          </body>
        </html>
      );
    }
    
    streamerId = user.userId;
    console.log("✅ Found streamerId:", streamerId);
  } catch (error) {
    console.error("❌ Database error:", error);
    
    // Тимчасово показуємо детальну помилку замість redirect
    return (
      <html lang="uk">
        <head><title>Database Error - YouTube Віджет</title></head>
        <body style={{ padding: '20px', fontFamily: 'monospace', background: '#000', color: '#fff' }}>
          <h1>💥 Database Error - YouTube Widget</h1>
          <p><strong>Token from URL:</strong> {token}</p>
          <p><strong>Error:</strong></p>
          <pre style={{ color: '#ff6b6b' }}>{error instanceof Error ? error.message : String(error)}</pre>
          <p><strong>Stack trace:</strong></p>
          <pre style={{ color: '#ffd93d', fontSize: '12px' }}>{error instanceof Error ? error.stack : 'No stack trace available'}</pre>
        </body>
      </html>
    );
  }

  // Завантажуємо налаштування YouTube віджету з бази даних
  let youtubeSettings = {
    maxDurationMinutes: 5,
    volume: 50,
    showClipTitle: true,
    showDonorName: true,
    minLikes: 0,
    minViews: 0,
    minComments: 0,
    showImmediately: false
  };

  try {
    const settings = await prisma.youTubeSettings.findUnique({
      where: { userId: streamerId }
    });
    
    if (settings) {
      youtubeSettings = {
        maxDurationMinutes: settings.maxDurationMinutes,
        volume: settings.volume,
        showClipTitle: settings.showClipTitle,
        showDonorName: settings.showDonorName,
        minLikes: settings.minLikes,
        minViews: settings.minViews,
        minComments: settings.minComments,
        showImmediately: settings.showImmediately
      };
    }
  } catch (error) {
    console.error("Failed to load YouTube settings:", error);
    // Використовуємо дефолтні налаштування
  }

  return (
    <html lang="uk">
      <head>
        <title>YouTube Віджет - Kitsune Donations</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{
          __html: `
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            html, body {
              width: 100%;
              height: 100%;
              background: transparent;
              overflow: hidden;
            }
            
            #__next {
              width: 100%;
              height: 100%;
            }
          `
        }} />
      </head>
      <body>
        <YouTubeWidgetClient 
          streamerId={streamerId} 
          settings={youtubeSettings}
        />
        
        {debug && (
          <div 
            style={{
              position: 'fixed',
              bottom: '10px',
              right: '10px',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '12px',
              zIndex: 1000
            }}
          >
            YouTube Widget Debug Mode
          </div>
        )}
      </body>
    </html>
  );
}
