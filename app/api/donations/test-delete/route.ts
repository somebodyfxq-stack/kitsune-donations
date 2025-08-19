import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session as any)?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any).user.id;
    
    // Перевіряємо чи існує користувач
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: "Користувач не знайдений" 
      }, { status: 404 });
    }

    // Видаляємо всі тестові донати (identifier починається з "test-")
    const deleteResult = await prisma.$transaction(async (tx) => {
      // Видаляємо тестові DonationEvent
      const deletedEvents = await tx.donationEvent.deleteMany({
        where: {
          streamerId: userId,
          identifier: {
            startsWith: 'test-'
          }
        }
      });

      // Видаляємо тестові DonationIntent
      const deletedIntents = await tx.donationIntent.deleteMany({
        where: {
          streamerId: userId,
          identifier: {
            startsWith: 'test-'
          }
        }
      });

      return {
        eventsDeleted: deletedEvents.count,
        intentsDeleted: deletedIntents.count
      };
    });

    console.log(`Deleted test donations for user ${userId}:`, deleteResult);

    return NextResponse.json({ 
      success: true, 
      message: `Видалено ${deleteResult.eventsDeleted} тестових донатів`,
      deletedCount: deleteResult.eventsDeleted
    });

  } catch (error) {
    console.error("Test donations deletion failed:", error);
    return NextResponse.json(
      { error: "Не вдалося видалити тестові донати" },
      { status: 500 }
    );
  }
}
