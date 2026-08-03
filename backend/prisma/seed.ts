import { PrismaClient, Role, Difficulty, QuestionType, TileType, TrapType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting ByteQuest Database Seeding...');

  // 1. Clear existing tables
  await prisma.sessionResult.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.studentBadge.deleteMany({});
  await prisma.roomPlayer.deleteMany({});
  await prisma.playerGameStats.deleteMany({});
  await prisma.playerMove.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.mapTile.deleteMany({});
  await prisma.gameSession.deleteMany({});
  await prisma.mapWorld.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.section.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.studentProfile.deleteMany({});
  await prisma.parentProfile.deleteMany({});
  await prisma.teacherProfile.deleteMany({});
  await prisma.school.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🗑️ Database cleared.');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Seed default School
  const school = await prisma.school.create({
    data: {
      name: "St. Patrick High School",
      district: "District 9",
      state: "State of Tech",
    }
  });

  // 3. Seed Teacher
  const teacherUser = await prisma.user.create({
    data: {
      email: "teacher@bytequest.com",
      passwordHash,
      role: Role.TEACHER,
      firstName: "Professor",
      lastName: "Turing",
      isVerified: true
    }
  });

  const teacher = await prisma.teacherProfile.create({
    data: {
      userId: teacherUser.id,
      schoolId: school.id,
      isApproved: true
    }
  });

  // 4. Seed Worlds (Isle of Basics, Function Jungle, Data Fortress, Mixed Map)
  console.log('🗺️ Seeding Game Worlds...');
  const worlds = [
    { name: 'Isle of Basics', description: 'Pedagogical map for Class 10 fundamentals.' },
    { name: 'Function Jungle', description: 'Pedagogical map for Class 11 functional structures.' },
    { name: 'Data Fortress', description: 'Pedagogical map for Class 12 data architectures.' },
    { name: 'Mixed Map', description: 'Fallback map when team grades differ.' }
  ];

  for (const w of worlds) {
    const world = await prisma.mapWorld.create({
      data: {
        name: w.name,
        description: w.description
      }
    });

    // Create 18 tiles per world (0 to 17)
    // 0: Start, 17: Finish, 6/12: Trap, 4/14: Treasure, 10: Boss, rest: Question
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
  }

  // 5. Seed Class & Students
  const cls = await prisma.class.create({
    data: {
      name: "Grade 11 - Section B",
      teacherId: teacher.id
    }
  });

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
    const user = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash,
        role: Role.STUDENT,
        firstName: s.name.split(' ')[0],
        lastName: s.name.split(' ')[1] || '',
        isVerified: true
      }
    });

    const student = await prisma.studentProfile.create({
      data: {
        userId: user.id,
        schoolId: school.id,
        classId: cls.id,
        xp: 100,
        coins: 50,
        level: 1
      }
    });

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
    const team = await prisma.team.create({
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

  // 7. Seed Questions (45 questions: 15 questions per Grade 10, 11, 12)
  console.log('📝 Seeding MCQ Question Pool (45 Questions)...');
  const questions = [
    // ==========================================
    // GRADE 10 QUESTIONS (15 Questions)
    // ==========================================
    {
      classLevel: 10,
      topic: "Python Basics",
      subtopic: "Variables",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "Variable Naming Rules",
      questionText: "Which of these is a valid variable name in Python?",
      options: ["2value", "value_2", "value-2", "value 2"],
      correctAnswer: "value_2",
      explanation: "Python variables can start with letters or underscores, and contain letters, numbers, or underscores, but not spaces, hyphens, or start with digits."
    },
    {
      classLevel: 10,
      topic: "Python Basics",
      subtopic: "Operators",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "Exponentiation Output",
      questionText: "What is the output of print(2 ** 3) in Python?",
      options: ["6", "8", "9", "5"],
      correctAnswer: "8",
      explanation: "The ** operator in Python represents exponentiation (power). 2 raised to the power of 3 is 2 * 2 * 2 = 8."
    },
    {
      classLevel: 10,
      topic: "Python Basics",
      subtopic: "Strings",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "Length of String",
      questionText: "What does the function len('ByteQuest') return?",
      options: ["8", "9", "10", "Error"],
      correctAnswer: "9",
      explanation: "The len() function returns the number of characters in a string. 'ByteQuest' contains exactly 9 characters."
    },
    {
      classLevel: 10,
      topic: "Python Basics",
      subtopic: "I/O",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "input() Default Return",
      questionText: "Which data type is returned by the input() function in Python by default?",
      options: ["Integer", "Float", "String", "Boolean"],
      correctAnswer: "String",
      explanation: "In Python, the input() function always reads user input as a string. You must typecast it (e.g., int(input())) if you need another type."
    },
    {
      classLevel: 10,
      topic: "Python Basics",
      subtopic: "Booleans",
      difficulty: Difficulty.HARD,
      type: QuestionType.MCQ,
      title: "Boolean Casting",
      questionText: "What is the output of print(bool('False')) in Python?",
      options: ["False", "True", "None", "Error"],
      correctAnswer: "True",
      explanation: "Any non-empty string in Python evaluates to True when cast to a Boolean. Only empty containers and strings evaluate to False."
    },
    {
      classLevel: 10,
      topic: "Number Systems",
      subtopic: "Binary conversion",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "Decimal to Binary",
      questionText: "What is the binary equivalent of the decimal number 5?",
      options: ["100", "101", "110", "111"],
      correctAnswer: "101",
      explanation: "In binary, decimal 5 is calculated as (1 * 4) + (0 * 2) + (1 * 1) = 101."
    },
    {
      classLevel: 10,
      topic: "Number Systems",
      subtopic: "Bases",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "Hexadecimal Base",
      questionText: "Which base value does the Hexadecimal number system use?",
      options: ["Base 2", "Base 8", "Base 10", "Base 16"],
      correctAnswer: "Base 16",
      explanation: "Hexadecimal is a base-16 number system, using digits 0-9 and letters A-F to represent numbers 0 to 15."
    },
    {
      classLevel: 10,
      topic: "Number Systems",
      subtopic: "Binary conversion",
      difficulty: Difficulty.HARD,
      type: QuestionType.MCQ,
      title: "Binary to Decimal",
      questionText: "Convert the binary number 1101 to decimal.",
      options: ["11", "12", "13", "14"],
      correctAnswer: "13",
      explanation: "1101 in binary is (1 * 8) + (1 * 4) + (0 * 2) + (1 * 1) = 8 + 4 + 0 + 1 = 13 in decimal."
    },
    {
      classLevel: 10,
      topic: "Boolean Logic",
      subtopic: "Logic Gates",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "AND Gate Behavior",
      questionText: "Which Boolean logic gate output is True only if both inputs are True?",
      options: ["OR", "AND", "NOT", "XOR"],
      correctAnswer: "AND",
      explanation: "An AND gate output is True only if both of its inputs are True."
    },
    {
      classLevel: 10,
      topic: "Boolean Logic",
      subtopic: "Laws",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "De Morgan's Laws",
      questionText: "According to De Morgan's Laws, NOT (A AND B) is equivalent to which of the following?",
      options: ["(NOT A) AND (NOT B)", "(NOT A) OR (NOT B)", "NOT A + NOT B", "A OR B"],
      correctAnswer: "(NOT A) OR (NOT B)",
      explanation: "De Morgan's law states that the negation of a conjunction is the disjunction of the negations: NOT (A AND B) = (NOT A) OR (NOT B)."
    },
    {
      classLevel: 10,
      topic: "Boolean Logic",
      subtopic: "Logic Operations",
      difficulty: Difficulty.HARD,
      type: QuestionType.MCQ,
      title: "Logic Truth Table",
      questionText: "What is the truth value of the Boolean expression: (True and False) or (not False)?",
      options: ["True", "False", "None", "Undefined"],
      correctAnswer: "True",
      explanation: "First, (True and False) is False. Second, (not False) is True. Finally, False or True evaluates to True."
    },
    {
      classLevel: 10,
      topic: "Internet Basics",
      subtopic: "Protocols",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "DNS Stands For",
      questionText: "What does DNS stand for in networking?",
      options: ["Data Network System", "Digital Name Server", "Domain Name System", "Dynamic Network Service"],
      correctAnswer: "Domain Name System",
      explanation: "DNS stands for Domain Name System, which translates human-readable domain names (like google.com) into numerical IP addresses."
    },
    {
      classLevel: 10,
      topic: "Python Basics",
      subtopic: "Slicing",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "List Slicing Output",
      questionText: "What is the output of print([1, 2, 3, 4][1:3]) in Python?",
      options: ["[1, 2]", "[2, 3]", "[2, 3, 4]", "[1, 2, 3]"],
      correctAnswer: "[2, 3]",
      explanation: "Slicing [1:3] starts at index 1 (inclusive) and goes up to index 3 (exclusive), returning the elements at indices 1 and 2, which are [2, 3]."
    },
    {
      classLevel: 10,
      topic: "Number Systems",
      subtopic: "Bases",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "Octal Base Value",
      questionText: "Which base value does the Octal number system use?",
      options: ["Base 2", "Base 8", "Base 10", "Base 16"],
      correctAnswer: "Base 8",
      explanation: "The Octal number system is a base-8 system, using digits from 0 to 7."
    },
    {
      classLevel: 10,
      topic: "Internet Basics",
      subtopic: "Addresses",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "Hardware Address",
      questionText: "Which address is physically burned into a network interface card (NIC) by the manufacturer?",
      options: ["IP Address", "MAC Address", "Port Address", "DNS Address"],
      correctAnswer: "MAC Address",
      explanation: "The Media Access Control (MAC) address is a unique physical hardware address assigned to network adapters at the factory."
    },

    // ==========================================
    // GRADE 11 QUESTIONS (15 Questions)
    // ==========================================
    {
      classLevel: 11,
      topic: "Functions",
      subtopic: "Declaration",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "Keyword def",
      questionText: "Which keyword is used to declare a function in Python?",
      options: ["function", "def", "define", "func"],
      correctAnswer: "def",
      explanation: "In Python, the 'def' keyword is used to define / declare a function."
    },
    {
      classLevel: 11,
      topic: "Functions",
      subtopic: "Arguments",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "Default arguments",
      questionText: "What is a parameter that has a default value assigned during function definition called?",
      options: ["Required argument", "Keyword argument", "Default argument", "Positional argument"],
      correctAnswer: "Default argument",
      explanation: "An argument that takes a default value if no value is passed to it during the function call is known as a default argument."
    },
    {
      classLevel: 11,
      topic: "Functions",
      subtopic: "Lambda",
      difficulty: Difficulty.HARD,
      type: QuestionType.MCQ,
      title: "Type of Lambda",
      questionText: "What is the output of print(type(lambda x: x + 1)) in Python?",
      options: ["<class 'int'>", "<class 'function'>", "<class 'lambda'>", "Error"],
      correctAnswer: "<class 'function'>",
      explanation: "A lambda expression creates an anonymous function. Its type is simply '<class 'function'>'."
    },
    {
      classLevel: 11,
      topic: "Data Structures",
      subtopic: "Dictionaries",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "Dictionary syntax",
      questionText: "Which brackets are used to declare a dictionary in Python?",
      options: ["[]", "()", "{}", "<>"],
      correctAnswer: "{}",
      explanation: "Curly brackets {} are used to define a dictionary (key-value pairs) in Python."
    },
    {
      classLevel: 11,
      topic: "Data Structures",
      subtopic: "Lists",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "List appending list",
      questionText: "What is the output of: x = [1, 2]; x.append([3, 4]); print(len(x))?",
      options: ["4", "3", "2", "Error"],
      correctAnswer: "3",
      explanation: "x.append([3,4]) appends the list [3,4] as a single element at the end of x. Thus, x becomes [1, 2, [3, 4]], which has length 3."
    },
    {
      classLevel: 11,
      topic: "Data Structures",
      subtopic: "Mutability",
      difficulty: Difficulty.HARD,
      type: QuestionType.MCQ,
      title: "Immutability tuple",
      questionText: "Which of the following data types in Python is immutable?",
      options: ["List", "Dictionary", "Set", "Tuple"],
      correctAnswer: "Tuple",
      explanation: "Tuples are immutable sequences in Python, meaning their elements cannot be changed, added, or removed after creation."
    },
    {
      classLevel: 11,
      topic: "Intro OOP",
      subtopic: "Classes",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "Class Blueprint",
      questionText: "What is a blueprint or template for creating objects in OOP called?",
      options: ["Instance", "Method", "Class", "Constructor"],
      correctAnswer: "Class",
      explanation: "A class acts as a blueprint or template from which individual objects (instances) are created."
    },
    {
      classLevel: 11,
      topic: "Intro OOP",
      subtopic: "Constructors",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "__init__ Initializer",
      questionText: "What is the name of the special method used to initialize a new object in a Python class?",
      options: ["__new__", "__init__", "constructor", "init"],
      correctAnswer: "__init__",
      explanation: "In Python, the __init__ method is automatically called to initialize a class's attributes when an object is instantiated."
    },
    {
      classLevel: 11,
      topic: "Intro OOP",
      subtopic: "Encapsulation",
      difficulty: Difficulty.HARD,
      type: QuestionType.MCQ,
      title: "Data Hiding Wrapping",
      questionText: "Which OOP concept wraps data (variables) and methods together as a single unit and restricts direct access?",
      options: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"],
      correctAnswer: "Encapsulation",
      explanation: "Encapsulation is the process of bundling data and methods inside a single class and restricting direct access to the state via access control modifiers."
    },
    {
      classLevel: 11,
      topic: "Intro SQL",
      subtopic: "Commands",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "SELECT Statement",
      questionText: "Which SQL command is used to retrieve data from a database?",
      options: ["SELECT", "EXTRACT", "GET", "FETCH"],
      correctAnswer: "SELECT",
      explanation: "The SELECT statement is used in SQL queries to retrieve records from database tables."
    },
    {
      classLevel: 11,
      topic: "Data Structures",
      subtopic: "Strings",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "String Join Method",
      questionText: "What is the output of 'CS'.join(['1', '2']) in Python?",
      options: ["12", "CS12", "1CS2", "Error"],
      correctAnswer: "1CS2",
      explanation: "The join() method concatenates list elements, placing the string separator 'CS' between them, yielding '1CS2'."
    },
    {
      classLevel: 11,
      topic: "Intro OOP",
      subtopic: "Objects",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "Instance of Class",
      questionText: "What is an instance of a class called in Object-Oriented Programming?",
      options: ["Method", "Object", "Variable", "Structure"],
      correctAnswer: "Object",
      explanation: "An object is a self-contained instance of a class containing its own state (attributes) and behavior (methods)."
    },
    {
      classLevel: 11,
      topic: "Intro SQL",
      subtopic: "Filtering",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "Distinct Records Query",
      questionText: "Which keyword is used in SQL to remove duplicate records from a SELECT query?",
      options: ["UNIQUE", "DISTINCT", "DIFFERENT", "SINGLE"],
      correctAnswer: "DISTINCT",
      explanation: "The DISTINCT keyword is used to filter out duplicate rows and return only unique values in the query results."
    },
    {
      classLevel: 11,
      topic: "Functions",
      subtopic: "Scopes",
      difficulty: Difficulty.HARD,
      type: QuestionType.MCQ,
      title: "Global Scope Modifier",
      questionText: "Which keyword allows modifying a variable in the global scope inside a Python function?",
      options: ["nonlocal", "global", "public", "outer"],
      correctAnswer: "global",
      explanation: "The 'global' keyword informs Python to bind the local variable scope name to the global namespace module."
    },
    {
      classLevel: 11,
      topic: "Intro OOP",
      subtopic: "Flowcharts",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "Decision Symbol Flow",
      questionText: "Which flowchart symbol is used to represent a decision block?",
      options: ["Rectangle", "Oval", "Diamond", "Parallelogram"],
      correctAnswer: "Diamond",
      explanation: "A diamond shape is standard in flowcharts for decision branches, with paths leaving based on conditions (e.g. Yes/No)."
    },

    // ==========================================
    // GRADE 12 QUESTIONS (15 Questions)
    // ==========================================
    {
      classLevel: 12,
      topic: "Advanced OOP",
      subtopic: "Inheritance",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "Inheritance Properties",
      questionText: "Which concept allows a subclass to acquire properties and behaviors of a superclass?",
      options: ["Polymorphism", "Encapsulation", "Abstraction", "Inheritance"],
      correctAnswer: "Inheritance",
      explanation: "Inheritance allows a child class to inherit the attributes and methods of a parent class."
    },
    {
      classLevel: 12,
      topic: "Advanced OOP",
      subtopic: "Polymorphism",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "Method Overriding Override",
      questionText: "Which concept describes overriding a parent class method inside a subclass to perform different actions?",
      options: ["Method Overloading", "Method Overriding", "Data Hiding", "Interface"],
      correctAnswer: "Method Overriding",
      explanation: "Method Overriding occurs when a subclass defines a method with the same name and signature as one in its superclass, replacing its behavior."
    },
    {
      classLevel: 12,
      topic: "Stacks & Queues",
      subtopic: "Stacks LIFO",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "LIFO stack",
      questionText: "Which principle does a Stack follow for adding and removing elements?",
      options: ["LIFO (Last In First Out)", "FIFO (First In First Out)", "LILO (Last In Last Out)", "Random access"],
      correctAnswer: "LIFO (Last In First Out)",
      explanation: "A stack is a Last In First Out (LIFO) data structure. The last element pushed is the first one popped."
    },
    {
      classLevel: 12,
      topic: "Stacks & Queues",
      subtopic: "Queues Enqueue",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "Enqueue Back Insertion",
      questionText: "Which queue term describes adding an element to the back of the queue?",
      options: ["Dequeue", "Enqueue", "Push", "Pop"],
      correctAnswer: "Enqueue",
      explanation: "Enqueue is the operation of inserting an item to the rear (end) of a queue."
    },
    {
      classLevel: 12,
      topic: "SQL Queries",
      subtopic: "Sorting",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "ORDER BY Sorting",
      questionText: "Which clause is used to sort the result-set of an SQL query in ascending or descending order?",
      options: ["GROUP BY", "SORT BY", "ORDER BY", "ARRANGE BY"],
      correctAnswer: "ORDER BY",
      explanation: "The ORDER BY clause is used to sort the output in ascending (ASC) or descending (DESC) order."
    },
    {
      classLevel: 12,
      topic: "Networking",
      subtopic: "Topologies",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "Bus Central Topology",
      questionText: "Which topology connects all devices to a single central cable?",
      options: ["Star topology", "Ring topology", "Bus topology", "Mesh topology"],
      correctAnswer: "Bus topology",
      explanation: "In a bus topology, all devices are connected along a single central cable, called the bus."
    },
    {
      classLevel: 12,
      topic: "File Handling",
      subtopic: "open() Function",
      difficulty: Difficulty.EASY,
      type: QuestionType.MCQ,
      title: "File Opening",
      questionText: "Which Python function is used to open a file?",
      options: ["open()", "file()", "read()", "access()"],
      correctAnswer: "open()",
      explanation: "The built-in open() function in Python opens a file and returns a corresponding file object."
    },
    {
      classLevel: 12,
      topic: "Stacks & Queues",
      subtopic: "Linked Lists",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "Singly Linked List Ending",
      questionText: "In a Singly Linked List, what does the last node's pointer point to?",
      options: ["Head", "Previous Node", "NULL", "itself"],
      correctAnswer: "NULL",
      explanation: "The last node of a Singly Linked List does not have a next node, so its pointer fields are bound to NULL (None in Python) to signify the end."
    },
    {
      classLevel: 12,
      topic: "SQL Queries",
      subtopic: "Aggregates",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "SQL Count Aggregation",
      questionText: "Which SQL aggregate function returns the total number of records in a table?",
      options: ["SUM()", "COUNT()", "TOTAL()", "ADD()"],
      correctAnswer: "COUNT()",
      explanation: "The COUNT() function counts the number of rows matching query filters."
    },
    {
      classLevel: 12,
      topic: "Networking",
      subtopic: "OSI Models",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "OSI Routing Layer",
      questionText: "Which OSI layer is responsible for routing packets across networks?",
      options: ["Physical Layer", "Data Link Layer", "Network Layer", "Transport Layer"],
      correctAnswer: "Network Layer",
      explanation: "The Network Layer (Layer 3) handles routing, logical addressing, and packets forwarding across routers."
    },
    {
      classLevel: 12,
      topic: "File Handling",
      subtopic: "Modes",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "Write Mode Truncation",
      questionText: "Which Python file open mode allows writing to a file, creating it if it doesn't exist, and truncating it first?",
      options: ["'r'", "'w'", "'a'", "'x'"],
      correctAnswer: "'w'",
      explanation: "The 'w' mode opens a file for writing, creates it if missing, and truncates (empties) existing contents upon opening."
    },
    {
      classLevel: 12,
      topic: "File Handling",
      subtopic: "Reading Methods",
      difficulty: Difficulty.HARD,
      type: QuestionType.MCQ,
      title: "File readlines Method",
      questionText: "Which Python file object method returns a list of all lines in a file?",
      options: ["read()", "readline()", "readlines()", "readall()"],
      correctAnswer: "readlines()",
      explanation: "The readlines() method reads all lines in a text file and returns them grouped as a list of strings."
    },
    {
      classLevel: 12,
      topic: "Advanced OOP",
      subtopic: "Interfaces",
      difficulty: Difficulty.MEDIUM,
      type: QuestionType.MCQ,
      title: "Polymorphic Responses",
      questionText: "What OOP concept describes the ability of different classes to respond to the same message in unique ways?",
      options: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"],
      correctAnswer: "Polymorphism",
      explanation: "Polymorphism (many forms) allows uniform operations across subclass interfaces that execute subclass-specific overrides."
    },
    {
      classLevel: 12,
      topic: "Stacks & Queues",
      subtopic: "Applications",
      difficulty: Difficulty.HARD,
      type: QuestionType.MCQ,
      title: "Stack Realworld Application",
      questionText: "Which of these is a direct real-world application of a Stack data structure?",
      options: ["Print queue spooler", "Undo/Redo operations in text editors", "Network load balancers", "Music playlist shuffler"],
      correctAnswer: "Undo/Redo operations in text editors",
      explanation: "Undo/Redo mechanisms push editor state history to a LIFO stack. The last edit state is popped first to revert actions."
    },
    {
      classLevel: 12,
      topic: "SQL Queries",
      subtopic: "JOINs",
      difficulty: Difficulty.HARD,
      type: QuestionType.MCQ,
      title: "Full Outer Join SQL",
      questionText: "Which SQL join returns all records when there is a match in either left or right table?",
      options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"],
      correctAnswer: "FULL OUTER JOIN",
      explanation: "A FULL OUTER JOIN returns all matching rows and fills unmatched rows with NULL values from either side."
    }
  ];

  // Populate questions with the creator link
  for (const q of questions) {
    await prisma.question.create({
      data: {
        classLevel: q.classLevel,
        topic: q.topic,
        subtopic: q.subtopic,
        difficulty: q.difficulty,
        type: q.type,
        title: q.title,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        creatorId: teacher.id,
        isApproved: true
      }
    });
  }

  console.log('✅ ByteQuest Database Seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
