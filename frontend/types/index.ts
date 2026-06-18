/**
 * PlaceMate – Shared TypeScript Types
 *
 * Mirrors the backend Pydantic schemas for type-safe frontend development.
 */

// ---------------------------------------------------------------------------
// Assessment Test
// ---------------------------------------------------------------------------

export type Subject = "DSA" | "OS" | "DBMS" | "CN" | "Aptitude";
export type Difficulty = "easy" | "medium" | "hard";

export interface Question {
  id: string;
  subject: Subject;
  topic: string;
  question: string;
  options: string[];
  difficulty: Difficulty;
}

export interface SubjectScore {
  subject: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface TestResult {
  test_id: string;
  subject_scores: SubjectScore[];
  overall_percentage: number;
  weak_subjects: string[];
}

export interface AnswerSubmission {
  answers: Record<string, string>; // question_id -> selected option
}

// ---------------------------------------------------------------------------
// Study Plan
// ---------------------------------------------------------------------------

export interface PlanConfig {
  weak_subjects: string[];
  topics: string[];
  /** @min 1 @max 390 */
  days: number;
  hours_per_day: number;
}

export interface DayPlan {
  day: number;
  subject: string;
  topics: string[];
  learning_objectives: string[];
  notes_summary: string;
  youtube_search_query: string;
}

export interface PlanResponse {
  plan_id: string;
  days: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Day Content
// ---------------------------------------------------------------------------

export interface VideoResource {
  title: string;
  video_id: string;
  thumbnail: string;
  channel: string;
}

export interface MCQQuestion {
  question: string;
  options: string[];
  correct: string;
  explanation: string;
}

export interface DayContent {
  day_number: number;
  subject: string;
  topics: string[];
  notes: string;
  videos: VideoResource[];
  mcqs: MCQQuestion[];
  is_unlocked: boolean;
  is_completed: boolean;
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export interface UserProgress {
  current_plan_id: string | null;
  total_days: number;
  days_completed: number;
  completion_percentage: number;
  mcq_scores: Record<string, string>;
  last_active: string | null;
}

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  created_at: string | null;
  current_plan_id: string | null;
}
