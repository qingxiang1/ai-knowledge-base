/**
 * 文件描述: API 服务层，封装与后端代码助手服务的通信
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { CodeRequest, CodeResponse } from '../types';

const API_BASE = '/api';

/**
 * 生成代码
 */
export async function generateCode(request: CodeRequest): Promise<CodeResponse> {
  const response = await fetch(`${API_BASE}/code`, {
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
