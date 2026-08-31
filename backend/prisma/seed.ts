import { PrismaClient, Role, Difficulty, QuestionType, TileType, TrapType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { questionsData } from '../src/data/questionsData';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ByteQuest Database Seeding...');

  // Note: Clear tables is omitted to make the seed script idempotent.
  // We do not want to delete existing student responses, custom teacher questions, or classes.
  console.log('ℹ️ Running in idempotent mode. Existing records will be preserved.');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Seed default School
  let school = await prisma.school.findFirst({
    where: { name: "St. Patrick High School" }
  });
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: "St. Patrick High School",
        district: "District 9",
        state: "State of Tech",
      }
    });
    console.log('🏫 Seeded default school.');
  }

  // 2. Seed Teacher
  let teacherUser = await prisma.user.findUnique({
    where: { email: "teacher@bytequest.com" }
  });
  if (!teacherUser) {
    teacherUser = await prisma.user.create({
      data: {
        email: "teacher@bytequest.com",
        passwordHash,
        role: Role.TEACHER,
        firstName: "Professor",
        lastName: "Turing",
        isVerified: true
      }
    });
  }

  let teacher = await prisma.teacherProfile.findUnique({
    where: { userId: teacherUser.id }
  });
  if (!teacher) {
    teacher = await prisma.teacherProfile.create({
      data: {
        userId: teacherUser.id,
        schoolId: school.id,
        isApproved: true
      }
    });
    console.log('👩‍🏫 Seeded default teacher.');
  }

  // 3. Seed Admin
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@bytequest.com" }
  });
  if (!adminUser) {
    await prisma.user.create({
      data: {
        email: "admin@bytequest.com",
        passwordHash,
        role: Role.ADMIN,
        firstName: "Admin",
        lastName: "System",
        isVerified: true
      }
    });
    console.log('👑 Seeded admin user.');
  }

  // 4. Seed Worlds (Isle of Basics, Function Jungle, Data Fortress, Mixed Map)
  console.log('🗺️ Checking/Seeding Game Worlds...');
  const worlds = [
    { name: 'Isle of Basics', description: 'Pedagogical map for Class 10 fundamentals.' },
    { name: 'Function Jungle', description: 'Pedagogical map for Class 11 functional structures.' },
    { name: 'Data Fortress', description: 'Pedagogical map for Class 12 data architectures.' },
    { name: 'Mixed Map', description: 'Fallback map when team grades differ.' }
  ];

  for (const w of worlds) {
    let world = await prisma.mapWorld.findFirst({
      where: { name: w.name }
    });
    if (!world) {
      world = await prisma.mapWorld.create({
        data: {
          name: w.name,
          description: w.description
        }
      });

      // Create 18 tiles per world (0 to 17)
      const tilesData = [];
      for (let pos = 0; pos <= 17; pos++) {
        let type: TileType = TileType.QUESTION;
        let trapType: TrapType | null = null;
        let rewardsXP = 15;
        let rewardsCoins = 5;

        if (pos === 0) {
          type = TileType.MYSTERY; // Represents Start
          rewardsXP = 0;
          rewardsCoins = 0;
        } else if (pos === 17) {
          type = TileType.TREASURE; // Represents Finish
          rewardsXP = 100;
          rewardsCoins = 50;
        } else if (pos === 2 || pos === 6 || pos === 12) {
          type = TileType.TRAP;
          trapType = TrapType.MOVE_BACK;
        } else if (pos === 4 || pos === 10 || pos === 15) {
          type = TileType.COIN_CHEST; // Represents Treasure
          rewardsCoins = 15;
        } else if (pos === 8 || pos === 16) {
          type = TileType.BOSS;
          rewardsXP = 50;
          rewardsCoins = 15;
        }

        tilesData.push({
          worldId: world.id,
          position: pos,
          type,
          trapType,
          rewardsXP,
          rewardsCoins
        });
      }

      await prisma.mapTile.createMany({ data: tilesData });
      console.log(`🗺️ Created tiles for world: ${w.name}`);
    }
  }

  // 5. Seed Class & Students
  let cls = await prisma.class.findFirst({
    where: { name: "Grade 11", section: "B" }
  });
  if (!cls) {
    cls = await prisma.class.create({
      data: {
        name: "Grade 11",
        section: "B",
        teacherId: teacher.id
      }
    });
    console.log('🏫 Seeded default class.');
  }

  const studentsList = [
    { name: "Aarav Sharma", email: "aarav@student.com" },
    { name: "Ananya Iyer", email: "ananya@student.com" },
    { name: "Aarav Patel", email: "aarav2@student.com" },
    { name: "Kabir Mehta", email: "kabir@student.com" },
    { name: "Riya Sen", email: "riya@student.com" },
    { name: "Vikram Malhotra", email: "vikram@student.com" }
  ];

  const studentEntities = [];

  for (const s of studentsList) {
    let user = await prisma.user.findUnique({
      where: { email: s.email }
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: s.email,
          passwordHash,
          role: Role.STUDENT,
          firstName: s.name.split(' ')[0],
          lastName: s.name.split(' ')[1] || '',
          isVerified: true
        }
      });
    }

    let student = await prisma.studentProfile.findUnique({
      where: { userId: user.id }
    });
    if (!student) {
      student = await prisma.studentProfile.create({
        data: {
          userId: user.id,
          schoolId: school.id,
          classId: cls.id,
          xp: 100,
          coins: 50,
          level: 1
        }
      });
    }

    studentEntities.push({
      id: student.id,
      name: s.name
    });
  }

  // 6. Seed Teams & TeamMembers
  const teamsData = [
    { name: "Team Crimson", color: "bg-red-500 text-white border-red-300", members: [studentEntities[0].id, studentEntities[1].id] },
    { name: "Team Cobalt", color: "bg-blue-600 text-white border-blue-400", members: [studentEntities[2].id, studentEntities[3].id] },
    { name: "Team Jade", color: "bg-emerald-600 text-white border-emerald-300", members: [studentEntities[4].id, studentEntities[5].id] }
  ];

  for (const t of teamsData) {
    let team = await prisma.team.findFirst({
      where: { classId: cls.id, name: t.name }
    });
    if (!team) {
      team = await prisma.team.create({
        data: {
          classId: cls.id,
          name: t.name,
          color: t.color
        }
      });

      for (const studentId of t.members) {
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            studentId
          }
        });
      }
    }
  }

  // 7. Seed Expanded Questions (1225 Questions)
  console.log('📝 Seeding Expanded Question Bank...');
  
  let seededCount = 0;
  let skippedCount = 0;

  for (const q of questionsData) {
    // Validate question fields
    if (!q.id || !q.questionText || !q.options || q.options.length !== 4 || !q.correctAnswer || !q.explanation || !q.classLevel || !q.subject) {
      console.warn(`[WARNING] Skipping invalid question: ${q.id || 'unknown ID'}`);
      skippedCount++;
      continue;
    }

    // Check if the question already exists
    const exists = await prisma.question.findUnique({
      where: { id: q.id }
    });

    if (!exists) {
      await prisma.question.create({
        data: {
          id: q.id,
          classLevel: q.classLevel,
          subject: q.subject,
          topic: q.topic,
          subtopic: q.subtopic,
          difficulty: q.difficulty.toUpperCase() as Difficulty,
          type: QuestionType.MCQ,
          title: `${q.subject} Class ${q.classLevel} - ${q.topic}`,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          creatorId: teacher.id,
          isApproved: true
        }
      });
      seededCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`✅ Question seeding complete. Seeded: ${seededCount}, Skipped/Existing: ${skippedCount}`);
  console.log('🎉 ByteQuest Database Seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
