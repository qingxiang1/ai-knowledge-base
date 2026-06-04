/**
 * 文件描述: API 服务层，封装与后端产品经理 Copilot 的通信
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { PRDRequest, PRDResponse, CompetitorRequest, CompetitorResponse } from '../types';

const API_BASE = '/api';

/**
 * 生成 PRD
 */
export async function generatePRD(request: PRDRequest): Promise<PRDResponse> {
  const response = await fetch(`${API_BASE}/prd`, {
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

/**
 * 生成用户故事
 */
export async function generateUserStories(feature: string, context?: string) {
  const response = await fetch(`${API_BASE}/user-stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature, context }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '生成失败');
  }

  return response.json();
}

/**
 * 竞品分析
 */
export async function analyzeCompetitors(request: CompetitorRequest): Promise<CompetitorResponse> {
  const response = await fetch(`${API_BASE}/competitor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '分析失败');
  }

  return response.json();
}
