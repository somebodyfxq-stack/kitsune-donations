import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    console.log("📺 YouTube Settings API - GET request");
    
    const session = await getAuthSession();
    console.log("📺 Session:", session?.user);
    
    if (!session?.user || !('role' in session.user) || session.user.role !== "streamer") {
      console.log("❌ Unauthorized access");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = 'id' in session.user ? session.user.id : '';
    console.log("📺 User ID:", userId);
    
    if (!userId) {
      console.log("❌ No user ID found");
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    console.log("📺 Checking if prisma.youTubeSettings exists:", typeof prisma.youTubeSettings);
    
    // Отримуємо налаштування YouTube з бази даних
    const youtubeSettings = await prisma.youTubeSettings.findUnique({
      where: { userId }
    });
    
    console.log("📺 YouTube settings from DB:", youtubeSettings);

    // Якщо налаштування не знайдені, повертаємо дефолтні
    const settings = youtubeSettings || {
      maxDurationMinutes: 5,
      volume: 50,
      showClipTitle: true,
      showDonorName: true,
      minLikes: 0,
      minViews: 0,
      minComments: 0,
      showImmediately: false
    };

    console.log("📺 Returning settings:", settings);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("❌ Failed to get YouTube settings:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user || !('role' in session.user) || session.user.role !== "streamer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = 'id' in session.user ? session.user.id : '';
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const body = await request.json();
    const {
      maxDurationMinutes,
      volume,
      showClipTitle,
      showDonorName,
      minLikes,
      minViews,
      minComments,
      showImmediately
    } = body;

    // Валідація
    if (
      typeof maxDurationMinutes !== 'number' || maxDurationMinutes < 1 || maxDurationMinutes > 30 ||
      typeof volume !== 'number' || volume < 0 || volume > 100 ||
      typeof showClipTitle !== 'boolean' ||
      typeof showDonorName !== 'boolean' ||
      typeof minLikes !== 'number' || minLikes < 0 ||
      typeof minViews !== 'number' || minViews < 0 ||
      typeof minComments !== 'number' || minComments < 0 ||
      typeof showImmediately !== 'boolean'
    ) {
      return NextResponse.json({ error: "Invalid settings data" }, { status: 400 });
    }

    // Зберігаємо або оновлюємо налаштування YouTube в базі даних
    await prisma.youTubeSettings.upsert({
      where: { userId },
      update: {
        maxDurationMinutes,
        volume,
        showClipTitle,
        showDonorName,
        minLikes,
        minViews,
        minComments,
        showImmediately
      },
      create: {
        userId,
        maxDurationMinutes,
        volume,
        showClipTitle,
        showDonorName,
        minLikes,
        minViews,
        minComments,
        showImmediately
      }
    });

    console.log("YouTube settings saved for user:", userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save YouTube settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
