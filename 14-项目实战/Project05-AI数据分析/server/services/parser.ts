/**
 * 创建时间: 2026-06-24
 * 文件名: parser.ts
 * 文件描述: 轻量 CSV/TSV 解析器与列类型推断。零依赖，支持逗号/制表符/分号分隔、
 *           带引号字段、缺失值与数值列自动识别。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-24
 */

import type { Dataset, ColumnType } from "../types";

/**
 * 猜测分隔符：在逗号 / 制表符 / 分号中选首行出现次数最多者
 * @param firstLine 首行文本
 * @returns 分隔符
 */
function guessDelimiter(firstLine: string): string {
  const candidates = [",", "\t", ";"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/**
 * 解析单行（支持双引号包裹、引号内分隔符与转义双引号）
 * @param line 行文本
 * @param delimiter 分隔符
 * @returns 字段数组
 */
function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      fields.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

/**
 * 判断字符串是否为有效数值（允许千分位逗号已被分隔符排除，故仅处理常规数字）
 * @param raw 原始字符串
 * @returns 是否数值
 */
export function isNumeric(raw: string): boolean {
  if (raw === "" || raw == null) return false;
  const cleaned = raw.replace(/[%¥$,\s]/g, "");
  if (cleaned === "") return false;
  return !Number.isNaN(Number(cleaned));
}

/**
 * 把字符串解析为数值（去除货币/百分号等修饰）
 * @param raw 原始字符串
 * @returns 数值，无法解析返回 NaN
 */
export function toNumber(raw: string): number {
  return Number(raw.replace(/[%¥$,\s]/g, ""));
}

/**
 * 解析 CSV/TSV 文本为数据集，并推断每列类型
 * @param text 原始文本
 * @returns 数据集
 */
export function parseDataset(text: string): Dataset {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], columnTypes: {} };
  }

  const delimiter = guessDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line, delimiter);
    // 补齐 / 截断到表头长度
    while (cells.length < headers.length) cells.push("");
    return cells.slice(0, headers.length);
  });

  // 列类型推断：非空值中 >=70% 可解析为数值则视为数值列
  const columnTypes: Record<string, ColumnType> = {};
  headers.forEach((header, col) => {
    let nonEmpty = 0;
    let numericCount = 0;
    for (const row of rows) {
      const v = row[col] ?? "";
      if (v === "") continue;
      nonEmpty += 1;
      if (isNumeric(v)) numericCount += 1;
    }
    columnTypes[header] = nonEmpty > 0 && numericCount / nonEmpty >= 0.7 ? "numeric" : "categorical";
  });

  return { headers, rows, columnTypes };
}

/**
 * 取出某数值列的所有有效数值（按行序），同时返回其原始行下标
 * @param dataset 数据集
 * @param column 列名
 * @returns { values, rowIndexes }
 */
export function numericColumn(
  dataset: Dataset,
  column: string,
): { values: number[]; rowIndexes: number[] } {
  const col = dataset.headers.indexOf(column);
  const values: number[] = [];
  const rowIndexes: number[] = [];
  if (col < 0) return { values, rowIndexes };
  dataset.rows.forEach((row, idx) => {
    const v = row[col] ?? "";
    if (isNumeric(v)) {
      values.push(toNumber(v));
      rowIndexes.push(idx);
    }
  });
  return { values, rowIndexes };
}

/**
 * 列出所有数值列 / 类别列名
 * @param dataset 数据集
 * @returns { numeric, categorical }
 */
export function splitColumns(dataset: Dataset): { numeric: string[]; categorical: string[] } {
  const numeric: string[] = [];
  const categorical: string[] = [];
  for (const h of dataset.headers) {
    if (dataset.columnTypes[h] === "numeric") numeric.push(h);
    else categorical.push(h);
  }
  return { numeric, categorical };
}
