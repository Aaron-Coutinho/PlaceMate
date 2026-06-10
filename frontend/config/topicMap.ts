/**
 * PlaceMate – Topic Map Configuration
 *
 * Predefined mapping of subjects to their sub-topics.
 * Used in topic selection UI after weak subjects are identified.
 */

export const TOPIC_MAP: Record<string, string[]> = {
  DSA: [
    "Arrays",
    "Linked Lists",
    "Trees",
    "Graphs",
    "DP",
    "Sorting",
    "Hashing",
  ],
  OS: [
    "Processes",
    "Threads",
    "Memory Management",
    "Deadlocks",
    "Scheduling",
  ],
  DBMS: [
    "SQL",
    "Normalization",
    "Transactions",
    "Indexing",
    "ER Models",
  ],
  CN: [
    "OSI Model",
    "TCP/IP",
    "DNS",
    "HTTP",
    "Routing",
    "Subnetting",
  ],
  Aptitude: [
    "Number Systems",
    "Probability",
    "Time & Work",
    "Permutations",
  ],
};

export const SUBJECTS = Object.keys(TOPIC_MAP);
