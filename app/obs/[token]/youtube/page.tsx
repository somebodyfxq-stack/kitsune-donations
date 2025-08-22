import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { YouTubeWidgetClient } from "../../youtube-widget-client";
import type { Metadata } from "next";

interface YouTubePageProps {
  params: {
    token: string;
  };
  searchParams: {
    debug?: string;
  };
}

export const metadata: Metadata = {
  title: "YouTube Віджет - Kitsune Donations",
  viewport: "width=device-width, initial-scale=1"
};

const ErrorPage = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="p-5 font-mono bg-black text-white min-h-screen">
    <h1 className="text-2xl mb-4">{title}</h1>
    {children}
  </div>
);

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
      
      return (
        <ErrorPage title="🔍 Debug Info - YouTube Widget">
          <p className="mb-2"><strong>Token from URL:</strong> {token}</p>
          <p className="mb-2"><strong>Available tokens in database:</strong></p>
          <pre className="mb-4 p-2 bg-gray-800 rounded">{JSON.stringify(allTokens, null, 2)}</pre>
          <p className="mb-2"><strong>Issue:</strong> No user found with this OBS token.</p>
          <p><strong>Solution:</strong> Check if the token is correct or generate a new one in /panel</p>
        </ErrorPage>
      );
    }
    
    streamerId = user.userId;
    console.log("✅ Found streamerId:", streamerId);
  } catch (error) {
    console.error("❌ Database error:", error);
    
    return (
      <ErrorPage title="💥 Database Error - YouTube Widget">
        <p className="mb-2"><strong>Token from URL:</strong> {token}</p>
        <p className="mb-2"><strong>Error:</strong></p>
        <pre className="mb-4 p-2 bg-gray-800 rounded text-red-400">{error instanceof Error ? error.message : String(error)}</pre>
        <p className="mb-2"><strong>Stack trace:</strong></p>
        <pre className="p-2 bg-gray-800 rounded text-yellow-400 text-xs">{error instanceof Error ? error.stack : 'No stack trace available'}</pre>
      </ErrorPage>
    );
  }

  // Завантажуємо налаштування YouTube віджету з бази даних
  let youtubeSettings = {
    maxDurationMinutes: 5,
    volume: 50,
    showClipTitle: true,
    showDonorName: true,
    showControls: true, // Додаємо пропущене поле
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
        showControls: settings.showControls ?? true, // Fallback to true if undefined
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
    <div 
      className="w-full h-screen bg-transparent overflow-hidden m-0 p-0"
      suppressHydrationWarning={true}
    >
      <YouTubeWidgetClient 
        streamerId={streamerId}
        token={token}
        settings={youtubeSettings}
      />
      
      {debug && (
        <div className="fixed bottom-2.5 right-2.5 bg-black/80 text-white p-2 rounded text-xs z-[1000]">
          YouTube Widget Debug Mode
        </div>
      )}
    </div>
  );
}
