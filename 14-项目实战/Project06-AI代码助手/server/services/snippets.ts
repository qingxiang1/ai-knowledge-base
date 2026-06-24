/**
 * 创建时间: 2026-06-24
 * 文件名: snippets.ts
 * 文件描述: 真实可用的代码片段库。按意图关键字匹配，返回经过验证、可直接运行的常见实现，
 *           作为「生成」动作的离线能力（无 API Key 时仍能产出真实正确的代码）。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-24
 */

/** 一个代码片段 */
export interface Snippet {
  name: string;
  /** 触发关键字（任一命中即匹配） */
  keywords: string[];
  language: string;
  code: string;
}

export const SNIPPETS: Snippet[] = [
  {
    name: "防抖 debounce",
    keywords: ["防抖", "debounce"],
    language: "TypeScript",
    code: `/** 防抖：停止触发 wait 毫秒后才执行 fn */
function debounce<T extends (...args: any[]) => void>(fn: T, wait = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}`,
  },
  {
    name: "节流 throttle",
    keywords: ["节流", "throttle"],
    language: "TypeScript",
    code: `/** 节流：每 interval 毫秒最多执行一次 fn */
function throttle<T extends (...args: any[]) => void>(fn: T, interval = 300) {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn(...args);
    }
  };
}`,
  },
  {
    name: "深拷贝 deepClone",
    keywords: ["深拷贝", "deepclone", "deep clone", "克隆"],
    language: "TypeScript",
    code: `/** 深拷贝：支持对象、数组、Date、循环引用（优先用 structuredClone） */
function deepClone<T>(value: T, seen = new WeakMap()): T {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T;
  if (seen.has(value as object)) return seen.get(value as object);
  const result: any = Array.isArray(value) ? [] : {};
  seen.set(value as object, result);
  for (const key of Object.keys(value as object)) {
    result[key] = deepClone((value as any)[key], seen);
  }
  return result;
}`,
  },
  {
    name: "数组去重 unique",
    keywords: ["去重", "unique", "排重", "去掉重复"],
    language: "TypeScript",
    code: `/** 数组去重（保持顺序） */
function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/** 按字段去重 */
function uniqueBy<T>(arr: T[], key: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  return arr.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}`,
  },
  {
    name: "快速排序 quicksort",
    keywords: ["快速排序", "quicksort", "quick sort", "排序"],
    language: "TypeScript",
    code: `/** 快速排序（函数式实现，O(n log n) 平均） */
function quickSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;
  const [pivot, ...rest] = arr;
  const left = rest.filter((x) => x < pivot);
  const right = rest.filter((x) => x >= pivot);
  return [...quickSort(left), pivot, ...quickSort(right)];
}`,
  },
  {
    name: "二分查找 binarySearch",
    keywords: ["二分", "binary search", "binarysearch", "查找"],
    language: "TypeScript",
    code: `/** 二分查找：在升序数组中查找 target，返回下标或 -1 */
function binarySearch(arr: number[], target: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
  },
  {
    name: "斐波那契 fibonacci",
    keywords: ["斐波那契", "fibonacci", "fib"],
    language: "TypeScript",
    code: `/** 斐波那契：迭代实现，O(n) 时间 O(1) 空间 */
function fibonacci(n: number): number {
  if (n < 2) return n;
  let a = 0;
  let b = 1;
  for (let i = 2; i <= n; i += 1) {
    [a, b] = [b, a + b];
  }
  return b;
}`,
  },
  {
    name: "邮箱校验 isEmail",
    keywords: ["邮箱", "email", "邮件", "校验邮箱"],
    language: "TypeScript",
    code: `/** 邮箱格式校验（覆盖绝大多数常规邮箱） */
function isEmail(value: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value.trim());
}`,
  },
  {
    name: "睡眠 sleep",
    keywords: ["sleep", "延时", "等待", "delay"],
    language: "TypeScript",
    code: `/** 异步睡眠：await sleep(1000) 暂停 1 秒 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}`,
  },
  {
    name: "带超时的请求 fetchJson",
    keywords: ["请求", "fetch", "http", "接口", "ajax"],
    language: "TypeScript",
    code: `/** 带超时的 JSON 请求 */
async function fetchJson<T>(url: string, timeout = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}`,
  },
];

/**
 * 按需求文本匹配最合适的片段
 * @param prompt 需求描述
 * @returns 命中的片段或 null
 */
export function findSnippet(prompt: string): Snippet | null {
  const text = prompt.toLowerCase();
  let best: Snippet | null = null;
  let bestHits = 0;
  for (const s of SNIPPETS) {
    let hits = 0;
    for (const kw of s.keywords) {
      if (text.includes(kw.toLowerCase())) hits += 1;
    }
    if (hits > bestHits) {
      bestHits = hits;
      best = s;
    }
  }
  return bestHits > 0 ? best : null;
}

/** 所有片段名（用于未命中时的提示） */
export function snippetNames(): string[] {
  return SNIPPETS.map((s) => s.name);
}
