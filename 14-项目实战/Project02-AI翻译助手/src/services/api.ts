/**
 * 文件描述: API 服务层，封装与后端的通信
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { TranslateRequest, TranslateResponse } from '../types';

const API_BASE = '/api';

/**
 * 翻译文本
 * @param request 翻译请求参数
 * @returns 翻译响应
 */
export async function translateText(request: TranslateRequest): Promise<TranslateResponse> {
  const response = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || '翻译失败');
  }

  return response.json();
}
