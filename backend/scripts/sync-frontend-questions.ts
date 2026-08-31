import * as fs from 'fs';
import * as path from 'path';

const BACKEND_DATA_PATH = path.join(__dirname, '../src/data/questionsData.ts');
const FRONTEND_FILE_PATH = path.resolve(__dirname, '../../frontend/src/questions.ts');

function syncQuestions() {
  console.log('🔄 Syncing questions from backend to frontend...');

  try {
    if (!fs.existsSync(BACKEND_DATA_PATH)) {
      console.error(`Error: Backend file does not exist at ${BACKEND_DATA_PATH}`);
      return;
    }

    const { questionsData } = require(BACKEND_DATA_PATH);
    console.log(`Loaded ${questionsData.length} questions from backend.`);

    // Map to frontend schema
    const frontendQuestions = questionsData.map((q: any) => {
      const correctIndex = q.options.indexOf(q.correctAnswer);
      if (correctIndex === -1) {
        console.warn(`[WARNING] Question ${q.id} correct answer "${q.correctAnswer}" not found in options:`, q.options);
      }

      return {
        id: q.id,
        grade: q.classLevel,
        subject: q.subject,
        topic: q.topic,
        difficulty: q.difficulty.toLowerCase(),
        question: q.questionText,
        options: q.options,
        correctIndex: correctIndex !== -1 ? correctIndex : 0,
        explanation: q.explanation
      };
    });

    const frontendContent = `export interface Question {
  id: string;
  grade: number;
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const questionBank: Question[] = ${JSON.stringify(frontendQuestions, null, 2)};
`;

    fs.writeFileSync(FRONTEND_FILE_PATH, frontendContent, 'utf-8');
    console.log(`🎉 Successfully synchronized and wrote ${frontendQuestions.length} questions to ${FRONTEND_FILE_PATH}`);

  } catch (err: any) {
    console.error('Error during frontend questions sync:', err.message);
    process.exit(1);
  }
}

syncQuestions();
