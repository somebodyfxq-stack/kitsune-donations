import { NextRequest, NextResponse } from "next/server";

import { appendDonationEvent } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoUrl, nickname, message, amount, streamerId } = body;

    // Валідація
    if (!videoUrl || !nickname || !streamerId || typeof amount !== 'number') {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Перевірка чи це YouTube URL
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    if (!youtubeRegex.test(videoUrl)) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    // TODO: Перевірити налаштування стримера (мінімум лайків, переглядів, коментарів)
    // TODO: Перевірити доступність відео через YouTube Data API

    // Створюємо подію донату з YouTube відео
    await appendDonationEvent({
      streamerId,
      nickname,
      message,
      amount,
      youtubeUrl: videoUrl,
      identifier: `youtube-${Date.now()}`,
      monoComment: `YouTube video: ${message}`,
      jarTitle: null,
      createdAt: new Date(),
      cleared: false, // Default value for new donations
      videoStatus: null, // Default video status
    });

    console.log("YouTube video donation created:", {
      streamerId,
      nickname,
      amount,
      videoUrl
    });

    return NextResponse.json({ 
      success: true, 
      message: "YouTube відео додано до черги!" 
    });

  } catch (error) {
    console.error("Failed to process YouTube video:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Endpoint для перевірки YouTube відео метаданих
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');

    if (!videoUrl) {
      return NextResponse.json({ error: "Video URL required" }, { status: 400 });
    }

    // Витягуємо ID відео
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = videoUrl.match(youtubeRegex);
    
    if (!match) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    const videoId = match[1];

    // Використовуємо YouTube oEmbed API для отримання базової інформації
    try {
      const oembedResponse = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );

      if (!oembedResponse.ok) {
        return NextResponse.json({ 
          error: "Video not found or unavailable",
          valid: false 
        }, { status: 404 });
      }

      const oembedData = await oembedResponse.json();

      // TODO: Використати YouTube Data API для отримання детальної статистики
      // Поки що повертаємо базову інформацію
      return NextResponse.json({
        valid: true,
        videoId,
        title: oembedData.title,
        author: oembedData.author_name,
        duration: null, // TODO: отримати через YouTube Data API
        views: null,    // TODO: отримати через YouTube Data API
        likes: null,    // TODO: отримати через YouTube Data API
        comments: null  // TODO: отримати через YouTube Data API
      });

    } catch (apiError) {
      console.error("YouTube API error:", apiError);
      return NextResponse.json({ 
        error: "Failed to validate video",
        valid: false 
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Failed to check YouTube video:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

