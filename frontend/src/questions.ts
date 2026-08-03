export interface Question {
  id: string;
  grade: number;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const questionBank: Question[] = [
  // ==========================================
  // GRADE 10 (15 Questions)
  // Python fundamentals, number systems, Boolean logic, internet basics
  // ==========================================
  {
    id: "q_10_python_001",
    grade: 10,
    topic: "Python Basics",
    difficulty: "easy",
    question: "Which of these is a valid variable name in Python?",
    options: ["2value", "value_2", "value-2", "value 2"],
    correctIndex: 1,
    explanation: "Python variables can start with letters or underscores, and contain letters, numbers, or underscores, but not spaces, hyphens, or start with digits."
  },
  {
    id: "q_10_python_002",
    grade: 10,
    topic: "Python Basics",
    difficulty: "easy",
    question: "What is the output of print(2 ** 3) in Python?",
    options: ["6", "8", "9", "5"],
    correctIndex: 1,
    explanation: "The ** operator in Python represents exponentiation (power). 2 raised to the power of 3 is 2 * 2 * 2 = 8."
  },
  {
    id: "q_10_python_003",
    grade: 10,
    topic: "Python Basics",
    difficulty: "medium",
    question: "What does the function len('ByteQuest') return?",
    options: ["8", "9", "10", "Error"],
    correctIndex: 1,
    explanation: "The len() function returns the number of characters in a string. 'ByteQuest' contains exactly 9 characters."
  },
  {
    id: "q_10_python_004",
    grade: 10,
    topic: "Python Basics",
    difficulty: "medium",
    question: "Which data type is returned by the input() function in Python by default?",
    options: ["Integer", "Float", "String", "Boolean"],
    correctIndex: 2,
    explanation: "In Python, the input() function always reads user input as a string. You must typecast it (e.g., int(input())) if you need another type."
  },
  {
    id: "q_10_python_005",
    grade: 10,
    topic: "Python Basics",
    difficulty: "hard",
    question: "What is the output of print(bool('False')) in Python?",
    options: ["False", "True", "None", "Error"],
    correctIndex: 1,
    explanation: "Any non-empty string in Python evaluates to True when cast to a Boolean. Only empty containers and strings evaluate to False."
  },
  {
    id: "q_10_number_001",
    grade: 10,
    topic: "Number Systems",
    difficulty: "easy",
    question: "What is the binary equivalent of the decimal number 5?",
    options: ["100", "101", "110", "111"],
    correctIndex: 1,
    explanation: "In binary, decimal 5 is calculated as (1 * 4) + (0 * 2) + (1 * 1) = 101."
  },
  {
    id: "q_10_number_002",
    grade: 10,
    topic: "Number Systems",
    difficulty: "medium",
    question: "Which base value does the Hexadecimal number system use?",
    options: ["Base 2", "Base 8", "Base 10", "Base 16"],
    correctIndex: 3,
    explanation: "Hexadecimal is a base-16 number system, using digits 0-9 and letters A-F to represent numbers 0 to 15."
  },
  {
    id: "q_10_number_003",
    grade: 10,
    topic: "Number Systems",
    difficulty: "hard",
    question: "Convert the binary number 1101 to decimal.",
    options: ["11", "12", "13", "14"],
    correctIndex: 2,
    explanation: "1101 in binary is (1 * 8) + (1 * 4) + (0 * 2) + (1 * 1) = 8 + 4 + 0 + 1 = 13 in decimal."
  },
  {
    id: "q_10_logic_001",
    grade: 10,
    topic: "Boolean Logic",
    difficulty: "easy",
    question: "Which Boolean logic gate output is True only if both inputs are True?",
    options: ["OR", "AND", "NOT", "XOR"],
    correctIndex: 1,
    explanation: "An AND gate output is True only if both of its inputs are True."
  },
  {
    id: "q_10_logic_002",
    grade: 10,
    topic: "Boolean Logic",
    difficulty: "medium",
    question: "According to De Morgan's Laws, NOT (A AND B) is equivalent to which of the following?",
    options: ["(NOT A) AND (NOT B)", "(NOT A) OR (NOT B)", "NOT A + NOT B", "A OR B"],
    correctIndex: 1,
    explanation: "De Morgan's law states that the negation of a conjunction is the disjunction of the negations: NOT (A AND B) = (NOT A) OR (NOT B)."
  },
  {
    id: "q_10_logic_003",
    grade: 10,
    topic: "Boolean Logic",
    difficulty: "hard",
    question: "What is the truth value of the Boolean expression: (True and False) or (not False)?",
    options: ["True", "False", "None", "Undefined"],
    correctIndex: 0,
    explanation: "First, (True and False) is False. Second, (not False) is True. Finally, False or True evaluates to True."
  },
  {
    id: "q_10_internet_001",
    grade: 10,
    topic: "Internet Basics",
    difficulty: "easy",
    question: "What does DNS stand for in networking?",
    options: ["Data Network System", "Digital Name Server", "Domain Name System", "Dynamic Network Service"],
    correctIndex: 2,
    explanation: "DNS stands for Domain Name System, which translates human-readable domain names (like google.com) into numerical IP addresses."
  },
  {
    id: "q_10_internet_002",
    grade: 10,
    topic: "Internet Basics",
    difficulty: "easy",
    question: "Which protocol is used for securely browsing web pages?",
    options: ["HTTP", "FTP", "HTTPS", "SMTP"],
    correctIndex: 2,
    explanation: "HTTPS (Hypertext Transfer Protocol Secure) encrypts communication over a computer network, providing security for website visits."
  },
  {
    id: "q_10_internet_003",
    grade: 10,
    topic: "Internet Basics",
    difficulty: "medium",
    question: "What is the primary function of an IP address?",
    options: ["To store user cookies", "To identify a device on a network", "To boost internet download speeds", "To secure a wireless access point"],
    correctIndex: 1,
    explanation: "An IP (Internet Protocol) address is a unique identifier assigned to each device connected to a computer network."
  },
  {
    id: "q_10_internet_004",
    grade: 10,
    topic: "Internet Basics",
    difficulty: "hard",
    question: "Which of these is a valid IPv4 address format?",
    options: ["192.168.1.1", "256.100.0.1", "192.168.1.2.3", "G2.34.12.9"],
    correctIndex: 0,
    explanation: "An IPv4 address consists of 4 numbers separated by dots, each ranging from 0 to 255. 256.100.0.1 is invalid because 256 exceeds 255."
  },

  // ==========================================
  // GRADE 11 (15 Questions)
  // Functions, lists/strings/dictionaries, intro OOP, flowcharts, intro SQL
  // ==========================================
  {
    id: "q_11_func_001",
    grade: 11,
    topic: "Functions",
    difficulty: "easy",
    question: "Which keyword is used to declare a function in Python?",
    options: ["function", "def", "define", "func"],
    correctIndex: 1,
    explanation: "In Python, the 'def' keyword is used to define / declare a function."
  },
  {
    id: "q_11_func_002",
    grade: 11,
    topic: "Functions",
    difficulty: "medium",
    question: "What is a parameter that has a default value assigned during function definition called?",
    options: ["Required argument", "Keyword argument", "Default argument", "Positional argument"],
    correctIndex: 2,
    explanation: "An argument that takes a default value if no value is passed to it during the function call is known as a default argument."
  },
  {
    id: "q_11_func_003",
    grade: 11,
    topic: "Functions",
    difficulty: "hard",
    question: "What is the output of print(type(lambda x: x + 1)) in Python?",
    options: ["<class 'int'>", "<class 'function'>", "<class 'lambda'>", "Error"],
    correctIndex: 1,
    explanation: "A lambda expression creates an anonymous function. Its type is simply '<class 'function'>'."
  },
  {
    id: "q_11_ds_001",
    grade: 11,
    topic: "Data Structures",
    difficulty: "easy",
    question: "Which brackets are used to declare a dictionary in Python?",
    options: ["[]", "()", "{}", "<>"],
    correctIndex: 2,
    explanation: "Curly brackets {} are used to define a dictionary (key-value pairs) in Python."
  },
  {
    id: "q_11_ds_002",
    grade: 11,
    topic: "Data Structures",
    difficulty: "medium",
    question: "What is the output of: x = [1, 2]; x.append([3, 4]); print(len(x))?",
    options: ["4", "3", "2", "Error"],
    correctIndex: 1,
    explanation: "x.append([3,4]) appends the list [3,4] as a single element at the end of x. Thus, x becomes [1, 2, [3, 4]], which has length 3."
  },
  {
    id: "q_11_ds_003",
    grade: 11,
    topic: "Data Structures",
    difficulty: "hard",
    question: "Which of the following data types in Python is immutable?",
    options: ["List", "Dictionary", "Set", "Tuple"],
    correctIndex: 3,
    explanation: "Tuples are immutable sequences in Python, meaning their elements cannot be changed, added, or removed after creation."
  },
  {
    id: "q_11_oop_001",
    grade: 11,
    topic: "Intro OOP",
    difficulty: "easy",
    question: "What is a blueprint or template for creating objects in OOP called?",
    options: ["Instance", "Method", "Class", "Constructor"],
    correctIndex: 2,
    explanation: "A class acts as a blueprint or template from which individual objects (instances) are created."
  },
  {
    id: "q_11_oop_002",
    grade: 11,
    topic: "Intro OOP",
    difficulty: "medium",
    question: "What is the name of the special method used to initialize a new object in a Python class?",
    options: ["__new__", "__init__", "constructor", "init"],
    correctIndex: 1,
    explanation: "In Python, the __init__ method is automatically called to initialize a class's attributes when an object is instantiated."
  },
  {
    id: "q_11_oop_003",
    grade: 11,
    topic: "Intro OOP",
    difficulty: "hard",
    question: "Which OOP concept wraps data (variables) and methods together as a single unit and restricts direct access?",
    options: ["Inheritance", "Polymorphism", "Encapsulation", "Abstraction"],
    correctIndex: 2,
    explanation: "Encapsulation is the process of bundling data and methods inside a single class and restricting direct access to the state via access control modifiers."
  },
  {
    id: "q_11_flow_001",
    grade: 11,
    topic: "Flowcharts",
    difficulty: "easy",
    question: "In a flowchart, what shape represents a decision point?",
    options: ["Oval", "Rectangle", "Diamond", "Parallelogram"],
    correctIndex: 2,
    explanation: "A diamond shape in flowcharts represents a decision, branching the flow into separate 'Yes' or 'No' paths."
  },
  {
    id: "q_11_flow_002",
    grade: 11,
    topic: "Flowcharts",
    difficulty: "medium",
    question: "In a flowchart, which shape is used to denote input or output operations?",
    options: ["Rectangle", "Parallelogram", "Oval", "Circle"],
    correctIndex: 1,
    explanation: "A parallelogram is used to represent input/output operations, such as reading data or displaying results."
  },
  {
    id: "q_11_sql_001",
    grade: 11,
    topic: "Intro SQL",
    difficulty: "easy",
    question: "Which SQL command is used to retrieve data from a database?",
    options: ["SELECT", "EXTRACT", "GET", "FETCH"],
    correctIndex: 0,
    explanation: "The SELECT statement is used in SQL queries to retrieve records from database tables."
  },
  {
    id: "q_11_sql_002",
    grade: 11,
    topic: "Intro SQL",
    difficulty: "medium",
    question: "Which clause is used to filter records in an SQL query?",
    options: ["GROUP BY", "ORDER BY", "WHERE", "HAVING"],
    correctIndex: 2,
    explanation: "The WHERE clause is used to filter query results to include only records that meet a specified condition."
  },
  {
    id: "q_11_sql_003",
    grade: 11,
    topic: "Intro SQL",
    difficulty: "medium",
    question: "What is a constraint that uniquely identifies each record in an SQL database table called?",
    options: ["Unique Key", "Foreign Key", "Primary Key", "Composite Key"],
    correctIndex: 2,
    explanation: "A Primary Key constraint uniquely identifies each row in a table. It cannot contain null values."
  },
  {
    id: "q_11_sql_004",
    grade: 11,
    topic: "Intro SQL",
    difficulty: "hard",
    question: "Which SQL command is used to add new rows of data into a table?",
    options: ["ADD ROW", "INSERT INTO", "UPDATE", "APPEND"],
    correctIndex: 1,
    explanation: "The INSERT INTO statement is used to insert new records into a database table."
  },

  // ==========================================
  // GRADE 12 (15 Questions)
  // Advanced OOP, stacks/queues/linked lists, SQL queries, networking, file handling
  // ==========================================
  {
    id: "q_12_oop_001",
    grade: 12,
    topic: "Advanced OOP",
    difficulty: "easy",
    question: "Which concept allows a subclass to acquire properties and behaviors of a superclass?",
    options: ["Polymorphism", "Encapsulation", "Abstraction", "Inheritance"],
    correctIndex: 3,
    explanation: "Inheritance allows a child class to inherit the attributes and methods of a parent class."
  },
  {
    id: "q_12_oop_002",
    grade: 12,
    topic: "Advanced OOP",
    difficulty: "medium",
    question: "Which concept describes overriding a parent class method inside a subclass to perform different actions?",
    options: ["Method Overloading", "Method Overriding", "Data Hiding", "Interface"],
    correctIndex: 1,
    explanation: "Method Overriding occurs when a subclass defines a method with the same name and signature as one in its superclass, replacing its behavior."
  },
  {
    id: "q_12_oop_003",
    grade: 12,
    topic: "Advanced OOP",
    difficulty: "hard",
    question: "In Python, which built-in function returns True if an object is an instance of a subclass or class?",
    options: ["typeof()", "isinstance()", "hasattr()", "issubclass()"],
    correctIndex: 1,
    explanation: "The isinstance() function checks if an object is an instance or subclass of a specified class (or tuple of classes)."
  },
  {
    id: "q_12_ds_001",
    grade: 12,
    topic: "Stacks & Queues",
    difficulty: "easy",
    question: "Which principle does a Stack follow for adding and removing elements?",
    options: ["LIFO (Last In First Out)", "FIFO (First In First Out)", "LILO (Last In Last Out)", "Random access"],
    correctIndex: 0,
    explanation: "A stack is a Last In First Out (LIFO) data structure. The last element pushed is the first one popped."
  },
  {
    id: "q_12_ds_002",
    grade: 12,
    topic: "Stacks & Queues",
    difficulty: "medium",
    question: "Which queue term describes adding an element to the back of the queue?",
    options: ["Dequeue", "Enqueue", "Push", "Pop"],
    correctIndex: 1,
    explanation: "Enqueue is the operation of inserting an item to the rear (end) of a queue."
  },
  {
    id: "q_12_ds_003",
    grade: 12,
    topic: "Stacks & Queues",
    difficulty: "hard",
    question: "What error occurs when trying to pop an item from an empty stack?",
    options: ["Overflow Error", "Underflow Error", "ZeroDivision Error", "NullPointer Error"],
    correctIndex: 1,
    explanation: "An Underflow error occurs when an operation tries to remove/pop elements from an empty stack or queue."
  },
  {
    id: "q_12_sql_001",
    grade: 12,
    topic: "SQL Queries",
    difficulty: "easy",
    question: "Which clause is used to sort the result-set of an SQL query in ascending or descending order?",
    options: ["GROUP BY", "SORT BY", "ORDER BY", "ARRANGE BY"],
    correctIndex: 2,
    explanation: "The ORDER BY clause is used to sort the output in ascending (ASC) or descending (DESC) order."
  },
  {
    id: "q_12_sql_002",
    grade: 12,
    topic: "SQL Queries",
    difficulty: "medium",
    question: "Which aggregate function is used to find the number of rows that match a specified criteria in SQL?",
    options: ["COUNT()", "SUM()", "TOTAL()", "ROWS()"],
    correctIndex: 0,
    explanation: "The COUNT() function returns the number of rows that match specified criteria in an SQL query."
  },
  {
    id: "q_12_sql_003",
    grade: 12,
    topic: "SQL Queries",
    difficulty: "hard",
    question: "Which keyword retrieves records when there is at least one match in both tables being joined?",
    options: ["FULL OUTER JOIN", "INNER JOIN", "CROSS JOIN", "LEFT JOIN"],
    correctIndex: 1,
    explanation: "An INNER JOIN matches records present in both tables. If a row does not match, it is omitted."
  },
  {
    id: "q_12_net_001",
    grade: 12,
    topic: "Networking",
    difficulty: "easy",
    question: "Which topology connects all devices to a single central cable?",
    options: ["Star topology", "Ring topology", "Bus topology", "Mesh topology"],
    correctIndex: 2,
    explanation: "In a bus topology, all devices are connected along a single central cable, called the bus."
  },
  {
    id: "q_12_net_002",
    grade: 12,
    topic: "Networking",
    difficulty: "medium",
    question: "What is the port number for the Domain Name System (DNS)?",
    options: ["21", "80", "443", "53"],
    correctIndex: 3,
    explanation: "DNS services listen on port 53 (mostly UDP) to resolve names to IP addresses."
  },
  {
    id: "q_12_net_003",
    grade: 12,
    topic: "Networking",
    difficulty: "hard",
    question: "Which layer of the OSI model is responsible for routing data packets across networks?",
    options: ["Data Link Layer", "Network Layer", "Transport Layer", "Session Layer"],
    correctIndex: 1,
    explanation: "The Network Layer (Layer 3) handles routing, IP addressing, and sending packets across networks."
  },
  {
    id: "q_12_file_001",
    grade: 12,
    topic: "File Handling",
    difficulty: "easy",
    question: "Which Python function is used to open a file?",
    options: ["open()", "file()", "read()", "access()"],
    correctIndex: 0,
    explanation: "The built-in open() function in Python opens a file and returns a corresponding file object."
  },
  {
    id: "q_12_file_002",
    grade: 12,
    topic: "File Handling",
    difficulty: "medium",
    question: "In Python file handling, which mode is used to open a file for writing, appending at the end?",
    options: ["'r'", "'w'", "'a'", "'x'"],
    correctIndex: 2,
    explanation: "The 'a' mode opens a file for appending. It creates the file if it does not exist, and writes to the end of the file."
  },
  {
    id: "q_12_file_003",
    grade: 12,
    topic: "File Handling",
    difficulty: "hard",
    question: "Which Python module is used to serialize and de-serialize python objects into binary files?",
    options: ["json", "csv", "pickle", "marshal"],
    correctIndex: 2,
    explanation: "The 'pickle' module is used for serializing (pickling) and de-serializing (unpickling) python object structures to/from binary files."
  }
];
