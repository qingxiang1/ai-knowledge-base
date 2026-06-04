/**
 * 文件描述: API 服务层，封装与后端数据分析服务的通信
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { AnalysisRequest, AnalysisResponse } from '../types';

const API_BASE = '/api';

/**
 * 分析数据
 */
export async function analyzeData(request: AnalysisRequest): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE}/analyze`, {
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
