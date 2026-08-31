import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function forceReseed() {
  console.log('🏁 Starting Database Force Reseed...\n');

  try {
    // 1. Delete all generated/seeded questions safely without touching user-created data
    console.log('🧹 Clearing old seeded questions from database...');
    const deleteResult = await prisma.question.deleteMany({
      where: {
        id: { startsWith: 'q_' }
      }
    });
    console.log(`✅ Cleared ${deleteResult.count} old seeded questions.`);

    // Also clear attempts log if they references deleted questions to prevent foreign key errors (though Prisma Cascade handles this, let's check)
    // Actually Prisma cascade or deleteMany is fine because attempts don't block question deletion if they reference it via onDelete: SetNull or Cascade.
    // In ByteQuest Prisma schema, QuestionAttempt questionId might be optional or set to Null on delete.

    // 2. Run the prisma seeder command
    console.log('🌱 Running Prisma Database Seeder...');
    const { stdout, stderr } = await execAsync('npx prisma db seed');
    console.log(stdout);
    if (stderr) {
      console.warn('Seeder Warning/Error output:\n', stderr);
    }
    console.log('🏆 Force re-seed complete!');

  } catch (err: any) {
    console.error('💥 Error running force re-seed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

forceReseed();
