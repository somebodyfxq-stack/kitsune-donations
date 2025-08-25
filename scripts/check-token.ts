#!/usr/bin/env tsx
import { prisma } from "../lib/db";

async function checkToken() {
  const token = "a3847e12e657403c9558b46914037d8bfddcd388603fca99501810d5f05d8185";
  
  console.log("🔍 Checking token:", token);
  
  try {
    const user = await prisma.monobankSettings.findFirst({
      where: { obsWidgetToken: token },
      include: { user: { select: { name: true, email: true } } }
    });
    
    if (user) {
      console.log("✅ Token found:", user);
    } else {
      console.log("❌ Token not found");
      
      // Показати всі доступні токени
      const allTokens = await prisma.monobankSettings.findMany({
        include: { user: { select: { name: true } } }
      });
      
      console.log("📋 Available tokens:");
      allTokens.forEach((t, i) => {
        console.log(`${i + 1}. Token: ${t.obsWidgetToken} | User: ${t.user?.name || 'Unknown'}`);
      });
    }
  } catch (error) {
    console.error("Database error:", error);
  }
  
  await prisma.$disconnect();
}

checkToken();
