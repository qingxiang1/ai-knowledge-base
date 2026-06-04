/**
 * 文件描述: API 服务层，封装与后端销售助手服务的通信
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { SalesScriptRequest, SalesScriptResponse, CustomerProfileRequest, CustomerProfileResponse } from '../types';

const API_BASE = '/api';

/**
 * 生成销售话术
 */
export async function generateSalesScript(request: SalesScriptRequest): Promise<SalesScriptResponse> {
  const response = await fetch(`${API_BASE}/script`, {
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
 * 客户分析
 */
export async function analyzeCustomerProfile(request: CustomerProfileRequest): Promise<CustomerProfileResponse> {
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
