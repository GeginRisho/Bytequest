import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixPreexisting() {
  console.log('🧹 Correcting duplicate options in pre-existing database questions...');

  const fixes = [
    { id: 'c95440d5-a843-4847-aaae-4fe604b9df1e', options: ['1', '2', '12', '7'] },
    { id: '40db2cdc-9fa0-41eb-815c-6d01b36c6e54', options: ['2', '3', '24', '11'] },
    { id: '96d60fc8-e1d0-488e-99f7-dc64cfcba1e0', options: ['30', '15', '20', '40'] },
    { id: 'e9051189-0863-4f08-be1c-7cd13c837f5f', options: ['40', '20', '30', '50'] },
    { id: '77f9f099-e1bd-4e5a-a45d-4e0bfe21e1bc', options: ['60', '30', '20', '40'] },
    { id: '1bf79789-df21-4783-a150-42bed2ca2b26', options: ['80', '40', '30', '50'] },
    { id: '4dd58d6c-91be-4dd7-9794-2602a1efb138', options: ['4', '5', '3', '2'] }
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
