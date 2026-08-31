import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runValidation() {
  console.log('🏁 Starting Question Bank Verification & Validation script...\n');

  try {
    const questions = await prisma.question.findMany({
      where: { deletedAt: null }
    });

    console.log(`📋 Total active questions found: ${questions.length}`);

    let errorsCount = 0;
    const errors: string[] = [];

    // Define syllabus structure
    const grades = [4, 5, 6, 7, 8, 9, 10, 11, 12];
    const getExpectedSubjects = (grade: number) => {
      if (grade <= 10) {
        const list = ['English', 'Tamil', 'Mathematics', 'Science', 'Social Science'];
        if (grade === 10) list.push('Computer Science');
        return list;
      } else {
        return ['English', 'Tamil', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science'];
      }
    };

    // 1. Completeness Checks: 25 questions minimum per grade & subject
    console.log('\n--- 1. Completeness Verification ---');
    const counts: Record<string, number> = {};

    // Initialize counts
    grades.forEach(grade => {
      getExpectedSubjects(grade).forEach(subject => {
        counts[`${grade}-${subject.toLowerCase()}`] = 0;
      });
    });

    // Count questions
    questions.forEach(q => {
      const key = `${q.classLevel}-${q.subject.toLowerCase()}`;
      if (counts[key] !== undefined) {
        counts[key]++;
      } else {
        // Unexpected subject or grade
        errors.push(`⚠️ Question ID ${q.id} has unexpected Grade ${q.classLevel} / Subject "${q.subject}" combo`);
        errorsCount++;
      }
    });

    // Verify minimums
    grades.forEach(grade => {
      getExpectedSubjects(grade).forEach(subject => {
        const key = `${grade}-${subject.toLowerCase()}`;
        const count = counts[key] || 0;
        if (count < 25) {
          errors.push(`❌ Completeness Error: Class ${grade} - Subject "${subject}" has only ${count}/25 questions.`);
          errorsCount++;
        } else {
          console.log(`✅ Class ${grade} - Subject "${subject}": ${count} questions (Complete)`);
        }
      });
    });

    // 2. Formatting & Validation Checks
    console.log('\n--- 2. Question Formatting & Quality Verification ---');
    const questionTextMap = new Map<string, string[]>(); // key: class-subject-text -> array of ids

    questions.forEach(q => {
      const qId = q.id;
      
      // Check topic
      if (!q.topic || q.topic.trim() === '') {
        errors.push(`❌ Formatting Error (ID ${qId}): Topic is empty.`);
        errorsCount++;
      }

      // Check question text
      if (!q.questionText || q.questionText.trim() === '') {
        errors.push(`❌ Formatting Error (ID ${qId}): Question text is empty.`);
        errorsCount++;
      }

      // Check options length
      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`❌ Formatting Error (ID ${qId}): Options must have exactly 4 items.`);
        errorsCount++;
      } else {
        // Check for empty options
        q.options.forEach((opt, idx) => {
          if (!opt || opt.trim() === '') {
            errors.push(`❌ Formatting Error (ID ${qId}): Option ${String.fromCharCode(65 + idx)} is empty.`);
            errorsCount++;
          }
        });

        // Check for duplicate options
        const uniqueOpts = new Set(q.options.map(o => o.trim()));
        if (uniqueOpts.size !== q.options.length) {
          errors.push(`❌ Formatting Error (ID ${qId}): Contains duplicate options [${q.options.join(', ')}].`);
          errorsCount++;
        }

        // Check correct answer mapping
        if (!q.correctAnswer || q.correctAnswer.trim() === '') {
          errors.push(`❌ Formatting Error (ID ${qId}): Correct answer is empty.`);
          errorsCount++;
        } else if (!q.options.includes(q.correctAnswer)) {
          errors.push(`❌ Mapping Error (ID ${qId}): Correct answer "${q.correctAnswer}" is not present in options list.`);
          errorsCount++;
        }
      }

      // Check explanation
      if (!q.explanation || q.explanation.trim() === '') {
        errors.push(`❌ Formatting Error (ID ${qId}): Explanation is empty.`);
        errorsCount++;
      } else if (q.explanation.trim().length < 15) {
        errors.push(`❌ Quality Error (ID ${qId}): Explanation is too short ("${q.explanation}").`);
        errorsCount++;
      }

      // 3. Deduplication Check within Class and Subject
      const textKey = `${q.classLevel}-${q.subject.toLowerCase()}-${q.questionText.trim().toLowerCase()}`;
      if (!questionTextMap.has(textKey)) {
        questionTextMap.set(textKey, []);
      }
      questionTextMap.get(textKey)!.push(qId);
    });

    // Check for duplicate questions
    questionTextMap.forEach((ids, textKey) => {
      if (ids.length > 1) {
        errors.push(`❌ Duplicate Error: Found ${ids.length} identical questions in the same Class-Subject bucket. IDs: [${ids.join(', ')}]`);
        errorsCount++;
      }
    });

    console.log('\n--- 3. Validation Report Summary ---');
    if (errorsCount === 0) {
      console.log('🏆 CONGRATULATIONS! The Question Bank is 100% compliant, complete, and contains NO errors or duplicates!');
    } else {
      console.error(`🚨 FOUND ${errorsCount} ERRORS in the question bank database! See details below:\n`);
      errors.forEach(err => console.error(err));
      process.exit(1);
    }

  } catch (err: any) {
    console.error('💥 Fatal error running question bank validation:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runValidation();
