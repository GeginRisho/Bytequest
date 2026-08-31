import * as fs from 'fs';
import * as path from 'path';

interface RawQuestion {
  id: string;
  classLevel: number;
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

const QUESTIONS_FILE_PATH = path.join(__dirname, '../src/data/questionsData.ts');

function ensureUniqueOptions(options: string[], correctAnswer: string): string[] {
  const unique = new Set<string>();
  const result: string[] = [];
  
  options.forEach((opt, idx) => {
    let val = opt.trim();
    if (unique.has(val) || val === '') {
      const num = Number(val);
      if (!isNaN(num)) {
        let offset = 1;
        while (unique.has(String(num + offset)) || options.includes(String(num + offset)) || String(num + offset) === '') {
          offset++;
        }
        val = String(num + offset);
      } else {
        let suffix = 1;
        while (unique.has(`${val} (${suffix})`) || options.includes(`${val} (${suffix})`)) {
          suffix++;
        }
        val = `${val} (${suffix})`;
      }
    }
    unique.add(val);
    result.push(val);
  });

  if (!result.includes(correctAnswer)) {
    const replaceIdx = result.findIndex(o => o !== correctAnswer);
    if (replaceIdx !== -1) {
      result[replaceIdx] = correctAnswer;
    }
  }

  return result;
}

function generateMathQuestion(grade: number, idx: number): RawQuestion {
  const id = `q_c${grade}_math_${String(idx).padStart(3, '0')}`;
  let topic = "Mathematics";
  let difficulty: 'easy' | 'medium' | 'hard' = idx <= 8 ? 'easy' : idx <= 18 ? 'medium' : 'hard';
  let questionText = "";
  let options: string[] = [];
  let correctAnswer = "";
  let explanation = "";

  if (grade === 4) {
    topic = idx <= 10 ? "Basic Arithmetic" : idx <= 18 ? "Fractions" : "Measurement & Time";
    if (idx <= 10) {
      const a = 120 + idx * 8;
      const b = 45 + idx * 4;
      questionText = `What is the sum of ${a} and ${b}? (Q-${idx})`;
      correctAnswer = String(a + b);
      options = [String(a + b), String(a + b - 10), String(a + b + 10), String(a + b + 5)];
      explanation = `Add ${a} and ${b} together: ${a} + ${b} = ${correctAnswer}.`;
    } else if (idx <= 18) {
      const denom = 10 + (idx % 5);
      questionText = `Which fraction is equivalent to ${idx - 8}/${denom}? (Q-${idx})`;
      const mult = 2;
      correctAnswer = `${(idx - 8) * mult}/${denom * mult}`;
      options = [
        correctAnswer,
        `${(idx - 8) * mult + 1}/${denom * mult}`,
        `${(idx - 8) * mult}/${denom * mult + 2}`,
        `${idx - 8}/${denom * mult}`
      ];
      explanation = `Multiply both the numerator and denominator by ${mult} to get an equivalent fraction: (${idx - 8} * ${mult}) / (${denom} * ${mult}) = ${correctAnswer}.`;
    } else {
      const side = idx - 10;
      questionText = `What is the perimeter of a square with side length ${side} cm? (Q-${idx})`;
      correctAnswer = String(side * 4);
      options = [String(side * 4), String(side * 2), String(side * side), String(side * 4 + 6)];
      explanation = `The perimeter of a square is 4 times its side length: 4 * ${side} cm = ${correctAnswer} cm.`;
    }
  } else if (grade === 5) {
    topic = idx <= 10 ? "Decimals" : idx <= 18 ? "Geometry" : "Data & Operations";
    if (idx <= 10) {
      const val = (idx * 0.15).toFixed(2);
      questionText = `Convert the decimal ${val} to a percentage. (Q-${idx})`;
      correctAnswer = `${(idx * 15).toFixed(0)}%`;
      options = [correctAnswer, `${(idx * 1.5).toFixed(1)}%`, `${(idx * 150).toFixed(0)}%`, `${idx}%`];
      explanation = `To convert a decimal to a percentage, multiply by 100: ${val} * 100 = ${correctAnswer}.`;
    } else if (idx <= 18) {
      const len = idx - 5;
      const wid = idx - 8;
      questionText = `What is the area of a rectangle with length ${len} cm and width ${wid} cm? (Q-${idx})`;
      correctAnswer = String(len * wid);
      options = [String(len * wid), String(2 * (len + wid)), String(len * wid + 10), String(len * wid - 5)];
      explanation = `The area of a rectangle is length multiplied by width: ${len} cm * ${wid} cm = ${correctAnswer} sq cm.`;
    } else {
      const val1 = idx * 10;
      const val2 = idx * 5;
      questionText = `If a box contains ${val1} red marbles and ${val2} blue marbles, what is the ratio of red to blue marbles in simplest form? (Q-${idx})`;
      correctAnswer = "2:1";
      options = ["2:1", "1:2", "3:1", "1:1"];
      explanation = `The ratio of red to blue is ${val1}:${val2}. Dividing both terms by ${val2} gives the simplest form: 2:1.`;
    }
  } else if (grade === 6) {
    topic = idx <= 10 ? "Ratios & Rates" : idx <= 18 ? "Integers" : "Basic Equations";
    if (idx <= 10) {
      const rate = idx + 2;
      questionText = `If a car travels at a speed of ${rate} km per hour, how far will it travel in 3 hours? (Q-${idx})`;
      correctAnswer = String(rate * 3);
      options = [String(rate * 3), String(rate * 2), String(rate + 3), String(rate * 3 + 12)];
      explanation = `Distance = Speed * Time. Here, Distance = ${rate} * 3 = ${correctAnswer} km.`;
    } else if (idx <= 18) {
      const val = idx - 12;
      questionText = `Evaluate the absolute value expression: |-${val}|. (Q-${idx})`;
      correctAnswer = String(val);
      options = [String(val), String(-val), "0", String(val + 2)];
      explanation = `The absolute value of a number is its distance from zero, which is always positive: |-${val}| = ${correctAnswer}.`;
    } else {
      const constVal = idx * 2;
      questionText = `Solve for x in the equation: x + ${constVal} = ${constVal * 3}. (Q-${idx})`;
      correctAnswer = String(constVal * 2);
      options = [String(constVal * 2), String(constVal * 3), String(constVal), String(constVal * 4)];
      explanation = `Subtract ${constVal} from both sides: x = ${constVal * 3} - ${constVal} = ${correctAnswer}.`;
    }
  } else if (grade === 7) {
    topic = idx <= 10 ? "Rational Numbers" : idx <= 18 ? "Probability" : "Exponents";
    if (idx <= 10) {
      const base = idx + 1;
      questionText = `What is the reciprocal of the rational number ${base}/7? (Q-${idx})`;
      correctAnswer = `7/${base}`;
      options = [`7/${base}`, `-${base}/7`, `-7/${base}`, `${base}/7`];
      explanation = `The reciprocal of a fraction is found by swapping the numerator and denominator: reciprocal of ${base}/7 is 7/${base}.`;
    } else if (idx <= 18) {
      const red = idx - 8;
      const blue = idx - 6;
      questionText = `A bag contains ${red} red balls and ${blue} blue balls. What is the probability of drawing a red ball? (Q-${idx})`;
      correctAnswer = `${red}/${red + blue}`;
      options = [correctAnswer, `${blue}/${red + blue}`, `${red}/${blue}`, `1/2`];
      explanation = `Probability = (Number of favorable outcomes) / (Total number of outcomes) = ${red} / (${red} + ${blue}) = ${correctAnswer}.`;
    } else {
      const exp = (idx % 4) + 2;
      questionText = `Simplify the expression: 3 raised to the power of ${exp}. (Q-${idx})`;
      correctAnswer = String(Math.pow(3, exp));
      options = [String(Math.pow(3, exp)), String(3 * exp), String(Math.pow(3, exp - 1)), String(Math.pow(3, exp) + 9)];
      explanation = `3 raised to the power of ${exp} means multiplying 3 by itself ${exp} times, which equals ${correctAnswer}.`;
    }
  } else if (grade === 8) {
    topic = idx <= 10 ? "Squares & Roots" : idx <= 18 ? "Linear Equations" : "Polygons";
    if (idx <= 10) {
      const sq = idx + 2;
      questionText = `What is the square root of ${sq * sq}? (Q-${idx})`;
      correctAnswer = String(sq);
      options = [String(sq), String(sq * 2), String(sq + 2), String(sq * sq * sq)];
      explanation = `The square root of a number is the value that, when multiplied by itself, gives the original number. Since ${sq} * ${sq} = ${sq * sq}, the square root is ${sq}.`;
    } else if (idx <= 18) {
      const coeff = 2;
      const offset = idx - 8;
      const rhs = offset + 10;
      questionText = `Solve for x in the equation: ${coeff}x + ${offset} = ${rhs}. (Q-${idx})`;
      correctAnswer = "5";
      options = ["5", "4", "6", "10"];
      explanation = `Subtract ${offset} from both sides: ${coeff}x = 10. Divide by 2: x = 5.`;
    } else {
      const sides = idx - 14;
      questionText = `What is the sum of interior angles of a convex polygon with ${sides} sides? (Q-${idx})`;
      correctAnswer = `${(sides - 2) * 180}°`;
      options = [`${(sides - 2) * 180}°`, `${sides * 180}°`, `${(sides - 1) * 180}°`, `${(sides - 2) * 360}°`];
      explanation = `The formula for the sum of interior angles of an n-sided polygon is (n - 2) * 180°. For n = ${sides}, we get (${sides} - 2) * 180° = ${correctAnswer}.`;
    }
  } else if (grade === 9) {
    topic = idx <= 10 ? "Coordinate Geometry" : idx <= 18 ? "Polynomials" : "Linear Systems";
    if (idx <= 10) {
      const x = idx;
      const y = -idx;
      questionText = `In which quadrant does the point (${x}, ${y}) lie? (Q-${idx})`;
      correctAnswer = "Quadrant IV";
      options = ["Quadrant I", "Quadrant II", "Quadrant III", "Quadrant IV"];
      explanation = `Points with positive x-coordinates and negative y-coordinates lie in Quadrant IV. Point (${x}, ${y}) has x > 0 and y < 0.`;
    } else if (idx <= 18) {
      const power = idx - 8;
      questionText = `What is the degree of the polynomial expression: 5x^${power} + 3x^2 - 7? (Q-${idx})`;
      correctAnswer = String(Math.max(power, 2));
      options = [String(Math.max(power, 2)), String(power - 1), "2", "0"];
      explanation = `The degree of a polynomial is the highest power of the variable x. Here, the highest power is ${correctAnswer}.`;
    } else {
      const slope = idx - 15;
      questionText = `What is the slope of the line given by the equation y = ${slope}x + 7? (Q-${idx})`;
      correctAnswer = String(slope);
      options = [String(slope), String(-slope), "7", "0"];
      explanation = `The equation of a line in slope-intercept form is y = mx + c, where m is the slope. In this equation, m = ${slope}.`;
    }
  } else if (grade === 10) {
    topic = idx <= 10 ? "Arithmetic Progressions" : idx <= 18 ? "Trigonometry" : "Quadratic Equations";
    if (idx <= 10) {
      const start = idx;
      const diff = 4;
      questionText = `Find the 4th term of the Arithmetic Progression: ${start}, ${start + diff}, ${start + 2 * diff}, ... (Q-${idx})`;
      correctAnswer = String(start + 3 * diff);
      options = [String(start + 3 * diff), String(start + 4 * diff), String(start + 2 * diff), String(start + 5 * diff)];
      explanation = `The nth term of an AP is a + (n - 1)d. Here, a = ${start}, d = ${diff}, and n = 4. The 4th term is ${start} + 3 * ${diff} = ${correctAnswer}.`;
    } else if (idx <= 18) {
      const angle = (idx - 10) * 10;
      questionText = `If cos(A) = sin(${angle}°), what is the measure of acute angle A in degrees? (Q-${idx})`;
      correctAnswer = `${90 - angle}°`;
      options = [`${90 - angle}°`, `${angle}°`, `${180 - angle}°`, `${90 + angle}°`];
      explanation = `Complementary angle trigonometric identity states that cos(A) = sin(90° - A). Therefore, A = 90° - ${angle}° = ${correctAnswer}.`;
    } else {
      const root1 = idx - 18;
      const sum = 2 * root1;
      const prod = root1 * root1;
      questionText = `What is the product of the roots of the quadratic equation: x^2 - ${sum}x + ${prod} = 0? (Q-${idx})`;
      correctAnswer = String(prod);
      options = [String(prod), String(sum), String(-prod), "1"];
      explanation = `According to Vieta's formulas, the product of the roots of the quadratic equation ax^2 + bx + c = 0 is equal to c/a. In this equation, c = ${prod} and a = 1.`;
    }
  } else if (grade === 11) {
    topic = idx <= 10 ? "Sets & Relations" : idx <= 18 ? "Complex Numbers" : "Permutations";
    if (idx <= 10) {
      const sizeA = idx;
      questionText = `If Set A has ${sizeA} elements, how many subsets does Set A have in total? (Q-${idx})`;
      correctAnswer = String(Math.pow(2, sizeA));
      options = [String(Math.pow(2, sizeA)), String(sizeA * 2), String(Math.pow(2, sizeA - 1)), String(sizeA * sizeA)];
      explanation = `A set with n elements has 2^n subsets. For ${sizeA} elements, the total subsets are 2^${sizeA} = ${correctAnswer}.`;
    } else if (idx <= 18) {
      const real = idx - 5;
      questionText = `Find the modulus of the complex number z = ${real} + 4i. (Q-${idx})`;
      const mod = Math.sqrt(real * real + 16);
      correctAnswer = mod.toFixed(2);
      options = [correctAnswer, String(real + 4), (mod + 1).toFixed(2), (mod - 1).toFixed(2)];
      explanation = `The modulus of z = x + yi is sqrt(x^2 + y^2). Here, |z| = sqrt(${real}^2 + 4^2) = sqrt(${real * real + 16}) = ${correctAnswer}.`;
    } else {
      const n = idx - 14;
      questionText = `In how many unique ways can ${n} books be arranged side-by-side on a shelf? (Q-${idx})`;
      let fact = 1;
      for (let i = 1; i <= n; i++) fact *= i;
      correctAnswer = String(fact);
      options = [String(fact), String(fact + 120), String(fact - 24), String(n * n)];
      explanation = `The number of arrangements of n distinct objects is n!. For n = ${n}, arrangements = ${n}! = ${correctAnswer}.`;
    }
  } else if (grade === 12) {
    topic = idx <= 10 ? "Matrices" : idx <= 18 ? "Determinants" : "Calculus";
    if (idx <= 10) {
      const k = idx;
      questionText = `What is the trace of the 2x2 identity matrix scaled by a factor of ${k}? (Q-${idx})`;
      correctAnswer = String(2 * k);
      options = [String(2 * k), String(k), String(k * k), String(4 * k)];
      explanation = `A scaled identity matrix of size 2x2 has diagonal elements [${k}, ${k}]. The trace is the sum of diagonal elements: ${k} + ${k} = ${correctAnswer}.`;
    } else if (idx <= 18) {
      const a = idx - 10;
      questionText = `Calculate the determinant of the 2x2 diagonal matrix: [[${a}, 0], [0, 5]]. (Q-${idx})`;
      correctAnswer = String(a * 5);
      options = [String(a * 5), String(a + 5), "0", String(a * 5 + 10)];
      explanation = `The determinant of a diagonal matrix is the product of its diagonal elements: ${a} * 5 = ${correctAnswer}.`;
    } else {
      const exponent = idx - 17;
      questionText = `What is the derivative of x^${exponent} with respect to x? (Q-${idx})`;
      correctAnswer = `${exponent}x^${exponent - 1}`;
      options = [
        `${exponent}x^${exponent - 1}`,
        `x^${exponent - 1}`,
        `${exponent}x^${exponent}`,
        `${exponent - 1}x^${exponent}`
      ];
      explanation = `According to the power rule of differentiation, d/dx(x^n) = n*x^(n-1). For n = ${exponent}, the derivative is ${correctAnswer}.`;
    }
  }

  return {
    id,
    classLevel: grade,
    subject: "Mathematics",
    topic,
    subtopic: "General",
    difficulty,
    questionText,
    options: ensureUniqueOptions(options, correctAnswer),
    correctAnswer,
    explanation
  };
}

function runRegeneration() {
  console.log('🏁 Starting Math Questions Seeding Regeneration...\n');

  try {
    if (!fs.existsSync(QUESTIONS_FILE_PATH)) {
      console.error(`Error: File does not exist at ${QUESTIONS_FILE_PATH}`);
      return;
    }

    const { questionsData } = require(QUESTIONS_FILE_PATH);
    console.log(`Loaded ${questionsData.length} total questions.`);

    const nonMathQuestions = questionsData.filter((q: any) => q.subject.toLowerCase() !== 'mathematics');
    console.log(`Filtered out ${questionsData.length - nonMathQuestions.length} Mathematics questions. Kept ${nonMathQuestions.length} non-Math questions.`);

    const newMathQuestions: RawQuestion[] = [];
    const grades = [4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    grades.forEach(grade => {
      for (let idx = 1; idx <= 25; idx++) {
        newMathQuestions.push(generateMathQuestion(grade, idx));
      }
    });

    console.log(`Generated ${newMathQuestions.length} new unique Mathematics questions.`);

    const combinedQuestions = [...nonMathQuestions, ...newMathQuestions];
    combinedQuestions.sort((a, b) => {
      if (a.classLevel !== b.classLevel) return a.classLevel - b.classLevel;
      if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
      return a.id.localeCompare(b.id);
    });

    const newFileContent = `// Auto-generated question bank data
export interface RawQuestion {
  id: string;
  classLevel: number;
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const questionsData: RawQuestion[] = ${JSON.stringify(combinedQuestions, null, 2)};
`;

    fs.writeFileSync(QUESTIONS_FILE_PATH, newFileContent, 'utf-8');
    console.log(`🎉 Successfully wrote ${combinedQuestions.length} questions to ${QUESTIONS_FILE_PATH}`);

  } catch (err: any) {
    console.error('Error during math question regeneration:', err.message);
    process.exit(1);
  }
}

runRegeneration();
