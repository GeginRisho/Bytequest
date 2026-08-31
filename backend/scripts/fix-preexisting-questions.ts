import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPreexisting() {
  console.log('🧹 Correcting duplicate options in pre-existing database questions...');

  const fixes = [
    { id: 'c95440d5-a843-4847-aaae-4fe604b9df1e', options: ['1', '2', '12', '7'] },
    { id: '43a6d9f7-0419-464e-8ced-f0a79f542ef8', options: ['1', '2', '12', '7'] },
    { id: '40db2cdc-9fa0-41eb-815c-6d01b36c6e54', options: ['2', '3', '24', '11'] },
    { id: '56807f4a-c499-4b32-9b71-c8a0f786228d', options: ['2', '3', '24', '11'] },
    { id: '96d60fc8-e1d0-488e-99f7-dc64cfcba1e0', options: ['30', '15', '20', '40'] },
    { id: 'e3f7949f-5ac7-4b19-839f-12375a9147c2', options: ['30', '15', '20', '40'] },
    { id: 'e9051189-0863-4f08-be1c-7cd13c837f5f', options: ['40', '20', '30', '50'] },
    { id: '1444cd82-daef-439d-86fd-dc52f5ff4b3c', options: ['40', '20', '30', '50'] },
    { id: '77f9f099-e1bd-4e5a-a45d-4e0bfe21e1bc', options: ['60', '30', '20', '40'] },
    { id: '21c44cb0-3933-475f-95e3-48fd7e1fbbe1', options: ['60', '30', '20', '40'] },
    { id: '1bf79789-df21-4783-a150-42bed2ca2b26', options: ['80', '40', '30', '50'] },
    { id: '4de37b97-31df-42c0-b985-6e7e53dcb48a', options: ['80', '40', '30', '50'] },
    { id: '4dd58d6c-91be-4dd7-9794-2602a1efb138', options: ['4', '5', '3', '2'] },
    { id: '0657332e-b8c9-4664-8457-9bb9b8cc5a75', options: ['4', '5', '3', '2'] }
  ];

  try {
    for (const f of fixes) {
      const q = await prisma.question.findUnique({ where: { id: f.id } });
      if (q) {
        // Ensure correct answer is still present
        if (!f.options.includes(q.correctAnswer)) {
          // Replace first option that isn't correct answer
          const idx = f.options.findIndex(o => o !== q.correctAnswer);
          if (idx !== -1) {
            f.options[idx] = q.correctAnswer;
          }
        }

        await prisma.question.update({
          where: { id: f.id },
          data: { options: f.options }
        });
        console.log(`✅ Fixed options for question ID: ${f.id}`);
      }
    }
    console.log('🎉 Pre-existing duplicate options corrected!');
  } catch (err: any) {
    console.error('Error fixing pre-existing questions:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixPreexisting();
