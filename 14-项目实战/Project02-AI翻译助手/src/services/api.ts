/**
 * 创建时间: 2026-06-03
 * 文件名: api.ts
 * 文件描述: Project02 AI 翻译助手 API 服务层，封装与后端的通信
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

import { DetectResponse, TranslateRequest, TranslateResponse } from "../types";

const API_BASE = "/api";

/**
 * 统一处理响应并抛出可读错误
 * @param response Fetch 响应对象
 * @returns 解析后的 JSON 数据
 */
async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "请求失败");
  }
  return response.json() as Promise<T>;
}

/**
 * 翻译文本
 * @param request 翻译请求参数
 * @returns 翻译响应
 */
export async function translateText(
  request: TranslateRequest,
): Promise<TranslateResponse> {
  const response = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseJson<TranslateResponse>(response);
}

/**
 * 识别文本语言
 * @param text 待识别文本
 * @returns 识别响应
 */
export async function detectLanguage(text: string): Promise<DetectResponse> {
  const response = await fetch(`${API_BASE}/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return parseJson<DetectResponse>(response);
}
