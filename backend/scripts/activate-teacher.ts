import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Activating teacher@bytequest.com...");
    const teacherUser = await prisma.user.findUnique({
      where: { email: 'teacher@bytequest.com' }
    });

    if (!teacherUser) {
      console.log("Teacher account not found!");
      return;
    }

    const updatedProfile = await prisma.teacherProfile.update({
      where: { userId: teacherUser.id },
      data: { isActive: true }
    });

    console.log("Teacher profile updated successfully:", {
      id: updatedProfile.id,
      isApproved: updatedProfile.isApproved,
      isActive: updatedProfile.isActive
    });
  } catch (err: any) {
    console.error("Error activating teacher:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
