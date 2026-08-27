import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const teachers = await prisma.teacherProfile.findMany({
      include: { user: true }
    });
    console.log("All Teacher Profiles in DB:");
    teachers.forEach(t => {
      console.log({
        id: t.id,
        userId: t.userId,
        email: t.user?.email,
        deletedAt: t.deletedAt,
        isActive: t.isActive
      });
    });
  } catch (err: any) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
