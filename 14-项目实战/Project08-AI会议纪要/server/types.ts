/**
 * 创建时间: 2026-06-24
 * 文件名: types.ts
 * 文件描述: Project08 AI 会议纪要服务端共享类型。定义转录解析结果、发言统计、行动项与统一纪要结构。
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-24
 */

/** 一条发言 */
export interface Utterance {
  speaker: string;
  text: string;
}

/** 发言人统计 */
export interface SpeakerStat {
  name: string;
  utterances: number;
  words: number;
  /** 发言字数占比（0-100，整数） */
  share: number;
}

/** 行动项 */
export interface ActionItem {
  task: string;
  assignee?: string;
  deadline?: string;
}

/** 会议纪要结果 */
export interface MinutesResult {
  meetingTitle: string;
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  decisions: string[];
  /** 自动识别 + 传入合并后的参会人 */
  participants: string[];
  /** 发言统计 */
  speakerStats: SpeakerStat[];
  /** 规模统计 */
  meta: { lines: number; words: number; speakers: number };
  mode: "mock" | "api";
}
