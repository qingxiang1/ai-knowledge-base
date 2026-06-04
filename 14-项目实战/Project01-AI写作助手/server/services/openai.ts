/**
 * 文件描述: OpenAI 服务封装，支持真实 API 调用与 mock 降级
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import OpenAI from 'openai';

/** 写作风格枚举 */
const WritingStyle = {
  FORMAL: 'formal',
  CASUAL: 'casual',
  ACADEMIC: 'academic',
  CREATIVE: 'creative',
  BUSINESS: 'business',
} as const;

/** 写作操作类型枚举 */
const WritingAction = {
  GENERATE: 'generate',
  CONTINUE: 'continue',
  POLISH: 'polish',
  SHORTEN: 'shorten',
  EXPAND: 'expand',
} as const;

type WritingStyleType = (typeof WritingStyle)[keyof typeof WritingStyle];
type WritingActionType = (typeof WritingAction)[keyof typeof WritingAction];

interface WritingRequest {
  content: string;
  style: WritingStyleType;
  action: WritingActionType;
  temperature?: number;
}

interface WritingResponse {
  result: string;
  tokens_used: number;
  model: string;
}

const isMockMode = !process.env.OPENAI_API_KEY;

/**
 * 获取 OpenAI 客户端实例（延迟初始化）
 * @returns OpenAI 客户端
 */
function getOpenAIClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * 构建写作提示词
 * @param request 写作请求参数
 * @returns 系统提示和用户提示
 */
function buildPrompt(request: WritingRequest): { system: string; user: string } {
  const styleMap: Record<string, string> = {
    [WritingStyle.FORMAL]: '正式、严谨',
    [WritingStyle.CASUAL]: '轻松、口语化',
    [WritingStyle.ACADEMIC]: '学术、专业',
    [WritingStyle.CREATIVE]: '富有创意、生动',
    [WritingStyle.BUSINESS]: '商务、简洁',
  };

  const actionMap: Record<string, string> = {
    [WritingAction.GENERATE]: `根据以下主题或关键词，生成一篇${styleMap[request.style]}风格的文章。要求结构清晰、内容充实。`,
    [WritingAction.CONTINUE]: `基于以下内容，继续${styleMap[request.style]}风格写作。保持上下文连贯，自然延伸。`,
    [WritingAction.POLISH]: `对以下内容进行润色优化。保持${styleMap[request.style]}风格，提升表达质量，修正语法错误。`,
    [WritingAction.SHORTEN]: `将以下内容精简压缩。保留核心信息，去除冗余表达，保持${styleMap[request.style]}风格。`,
    [WritingAction.EXPAND]: `对以下内容进行扩展丰富。增加细节、例子或论证，保持${styleMap[request.style]}风格。`,
  };

  return {
    system: '你是一位专业的写作助手，擅长根据用户需求生成高质量的文本内容。请用中文回复。',
    user: `${actionMap[request.action]}\n\n${request.content}`,
  };
}

/**
 * 生成 mock 写作响应
 * @param request 写作请求参数
 * @returns 模拟的写作响应
 */
function generateMockResponse(request: WritingRequest): WritingResponse {
  const styleMap: Record<string, string> = {
    [WritingStyle.FORMAL]: '正式',
    [WritingStyle.CASUAL]: '轻松',
    [WritingStyle.ACADEMIC]: '学术',
    [WritingStyle.CREATIVE]: '创意',
    [WritingStyle.BUSINESS]: '商务',
  };

  const actionMap: Record<string, string> = {
    [WritingAction.GENERATE]: '生成',
    [WritingAction.CONTINUE]: '续写',
    [WritingAction.POLISH]: '润色',
    [WritingAction.SHORTEN]: '精简',
    [WritingAction.EXPAND]: '扩展',
  };

  const mockResults: Record<string, string> = {
    [WritingAction.GENERATE]: `# ${request.content}\n\n在当今快速发展的时代，${request.content}已经成为不可忽视的重要话题。\n\n## 背景与现状\n\n随着技术的不断进步和社会的持续发展，${request.content}所涉及的领域正在经历深刻的变革。从宏观层面来看，这一变化不仅影响着行业格局，也深刻改变了人们的生活方式。\n\n## 核心要点\n\n首先，我们需要认识到${request.content}的核心价值。它不仅仅是一个概念，更是推动创新和进步的重要力量。在实践中，我们可以从以下几个维度来理解：\n\n1. **技术驱动**：新技术的应用为${request.content}提供了强大的支撑\n2. **用户需求**：市场对${request.content}的需求持续增长\n3. **生态构建**：围绕${request.content}的生态系统正在逐步完善\n\n## 展望未来\n\n展望未来，${request.content}将继续发挥重要作用。我们需要保持开放的心态，积极拥抱变化，共同推动这一领域的发展。`,
    [WritingAction.CONTINUE]: `${request.content}\n\n在此基础上，我们可以进一步探讨其深远影响。从实践角度来看，这一趋势将持续发展，并带来更多可能性。\n\n首先，技术的不断演进为后续发展奠定了坚实基础。其次，用户需求的多样化也催生了更多创新方向。最后，行业协作的加强将推动整个生态的繁荣。\n\n综上所述，我们有理由相信，未来的发展将更加值得期待。`,
    [WritingAction.POLISH]: `经过润色优化的内容：\n\n${request.content}\n\n> 注：在 mock 模式下，润色功能仅返回原文。配置 OPENAI_API_KEY 后可获得真实的润色效果。`,
    [WritingAction.SHORTEN]: `精简后的核心内容：\n\n${request.content.slice(0, Math.ceil(request.content.length * 0.6))}\n\n> 注：在 mock 模式下，精简功能仅截取部分内容。配置 OPENAI_API_KEY 后可获得真实的精简效果。`,
    [WritingAction.EXPAND]: `## 扩展内容\n\n${request.content}\n\n### 详细分析\n\n针对上述内容，我们可以从多个角度进行深入分析：\n\n**技术角度**：从技术实现层面来看，这涉及到系统架构设计、性能优化和可扩展性等多个方面。\n\n**业务角度**：从业务价值层面来看，这直接关系到用户体验、运营效率和商业模式的创新。\n\n**用户角度**：从用户需求层面来看，这反映了市场对更高效、更智能解决方案的迫切需求。\n\n### 实践建议\n\n1. 建立清晰的目标和衡量指标\n2. 采用迭代式开发方法\n3. 重视用户反馈和数据驱动决策`,
  };

  return {
    result: mockResults[request.action] || `【${styleMap[request.style]}风格·${actionMap[request.action]}】${request.content}`,
    tokens_used: Math.floor(Math.random() * 500) + 200,
    model: isMockMode ? 'mock-mode' : 'gpt-4',
  };
}

/**
 * 生成文本（支持 OpenAI API 和 mock 降级）
 * @param request 写作请求参数
 * @returns 写作响应
 */
export async function generateText(request: WritingRequest): Promise<WritingResponse> {
  if (isMockMode) {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200));
    return generateMockResponse(request);
  }

  const openai = getOpenAIClient();
  const { system, user } = buildPrompt(request);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: request.temperature ?? 0.7,
    max_tokens: 2000,
  });

  const result = completion.choices[0]?.message?.content || '';
  const tokens_used = completion.usage?.total_tokens || 0;

  return {
    result,
    tokens_used,
    model: 'gpt-4',
  };
}
