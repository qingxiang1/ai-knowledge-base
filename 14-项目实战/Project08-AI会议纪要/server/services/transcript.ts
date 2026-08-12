/**
 * 创建时间: 2026-06-24
 * 文件名: transcript.ts
 * 文件描述: 会议转录解析。把「发言人：内容」形式的转录拆成发言列表，自动识别参会人，
 *           并统计每位发言人的发言条数、字数与占比。零依赖。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-24
 */

import type { SpeakerStat, Utterance } from "../types";

/** 匹配「发言人：内容」（中英文冒号），发言人为 1-12 个非冒号字符 */
const SPEAKER_RE = /^\s*([^：:\n]{1,12})\s*[：:]\s*(.*)$/;

/**
 * 把转录文本解析为发言列表（无显式发言人的行并入上一条发言）
 * @param transcript 转录文本
 * @returns 发言数组
 */
export function parseUtterances(transcript: string): Utterance[] {
  const lines = transcript.split(/\r?\n/);
  const utterances: Utterance[] = [];
  for (const line of lines) {
    const raw = line.trim();
    if (!raw) continue;
    const m = raw.match(SPEAKER_RE);
    if (m && isLikelySpeaker(m[1])) {
      utterances.push({ speaker: m[1].trim(), text: m[2].trim() });
    } else if (utterances.length > 0) {
      // 续行：拼到上一条发言
      utterances[utterances.length - 1].text += (utterances[utterances.length - 1].text ? " " : "") + raw;
    } else {
      // 开头就没有发言人：归为「旁白」
      utterances.push({ speaker: "", text: raw });
    }
  }
  return utterances;
}

/**
 * 判断冒号前的内容是否像「发言人名」而非正文（排除过长或含句末标点的情况）
 * @param name 候选发言人
 * @returns 是否像发言人
 */
function isLikelySpeaker(name: string): boolean {
  const n = name.trim();
  if (n.length === 0 || n.length > 12) return false;
  // 含句子标点的更像正文里的冒号（如「我说：……」前的长句）
  if (/[。！？，、；,.!?]/.test(n)) return false;
  return true;
}

/**
 * 统计每位发言人的发言条数、字数与占比
 * @param utterances 发言列表
 * @returns 发言统计（按字数降序）
 */
export function computeSpeakerStats(utterances: Utterance[]): SpeakerStat[] {
  const map = new Map<string, { utterances: number; words: number }>();
  let totalWords = 0;
  for (const u of utterances) {
    if (!u.speaker) continue;
    const w = countWords(u.text);
    totalWords += w;
    const cur = map.get(u.speaker) ?? { utterances: 0, words: 0 };
    cur.utterances += 1;
    cur.words += w;
    map.set(u.speaker, cur);
  }
  const stats: SpeakerStat[] = [];
  for (const [name, v] of map.entries()) {
    stats.push({
      name,
      utterances: v.utterances,
      words: v.words,
      share: totalWords > 0 ? Math.round((v.words / totalWords) * 100) : 0,
    });
  }
  return stats.sort((a, b) => b.words - a.words);
}

/**
 * 统计字数：中文按字、英文按词
 * @param text 文本
 * @returns 字数
 */
export function countWords(text: string): number {
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  const latin = (text.match(/[a-zA-Z0-9]+/g) || []).length;
  return cjk + latin;
}

/**
 * 识别参会人：解析出的发言人 ∪ 传入的参会人
 * @param utterances 发言列表
 * @param provided 传入的参会人
 * @returns 去重后的参会人列表
 */
export function detectParticipants(utterances: Utterance[], provided: string[] = []): string[] {
  const set = new Set<string>();
  for (const u of utterances) if (u.speaker) set.add(u.speaker);
  for (const p of provided) if (p.trim()) set.add(p.trim());
  return Array.from(set);
}
