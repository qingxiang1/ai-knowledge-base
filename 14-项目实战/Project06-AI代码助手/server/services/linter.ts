/**
 * 创建时间: 2026-06-24
 * 文件名: linter.ts
 * 文件描述: 零依赖的规则型代码检查与安全自动修复。真实逐行扫描常见问题（松散相等、var、
 *           遗留调试输出、debugger、空 catch、超长行、TODO、行尾空白、eval 等），
 *           并对 JS/TS 应用语言安全的自动修复。规则按语言门控，避免误伤（如 Python 的 ==）。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-24
 */

import type { Issue } from "../types";

/** 判断是否 JS / TS（决定 ===、let、console 等规则是否适用） */
function isJsTs(language: string): boolean {
  return /javascript|typescript|js|ts/i.test(language);
}

/** 行是否为注释（用于跳过部分代码规则，减少误报） */
function isComment(trimmed: string): boolean {
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("--")
  );
}

/**
 * 对源码做规则检查
 * @param code 源码
 * @param language 语言（用于门控 JS/TS 专属规则）
 * @returns 问题列表（含行号）
 */
export function lintCode(code: string, language: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split(/\r?\n/);
  const jsTs = isJsTs(language);

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;
    const trimmed = line.trim();
    const comment = isComment(trimmed);

    // 行尾空白（普适）
    if (/[ \t]+$/.test(line)) {
      issues.push({ line: lineNo, severity: "info", rule: "trailing-whitespace", message: "行尾存在多余空白" });
    }
    // 超长行（普适）
    if (line.length > 120) {
      issues.push({ line: lineNo, severity: "info", rule: "max-len", message: `本行 ${line.length} 字符，建议控制在 120 以内` });
    }
    // TODO / FIXME（普适，注释里也算）
    if (/\b(TODO|FIXME|XXX)\b/.test(line)) {
      issues.push({ line: lineNo, severity: "info", rule: "todo", message: "存在未完成标记（TODO/FIXME）" });
    }

    if (comment) return; // 以下为代码级规则，跳过注释行

    // eval（普适，安全风险）
    if (/\beval\s*\(/.test(line)) {
      issues.push({ line: lineNo, severity: "error", rule: "no-eval", message: "使用 eval 存在安全与性能风险" });
    }

    if (jsTs) {
      // 松散相等
      if (/[^=!<>]==(?!=)/.test(line) || /!=(?!=)/.test(line)) {
        issues.push({ line: lineNo, severity: "warning", rule: "eqeqeq", message: "建议使用全等 === / !== 替代 == / !=" });
      }
      // var 声明
      if (/\bvar\b/.test(line)) {
        issues.push({ line: lineNo, severity: "warning", rule: "no-var", message: "建议用 let / const 替代 var" });
      }
      // 遗留调试输出
      if (/console\.(log|debug|info)\s*\(/.test(line)) {
        issues.push({ line: lineNo, severity: "info", rule: "no-console", message: "生产代码建议移除调试输出 console.*" });
      }
      // debugger
      if (/\bdebugger\b/.test(line)) {
        issues.push({ line: lineNo, severity: "error", rule: "no-debugger", message: "残留 debugger 语句" });
      }
    }
  });

  // 空 catch（跨行匹配）
  const emptyCatch = /catch\s*(\([^)]*\))?\s*\{\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = emptyCatch.exec(code)) !== null) {
    const lineNo = code.slice(0, m.index).split(/\r?\n/).length;
    issues.push({ line: lineNo, severity: "warning", rule: "no-empty-catch", message: "空 catch 会静默吞掉异常" });
  }

  return issues.sort((a, b) => a.line - b.line);
}

/**
 * 对源码应用安全的自动修复
 * @param code 源码
 * @param language 语言（决定是否应用 JS/TS 专属修复）
 * @returns 修复后的代码与已应用修复说明
 */
export function autoFix(code: string, language: string): { fixed: string; applied: string[] } {
  const applied: string[] = [];
  let fixed = code;

  // 行尾空白（普适）
  if (/[ \t]+$/m.test(fixed)) {
    fixed = fixed.replace(/[ \t]+$/gm, "");
    applied.push("移除所有行尾空白");
  }

  if (isJsTs(language)) {
    // var -> let
    if (/\bvar\b/.test(fixed)) {
      fixed = fixed.replace(/\bvar\b/g, "let");
      applied.push("var 声明改为 let");
    }
    // != -> !==（先处理，避免影响 == 规则）
    const before1 = fixed;
    fixed = fixed.replace(/!=(?!=)/g, "!==");
    if (fixed !== before1) applied.push("!= 改为 !==");
    // == -> ===（前一个字符不是 = ! < >，且后面不是 =）
    const before2 = fixed;
    fixed = fixed.replace(/([^=!<>])==(?!=)/g, "$1===");
    if (fixed !== before2) applied.push("== 改为 ===");
  }

  if (applied.length === 0) applied.push("未发现可自动修复的问题");
  return { fixed, applied };
}
