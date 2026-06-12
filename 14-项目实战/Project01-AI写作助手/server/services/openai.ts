/**
 * 创建时间: 2026-06-12
 * 文件名: openai.ts
 * 文件描述: Project01 企业级写作工作流 AI 草稿生成服务，支持真实模型与 mock 降级
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-12
 */

import OpenAI from 'openai';

export const writingStyles = ['formal', 'casual', 'academic', 'creative', 'business'] as const;
export const writingActions = ['generate', 'continue', 'polish', 'shorten', 'expand'] as const;

export type WritingStyle = (typeof writingStyles)[number];
export type WritingAction = (typeof writingActions)[number];

export interface EnterpriseDraftGenerationRequest {
  title: string;
  brief: string;
  templateName: string;
  channel: string;
  style: WritingStyle;
  action: WritingAction;
}

export interface AIWritingResponse {
  result: string;
  tokensUsed: number;
  model: string;
}

const isMockMode = !process.env.OPENAI_API_KEY;

/**
 * 获取 OpenAI 客户端实例
 * @returns OpenAI 客户端
 */
function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * 构建企业草稿提示词
 * @param request 生成请求
 * @returns 系统提示词和用户提示词
 */
function buildEnterprisePrompt(
  request: EnterpriseDraftGenerationRequest,
): { system: string; user: string } {
  const styleDescriptions: Record<WritingStyle, string> = {
    formal: '正式、稳健、适合企业公告和外部沟通',
    casual: '自然、轻松，但仍保持专业边界',
    academic: '结构严谨、论证充分、用词专业',
    creative: '表达新颖、节奏生动、易于传播',
    business: '商务、清晰、强调价值和行动指引',
  };

  const actionDescriptions: Record<WritingAction, string> = {
    generate: '从零生成一份完整企业内容草稿',
    continue: '在现有意图上继续扩写内容',
    polish: '润色现有表达并提升专业度',
    shorten: '保留重点并压缩篇幅',
    expand: '补充细节和论证，增强说服力',
  };

  return {
    system:
      '你是一名企业内容运营专家。请严格输出适合企业内部工作流的中文内容，结构清晰、可直接进入审核流程。输出中必须包含标题、摘要、正文、审核重点、发布建议五个部分。',
    user: `请基于以下信息生成企业内容草稿。
标题：${request.title}
模板：${request.templateName}
发布渠道：${request.channel}
写作风格：${styleDescriptions[request.style]}
写作动作：${actionDescriptions[request.action]}
业务摘要：${request.brief}`,
  };
}

/**
 * 生成 mock 企业草稿
 * @param request 生成请求
 * @returns 模拟草稿响应
 */
function generateMockResponse(request: EnterpriseDraftGenerationRequest): AIWritingResponse {
  const result = `# ${request.title}

## 摘要
本草稿基于「${request.templateName}」模板生成，面向 ${request.channel} 渠道发布，目标是围绕以下业务背景完成对外表达：${request.brief}

## 正文
各位同事/客户您好：

围绕本次主题，我们完成了新一轮内容升级。本次内容重点聚焦三个方面：
1. 清晰说明业务变化和核心收益，便于快速理解价值。
2. 用企业级表达确保信息准确、可审核、可追踪。
3. 为后续发布和扩展集成预留结构化空间。

结合当前场景，建议在正式发布前重点核查品牌用语、客户收益表达和行动指引的一致性。若进入外部渠道，请额外补充发布日期、适用范围和客服承接方式。

## 审核重点
- 品牌与合规措辞是否统一
- 是否明确传达了目标受众、核心收益和下一步动作
- 是否存在需要业务负责人确认的表述

## 发布建议
- 先由审核人确认品牌和风险表达
- 通过后在内部模拟发布，确认展示结构无误
- 后续可直接接入 CMS、邮件系统或 CRM 触达链路`;

  return {
    result,
    tokensUsed: Math.max(280, request.brief.length * 3),
    model: isMockMode ? 'mock-enterprise-writer' : 'gpt-4',
  };
}

/**
 * 生成企业草稿文本
 * @param request 生成请求
 * @returns 草稿响应
 */
export async function generateEnterpriseDraft(
  request: EnterpriseDraftGenerationRequest,
): Promise<AIWritingResponse> {
  if (isMockMode) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return generateMockResponse(request);
  }

  const openai = getOpenAIClient();
  const { system, user } = buildEnterprisePrompt(request);
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: request.style === 'creative' ? 0.85 : 0.55,
    max_tokens: 1800,
  });

  return {
    result: completion.choices[0]?.message?.content || '',
    tokensUsed: completion.usage?.total_tokens || 0,
    model: 'gpt-4',
  };
}
