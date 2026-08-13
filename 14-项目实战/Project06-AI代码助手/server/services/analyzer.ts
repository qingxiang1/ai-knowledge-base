/**
 * 创建时间: 2026-06-24
 * 文件名: analyzer.ts
 * 文件描述: 零依赖的多语言代码静态分析。真实计算行数构成、注释率、函数数量、最大嵌套深度、
 *           圈复杂度近似与最长行，并做轻量语言探测。用于「解释 / 优化」动作的事实基础。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-24
 */

import type { CodeMetrics } from "../types";

/**
 * 轻量语言探测：基于特征关键字打分
 * @param code 源码
 * @param fallback 探测失败时返回的语言
 * @returns 语言名
 */
export function detectLanguage(code: string, fallback = "Unknown"): string {
  const c = code;
  const tests: { lang: string; score: number }[] = [
    { lang: "Python", score: count(c, /\bdef\s+\w+\s*\(/g) * 3 + count(c, /\bimport\s+\w+/g) + count(c, /\bprint\s*\(/g) + count(c, /\belif\b/g) * 2 },
    { lang: "TypeScript", score: count(c, /:\s*(string|number|boolean|void|any)\b/g) * 3 + count(c, /\binterface\s+\w+/g) * 3 + count(c, /\btype\s+\w+\s*=/g) * 2 },
    { lang: "JavaScript", score: count(c, /\bfunction\b/g) + count(c, /\bconst\b|\blet\b|\bvar\b/g) + count(c, /=>/g) + count(c, /console\.\w+/g) },
    { lang: "Java", score: count(c, /\bpublic\s+(class|static|void)\b/g) * 3 + count(c, /System\.out\./g) * 2 },
    { lang: "Go", score: count(c, /\bfunc\s+\w+/g) * 2 + count(c, /\bpackage\s+\w+/g) * 3 + count(c, /\bfmt\./g) * 2 },
    { lang: "Rust", score: count(c, /\bfn\s+\w+/g) * 2 + count(c, /\blet\s+mut\b/g) * 2 + count(c, /println!/g) * 2 },
    { lang: "C++", score: count(c, /#include\b/g) * 3 + count(c, /\bstd::/g) * 2 + count(c, /\bcout\b/g) },
    { lang: "SQL", score: count(c, /\b(SELECT|FROM|WHERE|JOIN|GROUP\s+BY|INSERT|UPDATE)\b/gi) },
  ];
  tests.sort((a, b) => b.score - a.score);
  return tests[0].score > 0 ? tests[0].lang : fallback;
}

/** 统计正则匹配次数 */
function count(text: string, re: RegExp): number {
  return (text.match(re) || []).length;
}

/**
 * 判断一行是否为注释行（覆盖 // # /* * -- 起始）
 * @param trimmed 去除首尾空白的行
 * @returns 是否注释
 */
function isCommentLine(trimmed: string): boolean {
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("--")
  );
}

/**
 * 计算最大嵌套深度：花括号深度与缩进深度取较大者
 * @param lines 源码行
 * @returns 最大嵌套深度
 */
function maxNestingDepth(lines: string[]): number {
  let braceDepth = 0;
  let maxBrace = 0;
  let maxIndent = 0;
  for (const line of lines) {
    // 花括号深度
    for (const ch of line) {
      if (ch === "{") {
        braceDepth += 1;
        if (braceDepth > maxBrace) maxBrace = braceDepth;
      } else if (ch === "}") {
        braceDepth = Math.max(0, braceDepth - 1);
      }
    }
    // 缩进深度（4 空格或 1 tab 记 1 级），仅对非空行
    if (line.trim().length > 0) {
      const indentMatch = line.match(/^[ \t]*/);
      const ws = indentMatch ? indentMatch[0] : "";
      const spaces = ws.replace(/\t/g, "    ").length;
      const level = Math.floor(spaces / 4);
      if (level > maxIndent) maxIndent = level;
    }
  }
  return Math.max(maxBrace, maxIndent);
}

/**
 * 对源码做静态分析
 * @param code 源码
 * @param language 用户选择的语言（作为探测失败的兜底）
 * @returns 代码度量
 */
export function analyzeCode(code: string, language: string): CodeMetrics {
  const lines = code.split(/\r?\n/);
  const totalLines = lines.length;
  let commentLines = 0;
  let blankLines = 0;
  let longestLen = 0;
  let longestLineNo = 1;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) blankLines += 1;
    else if (isCommentLine(trimmed)) commentLines += 1;
    if (line.length > longestLen) {
      longestLen = line.length;
      longestLineNo = idx + 1;
    }
  });

  const codeLines = totalLines - commentLines - blankLines;

  // 函数/方法近似计数
  const functions =
    count(code, /\bfunction\b/g) +
    count(code, /\bdef\s+\w+\s*\(/g) +
    count(code, /\bfunc\s+\w+/g) +
    count(code, /\bfn\s+\w+/g) +
    count(code, /\w+\s*\([^)]*\)\s*=>/g) +
    count(code, /\b(public|private|protected|static)\s+[\w<>[\]]+\s+\w+\s*\(/g);

  // 圈复杂度近似：分支关键字 + 1
  const branchCount =
    count(code, /\bif\b/g) +
    count(code, /\belse\s+if\b/g) +
    count(code, /\belif\b/g) +
    count(code, /\bfor\b/g) +
    count(code, /\bwhile\b/g) +
    count(code, /\bcase\b/g) +
    count(code, /\bcatch\b/g) +
    count(code, /&&/g) +
    count(code, /\|\|/g) +
    count(code, /\?[^.]/g); // 三元（排除可选链 ?.）

  return {
    detectedLanguage: detectLanguage(code, language),
    totalLines,
    codeLines,
    commentLines,
    blankLines,
    commentRatio: totalLines > 0 ? Math.round((commentLines / totalLines) * 100) / 100 : 0,
    functions,
    maxDepth: maxNestingDepth(lines),
    complexity: branchCount + 1,
    longestLine: { length: longestLen, line: longestLineNo },
  };
}

/**
 * 把度量转成可读的中文说明
 * @param m 度量
 * @returns 文字说明
 */
export function describeMetrics(m: CodeMetrics): string {
  return (
    `探测语言：${m.detectedLanguage}\n` +
    `代码规模：共 ${m.totalLines} 行（代码 ${m.codeLines} / 注释 ${m.commentLines} / 空行 ${m.blankLines}）\n` +
    `注释率：${(m.commentRatio * 100).toFixed(0)}%\n` +
    `函数/方法（约）：${m.functions} 个\n` +
    `最大嵌套深度：${m.maxDepth}\n` +
    `圈复杂度（近似）：${m.complexity}\n` +
    `最长行：第 ${m.longestLine.line} 行，${m.longestLine.length} 字符`
  );
}
