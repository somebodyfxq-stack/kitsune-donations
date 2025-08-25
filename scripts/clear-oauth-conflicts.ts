#!/usr/bin/env tsx
import { prisma } from "../lib/db";

async function clearOAuthConflicts() {
  console.log("🧹 Clearing OAuth conflicts...");
  
  // Знайти дублікати email'ів
  const duplicateEmails = await prisma.user.groupBy({
    by: ['email'],
    having: {
      email: {
        _count: {
          gt: 1
        }
      }
    },
    _count: {
      email: true
    },
    where: {
      email: {
        not: null
      }
    }
  });

  console.log("📧 Found duplicate emails:", duplicateEmails);

  // Видалити старі записи аккаунтів без активних сесій
  const orphanedAccounts = await prisma.account.deleteMany({
    where: {
      user: {
        sessions: {
          none: {}
        }
      }
    }
  });

  console.log("🗑️ Deleted orphaned accounts:", orphanedAccounts.count);

  // Показати статистику
  const totalUsers = await prisma.user.count();
  const totalAccounts = await prisma.account.count();
  const totalSessions = await prisma.session.count();

  console.log("📊 Database stats:");
  console.log(`   Users: ${totalUsers}`);
  console.log(`   Accounts: ${totalAccounts}`);
  console.log(`   Sessions: ${totalSessions}`);
}

clearOAuthConflicts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

