/**
 * 简历评估请求
 */
export interface ResumeEvaluateRequest {
  resume: string;
  jobDescription: string;
}

/**
 * 简历评估响应
 */
export interface ResumeEvaluateResponse {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  matchDetails: Array<{
    skill: string;
    matched: boolean;
    level?: string;
  }>;
}

/**
 * 面试问题生成请求
 */
export interface InterviewQuestionsRequest {
  jobTitle: string;
  jobDescription: string;
  questionTypes: string[];
  count?: number;
}

/**
 * 面试问题响应
 */
export interface InterviewQuestionsResponse {
  questions: Array<{
    type: string;
    question: string;
    purpose: string;
  }>;
}
