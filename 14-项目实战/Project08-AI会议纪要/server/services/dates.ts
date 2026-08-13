/**
 * 创建时间: 2026-06-24
 * 文件名: dates.ts
 * 文件描述: 中文日期表达式解析。把「今天/明天/后天/本周五/下周一/周五前/6月15日/6/15/月底」等
 *           相对或绝对表达解析为具体日期（YYYY-MM-DD）。用于从会议发言中提取行动项截止时间。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-24
 */

/** 格式化为 YYYY-MM-DD */
function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 加 n 天 */
function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/** 中文星期 -> 0(周日)..6(周六) 的目标值（周一=1） */
const WEEKDAY: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0,
};

/**
 * 计算从 base 起、本周/下周某星期几的日期
 * @param base 基准日
 * @param target 目标星期（0-6）
 * @param next 是否下周
 */
function weekdayDate(base: Date, target: number, next: boolean): Date {
  const cur = base.getDay();
  let diff = (target - cur + 7) % 7;
  // 「本周X」若已过去则取最近的将来；这里 diff=0 表示就是今天
  if (next) diff += 7;
  return addDays(base, diff);
}

/**
 * 从文本中解析截止日期
 * @param text 含日期表达的文本
 * @param today 基准「今天」（默认当前）
 * @returns YYYY-MM-DD 或 null
 */
export function parseDeadline(text: string, today: Date = new Date()): string | null {
  const t = text;

  if (/今天|今日/.test(t)) return fmt(today);
  if (/明天|明日/.test(t)) return fmt(addDays(today, 1));
  if (/后天/.test(t)) return fmt(addDays(today, 2));
  if (/大后天/.test(t)) return fmt(addDays(today, 3));

  // 下周X / 本周X / 这周X / 周X / 周X前
  const wk = t.match(/(下|本|这)?\s*(?:周|星期|礼拜)\s*([一二三四五六日天])/);
  if (wk) {
    const next = wk[1] === "下";
    const target = WEEKDAY[wk[2]];
    if (target !== undefined) return fmt(weekdayDate(today, target, next));
  }

  // X月X日 / X月X号
  const md = t.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
  if (md) {
    const month = Number(md[1]);
    const day = Number(md[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let year = today.getFullYear();
      // 若月份已过去，视为明年
      if (month < today.getMonth() + 1) year += 1;
      return fmt(new Date(year, month - 1, day));
    }
  }

  // 月底 / 月末
  if (/月底|月末/.test(t)) {
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return fmt(end);
  }

  // 下周（无具体星期）-> 下周一
  if (/下周|下星期|下礼拜/.test(t)) return fmt(weekdayDate(today, 1, true));

  // X/X 形式（如 6/15），避免误伤比例/比分：要求两侧为合理月日
  const slash = t.match(/(?<!\d)(\d{1,2})\s*\/\s*(\d{1,2})(?!\d)/);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let year = today.getFullYear();
      if (month < today.getMonth() + 1) year += 1;
      return fmt(new Date(year, month - 1, day));
    }
  }

  return null;
}
