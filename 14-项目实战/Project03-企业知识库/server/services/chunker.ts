/**
 * 创建时间: 2026-06-14
 * 文件名: chunker.ts
 * 文件描述: Project03 企业知识库文本切片服务，将文档正文切分为适合检索的段落
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

const MAX_CHUNK_LENGTH = 240;

/**
 * 将过长的段落按句子边界二次切分到目标长度附近
 * @param paragraph 原始段落
 * @returns 切分后的段落数组
 */
function splitLongParagraph(paragraph: string): string[] {
  if (paragraph.length <= MAX_CHUNK_LENGTH) {
    return [paragraph];
  }

  // 按中英文句末标点切句，保留分隔符
  const sentences = paragraph.split(/(?<=[。！？!?;；\n])/);
  const chunks: string[] = [];
  let buffer = "";

  for (const sentence of sentences) {
    if ((buffer + sentence).length > MAX_CHUNK_LENGTH && buffer) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer += sentence;
    }
  }

  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }

  return chunks;
}

/**
 * 将文档正文切分为段落级切片
 * @param text 文档纯文本
 * @returns 切片文本数组（已去除空白片段）
 */
export function chunkText(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  // 先按空行分段，再对长段落二次切分
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const paragraph of paragraphs) {
    for (const piece of splitLongParagraph(paragraph)) {
      const cleaned = piece.replace(/\s+/g, " ").trim();
      if (cleaned) {
        chunks.push(cleaned);
      }
    }
  }

  return chunks;
}
