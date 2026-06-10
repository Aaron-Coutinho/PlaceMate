"""
PlaceMate – Question Bank Seeding Script

Seeds the Firestore 'questions' collection with 20+ MCQs per subject.
Covers 5 subjects: DSA, OS, DBMS, CN, Aptitude.

Usage:
    python scripts/seed_questions.py

Requires:
    - FIREBASE_SERVICE_ACCOUNT env var set (or .env file in backend/)
    - firebase-admin installed
"""

import sys
import os
import uuid

# Add parent dir to path so we can import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.firebase_init import get_db

# ---------------------------------------------------------------------------
# Question Bank – 20 questions per subject (100 total)
# ---------------------------------------------------------------------------

QUESTIONS = [
    # ======================================================================
    # DSA (20 questions)
    # ======================================================================
    {
        "subject": "DSA",
        "topic": "Arrays",
        "question": "What is the time complexity of accessing an element in an array by index?",
        "options": ["O(1)", "O(n)", "O(log n)", "O(n²)"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DSA",
        "topic": "Arrays",
        "question": "Which algorithm is used to find the maximum subarray sum?",
        "options": [
            "Kadane's Algorithm",
            "Dijkstra's Algorithm",
            "Floyd-Warshall",
            "Bellman-Ford",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DSA",
        "topic": "Arrays",
        "question": "What is the worst-case time complexity of inserting an element at the beginning of an array?",
        "options": ["O(n)", "O(1)", "O(log n)", "O(n log n)"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DSA",
        "topic": "Linked Lists",
        "question": "What is the time complexity of inserting a node at the head of a singly linked list?",
        "options": ["O(1)", "O(n)", "O(log n)", "O(n²)"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DSA",
        "topic": "Linked Lists",
        "question": "Which data structure is best for implementing an LRU Cache?",
        "options": [
            "Doubly Linked List + HashMap",
            "Array + Stack",
            "Binary Tree",
            "Queue",
        ],
        "correct_answer": "A",
        "difficulty": "hard",
    },
    {
        "subject": "DSA",
        "topic": "Trees",
        "question": "What is the maximum number of nodes at level 'l' of a binary tree?",
        "options": ["2^l", "2^(l+1)", "l²", "2*l"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DSA",
        "topic": "Trees",
        "question": "In a Binary Search Tree, the in-order traversal gives elements in which order?",
        "options": ["Sorted ascending", "Sorted descending", "Random", "Level order"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DSA",
        "topic": "Trees",
        "question": "What is the height of a balanced BST with n nodes?",
        "options": ["O(log n)", "O(n)", "O(n²)", "O(1)"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DSA",
        "topic": "Graphs",
        "question": "Which algorithm finds the shortest path in an unweighted graph?",
        "options": ["BFS", "DFS", "Kruskal's", "Prim's"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DSA",
        "topic": "Graphs",
        "question": "What is the time complexity of BFS on a graph with V vertices and E edges?",
        "options": ["O(V + E)", "O(V²)", "O(E log V)", "O(V * E)"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DSA",
        "topic": "Graphs",
        "question": "Which algorithm is used to detect a cycle in a directed graph?",
        "options": [
            "DFS with coloring",
            "BFS only",
            "Binary Search",
            "Merge Sort",
        ],
        "correct_answer": "A",
        "difficulty": "hard",
    },
    {
        "subject": "DSA",
        "topic": "DP",
        "question": "What is the time complexity of the dynamic programming solution for the 0/1 Knapsack problem?",
        "options": ["O(n*W)", "O(n²)", "O(2^n)", "O(n log n)"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DSA",
        "topic": "DP",
        "question": "Which property must a problem have to be solvable by Dynamic Programming?",
        "options": [
            "Optimal substructure and overlapping subproblems",
            "Greedy choice property",
            "Divide and conquer only",
            "Sorted input",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DSA",
        "topic": "DP",
        "question": "The longest common subsequence (LCS) of two strings of length m and n can be found in:",
        "options": ["O(m*n)", "O(m+n)", "O(m²)", "O(2^n)"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DSA",
        "topic": "Sorting",
        "question": "Which sorting algorithm has the best average-case time complexity?",
        "options": ["Merge Sort — O(n log n)", "Bubble Sort — O(n²)", "Selection Sort — O(n²)", "Insertion Sort — O(n²)"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DSA",
        "topic": "Sorting",
        "question": "QuickSort's worst-case time complexity occurs when:",
        "options": [
            "The pivot is always the smallest/largest element",
            "The array is already sorted in correct order",
            "All elements are equal",
            "All of the above",
        ],
        "correct_answer": "D",
        "difficulty": "hard",
    },
    {
        "subject": "DSA",
        "topic": "Hashing",
        "question": "What is the average time complexity of search in a hash table?",
        "options": ["O(1)", "O(n)", "O(log n)", "O(n²)"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DSA",
        "topic": "Hashing",
        "question": "Which technique resolves hash collisions by storing multiple elements in the same bucket?",
        "options": [
            "Chaining",
            "Open Addressing",
            "Linear Probing",
            "Double Hashing",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DSA",
        "topic": "Sorting",
        "question": "Which sorting algorithm is NOT comparison-based?",
        "options": ["Counting Sort", "Merge Sort", "Quick Sort", "Heap Sort"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DSA",
        "topic": "Hashing",
        "question": "In open addressing, what happens when a collision occurs?",
        "options": [
            "The algorithm probes for the next empty slot",
            "The element is discarded",
            "A new hash table is created",
            "The element is stored in a linked list",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    # ======================================================================
    # OS (20 questions)
    # ======================================================================
    {
        "subject": "OS",
        "topic": "Processes",
        "question": "What is a process in an operating system?",
        "options": [
            "A program in execution",
            "A file on disk",
            "A CPU register",
            "A kernel module",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "OS",
        "topic": "Processes",
        "question": "Which system call creates a new process in Unix?",
        "options": ["fork()", "exec()", "wait()", "exit()"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "OS",
        "topic": "Processes",
        "question": "What is a zombie process?",
        "options": [
            "A process that has finished but still has an entry in the process table",
            "A process waiting for I/O",
            "A process with high priority",
            "A process consuming all CPU",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "OS",
        "topic": "Threads",
        "question": "What is the main advantage of threads over processes?",
        "options": [
            "Threads share memory space, making communication faster",
            "Threads are more secure",
            "Threads don't need CPU time",
            "Threads can't be preempted",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "OS",
        "topic": "Threads",
        "question": "In a multi-threaded environment, what is a race condition?",
        "options": [
            "Multiple threads accessing shared data simultaneously with at least one writing",
            "A thread running faster than others",
            "Two threads competing for CPU time",
            "A thread that never gets scheduled",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "OS",
        "topic": "Threads",
        "question": "Which model maps many user threads to one kernel thread?",
        "options": [
            "Many-to-One",
            "One-to-One",
            "Many-to-Many",
            "One-to-Many",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "OS",
        "topic": "Memory Management",
        "question": "What is virtual memory?",
        "options": [
            "A memory management technique that uses disk as an extension of RAM",
            "Extra physical RAM",
            "Cache memory",
            "Register memory",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "OS",
        "topic": "Memory Management",
        "question": "What is a page fault?",
        "options": [
            "Accessing a page not currently in physical memory",
            "A corrupted page in memory",
            "A page that is too large",
            "Writing to a read-only page",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "OS",
        "topic": "Memory Management",
        "question": "Which page replacement algorithm suffers from Belady's anomaly?",
        "options": ["FIFO", "LRU", "Optimal", "Clock"],
        "correct_answer": "A",
        "difficulty": "hard",
    },
    {
        "subject": "OS",
        "topic": "Memory Management",
        "question": "What is thrashing in an operating system?",
        "options": [
            "Excessive paging causing the system to spend more time swapping than executing",
            "A process crashing repeatedly",
            "CPU overheating",
            "Disk fragmentation",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "OS",
        "topic": "Deadlocks",
        "question": "Which of the following is NOT a necessary condition for deadlock?",
        "options": [
            "Preemption",
            "Mutual Exclusion",
            "Hold and Wait",
            "Circular Wait",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "OS",
        "topic": "Deadlocks",
        "question": "The Banker's Algorithm is used for:",
        "options": [
            "Deadlock avoidance",
            "Deadlock detection",
            "Deadlock prevention",
            "Deadlock recovery",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "OS",
        "topic": "Deadlocks",
        "question": "How many necessary conditions must hold simultaneously for a deadlock to occur?",
        "options": ["4", "2", "3", "5"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "OS",
        "topic": "Scheduling",
        "question": "Which CPU scheduling algorithm may cause starvation?",
        "options": [
            "Shortest Job First (SJF)",
            "Round Robin",
            "First Come First Serve",
            "Multilevel Queue",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "OS",
        "topic": "Scheduling",
        "question": "In Round Robin scheduling, what determines how long a process runs before being preempted?",
        "options": ["Time quantum", "Priority level", "Process size", "Arrival time"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "OS",
        "topic": "Scheduling",
        "question": "Which scheduling algorithm is optimal in terms of average waiting time?",
        "options": [
            "Shortest Job First (Non-preemptive)",
            "FCFS",
            "Round Robin",
            "Priority Scheduling",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "OS",
        "topic": "Scheduling",
        "question": "What is the convoy effect in CPU scheduling?",
        "options": [
            "Short processes wait behind a long process in FCFS",
            "All processes have equal priority",
            "Processes are executed in parallel",
            "CPU is idle while waiting for I/O",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "OS",
        "topic": "Processes",
        "question": "What is the difference between a program and a process?",
        "options": [
            "A program is passive (on disk), a process is active (in execution)",
            "They are the same thing",
            "A program uses CPU, a process uses disk",
            "A process is a type of program",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "OS",
        "topic": "Deadlocks",
        "question": "Resource Allocation Graph (RAG) is used for:",
        "options": [
            "Deadlock detection",
            "Memory allocation",
            "CPU scheduling",
            "File management",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "OS",
        "topic": "Memory Management",
        "question": "What is the difference between internal and external fragmentation?",
        "options": [
            "Internal: wasted space within allocated blocks; External: wasted space between blocks",
            "Internal occurs in paging; External occurs in segmentation only",
            "They are the same thing",
            "Internal is worse than external",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    # ======================================================================
    # DBMS (20 questions)
    # ======================================================================
    {
        "subject": "DBMS",
        "topic": "SQL",
        "question": "Which SQL clause is used to filter rows?",
        "options": ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DBMS",
        "topic": "SQL",
        "question": "What is the difference between WHERE and HAVING?",
        "options": [
            "WHERE filters rows before grouping; HAVING filters groups after aggregation",
            "They are identical",
            "WHERE works only with JOINs",
            "HAVING is used before GROUP BY",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DBMS",
        "topic": "SQL",
        "question": "Which SQL statement is used to remove all rows from a table without logging individual row deletions?",
        "options": ["TRUNCATE", "DELETE", "DROP", "REMOVE"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DBMS",
        "topic": "SQL",
        "question": "Which type of JOIN returns all rows from both tables, matching where possible?",
        "options": ["FULL OUTER JOIN", "INNER JOIN", "LEFT JOIN", "CROSS JOIN"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DBMS",
        "topic": "Normalization",
        "question": "What is the primary goal of database normalization?",
        "options": [
            "Reduce data redundancy and anomalies",
            "Increase query speed",
            "Add more tables",
            "Remove indexes",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DBMS",
        "topic": "Normalization",
        "question": "A relation is in 3NF if it is in 2NF and has no:",
        "options": [
            "Transitive dependencies",
            "Partial dependencies",
            "Functional dependencies",
            "Candidate keys",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DBMS",
        "topic": "Normalization",
        "question": "BCNF is stricter than 3NF because:",
        "options": [
            "Every determinant must be a candidate key",
            "It removes all functional dependencies",
            "It allows partial dependencies",
            "It requires composite keys",
        ],
        "correct_answer": "A",
        "difficulty": "hard",
    },
    {
        "subject": "DBMS",
        "topic": "Normalization",
        "question": "What is denormalization?",
        "options": [
            "Adding redundancy back to improve read performance",
            "Removing all tables",
            "Converting to NoSQL",
            "Dropping all indexes",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DBMS",
        "topic": "Transactions",
        "question": "What does the 'A' in ACID stand for?",
        "options": ["Atomicity", "Availability", "Authentication", "Aggregation"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DBMS",
        "topic": "Transactions",
        "question": "Which isolation level prevents dirty reads but allows non-repeatable reads?",
        "options": [
            "Read Committed",
            "Read Uncommitted",
            "Repeatable Read",
            "Serializable",
        ],
        "correct_answer": "A",
        "difficulty": "hard",
    },
    {
        "subject": "DBMS",
        "topic": "Transactions",
        "question": "What is a dirty read?",
        "options": [
            "Reading data written by an uncommitted transaction",
            "Reading corrupted data",
            "Reading stale cache data",
            "Reading data from a dropped table",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DBMS",
        "topic": "Transactions",
        "question": "Two-Phase Locking (2PL) ensures:",
        "options": [
            "Serializability of transactions",
            "Deadlock prevention",
            "Faster query execution",
            "Data encryption",
        ],
        "correct_answer": "A",
        "difficulty": "hard",
    },
    {
        "subject": "DBMS",
        "topic": "Indexing",
        "question": "What data structure is most commonly used for database indexes?",
        "options": ["B+ Tree", "Hash Table", "Array", "Linked List"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DBMS",
        "topic": "Indexing",
        "question": "What is a clustered index?",
        "options": [
            "An index that determines the physical order of data in a table",
            "An index on multiple columns",
            "A secondary index",
            "An index on a view",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DBMS",
        "topic": "Indexing",
        "question": "How many clustered indexes can a table have?",
        "options": ["1", "2", "Unlimited", "0"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DBMS",
        "topic": "ER Models",
        "question": "In an ER diagram, a diamond shape represents:",
        "options": [
            "A relationship",
            "An entity",
            "An attribute",
            "A primary key",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DBMS",
        "topic": "ER Models",
        "question": "What is a weak entity?",
        "options": [
            "An entity that cannot be uniquely identified by its own attributes alone",
            "An entity with no attributes",
            "An entity with only one attribute",
            "A deprecated entity",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "DBMS",
        "topic": "ER Models",
        "question": "What type of relationship exists when one entity is associated with many entities of another type?",
        "options": ["One-to-Many", "One-to-One", "Many-to-Many", "Self-referential"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DBMS",
        "topic": "SQL",
        "question": "What is a subquery?",
        "options": [
            "A query nested inside another query",
            "A backup query",
            "A query that runs automatically",
            "A query on a temporary table only",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "DBMS",
        "topic": "Indexing",
        "question": "Which of the following queries would benefit most from an index?",
        "options": [
            "SELECT * FROM users WHERE email = 'x@y.com'",
            "SELECT * FROM users",
            "INSERT INTO users VALUES (...)",
            "DELETE FROM users",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    # ======================================================================
    # CN (20 questions)
    # ======================================================================
    {
        "subject": "CN",
        "topic": "OSI Model",
        "question": "How many layers are in the OSI model?",
        "options": ["7", "5", "4", "6"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "CN",
        "topic": "OSI Model",
        "question": "Which OSI layer is responsible for routing?",
        "options": ["Network", "Transport", "Data Link", "Session"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "CN",
        "topic": "OSI Model",
        "question": "Which layer handles encryption and data compression?",
        "options": ["Presentation", "Session", "Application", "Transport"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "CN",
        "topic": "OSI Model",
        "question": "The Data Link layer is divided into which two sub-layers?",
        "options": [
            "LLC and MAC",
            "IP and TCP",
            "HTTP and FTP",
            "ARP and RARP",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "CN",
        "topic": "TCP/IP",
        "question": "Which protocol provides reliable, connection-oriented communication?",
        "options": ["TCP", "UDP", "ICMP", "ARP"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "CN",
        "topic": "TCP/IP",
        "question": "What is the three-way handshake in TCP?",
        "options": [
            "SYN → SYN-ACK → ACK",
            "ACK → SYN → FIN",
            "SYN → ACK → DATA",
            "FIN → ACK → RST",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "CN",
        "topic": "TCP/IP",
        "question": "Which transport layer protocol is used for video streaming?",
        "options": ["UDP", "TCP", "SCTP", "DCCP"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "CN",
        "topic": "TCP/IP",
        "question": "What is the main difference between TCP and UDP?",
        "options": [
            "TCP is connection-oriented and reliable; UDP is connectionless and faster",
            "UDP is more reliable than TCP",
            "TCP is faster than UDP",
            "They are identical",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "CN",
        "topic": "DNS",
        "question": "What does DNS stand for?",
        "options": [
            "Domain Name System",
            "Data Network Service",
            "Dynamic Name Server",
            "Distributed Network System",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "CN",
        "topic": "DNS",
        "question": "DNS primarily uses which transport protocol?",
        "options": ["UDP", "TCP", "HTTP", "FTP"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "CN",
        "topic": "DNS",
        "question": "What type of DNS record maps a domain name to an IP address?",
        "options": ["A Record", "CNAME Record", "MX Record", "PTR Record"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "CN",
        "topic": "HTTP",
        "question": "Which HTTP status code indicates 'Not Found'?",
        "options": ["404", "200", "500", "301"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "CN",
        "topic": "HTTP",
        "question": "What is the difference between HTTP and HTTPS?",
        "options": [
            "HTTPS uses TLS/SSL for encryption",
            "HTTP is faster",
            "HTTPS uses UDP",
            "They are identical",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "CN",
        "topic": "HTTP",
        "question": "Which HTTP method is idempotent?",
        "options": ["GET", "POST", "PATCH", "CONNECT"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "CN",
        "topic": "Routing",
        "question": "Which routing protocol uses the Bellman-Ford algorithm?",
        "options": ["RIP", "OSPF", "BGP", "EIGRP"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "CN",
        "topic": "Routing",
        "question": "What is the default gateway?",
        "options": [
            "The router that forwards traffic to external networks",
            "The fastest path to the server",
            "A firewall rule",
            "The DNS server",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "CN",
        "topic": "Routing",
        "question": "OSPF is classified as which type of routing protocol?",
        "options": [
            "Link-State",
            "Distance-Vector",
            "Path-Vector",
            "Hybrid",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "CN",
        "topic": "Subnetting",
        "question": "How many usable host addresses are in a /24 subnet?",
        "options": ["254", "256", "255", "252"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "CN",
        "topic": "Subnetting",
        "question": "What is the subnet mask for a /26 network?",
        "options": [
            "255.255.255.192",
            "255.255.255.128",
            "255.255.255.224",
            "255.255.255.240",
        ],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "CN",
        "topic": "Subnetting",
        "question": "CIDR stands for:",
        "options": [
            "Classless Inter-Domain Routing",
            "Centralized Internet Data Routing",
            "Common Internet Distribution Resource",
            "Classified Internal Domain Registry",
        ],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    # ======================================================================
    # Aptitude (20 questions)
    # ======================================================================
    {
        "subject": "Aptitude",
        "topic": "Number Systems",
        "question": "What is the binary representation of decimal 13?",
        "options": ["1101", "1011", "1110", "1001"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "Aptitude",
        "topic": "Number Systems",
        "question": "Convert hexadecimal 'FF' to decimal:",
        "options": ["255", "256", "127", "511"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "Aptitude",
        "topic": "Number Systems",
        "question": "What is the octal representation of binary 110101?",
        "options": ["65", "53", "35", "63"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "Aptitude",
        "topic": "Number Systems",
        "question": "The 2's complement of binary 0110 (4-bit) is:",
        "options": ["1010", "1001", "0110", "1110"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "Aptitude",
        "topic": "Probability",
        "question": "What is the probability of getting heads when flipping a fair coin?",
        "options": ["1/2", "1/4", "1/3", "2/3"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "Aptitude",
        "topic": "Probability",
        "question": "Two dice are thrown. What is the probability that the sum is 7?",
        "options": ["6/36", "5/36", "7/36", "1/6"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "Aptitude",
        "topic": "Probability",
        "question": "If P(A) = 0.4 and P(B) = 0.3, and A and B are independent, what is P(A ∩ B)?",
        "options": ["0.12", "0.7", "0.1", "0.3"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "Aptitude",
        "topic": "Probability",
        "question": "A bag has 3 red and 5 blue balls. What is the probability of drawing a red ball?",
        "options": ["3/8", "5/8", "1/3", "1/2"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "Aptitude",
        "topic": "Time & Work",
        "question": "A can do a piece of work in 10 days, B in 15 days. How many days will they take together?",
        "options": ["6", "5", "7", "8"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "Aptitude",
        "topic": "Time & Work",
        "question": "If 5 men can do a job in 20 days, how many days will 10 men take?",
        "options": ["10", "15", "20", "5"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "Aptitude",
        "topic": "Time & Work",
        "question": "A can complete work in 12 days. B is 50% more efficient. How long does B take?",
        "options": ["8 days", "6 days", "10 days", "9 days"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "Aptitude",
        "topic": "Time & Work",
        "question": "A pipe fills a tank in 6 hours. A drain empties it in 12 hours. How long to fill with both open?",
        "options": ["12 hours", "8 hours", "6 hours", "18 hours"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "Aptitude",
        "topic": "Permutations",
        "question": "How many ways can 4 books be arranged on a shelf?",
        "options": ["24", "12", "16", "8"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "Aptitude",
        "topic": "Permutations",
        "question": "How many 3-letter words can be formed from ABCDE without repetition?",
        "options": ["60", "120", "20", "10"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "Aptitude",
        "topic": "Permutations",
        "question": "In how many ways can 5 people sit around a circular table?",
        "options": ["24", "120", "60", "12"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "Aptitude",
        "topic": "Permutations",
        "question": "The number of combinations of choosing 3 from 7 items is:",
        "options": ["35", "21", "42", "210"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "Aptitude",
        "topic": "Number Systems",
        "question": "What is the LCM of 12 and 18?",
        "options": ["36", "72", "24", "48"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "Aptitude",
        "topic": "Probability",
        "question": "In how many ways can a committee of 3 be selected from 8 people?",
        "options": ["56", "336", "24", "120"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
    {
        "subject": "Aptitude",
        "topic": "Time & Work",
        "question": "A and B together earn ₹1200 per week. A earns ₹200 more than B. What does A earn?",
        "options": ["₹700", "₹600", "₹800", "₹500"],
        "correct_answer": "A",
        "difficulty": "easy",
    },
    {
        "subject": "Aptitude",
        "topic": "Permutations",
        "question": "How many distinct permutations of the word 'BOOK'?",
        "options": ["12", "24", "6", "4"],
        "correct_answer": "A",
        "difficulty": "medium",
    },
]


def seed():
    """Upload all questions to Firestore."""
    db = get_db()
    batch = db.batch()
    count = 0

    for q in QUESTIONS:
        doc_id = str(uuid.uuid4())
        doc_ref = db.collection("questions").document(doc_id)
        batch.set(doc_ref, q)
        count += 1

        # Firestore batches support max 500 writes
        if count % 400 == 0:
            batch.commit()
            batch = db.batch()

    # Commit remaining
    batch.commit()
    print(f"✅ Seeded {count} questions to Firestore!")

    # Print summary by subject
    from collections import Counter

    subject_counts = Counter(q["subject"] for q in QUESTIONS)
    for subject, num in sorted(subject_counts.items()):
        print(f"   {subject}: {num} questions")


if __name__ == "__main__":
    seed()
