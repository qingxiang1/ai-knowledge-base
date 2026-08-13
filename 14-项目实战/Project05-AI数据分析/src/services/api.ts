/**
 * 创建时间: 2026-06-03
 * 文件名: api.ts
 * 文件描述: API 服务层，封装与后端数据分析服务的通信（分析 / 示例数据）
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

import { AnalysisRequest, AnalysisResponse, SampleInfo } from '../types';

const API_BASE = '/api';

/**
 * 分析数据
 * @param request 数据与分析类型
 * @returns 真实统计结果
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

/**
 * 获取内置示例数据集与当前运行模式
 * @returns 模式与示例列表
 */
export async function fetchSamples(): Promise<{ mode: 'mock' | 'api'; samples: SampleInfo[] }> {
  const response = await fetch(`${API_BASE}/samples`);
  if (!response.ok) throw new Error('获取示例失败');
  return response.json();
}
