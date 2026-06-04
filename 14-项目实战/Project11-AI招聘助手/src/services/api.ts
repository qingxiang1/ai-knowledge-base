/**
 * 文件描述: API 服务层，封装与后端招聘助手服务的通信
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { ResumeEvaluateRequest, ResumeEvaluateResponse, InterviewQuestionsRequest, InterviewQuestionsResponse } from '../types';

const API_BASE = '/api';

/**
 * 生成岗位描述
 */
export async function generateJobDescription(data: { title: string; department?: string; requirements?: string[]; responsibilities?: string[] }) {
  const response = await fetch(`${API_BASE}/job-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '生成失败');
  }

  return response.json();
}

/**
 * 简历筛选
 */
export async function screenResume(data: { resume: string; jobTitle?: string; criteria?: string }) {
  const response = await fetch(`${API_BASE}/screen-resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '筛选失败');
  }

  return response.json();
}

/**
 * 评估简历
 */
export async function evaluateResume(request: ResumeEvaluateRequest): Promise<ResumeEvaluateResponse> {
  const response = await fetch(`${API_BASE}/evaluate-resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '评估失败');
  }

  return response.json();
}

/**
 * 生成面试问题
 */
export async function generateInterviewQuestions(request: InterviewQuestionsRequest): Promise<InterviewQuestionsResponse> {
  const response = await fetch(`${API_BASE}/interview-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '生成失败');
  }

  return response.json();
}
