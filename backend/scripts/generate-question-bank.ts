import * as fs from 'fs';
import * as path from 'path';

// Define the interface matching both backend and frontend question models
interface GeneratedQuestion {
  id: string;
  grade: number; // classLevel in DB
  subject: string;
  topic: string;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correctAnswer: string; // The correct option text
  correctIndex: number; // For frontend compatibility
  explanation: string;
}

// ----------------------------------------------------
// MATH GENERATOR (Class 4 to 12)
// ----------------------------------------------------
function generateMathQuestions(grade: number): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  
  // Define Math topics based on grade
  let topics: string[] = [];
  if (grade <= 5) {
    topics = ["Arithmetic Operations", "Fractions & Decimals", "Shapes & Geometry", "Measurement & Time", "Data & Graphs"];
  } else if (grade <= 8) {
    topics = ["Ratios & Proportions", "Integers & Rational Numbers", "Basic Algebra", "Geometry & Angles", "Data Handling"];
  } else if (grade <= 10) {
    topics = ["Algebraic Equations", "Coordinate Geometry", "Trigonometry Basics", "Probability & Statistics", "Mensuration"];
  } else {
    topics = ["Matrices & Determinants", "Differential Calculus", "Integral Calculus", "Vector Algebra", "Advanced Probability"];
  }

  for (let i = 1; i <= 25; i++) {
    const topicIdx = Math.floor((i - 1) / 5);
    const topic = topics[topicIdx];
    const diff: 'easy' | 'medium' | 'hard' = i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy';
    
    let question = "";
    let options: string[] = [];
    let correctIndex = 0;
    let explanation = "";

    // Generate math problem based on grade and topic index
    if (grade === 4) {
      if (topicIdx === 0) {
        // Arithmetic Operations
        const a = 120 + i * 15;
        const b = 45 + i * 8;
        const sum = a + b;
        question = `What is the sum of ${a} and ${b}?`;
        options = [String(sum), String(sum - 10), String(sum + 10), String(sum - 5)];
        correctIndex = 0;
        explanation = `Adding ${a} and ${b} gives: ${a} + ${b} = ${sum}.`;
      } else if (topicIdx === 1) {
        // Fractions
        const num = i + 1;
        const den = num * 2;
        question = `Which of the following is equivalent to the fraction ${num}/${den}?`;
        options = ["1/2", "1/3", "1/4", "2/3"];
        correctIndex = 0;
        explanation = `Simplifying ${num}/${den} by dividing both numerator and denominator by ${num} gives 1/2.`;
      } else if (topicIdx === 2) {
        // Shapes & Geometry
        const sides = 4 + (i % 3);
        const names = ["square", "pentagon", "hexagon"];
        const name = names[sides - 4];
        question = `How many sides does a regular ${name} have?`;
        options = [String(sides), String(sides - 1), String(sides + 1), "8"];
        correctIndex = 0;
        explanation = `A regular ${name} always has exactly ${sides} straight sides.`;
      } else if (topicIdx === 3) {
        // Measurement & Time
        const hours = i + 1;
        const mins = hours * 60;
        question = `How many minutes are there in ${hours} hours?`;
        options = [String(mins), String(mins - 30), String(mins + 30), String(mins * 2)];
        correctIndex = 0;
        explanation = `Since 1 hour = 60 minutes, ${hours} hours equals ${hours} * 60 = ${mins} minutes.`;
      } else {
        // Data & Graphs
        const values = [5, 10, 15, 20, 25];
        const val = values[i % 5];
        question = `If each star symbol on a pictograph represents 5 books, how many books do ${val / 5} stars represent?`;
        options = [String(val), String(val - 5), String(val + 5), String(val * 2)];
        correctIndex = 0;
        explanation = `Multiplying the number of stars (${val / 5}) by the value of each star (5) gives ${val} books.`;
      }
    } else if (grade === 5) {
      if (topicIdx === 0) {
        const val = 12.5 + i * 0.5;
        question = `What is the value of ${val} multiplied by 10?`;
        options = [String(val * 10), String(val / 10), String(val + 10), String(val - 10)];
        correctIndex = 0;
        explanation = `Multiplying a decimal by 10 shifts the decimal point one place to the right, yielding ${val * 10}.`;
      } else if (topicIdx === 1) {
        const num = i + 3;
        question = `What is the smallest common multiple of 2 and ${num}?`;
        const correct = num % 2 === 0 ? num : num * 2;
        options = [String(correct), String(correct * 2), String(correct + 1), String(correct - 1)];
        correctIndex = 0;
        explanation = `The least common multiple (LCM) of 2 and ${num} is ${correct}.`;
      } else if (topicIdx === 2) {
        const len = 6 + i;
        const wid = 4 + i;
        const area = len * wid;
        question = `Find the area of a rectangle with length ${len} cm and width ${wid} cm.`;
        options = [String(area), String(2 * (len + wid)), String(area - 5), String(area + 10)];
        correctIndex = 0;
        explanation = `Area = length * width = ${len} * ${wid} = ${area} square cm.`;
      } else if (topicIdx === 3) {
        const side = 2 + i;
        const vol = side * side * side;
        question = `What is the volume of a cube with side length ${side} cm?`;
        options = [String(vol), String(side * 6), String(side * side), String(vol + 10)];
        correctIndex = 0;
        explanation = `Volume of cube = side^3 = ${side} * ${side} * ${side} = ${vol} cubic cm.`;
      } else {
        const sum = 10 * i;
        question = `If the sum of 5 numbers is ${sum}, what is their average value?`;
        options = [String(sum / 5), String(sum / 10), String(sum + 5), String(sum - 5)];
        correctIndex = 0;
        explanation = `Average = Sum / Count = ${sum} / 5 = ${sum / 5}.`;
      }
    } else if (grade === 6) {
      if (topicIdx === 0) {
        const val = 10 * i;
        question = `Express the ratio of ${val} to ${val * 3} in its simplest form.`;
        options = ["1:3", "1:2", "3:1", "2:3"];
        correctIndex = 0;
        explanation = `Dividing both parts of the ratio by their greatest common divisor (${val}) gives 1:3.`;
      } else if (topicIdx === 1) {
        const a = -5 - i;
        const b = 8 + i;
        question = `Calculate the sum of the integers ${a} and ${b}.`;
        options = [String(a + b), String(a - b), String(b - a), String(a + b - 1)];
        correctIndex = 0;
        explanation = `Adding negative ${Math.abs(a)} and positive ${b} gives: ${a} + ${b} = ${a + b}.`;
      } else if (topicIdx === 2) {
        const constant = 4 + i;
        const correct = 12 + i;
        question = `Solve the algebraic equation: x - ${constant} = 8. What is the value of x?`;
        options = [String(correct), String(8 - constant), String(constant * 8), String(correct + 2)];
        correctIndex = 0;
        explanation = `Adding ${constant} to both sides of the equation yields x = 8 + ${constant} = ${correct}.`;
      } else if (topicIdx === 3) {
        const angle = 30 + i * 5;
        question = `What is the complement of an angle of ${angle} degrees?`;
        options = [String(90 - angle), String(180 - angle), String(360 - angle), String(90 + angle)];
        correctIndex = 0;
        explanation = `Complementary angles sum to 90 degrees, so the complement is 90 - ${angle} = ${90 - angle} degrees.`;
      } else {
        const n = 5 + (i % 3);
        question = `Find the mean of the first ${n} positive integers.`;
        const correct = (n + 1) / 2;
        options = [String(correct), String(correct + 1), String(correct - 0.5), String(n)];
        correctIndex = 0;
        explanation = `The sum of the first ${n} positive integers is ${n} * (${n} + 1) / 2. Dividing by ${n} gives the mean as (${n} + 1) / 2 = ${correct}.`;
      }
    } else if (grade === 7) {
      if (topicIdx === 0) {
        const mult = 2 + (i % 3);
        const correct = 3 + i;
        const res = mult * correct + 5;
        question = `Solve the linear equation for x: ${mult}x + 5 = ${res}.`;
        options = [String(correct), String(correct + 2), String(correct - 1), String(res - 5)];
        correctIndex = 0;
        explanation = `Subtract 5: ${mult}x = ${res - 5}. Divide by ${mult}: x = ${correct}.`;
      } else if (topicIdx === 1) {
        const a = 40 + i;
        const b = 60 + i;
        question = `In a triangle, two angles measure ${a} degrees and ${b} degrees. What is the measure of the third angle?`;
        options = [String(180 - (a + b)), String(90 - (a + b)), String(a + b), "90"];
        correctIndex = 0;
        explanation = `The sum of angles in a triangle is 180 degrees. Third angle = 180 - (${a} + ${b}) = ${180 - (a + b)} degrees.`;
      } else if (topicIdx === 2) {
        const pr = 10 + i * 5;
        question = `What is ${pr}% of 200?`;
        options = [String(pr * 2), String(pr), String(pr / 2), String(pr * 4)];
        correctIndex = 0;
        explanation = `Calculation: ( ${pr} / 100 ) * 200 = ${pr * 2}.`;
      } else if (topicIdx === 3) {
        question = `Which of the following rational numbers is in its standard simplest form?`;
        options = ["-3/5", "6/10", "-4/-8", "9/12"];
        correctIndex = 0;
        explanation = `-3/5 is in simplest standard form as 3 and 5 share no common factors besides 1, and the negative sign is in the numerator.`;
      } else {
        const princ = 1000 + i * 100;
        const rate = 5;
        const time = 2;
        const si = (princ * rate * time) / 100;
        question = `Calculate the Simple Interest on principal $${princ} at ${rate}% per year for ${time} years.`;
        options = [String(si), String(si * 2), String(si / 2), String(princ + si)];
        correctIndex = 0;
        explanation = `Simple Interest formula SI = (P * R * T) / 100 = (${princ} * ${rate} * ${time}) / 100 = ${si}.`;
      }
    } else if (grade === 8) {
      if (topicIdx === 0) {
        const power = 3 + (i % 4);
        const val = Math.pow(2, power);
        question = `Evaluate the exponent expression: 2 raised to the power of ${power}.`;
        options = [String(val), String(power * 2), String(val - 2), String(val * 2)];
        correctIndex = 0;
        explanation = `2^${power} is 2 multiplied by itself ${power} times, which equals ${val}.`;
      } else if (topicIdx === 1) {
        const rootVal = 10 + i;
        const square = rootVal * rootVal;
        question = `What is the square root of the number ${square}?`;
        options = [String(rootVal), String(rootVal - 1), String(rootVal + 1), String(rootVal * 2)];
        correctIndex = 0;
        explanation = `The square root of ${square} is the positive number which when multiplied by itself equals ${square}, which is ${rootVal}.`;
      } else if (topicIdx === 2) {
        const correct = 2 + i;
        const lhs = 3 * correct - 7;
        question = `Solve for x in the equation: 3x - 7 = ${lhs}.`;
        options = [String(correct), String(correct + 3), String(correct - 1), String(lhs + 7)];
        correctIndex = 0;
        explanation = `Add 7 to both sides: 3x = ${lhs + 7}. Divide by 3: x = ${correct}.`;
      } else if (topicIdx === 3) {
        const sum = 360;
        question = `What is the sum of the interior angles of any convex quadrilateral?`;
        options = ["360 degrees", "180 degrees", "540 degrees", "720 degrees"];
        correctIndex = 0;
        explanation = `The sum of interior angles of a convex polygon is (n - 2) * 180. For n = 4, (4-2) * 180 = 360 degrees.`;
      } else {
        const r = 7;
        const h = i + 2;
        const vol = Math.round(22/7 * r * r * h);
        question = `Using pi = 22/7, find the volume of a cylinder with radius ${r} cm and height ${h} cm.`;
        options = [String(vol), String(vol - 50), String(vol + 50), String(Math.round(vol / 2))];
        correctIndex = 0;
        explanation = `Volume of cylinder = pi * r^2 * h = (22/7) * ${r * r} * ${h} = ${vol} cubic cm.`;
      }
    } else if (grade === 9) {
      if (topicIdx === 0) {
        question = `Which of the following is an irrational number?`;
        options = ["Square root of 2", "0.25", "22/7", "Square root of 9"];
        correctIndex = 0;
        explanation = `Square root of 2 cannot be expressed as a simple fraction and has a non-terminating, non-repeating decimal expansion, making it irrational.`;
      } else if (topicIdx === 1) {
        const coeff = 2 + i;
        question = `What is the degree of the polynomial: P(x) = ${coeff}x^3 + 5x^2 - 7?`;
        options = ["3", "2", "0", "1"];
        correctIndex = 0;
        explanation = `The degree of a polynomial is the highest exponent power of the variable in the expression, which is 3 here.`;
      } else if (topicIdx === 2) {
        const x = i;
        const y = 3;
        const constant = 2 * x + y;
        question = `Which of the following coordinate pairs is a solution to the equation 2x + y = ${constant}?`;
        options = [`(${x}, ${y})`, `(${x + 1}, ${y})`, `(${x}, ${y - 1})`, `(0, 0)`];
        correctIndex = 0;
        explanation = `Plugging in x = ${x} and y = ${y} yields 2*${x} + ${y} = ${constant}, satisfying the equality.`;
      } else if (topicIdx === 3) {
        question = `If a standard fair six-sided die is rolled, what is the probability of getting an even number?`;
        options = ["1/2", "1/3", "1/6", "2/3"];
        correctIndex = 0;
        explanation = `There are 3 even numbers (2, 4, 6) out of 6 possible outcomes. Probability = 3/6 = 1/2.`;
      } else {
        const angle = 45 + i;
        question = `If two supplementary angles are in ratio 1:1, what is the measure of each angle?`;
        options = ["90 degrees", "45 degrees", "180 degrees", "60 degrees"];
        correctIndex = 0;
        explanation = `Supplementary angles sum to 180 degrees. If they are in 1:1 ratio, each measures 180 / 2 = 90 degrees.`;
      }
    } else if (grade === 10) {
      if (topicIdx === 0) {
        const r1 = 2;
        const r2 = i;
        const sum = r1 + r2;
        const prod = r1 * r2;
        question = `Find the roots of the quadratic equation: x^2 - ${sum}x + ${prod} = 0.`;
        options = [`${r1} and ${r2}`, `${r1 + 1} and ${r2}`, `${r1} and ${r2 + 1}`, `0 and ${sum}`];
        correctIndex = 0;
        explanation = `Factoring the quadratic yields (x - ${r1})(x - ${r2}) = 0. Thus, the roots are x = ${r1} and x = ${r2}.`;
      } else if (topicIdx === 1) {
        const first = i;
        const diff = 3;
        const termIndex = 5;
        const termVal = first + (termIndex - 1) * diff;
        question = `Find the ${termIndex}th term of the Arithmetic Progression (AP) whose first term is ${first} and common difference is ${diff}.`;
        options = [String(termVal), String(termVal + 3), String(termVal - 3), String(first * termIndex)];
        correctIndex = 0;
        explanation = `Using AP formula: a_n = a + (n - 1) * d = ${first} + (${termIndex} - 1) * ${diff} = ${termVal}.`;
      } else if (topicIdx === 2) {
        question = `In a right-angled triangle, if sine of an angle is 3/5, what is its cosine value?`;
        options = ["4/5", "3/4", "5/4", "1/2"];
        correctIndex = 0;
        explanation = `Using trigonometric identity: cos^2(x) = 1 - sin^2(x) = 1 - 9/25 = 16/25. Thus, cos(x) = 4/5.`;
      } else if (topicIdx === 3) {
        const median = 15;
        const mean = 12;
        const mode = 3 * median - 2 * mean;
        question = `Using the empirical formula: Mode = 3 Median - 2 Mean. If Median is ${median} and Mean is ${mean}, find the Mode.`;
        options = [String(mode), String(mode + 5), String(mode - 5), String(median + mean)];
        correctIndex = 0;
        explanation = `Plugging values into the empirical formula: Mode = 3 * ${median} - 2 * ${mean} = 45 - 24 = ${mode}.`;
      } else {
        const red = 3;
        const blue = i + 2;
        const total = red + blue;
        question = `A bag contains ${red} red marbles and ${blue} blue marbles. What is the probability of randomly drawing a red marble?`;
        options = [`${red}/${total}`, `${blue}/${total}`, `1/${total}`, `3/8`];
        correctIndex = 0;
        explanation = `Probability = number of favorable outcomes (red marbles = ${red}) divided by total outcomes (${total}), which is ${red}/${total}.`;
      }
    } else if (grade === 11) {
      if (topicIdx === 0) {
        const power = i % 3 + 2;
        const subsets = Math.pow(2, power);
        question = `If set A contains ${power} distinct elements, how many subsets does it have in total?`;
        options = [String(subsets), String(power * 2), String(subsets - 1), String(subsets + 2)];
        correctIndex = 0;
        explanation = `The number of subsets of a set with n elements is given by 2^n. For n = ${power}, 2^${power} = ${subsets}.`;
      } else if (topicIdx === 1) {
        const power = 4 * i + 2;
        question = `Evaluate the imaginary unit expression: i raised to the power of ${power} (where i = square root of -1).`;
        options = ["-1", "1", "i", "-i"];
        correctIndex = 0;
        explanation = `Powers of i repeat in a cycle of 4: i^1=i, i^2=-1, i^3=-i, i^4=1. Since ${power} divided by 4 leaves a remainder of 2, i^${power} = i^2 = -1.`;
      } else if (topicIdx === 2) {
        const n = 5;
        const r = 2;
        const comb = 10; // 5C2
        question = `Calculate the value of the combination 5C2 (selecting 2 items from 5).`;
        options = [String(comb), "20", "5", "120"];
        correctIndex = 0;
        explanation = `Combination formula: nCr = n! / (r!(n-r)!) = 5! / (2! * 3!) = 120 / (2 * 6) = 10.`;
      } else if (topicIdx === 3) {
        const first = 2;
        const ratio = 3;
        const term = first * Math.pow(ratio, 2); // 3rd term
        question = `What is the 3rd term of a Geometric Progression (GP) with first term ${first} and common ratio ${ratio}?`;
        options = [String(term), String(first * ratio * 3), String(term - 2), "12"];
        correctIndex = 0;
        explanation = `Geometric term formula: a_n = a * r^(n-1). For n=3: a_3 = ${first} * ${ratio}^2 = ${first} * 9 = ${term}.`;
      } else {
        const exponent = i % 3 + 2; // 2 or 3 or 4
        question = `What is the limit as x approaches 2 of (x^${exponent} - 2^${exponent}) / (x - 2)?`;
        const limitVal = exponent * Math.pow(2, exponent - 1);
        options = [String(limitVal), String(Math.pow(2, exponent)), String(exponent * 2), "0"];
        correctIndex = 0;
        explanation = `Using the limit theorem lim (x->a) (x^n - a^n)/(x-a) = n * a^(n-1). Here: ${exponent} * 2^(${exponent}-1) = ${limitVal}.`;
      }
    } else { // Grade 12
      if (topicIdx === 0) {
        const det = 2 * i - 3;
        question = `Calculate the determinant of the 2x2 matrix: [[${i}, 1], [3, 2]].`;
        options = [String(det), String(det + 2), String(det - 2), String(i + 2)];
        correctIndex = 0;
        explanation = `Determinant of [[a, b], [c, d]] is ad - bc. Here it is (${i} * 2) - (1 * 3) = ${2 * i} - 3 = ${det}.`;
      } else if (topicIdx === 1) {
        const power = 3 + (i % 3);
        question = `Find the derivative of f(x) = x^${power} with respect to x.`;
        options = [`${power}x^${power - 1}`, `x^${power - 1}`, `${power}x^${power}`, `(x^${power + 1})/${power + 1}`];
        correctIndex = 0;
        explanation = `By the power rule of differentiation, d/dx (x^n) = n * x^(n-1). Therefore, f'(x) = ${power}x^${power - 1}.`;
      } else if (topicIdx === 2) {
        const power = i % 3 + 1; // 1 or 2 or 3
        question = `Evaluate the indefinite integral: integral of x^${power} dx.`;
        options = [`(x^${power + 1})/${power + 1} + C`, `x^${power + 1} + C`, `${power}x^${power - 1} + C`, `x^${power} + C`];
        correctIndex = 0;
        explanation = `By the power rule of integration, integral of x^n dx = (x^(n+1))/(n+1) + C.`;
      } else if (topicIdx === 3) {
        const dot = 2 * i + 3;
        question = `Find the dot product of vectors u = [${i}, 3] and v = [2, 1].`;
        options = [String(dot), String(dot + 1), String(dot - 1), String(i * 2 + 1)];
        correctIndex = 0;
        explanation = `Dot product is u1*v1 + u2*v2 = (${i} * 2) + (3 * 1) = ${2 * i} + 3 = ${dot}.`;
      } else {
        const n = 4;
        const p = 0.5;
        const mean = n * p;
        question = `For a binomial probability distribution with n = ${n} trials and probability of success p = ${p}, calculate the mean (expected value).`;
        options = [String(mean), String(n * p * 0.5), String(n), "1"];
        correctIndex = 0;
        explanation = `The mean of a binomial distribution is given by E(X) = n * p. Here, ${n} * ${p} = ${mean}.`;
      }
    }

    questions.push({
      id: `q_c${grade}_math_${String(i).padStart(3, '0')}`,
      grade,
      subject: "Mathematics",
      topic,
      subtopic: "General Math",
      difficulty: diff,
      question,
      options,
      correctAnswer: options[correctIndex],
      correctIndex,
      explanation
    });
  }

  return questions;
}

