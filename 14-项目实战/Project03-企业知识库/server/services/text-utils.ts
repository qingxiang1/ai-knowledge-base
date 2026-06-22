/**
 * 创建时间: 2026-06-14
 * 文件名: text-utils.ts
 * 文件描述: Project03 企业知识库文本工具，提供中英文混合分词（CJK 二元组 + 拉丁词）
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

/**
 * 将文本切成词元：拉丁词整体保留，CJK 文本拆为二元组以兼顾中文匹配精度
 * 同时用于本地 embedding 的特征哈希与命中词高亮
 * @param text 输入文本
 * @returns 词元数组（可能重复，用于词频统计）
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = [];

  // 拉丁字母与数字按单词切分
  const latin = text.toLowerCase().match(/[a-z0-9]+/g);
  if (latin) {
    tokens.push(...latin);
  }

  // CJK 连续片段拆成二元组（长度为 1 时保留单字）
  const cjkRuns = text.match(/[一-鿿]+/g);
  if (cjkRuns) {
    for (const run of cjkRuns) {
      if (run.length === 1) {
        tokens.push(run);
        continue;
      }
      for (let i = 0; i < run.length - 1; i += 1) {
        tokens.push(run.slice(i, i + 2));
      }
    }
  }

  return tokens;
}
