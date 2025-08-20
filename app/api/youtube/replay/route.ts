import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { broadcastDonation } from "@/lib/sse";

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
    const { donationId } = body;

    if (!donationId) {
      return NextResponse.json({ error: "Donation ID required" }, { status: 400 });
    }

    // Знаходимо донат в базі даних
    const donation = await prisma.donationEvent.findFirst({
      where: {
        id: donationId,
        streamerId: userId,
        youtubeUrl: { not: null } // Тільки донати з YouTube відео
      }
    });

    if (!donation || !donation.youtubeUrl) {
      return NextResponse.json({ error: "Donation with YouTube video not found" }, { status: 404 });
    }

    // Створюємо SSE payload для повторного відтворення
    const ssePayload = {
      identifier: `replay-${donation.identifier}-${Date.now()}`, // Унікальний ідентифікатор для повтору
      nickname: donation.nickname,
      message: donation.message,
      amount: donation.amount,
      monoComment: donation.monoComment,
      youtubeUrl: donation.youtubeUrl,
      jarTitle: donation.jarTitle,
      createdAt: new Date().toISOString(), // Поточний час для нового показу
      streamerId: userId
    };

    console.log('🔄 Broadcasting YouTube video replay:', {
      donationId,
      youtubeUrl: donation.youtubeUrl,
      nickname: donation.nickname
    });

    // Відправляємо подію повтору
    broadcastDonation(ssePayload);

    return NextResponse.json({ 
      success: true, 
      message: "YouTube відео додано до черги повторного відтворення" 
    });

  } catch (error) {
    console.error("Failed to replay YouTube video:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

