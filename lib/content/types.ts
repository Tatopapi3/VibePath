export interface LessonCard {
  title: string;
  body: string;
  code?: string;
  language?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface TestCase {
  id: string;
  description: string;
  input?: string;
  expected: string;
}

export interface LessonContent { cards: LessonCard[]; }
export interface QuizContent { questions: QuizQuestion[]; }
export interface ChallengeContent {
  description: string;
  instructions: string;
  starterCode: string;
  language: string;
  testCases: TestCase[];
  hints?: string[];
}
export interface ReviewContent {
  summary: string;
  keyPoints: string[];
  questions: QuizQuestion[];
}

export type NodeContent = LessonContent | QuizContent | ChallengeContent | ReviewContent;
export type NodeType = "lesson" | "quiz" | "challenge" | "review";

export interface Language {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  display_order: number;
  description: string;
}

export interface Unit {
  id: string;
  language_id: string;
  title: string;
  display_order: number;
  color: string;
  description: string;
}

export interface Lesson {
  id: string;
  unit_id: string;
  title: string;
  type: NodeType;
  content_json: NodeContent;
  display_order: number;
  xp_reward: number;
  coin_reward: number;
}

export interface UserProgress {
  id: string;
  device_id: string;
  lesson_id: string;
  completed: boolean;
  score?: number;
  completed_at?: string;
}
