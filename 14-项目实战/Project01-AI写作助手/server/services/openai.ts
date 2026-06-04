import OpenAI from 'openai';
import { WritingRequest, WritingResponse, WritingAction, WritingStyle } from '../../src/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildPrompt(request: WritingRequest): { system: string; user: string } {
  const styleMap: Record<WritingStyle, string> = {
    [WritingStyle.FORMAL]: '正式、严谨',
    [WritingStyle.CASUAL]: '轻松、口语化',
    [WritingStyle.ACADEMIC]: '学术、专业',
    [WritingStyle.CREATIVE]: '富有创意、生动',
    [WritingStyle.BUSINESS]: '商务、简洁',
  };

  const actionMap: Record<WritingAction, string> = {
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

export async function generateText(request: WritingRequest): Promise<WritingResponse> {
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
