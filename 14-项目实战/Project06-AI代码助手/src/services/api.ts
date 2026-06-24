/**
 * 创建时间: 2026-06-03
 * 文件名: api.ts
 * 文件描述: API 服务层，封装与后端代码助手服务的通信
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

import { CodeRequest, CodeResponse } from '../types';

const API_BASE = '/api';

/**
 * 处理代码请求（生成 / 解释 / 优化 / 修复）
 * @param request 请求参数
 * @returns 处理结果
 */
export async function generateCode(request: CodeRequest): Promise<CodeResponse> {
  const response = await fetch(`${API_BASE}/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '处理失败');
  }

  return response.json();
}