// ----------------------------------------------------
// CURRICULUM DATA GENERATOR (All other subjects)
// ----------------------------------------------------
interface TemplateData {
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// Helper to load templates for subject/grade
function getSubjectTemplates(subject: string, grade: number): TemplateData[] {
  const templates: TemplateData[] = [];
  
  if (subject === "English") {
    // 25 grammar and vocabulary questions
    for (let i = 1; i <= 25; i++) {
      const diffWord = i % 3 === 0 ? 'advanced' : i % 2 === 0 ? 'intermediate' : 'simple';
      let topic = "Grammar";
      let question = "";
      let options: string[] = [];
      let correctIndex = 0;
      let explanation = "";

      if (grade <= 5) {
        topic = "Grammar Basics";
        if (i % 5 === 0) {
          question = `Identify the noun in the sentence: "The quick squirrel climbed the tall tree quickly." (Q-${i})`;
          options = ["squirrel", "climbed", "quickly", "tall"];
          correctIndex = 0;
          explanation = "A noun is a word that names a person, place, thing, or animal. Here, 'squirrel' names an animal.";
        } else if (i % 5 === 1) {
          question = `Choose the correct pronoun to fill in the blank: "She told ____ that she was going home." (Q-${i})`;
          options = ["me", "I", "my", "mine"];
          correctIndex = 0;
          explanation = "'Me' is an objective pronoun, which functions as the object of the verb 'told'.";
        } else if (i % 5 === 2) {
          question = `Which word is an adjective in the sentence: "We wore warm coats in the cold winter." (Q-${i})`;
          options = ["warm", "coats", "wore", "winter"];
          correctIndex = 0;
          explanation = "Adjectives describe or modify nouns. 'Warm' describes the noun 'coats'.";
        } else if (i % 5 === 3) {
          question = `What is the opposite (antonym) of the word "brave"? (Q-${i})`;
          options = ["cowardly", "fearless", "strong", "heroic"];
          correctIndex = 0;
          explanation = "The antonym of 'brave' (showing courage) is 'cowardly' (lacking courage).";
        } else {
          question = `Find the plural form of the noun "child". (Q-${i})`;
          options = ["children", "childs", "childrens", "childes"];
          correctIndex = 0;
          explanation = "'Children' is an irregular plural noun; it does not take an -s.";
        }
      } else if (grade <= 8) {
        topic = "English Grammar & Vocabulary";
        if (i % 5 === 0) {
          question = `Identify the conjunction in the sentence: "He did not study, yet he passed the examination." (Q-${i})`;
          options = ["yet", "did", "passed", "not"];
          correctIndex = 0;
          explanation = "'Yet' is a coordinating conjunction that connects two independent clauses showing contrast.";
        } else if (i % 5 === 1) {
          question = `What is the synonym of the word "Benevolent"? (Q-${i})`;
          options = ["Kind-hearted", "Cruel", "Selfish", "Miserly"];
          correctIndex = 0;
          explanation = "'Benevolent' means well-meaning and kindly. Its synonym is 'Kind-hearted'.";
        } else if (i % 5 === 2) {
          question = `Which of these sentences is written in the Passive Voice? (Q-${i})`;
          options = ["The letter was written by Mary.", "Mary wrote the letter.", "Mary is writing the letter.", "Mary will write the letter."];
          correctIndex = 0;
          explanation = "In passive voice, the target of the action (letter) is promoted to the subject position.";
        } else if (i % 5 === 3) {
          question = `Fill in the blank with the correct preposition: "The child is afraid _____ dogs." (Q-${i})`;
          options = ["of", "by", "with", "from"];
          correctIndex = 0;
          explanation = "The adjective 'afraid' is idiomatically followed by the preposition 'of'.";
        } else {
          question = `Choose the correct modal verb for obligation: "You _____ wear a helmet while driving a motorcycle." (Q-${i})`;
          options = ["must", "can", "might", "may"];
          correctIndex = 0;
          explanation = "'Must' expresses a strong obligation or legal rule.";
        }
      } else {
        topic = "Advanced Rhetoric & Vocabulary";
        if (i % 5 === 0) {
          question = `Choose the correct figure of speech: "The wind whispered through the dark trees." (Q-${i})`;
          options = ["Personification", "Metaphor", "Hyperbole", "Simile"];
          correctIndex = 0;
          explanation = "Personification attributes human qualities (whispering) to non-human things (the wind).";
        } else if (i % 5 === 1) {
          question = `Identify the correct meaning of the idiom: "To spill the beans". (Q-${i})`;
          options = ["To reveal a secret prematurely", "To cook a meal", "To waste food", "To drop objects accidentally"];
          correctIndex = 0;
          explanation = "The idiom 'spill the beans' means to disclose secret information, especially unintentionally.";
        } else if (i % 5 === 2) {
          question = `Choose the correct form of the word to fill the blank: "Her performance was highly _____." (Q-${i})`;
          options = ["commendable", "commend", "commending", "commendably"];
          correctIndex = 0;
          explanation = "The adjective 'commendable' is required to modify the noun performance through the linking verb 'was'.";
        } else if (i % 5 === 3) {
          question = `What is the antonym of the word "Mitigate"? (Q-${i})`;
          options = ["Aggravate", "Alleviate", "Assuage", "Soothe"];
          correctIndex = 0;
          explanation = "'Mitigate' means to make less severe. Its antonym is 'Aggravate', which means to make worse.";
        } else {
          question = `Identify the sentence that displays correct parallel structure. (Q-${i})`;
          options = ["She likes swimming, hiking, and jogging.", "She likes swimming, to hike, and jogging.", "She likes to swim, hiking, and to jog.", "She likes swimming, hiking, and to jog."];
          correctIndex = 0;
          explanation = "Parallel structure requires all elements in a list to have the same grammatical form (all gerunds here).";
        }
      }

      templates.push({ topic, question, options, correctIndex, explanation });
    }
  } else if (subject === "Tamil") {
    // 25 Tamil grammar and literature questions (actual Tamil script)
    for (let i = 1; i <= 25; i++) {
      let topic = "இலக்கணம் (Tamil Grammar)";
      let question = "";
      let options: string[] = [];
      let correctIndex = 0;
      let explanation = "";

      if (grade <= 5) {
        topic = "அடிப்படைத் தமிழ் (Basic Tamil)";
        if (i % 5 === 0) {
          question = `தமிழ் எழுத்துக்களில் உயிர் எழுத்துக்கள் மொத்தம் எத்தனை? (Q-${i})`;
          options = ["12", "18", "247", "30"];
          correctIndex = 0;
          explanation = "தமிழ் நெடுங்கணக்கில் உயிர் எழுத்துக்கள் (அ முதல் ஔ வரை) மொத்தம் 12 ஆகும்.";
        } else if (i % 5 === 1) {
          question = `கீழ்க்கண்டவற்றுள் எது மெய் எழுத்து? (Q-${i})`;
          options = ["க்", "அ", "கா", "ஔ"];
          correctIndex = 0;
          explanation = "புள்ளி வைத்த எழுத்துக்கள் மெய் எழுத்துக்கள் எனப்படும். 'க்' ஒரு மெய் எழுத்தாகும்.";
        } else if (i % 5 === 2) {
          question = `பறவை என்ற சொல்லின் எதிர்ச்சொல் என்ன? (அல்லது விலங்கு? பெயர்ச்சொல்லைக் கண்டறிக) பெயர்ச்சொல் எது? (Q-${i})`;
          options = ["மயில்", "பறந்தது", "அழகாக", "மெதுவாக"];
          correctIndex = 0;
          explanation = "ஒன்றன் பெயரைக் குறிக்கும் சொல் பெயர்ச்சொல் எனப்படும். 'மயில்' ஒரு பறவையின் பெயர்.";
        } else if (i % 5 === 3) {
          question = `தமிழ் மொழியின் முதல் எழுத்து எது? (Q-${i})`;
          options = ["அ", "ஆ", "க", "உ"];
          correctIndex = 0;
          explanation = "தமிழ் எழுத்துக்களின் தொடக்கமாகவும் முதல் எழுத்தாகவும் விளங்குவது 'அ' ஆகும்.";
        } else {
          question = `ஆயுத எழுத்து எது? (Q-${i})`;
          options = ["ஃ", "அ", "இ", "உ"];
          correctIndex = 0;
          explanation = "ஃ என்பது தமிழின் ஒரே ஆயுத எழுத்தாகும். இது முப்புள்ளி என்றும் அழைக்கப்படும்.";
        }
      } else if (grade <= 8) {
        topic = "இலக்கணமும் இலக்கியமும்";
        if (i % 5 === 0) {
          question = `திருக் குறளை இயற்றியவர் யார்? (Q-${i})`;
          options = ["திருவள்ளுவர்", "கம்பர்", "பாரதியார்", "ஒளவையார்"];
          correctIndex = 0;
          explanation = "1330 குறள்களைக் கொண்ட உலகப் பொதுமறையான திருக்குறளை இயற்றியவர் திருவள்ளுவர் ஆவார்.";
        } else if (i % 5 === 1) {
          question = `திணை எத்தனை வகைப்படும்? (Q-${i})`;
          options = ["2", "3", "4", "5"];
          correctIndex = 0;
          explanation = "திணை உயர்திணை, அஃறிணை என இரண்டு வகைப்படும்.";
        } else if (i % 5 === 2) {
          question = `முக்கனிகள் என்று அழைக்கப்படுபவை எவை? (Q-${i})`;
          options = ["மா, பலா, வாழை", "ஆப்பிள், ஆரஞ்சு, மாதுளை", "கொய்யா, திராட்சை, எலுமிச்சை", "மாங்கனி மட்டும்"];
          correctIndex = 0;
          explanation = "தமிழில் மா, பலா, வாழை ஆகிய மூன்றும் முக்கனிகள் என்று சிறப்பிக்கப்படுகின்றன.";
        } else if (i % 5 === 3) {
          question = `சொல் எத்தனை வகைப்படும்? (Q-${i})`;
          options = ["4", "2", "3", "5"];
          correctIndex = 0;
          explanation = "சொற்கள் பெயர்ச்சொல், வினைச்சொல், இடைச்சொல், உரிச்சொல் என நான்கு வகைப்படும்.";
        } else {
          question = `பகுபதம் எத்தனை வகைப்படும்? (Q-${i})`;
          options = ["2", "3", "4", "6"];
          correctIndex = 0;
          explanation = "பகுபதம் பெயர் பகுபதம், வினை பகுபதம் என இரண்டு வகைப்படும்.";
        }
      } else {
        topic = "உயர்தமிழ் இலக்கணம்";
        if (i % 5 === 0) {
          question = `சிலப்பதிகாரத்தை இயற்றியவர் யார்? (Q-${i})`;
          options = ["இளங்கோவடிகள்", "சீத்தலைச்சாத்தனார்", "திருத்தக்கதேவர்", "நாதகுத்தனார்"];
          correctIndex = 0;
          explanation = "ஐம்பெருங்காப்பியங்களில் முதன்மையான சிலப்பதிகாரத்தை இயற்றியவர் இளங்கோவடிகள் ஆவார்.";
        } else if (i % 5 === 1) {
          question = `வேற்றுமை எத்தனை வகைப்படும்? (Q-${i})`;
          options = ["8", "7", "6", "5"];
          correctIndex = 0;
          explanation = "தமிழில் வேற்றுமை முதல் வேற்றுமை முதல் எட்டாம் வேற்றுமை வரை மொத்தம் எட்டு வகைப்படும்.";
        } else if (i % 5 === 2) {
          question = `அணிகளுள் மிகவும் பழமையானதும் அடிப்படையானதும் எது? (Q-${i})`;
          options = ["உவமையணி", "உருவகவணி", "வஞ்சப்புகழ்ச்சியணி", "தற்குறிப்பேற்றவணி"];
          correctIndex = 0;
          explanation = "மற்ற அணிகளுக்கு அடிப்படையாக விளங்குவது உவமையணி ஆகும்.";
        } else if (i % 5 === 3) {
          question = `யாப்பின் உறுப்புகள் எத்தனை? (Q-${i})`;
          options = ["6", "5", "4", "7"];
          correctIndex = 0;
          explanation = "யாப்பின் உறுப்புகள் எழுத்து, அசை, சீர், தளை, அடி, தொடை என ஆறு ஆகும்.";
        } else {
          question = `தொல்காப்பியம் எத்தனை அதிகாரங்களைக் கொண்டுள்ளது? (Q-${i})`;
          options = ["3", "5", "9", "12"];
          correctIndex = 0;
          explanation = "மிகப் பழமையான தமிழ் இலக்கண நூலான தொல்காப்பியம் எழுத்து, சொல், பொருள் என 3 அதிகாரங்களைக் கொண்டுள்ளது.";
        }
      }

      templates.push({ topic, question, options, correctIndex, explanation });
    }
  } else if (subject === "Science") {
    // 25 Science questions (Grades 4-10)
    for (let i = 1; i <= 25; i++) {
      let topic = "General Biology";
      let question = "";
      let options: string[] = [];
      let correctIndex = 0;
      let explanation = "";

      if (grade === 4) {
        topic = "Basic Science";
        if (i % 5 === 0) {
          question = `Which part of a plant absorbs water and nutrients from the soil? (Q-${i})`;
          options = ["Roots", "Leaves", "Flowers", "Stem"];
          correctIndex = 0;
          explanation = "Roots grow deep into the ground to anchor the plant and absorb water/nutrients.";
        } else if (i % 5 === 1) {
          question = `Which animal is known as the "Ship of the Desert"? (Q-${i})`;
          options = ["Camel", "Lion", "Elephant", "Horse"];
          correctIndex = 0;
          explanation = "Camels are adapted to live in hot deserts with very little water for long periods.";
        } else if (i % 5 === 2) {
          question = `What state of matter has a fixed shape and fixed volume? (Q-${i})`;
          options = ["Solid", "Liquid", "Gas", "Plasma"];
          correctIndex = 0;
          explanation = "Solids have tightly packed molecules which give them a definite shape and volume.";
        } else if (i % 5 === 3) {
          question = `Which gas do humans breathe in to survive? (Q-${i})`;
          options = ["Oxygen", "Carbon Dioxide", "Nitrogen", "Helium"];
          correctIndex = 0;
          explanation = "Humans require Oxygen from the air for cellular respiration and energy production.";
        } else {
          question = `Which of the following is a primary source of light for the Earth? (Q-${i})`;
          options = ["The Sun", "The Moon", "Flashlights", "Fireflies"];
          correctIndex = 0;
          explanation = "The Sun is a massive star that provides natural light and heat energy to our planet.";
        }
      } else if (grade === 5) {
        topic = "Intermediate Science";
        if (i % 5 === 0) {
          question = `What is the process by which green plants make their own food? (Q-${i})`;
          options = ["Photosynthesis", "Respiration", "Germination", "Transpiration"];
          correctIndex = 0;
          explanation = "Photosynthesis is how plants use carbon dioxide, water, and sunlight to produce glucose.";
        } else if (i % 5 === 1) {
          question = `How many bones does an adult human skeleton typically have? (Q-${i})`;
          options = ["206", "300", "150", "350"];
          correctIndex = 0;
          explanation = "An adult human has 206 bones, whereas infants have more bones which fuse together over time.";
        } else if (i % 5 === 2) {
          question = `Which simple machine has a grooved wheel and a rope used to lift heavy loads? (Q-${i})`;
          options = ["Pulley", "Lever", "Wheel and Axle", "Inclined Plane"];
          correctIndex = 0;
          explanation = "A pulley changes the direction of the force, making it easier to lift objects upward.";
        } else if (i % 5 === 3) {
          question = `Which planet is closest to the Sun in our solar system? (Q-${i})`;
          options = ["Mercury", "Venus", "Earth", "Mars"];
          correctIndex = 0;
          explanation = "Mercury is the innermost planet, orbiting closest to the Sun.";
        } else {
          question = `What force pulls objects down toward the center of the Earth? (Q-${i})`;
          options = ["Gravity", "Magnetism", "Friction", "Electrostatic force"];
          correctIndex = 0;
          explanation = "Gravity is an attractive force that pulls objects toward any body with mass, like Earth.";
        }
      } else if (grade === 6) {
        topic = "Foundational Physics & Biology";
        if (i % 5 === 0) {
          question = `Which vitamin deficiency causes the disease called scurvy? (Q-${i})`;
          options = ["Vitamin C", "Vitamin A", "Vitamin B", "Vitamin D"];
          correctIndex = 0;
          explanation = "Scurvy is caused by a severe lack of Vitamin C, which is crucial for healthy skin and gums.";
        } else if (i % 5 === 1) {
          question = `What component of air supports combustion (burning)? (Q-${i})`;
          options = ["Oxygen", "Nitrogen", "Carbon Dioxide", "Argon"];
          correctIndex = 0;
          explanation = "Oxygen is essential for burning substances. Without oxygen, fire is extinguished.";
        } else if (i % 5 === 2) {
          question = `Which of the following is a good conductor of electricity? (Q-${i})`;
          options = ["Copper", "Rubber", "Wood", "Plastic"];
          correctIndex = 0;
          explanation = "Copper is a metal with free electrons, making it highly conductive to electrical current.";
        } else if (i % 5 === 3) {
          question = `What is the chemical symbol for water? (Q-${i})`;
          options = ["H2O", "CO2", "O2", "NaCl"];
          correctIndex = 0;
          explanation = "Water is composed of two hydrogen atoms bonded to one oxygen atom (H2O).";
        } else {
          question = `Which of these is a biotic component of the environment? (Q-${i})`;
          options = ["Plants", "Water", "Air", "Soil"];
          correctIndex = 0;
          explanation = "Biotic components are the living elements of an ecosystem, such as plants, animals, and microbes.";
        }
      } else if (grade === 7) {
        topic = "Heat & Chemistry Basics";
        if (i % 5 === 0) {
          question = `What instrument is used to measure temperature? (Q-${i})`;
          options = ["Thermometer", "Barometer", "Speedometer", "Ammeter"];
          correctIndex = 0;
          explanation = "A thermometer is used to measure temperature, usually using Mercury or digital sensors.";
        } else if (i % 5 === 1) {
          question = `What is the pH value of a neutral solution like pure water? (Q-${i})`;
          options = ["7", "1", "14", "0"];
          correctIndex = 0;
          explanation = "A pH of 7 is completely neutral. Values below 7 are acidic, and values above 7 are basic.";
        } else if (i % 5 === 2) {
          question = `Which of the following is a physical change? (Q-${i})`;
          options = ["Melting of ice", "Burning of paper", "Rusting of iron", "Digestion of food"];
          correctIndex = 0;
          explanation = "Melting ice changes only the state of matter (solid to liquid), not its chemical structure, making it a physical change.";
        } else if (i % 5 === 3) {
          question = `What is the main function of the large intestine in humans? (Q-${i})`;
          options = ["Absorption of water", "Digestion of proteins", "Absorption of nutrients", "Production of bile"];
          correctIndex = 0;
          explanation = "The large intestine mainly absorbs leftover water and salts from undigested food materials.";
        } else {
          question = `What transfers heat through direct contact between solids? (Q-${i})`;
          options = ["Conduction", "Convection", "Radiation", "Insulation"];
          correctIndex = 0;
          explanation = "Conduction is the transfer of thermal energy through collisions of neighboring atoms in a solid.";
        }
      } else if (grade === 8) {
        topic = "Cells & Materials";
        if (i % 5 === 0) {
          question = `Which cell organelle is known as the "powerhouse of the cell"? (Q-${i})`;
          options = ["Mitochondria", "Nucleus", "Ribosome", "Chloroplast"];
          correctIndex = 0;
          explanation = "Mitochondria produce ATP, which is the energy currency used by cells to perform functions.";
        } else if (i % 5 === 1) {
          question = `Which non-metal is a good conductor of electricity? (Q-${i})`;
          options = ["Graphite", "Sulfur", "Oxygen", "Phosphorus"];
          correctIndex = 0;
          explanation = "Graphite is an allotrope of carbon with free delocalized electrons, allowing it to conduct electricity.";
        } else if (i % 5 === 2) {
          question = `What is the force acting on a unit area of a surface called? (Q-${i})`;
          options = ["Pressure", "Friction", "Gravity", "Tension"];
          correctIndex = 0;
          explanation = "Pressure is defined as Force divided by Area (P = F / A).";
        } else if (i % 5 === 3) {
          question = `Which gas is produced when active metals react with dilute acids? (Q-${i})`;
          options = ["Hydrogen", "Oxygen", "Carbon Dioxide", "Nitrogen"];
          correctIndex = 0;
          explanation = "Metals displace hydrogen from acids, producing metal salts and releasing hydrogen gas (H2).";
        } else {
          question = `What is the female reproductive cell in humans called? (Q-${i})`;
          options = ["Ovum", "Sperm", "Zygote", "Embryo"];
          correctIndex = 0;
          explanation = "The ovum (egg cell) is the female gamete, which fuses with a sperm during fertilization.";
        }
      } else if (grade === 9) {
        topic = "Atoms & Motion";
        if (i % 5 === 0) {
          question = `According to Newton's Second Law of Motion, force is equal to mass multiplied by what? (Q-${i})`;
          options = ["Acceleration", "Velocity", "Speed", "Distance"];
          correctIndex = 0;
          explanation = "Newton's second law is mathematically stated as F = m * a (Force = Mass * Acceleration).";
        } else if (i % 5 === 1) {
          question = `What is the value of acceleration due to gravity (g) on the surface of the Earth? (Q-${i})`;
          options = ["9.8 m/s^2", "9.8 cm/s^2", "1.6 m/s^2", "32 m/s^2"];
          correctIndex = 0;
          explanation = "On Earth's surface, the standard acceleration due to gravity is approximately 9.8 meters per second squared.";
        } else if (i % 5 === 2) {
          question = `Who discovered the nucleus of the atom through the gold foil experiment? (Q-${i})`;
          options = ["Ernest Rutherford", "J.J. Thomson", "John Dalton", "Niels Bohr"];
          correctIndex = 0;
          explanation = "Rutherford's alpha particle scattering experiment led to the discovery of a dense positive nucleus in atoms.";
        } else if (i % 5 === 3) {
          question = `Which plant tissue is responsible for transporting water from roots to leaves? (Q-${i})`;
          options = ["Xylem", "Phloem", "Parenchyma", "Collenchyma"];
          correctIndex = 0;
          explanation = "Xylem is a vascular tissue that conducts water and dissolved minerals unidirectionally upwards.";
        } else {
          question = `What is the SI unit of work and energy? (Q-${i})`;
          options = ["Joule", "Watt", "Newton", "Pascal"];
          correctIndex = 0;
          explanation = "Work and energy are measured in Joules (J). 1 Joule is equal to 1 Newton-meter.";
        }
      } else { // Grade 10
        topic = "Advanced Chemistry & Life Processes";
        if (i % 5 === 0) {
          question = `What is the chemical formula of rust? (Q-${i})`;
          options = ["Fe2O3", "FeO", "Fe3O4", "Fe(OH)2"];
          correctIndex = 0;
          explanation = "Rusting of iron produces hydrated iron(III) oxide, primarily Fe2O3.";
        } else if (i % 5 === 1) {
          question = `Which hormone regulates the blood sugar levels in the human body? (Q-${i})`;
          options = ["Insulin", "Thyroxine", "Adrenaline", "Estrogen"];
          correctIndex = 0;
          explanation = "Insulin, secreted by the pancreas, enables cells to absorb glucose, lowering blood sugar levels.";
        } else if (i % 5 === 2) {
          question = `Which carbon compound is the main constituent of natural gas? (Q-${i})`;
          options = ["Methane", "Ethane", "Propane", "Butane"];
          correctIndex = 0;
          explanation = "Methane (CH4) is a simple hydrocarbon that makes up about 90% of natural gas.";
        } else if (i % 5 === 3) {
          question = `What is the unit of electrical resistance? (Q-${i})`;
          options = ["Ohm", "Volt", "Ampere", "Watt"];
          correctIndex = 0;
          explanation = "Resistance is the opposition to current flow, measured in Ohms (symbol omega) according to Ohm's law.";
        } else {
          question = `What lens is used to correct the vision defect known as myopia (near-sightedness)? (Q-${i})`;
          options = ["Concave lens", "Convex lens", "Bifocal lens", "Cylindrical lens"];
          correctIndex = 0;
          explanation = "A concave (diverging) lens is used to diverge light rays so that they focus on the retina rather than in front of it.";
        }
      }

      templates.push({ topic, question, options, correctIndex, explanation });
    }
  } else if (subject === "Social Science") {
    // 25 Social Science questions (Grades 4-10)
    for (let i = 1; i <= 25; i++) {
      let topic = "Geography";
      let question = "";
      let options: string[] = [];
      let correctIndex = 0;
      let explanation = "";

      if (grade === 4) {
        topic = "Geography & Civics Basics";
        if (i % 5 === 0) {
          question = `How many continents are there on Earth? (Q-${i})`;
          options = ["7", "5", "6", "8"];
          correctIndex = 0;
          explanation = "There are seven major continents: Asia, Africa, North America, South America, Antarctica, Europe, and Australia.";
        } else if (i % 5 === 1) {
          question = `Which direction is opposite to East on a standard compass rose? (Q-${i})`;
          options = ["West", "North", "South", "Northeast"];
          correctIndex = 0;
          explanation = "The four cardinal directions in order are North, East, South, and West. West is opposite to East.";
        } else if (i % 5 === 2) {
          question = `Which is the national bird of India? (Q-${i})`;
          options = ["Peacock", "Pigeon", "Eagle", "Crow"];
          correctIndex = 0;
          explanation = "The Indian Peacock (Pavo cristatus) was declared the National Bird of India in 1963.";
        } else if (i % 5 === 3) {
          question = `What is the capital city of India? (Q-${i})`;
          options = ["New Delhi", "Mumbai", "Chennai", "Kolkata"];
          correctIndex = 0;
          explanation = "New Delhi is the official capital city and the seat of government of India.";
        } else {
          question = `Which is the smallest ocean on Earth? (Q-${i})`;
          options = ["Arctic Ocean", "Indian Ocean", "Pacific Ocean", "Atlantic Ocean"];
          correctIndex = 0;
          explanation = "The Arctic Ocean is the smallest and shallowest of the world's five major oceans.";
        }
      } else if (grade === 5) {
        topic = "Maps & Freedom Struggle";
        if (i % 5 === 0) {
          question = `What imaginary line divides the Earth into the Northern and Southern Hemispheres? (Q-${i})`;
          options = ["Equator", "Prime Meridian", "Tropic of Cancer", "Tropic of Capricorn"];
          correctIndex = 0;
          explanation = "The Equator is the 0-degree latitude line that divides the Earth equally into North and South halves.";
        } else if (i % 5 === 1) {
          question = `Who was known as the leader of the Salt Satyagraha in India? (Q-${i})`;
          options = ["Mahatma Gandhi", "Jawaharlal Nehru", "Subhas Chandra Bose", "Bhagat Singh"];
          correctIndex = 0;
          explanation = "Mahatma Gandhi led the Dandi Salt March in 1930 to protest against the British monopoly on salt.";
        } else if (i % 5 === 2) {
          question = `What is a model representation of the Earth in a spherical shape called? (Q-${i})`;
          options = ["Globe", "Map", "Chart", "Compass"];
          correctIndex = 0;
          explanation = "A globe is a three-dimensional scale model of the Earth or other round celestial bodies.";
        } else if (i % 5 === 3) {
          question = `In which year did India gain independence from British rule? (Q-${i})`;
          options = ["1947", "1950", "1935", "1942"];
          correctIndex = 0;
          explanation = "India attained independence on August 15, 1947, through the Indian Independence Act.";
        } else {
          question = `Which organization was created in 1945 to maintain international peace and security? (Q-${i})`;
          options = ["United Nations", "League of Nations", "Red Cross", "World Bank"];
          correctIndex = 0;
          explanation = "The United Nations (UN) was established after WWII to promote international cooperation and prevent conflicts.";
        }
      } else if (grade === 6) {
        topic = "Indus Valley & Earth";
        if (i % 5 === 0) {
          question = `Which major ancient city of the Indus Valley Civilization featured a Great Bath? (Q-${i})`;
          options = ["Mohenjo-daro", "Harappa", "Lothal", "Kalibangan"];
          correctIndex = 0;
          explanation = "The Great Bath, a large brick basin, was discovered in Mohenjo-daro (present-day Pakistan).";
        } else if (i % 5 === 1) {
          question = `What is the third planet from the Sun in our Solar System? (Q-${i})`;
          options = ["Earth", "Venus", "Mars", "Jupiter"];
          correctIndex = 0;
          explanation = "Earth is positioned third, between Venus and Mars, orbiting the Sun.";
        } else if (i % 5 === 2) {
          question = `What are the imaginary vertical lines on a map connecting the poles called? (Q-${i})`;
          options = ["Longitudes", "Latitudes", "Equators", "Grids"];
          correctIndex = 0;
          explanation = "Longitudes (meridians) run north-south and measure angular distance east or west of the Prime Meridian.";
        } else if (i % 5 === 3) {
          question = `Who is considered the head of a Gram Panchayat in India? (Q-${i})`;
          options = ["Sarpanch", "Mayor", "Governor", "Collector"];
          correctIndex = 0;
          explanation = "The Sarpanch (or Panchayat President) is the elected leader of a village-level local government.";
        } else {
          question = `Which system of ancient India divided society into four major occupational groups? (Q-${i})`;
          options = ["Varna System", "Zamindari System", "Panchayat System", "Guild System"];
          correctIndex = 0;
          explanation = "The Vedic society categorized occupations into four Varnas: Brahmins, Kshatriyas, Vaishyas, and Shudras.";
        }
      } else if (grade === 7) {
        topic = "Medieval Kingdoms & Earth Layers";
        if (i % 5 === 0) {
          question = `Who was the founder of the Mughal Empire in India in 1526? (Q-${i})`;
          options = ["Babur", "Akbar", "Humayun", "Sher Shah Suri"];
          correctIndex = 0;
          explanation = "Babur defeated Ibrahim Lodi in the First Battle of Panipat (1526) to establish the Mughal dynasty.";
        } else if (i % 5 === 1) {
          question = `What is the thin outermost layer of the solid Earth called? (Q-${i})`;
          options = ["Crust", "Mantle", "Outer Core", "Inner Core"];
          correctIndex = 0;
          explanation = "The crust is the thin solid surface layer where we live, ranging from 5 to 70 km deep.";
        } else if (i % 5 === 2) {
          question = `Which ocean has the longest coastline and is shaped like the letter 'S'? (Q-${i})`;
          options = ["Atlantic Ocean", "Pacific Ocean", "Indian Ocean", "Southern Ocean"];
          correctIndex = 0;
          explanation = "The Atlantic Ocean is bounded by the Americas, Europe, and Africa, forming an S-shape.";
        } else if (i % 5 === 3) {
          question = `Who is the administrative head of a state government executive in India? (Q-${i})`;
          options = ["Governor", "Chief Minister", "President", "Speaker"];
          correctIndex = 0;
          explanation = "The Governor is the nominal constitutional head of a state, appointed by the President of India.";
        } else {
          question = `What type of rock is formed by the cooling and solidification of molten magma? (Q-${i})`;
          options = ["Igneous rock", "Sedimentary rock", "Metamorphic rock", "Fossil rock"];
          correctIndex = 0;
          explanation = "Igneous rocks (like basalt or granite) crystallize from hot, liquid magma or lava.";
        }
      } else if (grade === 8) {
        topic = "Constitution & British Rule";
        if (i % 5 === 0) {
          question = `Who served as the Chairman of the Drafting Committee of the Indian Constitution? (Q-${i})`;
          options = ["Dr. B.R. Ambedkar", "Dr. Rajendra Prasad", "Sardar Patel", "Jawaharlal Nehru"];
          correctIndex = 0;
          explanation = "Dr. B.R. Ambedkar is revered as the Chief Architect of the Indian Constitution.";
        } else if (i % 5 === 1) {
          question = `Which event in 1857 is historically marked as India's First War of Independence? (Q-${i})`;
          options = ["Sepoy Mutiny", "Non-Cooperation Movement", "Quit India Movement", "Partition of Bengal"];
          correctIndex = 0;
          explanation = "The uprising of sepoy soldiers in Meerut in 1857 grew into a major rebellion against British East India Company rule.";
        } else if (i % 5 === 2) {
          question = `Which type of resources are replenished naturally over short periods of time? (Q-${i})`;
          options = ["Renewable resources", "Non-renewable resources", "Abiotic resources", "Ubiquitous resources"];
          correctIndex = 0;
          explanation = "Renewable resources (like solar, wind, and water) are restored by ecological cycles and do not deplete.";
        } else if (i % 5 === 3) {
          question = `What is the term of office for a member of the Rajya Sabha (Upper House) in India? (Q-${i})`;
          options = ["6 years", "5 years", "4 years", "2 years"];
          correctIndex = 0;
          explanation = "Rajya Sabha is a permanent body, and its members are elected for a term of six years, with 1/3 retiring every two years.";
        } else {
          question = `What denotes the system of courts that interprets and applies the law in a country? (Q-${i})`;
          options = ["Judiciary", "Legislature", "Executive", "Parliament"];
          correctIndex = 0;
          explanation = "The Judiciary is the independent branch of government responsible for administering justice and resolving legal disputes.";
        }
      } else if (grade === 9) {
        topic = "French Revolution & Politics";
        if (i % 5 === 0) {
          question = `In which year did the French Revolution begin with the storming of the Bastille? (Q-${i})`;
          options = ["1789", "1799", "1776", "1804"];
          correctIndex = 0;
          explanation = "The storming of the Bastille prison on July 14, 1789, marked the outbreak of the French Revolution.";
        } else if (i % 5 === 1) {
          question = `Which mountain range forms the northern boundary of India? (Q-${i})`;
          options = ["Himalayas", "Western Ghats", "Aravali Range", "Vindhya Range"];
          correctIndex = 0;
          explanation = "The young fold mountain range of the Himalayas acts as a geographic barrier in northern India.";
        } else if (i % 5 === 2) {
          question = `What document guarantees the fundamental rights of citizens in India? (Q-${i})`;
          options = ["The Constitution", "The Preamble", "The Magna Carta", "The Bill of Rights"];
          correctIndex = 0;
          explanation = "Part III of the Constitution of India lists the Fundamental Rights secured for its citizens.";
        } else if (i % 5 === 3) {
          question = `Which body conducts elections for the Parliament and State Legislatures in India? (Q-${i})`;
          options = ["Election Commission of India", "Supreme Court", "Ministry of Home Affairs", "Planning Commission"];
          correctIndex = 0;
          explanation = "The Election Commission of India (ECI) is an autonomous constitutional authority supervising elections.";
        } else {
          question = `What type of unemployment occurs when people are employed only during certain seasons of the year? (Q-${i})`;
          options = ["Seasonal unemployment", "Disguised unemployment", "Structural unemployment", "Frictional unemployment"];
          correctIndex = 0;
          explanation = "Seasonal unemployment is common in agriculture where laborers find work only during sowing/harvesting seasons.";
        }
      } else { // Grade 10
        topic = "World History & Economy";
        if (i % 5 === 0) {
          question = `Which treaty signed in 1919 ended the First World War and imposed harsh penalties on Germany? (Q-${i})`;
          options = ["Treaty of Versailles", "Treaty of Vienna", "Treaty of Geneva", "Treaty of London"];
          correctIndex = 0;
          explanation = "The Treaty of Versailles (1919) forced Germany to accept war guilt, pay reparations, and cede territories.";
        } else if (i % 5 === 1) {
          question = `What sector of the economy includes agriculture, forestry, animal husbandry, and mining? (Q-${i})`;
          options = ["Primary Sector", "Secondary Sector", "Tertiary Sector", "Quaternary Sector"];
          correctIndex = 0;
          explanation = "The Primary sector involves direct exploitation and extraction of natural resources from the Earth.";
        } else if (i % 5 === 2) {
          question = `Which division of power shared among different organs of government (Legislature, Executive, Judiciary) is called? (Q-${i})`;
          options = ["Horizontal power sharing", "Vertical power sharing", "Federal power sharing", "Coalition power sharing"];
          correctIndex = 0;
          explanation = "Horizontal distribution places organs at the same level to exercise different powers, checking each other.";
        } else if (i % 5 === 3) {
          question = `What index is calculated by the UNDP combining life expectancy, education, and per capita income? (Q-${i})`;
          options = ["Human Development Index (HDI)", "Gross Domestic Product (GDP)", "Gini Coefficient", "Happy Planet Index"];
          correctIndex = 0;
          explanation = "The Human Development Index (HDI) measures key dimensions of human development across countries.";
        } else {
          question = `What is the system of money in common use in a country called? (Q-${i})`;
          options = ["Currency", "Credit", "Barter", "Collateral"];
          correctIndex = 0;
          explanation = "Currency refers to paper notes and coins authorized by a government as a medium of exchange.";
        }
      }

      templates.push({ topic, question, options, correctIndex, explanation });
    }
  } else if (subject === "Physics") {
    // 25 Advanced Physics questions (Class 11-12)
    for (let i = 1; i <= 25; i++) {
      let topic = "Mechanics";
      let question = "";
      let options: string[] = [];
      let correctIndex = 0;
      let explanation = "";

      if (grade === 11) {
        topic = "Class 11 Physics Core";
        if (i % 5 === 0) {
          question = `What is the SI unit of force? (Q-${i})`;
          options = ["Newton", "Joule", "Pascal", "Watt"];
          correctIndex = 0;
          explanation = "One Newton is defined as the force required to accelerate a 1 kg mass by 1 m/s^2.";
        } else if (i % 5 === 1) {
          question = `Which of the following is a scalar quantity? (Q-${i})`;
          options = ["Work", "Force", "Acceleration", "Velocity"];
          correctIndex = 0;
          explanation = "Work has only magnitude and no specific direction, making it a scalar quantity.";
        } else if (i % 5 === 2) {
          question = `What does the area under a Velocity-Time graph represent? (Q-${i})`;
          options = ["Displacement", "Acceleration", "Force", "Momentum"];
          correctIndex = 0;
          explanation = "Integrating velocity with respect to time (the area under v-t graph) gives displacement.";
        } else if (i % 5 === 3) {
          question = `Which thermodynamic process occurs at a constant temperature? (Q-${i})`;
          options = ["Isothermal", "Isobaric", "Isochoric", "Adiabatic"];
          correctIndex = 0;
          explanation = "An isothermal process takes place in a system where temperature remains constant (dT = 0).";
        } else {
          question = `What is the acceleration of a freely falling body near the surface of the moon? (Q-${i})`;
          options = ["1.62 m/s^2", "9.8 m/s^2", "3.7 m/s^2", "0 m/s^2"];
          correctIndex = 0;
          explanation = "The gravitational acceleration on the Moon is about 1/6th of that on Earth (approx 1.62 m/s^2).";
        }
      } else { // Class 12
        topic = "Class 12 Electromagnetism & Optics";
        if (i % 5 === 0) {
          question = `What law states that the electric flux through any closed surface is proportional to the enclosed electric charge? (Q-${i})`;
          options = ["Gauss's Law", "Coulomb's Law", "Ampere's Law", "Faraday's Law"];
          correctIndex = 0;
          explanation = "Gauss's Law relates net electric flux through a closed surface to the net charge enclosed inside it.";
        } else if (i % 5 === 1) {
          question = `What is the SI unit of electrical capacitance? (Q-${i})`;
          options = ["Farad", "Ohm", "Henry", "Tesla"];
          correctIndex = 0;
          explanation = "Capacitance (C = Q / V) is measured in Farads (F), representing charge stored per unit potential difference.";
        } else if (i % 5 === 2) {
          question = `What phenomenon describes the bending of light waves around the corners of an obstacle? (Q-${i})`;
          options = ["Diffraction", "Refraction", "Interference", "Polarization"];
          correctIndex = 0;
          explanation = "Diffraction is the slight bending of light as it passes around the edge of an object.";
        } else if (i % 5 === 3) {
          question = `Which semiconductor device allows current to flow in only one direction? (Q-${i})`;
          options = ["PN Junction Diode", "Bipolar Junction Transistor", "Resistor", "Capacitor"];
          correctIndex = 0;
          explanation = "A PN junction diode conducts current primarily in forward bias, acting as a one-way electrical valve.";
        } else {
          question = `What is the energy of a photon with frequency 'f' given by Planck's equation? (Q-${i})`;
          options = ["E = h * f", "E = h / f", "E = m * c^2", "E = f / h"];
          correctIndex = 0;
          explanation = "Planck's relation states that photon energy E is directly proportional to frequency: E = hf (h = Planck's constant).";
        }
      }

      templates.push({ topic, question, options, correctIndex, explanation });
    }
  } else if (subject === "Chemistry") {
    // 25 Advanced Chemistry questions (Class 11-12)
    for (let i = 1; i <= 25; i++) {
      let topic = "Inorganic Chemistry";
      let question = "";
      let options: string[] = [];
      let correctIndex = 0;
      let explanation = "";

      if (grade === 11) {
        topic = "Class 11 Chemistry Core";
        if (i % 5 === 0) {
          question = `Which subatomic particle was discovered by J.J. Thomson? (Q-${i})`;
          options = ["Electron", "Proton", "Neutron", "Positron"];
          correctIndex = 0;
          explanation = "Thomson's cathode ray experiments proved the existence of tiny negatively charged particles (electrons).";
        } else if (i % 5 === 1) {
          question = `What type of chemical bond is formed by the complete transfer of electrons from one atom to another? (Q-${i})`;
          options = ["Ionic Bond", "Covalent Bond", "Metallic Bond", "Hydrogen Bond"];
          correctIndex = 0;
          explanation = "Ionic bonds result from electrostatic attraction between oppositely charged ions formed by electron transfer.";
        } else if (i % 5 === 2) {
          question = `Which group in the periodic table contains the noble (inert) gases? (Q-${i})`;
          options = ["Group 18", "Group 1", "Group 17", "Group 2"];
          correctIndex = 0;
          explanation = "Group 18 elements have full valence electron shells, making them extremely unreactive.";
        } else if (i % 5 === 3) {
          question = `According to Boyle's Law, at constant temperature, pressure is inversely proportional to what? (Q-${i})`;
          options = ["Volume", "Temperature", "Amount of gas", "Density"];
          correctIndex = 0;
          explanation = "Boyle's law states that P1 * V1 = P2 * V2, meaning pressure increases as volume decreases (inversely related).";
        } else {
          question = `What is the oxidation state of hydrogen in metal hydrides like NaH? (Q-${i})`;
          options = ["-1", "+1", "0", "+2"];
          correctIndex = 0;
          explanation = "In ionic metal hydrides, hydrogen acts as an anion (hydride, H-) with an oxidation state of -1.";
        }
      } else { // Class 12
        topic = "Class 12 Organic & Physical Chemistry";
        if (i % 5 === 0) {
          question = `What is the IUPAC name of the organic compound CH3-CH2-OH? (Q-${i})`;
          options = ["Ethanol", "Methanol", "Propanol", "Ethanoic Acid"];
          correctIndex = 0;
          explanation = "A two-carbon hydrocarbon chain (ethane) with a hydroxyl (-OH) functional group is named Ethanol.";
        } else if (i % 5 === 1) {
          question = `Which law states that the amount of chemical reaction at an electrode is proportional to the current passed? (Q-${i})`;
          options = ["Faraday's Laws of Electrolysis", "Kohlrausch's Law", "Nernst Equation", "Ohm's Law"];
          correctIndex = 0;
          explanation = "Faraday's first law of electrolysis states that mass deposited is proportional to the quantity of electricity (Q).";
        } else if (i % 5 === 2) {
          question = `What is the order of a reaction whose rate is completely independent of the reactant concentration? (Q-${i})`;
          options = ["Zero Order", "First Order", "Second Order", "Pseudo-First Order"];
          correctIndex = 0;
          explanation = "In zero-order reactions, Rate = k [A]^0 = k, which is constant and independent of concentrations.";
        } else if (i % 5 === 3) {
          question = `What linkage binds amino acids together to form proteins? (Q-${i})`;
          options = ["Peptide Bond", "Glycosidic Bond", "Phosphodiester Bond", "Ester Bond"];
          correctIndex = 0;
          explanation = "A peptide bond is a covalent amide linkage formed between the carboxyl group of one amino acid and amino group of another.";
        } else {
          question = `What is the coordination number of a metal ion in the complex [Co(NH3)6]3+? (Q-${i})`;
          options = ["6", "3", "2", "4"];
          correctIndex = 0;
          explanation = "The coordination number is the number of ligand donor atoms directly bonded to the metal (6 NH3 ligands = 6).";
        }
      }

      templates.push({ topic, question, options, correctIndex, explanation });
    }
  } else if (subject === "Biology") {
    // 25 Advanced Biology questions (Class 11-12)
    for (let i = 1; i <= 25; i++) {
      let topic = "Cell Biology";
      let question = "";
      let options: string[] = [];
      let correctIndex = 0;
      let explanation = "";

      if (grade === 11) {
        topic = "Class 11 Biology Core";
        if (i % 5 === 0) {
          question = `What is the primary site of protein synthesis in a living cell? (Q-${i})`;
          options = ["Ribosome", "Lysosome", "Mitochondria", "Golgi Apparatus"];
          correctIndex = 0;
          explanation = "Ribosomes translate genetic instructions from mRNA into polypeptide chains (proteins).";
        } else if (i % 5 === 1) {
          question = `Which green pigment in plants is primary responsible for capturing solar light energy? (Q-${i})`;
          options = ["Chlorophyll a", "Carotenoid", "Xanthophyll", "Anthocyanin"];
          correctIndex = 0;
          explanation = "Chlorophyll a is the essential reaction center pigment in photosystems that drives photosynthesis.";
        } else if (i % 5 === 2) {
          question = `Which organ in the human body secretes insulin and glucagon hormones? (Q-${i})`;
          options = ["Pancreas", "Liver", "Thyroid", "Adrenal gland"];
          correctIndex = 0;
          explanation = "The islets of Langerhans in the pancreas contain alpha and beta cells secreting glucagon and insulin.";
        } else if (i % 5 === 3) {
          question = `What type of cell division reduces the chromosome number by half, producing gametes? (Q-${i})`;
          options = ["Meiosis", "Mitosis", "Binary Fission", "Budding"];
          correctIndex = 0;
          explanation = "Meiosis consists of two divisions that turn one diploid cell into four haploid gametes.";
        } else {
          question = `Which phylum in the animal kingdom is characterized by jointed appendages and chitinous exoskeleton? (Q-${i})`;
          options = ["Arthropoda", "Mollusca", "Annelida", "Chordata"];
          correctIndex = 0;
          explanation = "Arthropoda (insects, arachnids, crustaceans) is the largest animal phylum featuring jointed limbs.";
        }
      } else { // Class 12
        topic = "Class 12 Genetics & Biotechnology";
        if (i % 5 === 0) {
          question = `Who is universally recognized as the "Father of Modern Genetics"? (Q-${i})`;
          options = ["Gregor Mendel", "Charles Darwin", "Thomas Hunt Morgan", "Watson and Crick"];
          correctIndex = 0;
          explanation = "Mendel's breeding experiments with pea plants established the laws of inheritance.";
        } else if (i % 5 === 1) {
          question = `What molecular structure is a double helix composed of nucleotides joined by hydrogen bonds? (Q-${i})`;
          options = ["DNA", "RNA", "Protein", "Polysaccharide"];
          correctIndex = 0;
          explanation = "Deoxyribonucleic Acid (DNA) is a double-stranded helical molecule storing genetic information.";
        } else if (i % 5 === 2) {
          question = `Which enzymes act as molecular scissors to cut DNA strands at specific recognition sequences? (Q-${i})`;
          options = ["Restriction Endonucleases", "DNA Ligases", "DNA Polymerases", "Helicases"];
          correctIndex = 0;
          explanation = "Restriction enzymes cut phosphodiester backbones at specific palindromic target sites.";
        } else if (i % 5 === 3) {
          question = `What ecological relationship describes an interaction where both species benefit? (Q-${i})`;
          options = ["Mutualism", "Commensalism", "Parasitism", "Competition"];
          correctIndex = 0;
          explanation = "Mutualism is an obligate or facultative symbiotic interaction positive to both organisms (e.g. lichens).";
        } else {
          question = `Which process describes copying genetic information from a strand of DNA into a complementary RNA? (Q-${i})`;
          options = ["Transcription", "Translation", "Replication", "Transduction"];
          correctIndex = 0;
          explanation = "Transcription is the synthesis of RNA under the direction of DNA templates catalyzed by RNA polymerase.";
        }
      }

      templates.push({ topic, question, options, correctIndex, explanation });
    }
  } else if (subject === "Computer Science") {
    // 25 Computer Science questions (Class 11-12)
    for (let i = 1; i <= 25; i++) {
      let topic = "Python Programming";
      let question = "";
      let options: string[] = [];
      let correctIndex = 0;
      let explanation = "";

      if (grade === 11) {
        topic = "Python Basics & Dictionaries";
        if (i % 5 === 0) {
          question = `What is the output of print(type({})) in Python? (Q-${i})`;
          options = ["<class 'dict'>", "<class 'set'>", "<class 'list'>", "<class 'tuple'>"];
          correctIndex = 0;
          explanation = "An empty set of curly braces {} in Python defaults to creating a dictionary, not a set.";
        } else if (i % 5 === 1) {
          question = `Which of the following is a mutable data type in Python? (Q-${i})`;
          options = ["List", "Tuple", "String", "Integer"];
          correctIndex = 0;
          explanation = "Lists can be modified after creation (elements appended/removed), while tuples, strings, and integers are immutable.";
        } else if (i % 5 === 2) {
          question = `What is the output of print("CS" * 3) in Python? (Q-${i})`;
          options = ["CSCSCS", "CS 3", "CSCS", "Error"];
          correctIndex = 0;
          explanation = "The multiplication operator * repeats strings a specified number of times.";
        } else if (i % 5 === 3) {
          question = `Which keyword is used to start a loop block in Python? (Q-${i})`;
          options = ["for", "loop", "foreach", "repeat"];
          correctIndex = 0;
          explanation = "Python uses 'for' and 'while' loops. There is no 'loop' or 'foreach' keyword.";
        } else {
          question = `What does the break statement do inside a loop? (Q-${i})`;
          options = ["Terminates the loop immediately", "Skips the current iteration", "Restarts the loop", "Exits the entire program"];
          correctIndex = 0;
          explanation = "The 'break' statement terminates the execution of the loop and transfers control to the statement following it.";
        }
      } else { // Class 12
        topic = "OOP & SQL Queries";
        if (i % 5 === 0) {
          question = `Which OOP concept refers to the inheritance of properties by a child class from a parent class? (Q-${i})`;
          options = ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"];
          correctIndex = 0;
          explanation = "Inheritance allows a subclass to reuse code and behaviors defined in its superclass.";
        } else if (i % 5 === 1) {
          question = `Which SQL statement is used to retrieve unique records, removing duplicates? (Q-${i})`;
          options = ["SELECT DISTINCT", "SELECT UNIQUE", "SELECT ONLY", "SELECT GROUP"];
          correctIndex = 0;
          explanation = "The DISTINCT keyword is placed after SELECT to filter out duplicate rows in output sets.";
        } else if (i % 5 === 2) {
          question = `In a stack, which operation inserts a new element at the top? (Q-${i})`;
          options = ["Push", "Pop", "Enqueue", "Dequeue"];
          correctIndex = 0;
          explanation = "Push adds an element to the top of a stack. Pop removes the top element.";
        } else if (i % 5 === 3) {
          question = `Which network device connects multiple networks and routes packets between them? (Q-${i})`;
          options = ["Router", "Switch", "Hub", "Repeater"];
          correctIndex = 0;
          explanation = "Routers inspect destination IP addresses and forward packets across internet gateways.";
        } else {
          question = `Which Python module is used to work with CSV files? (Q-${i})`;
          options = ["csv", "json", "pandas", "os"];
          correctIndex = 0;
          explanation = "The built-in 'csv' module provides classes/methods to read and write tabular data in CSV format.";
        }
      }

      templates.push({ topic, question, options, correctIndex, explanation });
    }
  }

  return templates;
}

// ----------------------------------------------------
// MAIN SCRIPT EXECUTION
// ----------------------------------------------------
function main() {
  console.log("🚀 Generating full question bank...");

  const allQuestions: GeneratedQuestion[] = [];
  const subjects4to10 = ["English", "Tamil", "Mathematics", "Science", "Social Science"];
  const subjects11to12 = ["English", "Tamil", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science"];

  // Generate for Grade 4 to 10
  for (let grade = 4; grade <= 10; grade++) {
    for (const sub of subjects4to10) {
      if (sub === "Mathematics") {
        allQuestions.push(...generateMathQuestions(grade));
      } else {
        allQuestions.push(...getSubjectTemplates(sub, grade).map((t, idx) => {
          const diff: 'easy' | 'medium' | 'hard' = idx % 3 === 0 ? 'hard' : idx % 2 === 0 ? 'medium' : 'easy';
          return {
            id: `q_c${grade}_${sub.toLowerCase().replace(/\s+/g, '')}_${String(idx + 1).padStart(3, '0')}`,
            grade,
            subject: sub,
            topic: t.topic,
            subtopic: "General",
            difficulty: diff,
            question: t.question,
            options: t.options,
            correctAnswer: t.options[t.correctIndex],
            correctIndex: t.correctIndex,
            explanation: t.explanation
          };
        }));
      }
    }
  }

  // Generate for Grade 11 to 12
  for (let grade = 11; grade <= 12; grade++) {
    for (const sub of subjects11to12) {
      if (sub === "Mathematics") {
        allQuestions.push(...generateMathQuestions(grade));
      } else {
        allQuestions.push(...getSubjectTemplates(sub, grade).map((t, idx) => {
          const diff: 'easy' | 'medium' | 'hard' = idx % 3 === 0 ? 'hard' : idx % 2 === 0 ? 'medium' : 'easy';
          return {
            id: `q_c${grade}_${sub.toLowerCase().replace(/\s+/g, '')}_${String(idx + 1).padStart(3, '0')}`,
            grade,
            subject: sub,
            topic: t.topic,
            subtopic: "General",
            difficulty: diff,
            question: t.question,
            options: t.options,
            correctAnswer: t.options[t.correctIndex],
            correctIndex: t.correctIndex,
            explanation: t.explanation
          };
        }));
      }
    }
  }

  console.log(`Generated a total of ${allQuestions.length} questions.`);

  // Write to backend questionsData file
  const backendDir = path.join(__dirname, '../src/data');
  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true });
  }
  const backendFilePath = path.join(backendDir, 'questionsData.ts');
  const backendContent = `// Auto-generated question bank data
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

export const questionsData: RawQuestion[] = ${JSON.stringify(
    allQuestions.map(q => ({
      id: q.id,
      classLevel: q.grade,
      subject: q.subject,
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty,
      questionText: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    })),
    null,
    2
  )};
`;
  fs.writeFileSync(backendFilePath, backendContent);
  console.log(`Saved backend question bank data to: ${backendFilePath}`);

  // Write to frontend questions file
  const frontendFilePath = path.resolve(__dirname, '../../frontend/src/questions.ts');
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

export const questionBank: Question[] = ${JSON.stringify(
    allQuestions.map(q => ({
      id: q.id,
      grade: q.grade,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation
    })),
    null,
    2
  )};
`;
  fs.writeFileSync(frontendFilePath, frontendContent);
  console.log(`Saved frontend question bank data to: ${frontendFilePath}`);
  console.log("🎉 Question bank compilation complete!");
}

main();
