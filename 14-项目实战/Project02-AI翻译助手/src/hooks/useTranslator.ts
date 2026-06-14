/**
 * 创建时间: 2026-06-14
 * 文件名: useTranslator.ts
 * 文件描述: Project02 AI 翻译助手核心状态管理 Hook，封装翻译、备选、历史与本地持久化
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-14
 */

import { useCallback, useEffect, useState } from "react";
import { translateText } from "../services/api";
import {
  TranslateResponse,
  TranslationHistoryItem,
  TranslationStyle,
} from "../types";

const HISTORY_KEY = "ai-translator-history";
const HISTORY_LIMIT = 20;

/**
 * 从 localStorage 读取历史记录
 * @returns 历史记录列表
 */
function loadHistory(): TranslationHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TranslationHistoryItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * 生成历史记录 ID（无需引入额外依赖）
 * @returns 唯一 ID
 */
function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface UseTranslatorReturn {
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  style: TranslationStyle;
  alternatives: string[];
  detectedLang: string;
  model: string;
  loading: boolean;
  error: string | null;
  history: TranslationHistoryItem[];
  setSourceText: (value: string) => void;
  setTargetText: (value: string) => void;
  setSourceLang: (value: string) => void;
  setTargetLang: (value: string) => void;
  setStyle: (value: TranslationStyle) => void;
  translate: () => Promise<void>;
  swap: () => void;
  clearError: () => void;
  applyAlternative: (text: string) => void;
  restoreHistory: (item: TranslationHistoryItem) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
}

/**
 * 翻译助手核心 Hook
 */
export function useTranslator(): UseTranslatorReturn {
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [style, setStyle] = useState<TranslationStyle>("formal");
  const [alternatives, setAlternatives] = useState<string[]>([]);
  const [detectedLang, setDetectedLang] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  /**
   * 持久化历史记录
   * @param next 最新历史列表
   */
  const persistHistory = useCallback((next: TranslationHistoryItem[]) => {
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {
      // 忽略隐私模式下的写入失败
    }
  }, []);

  /**
   * 执行翻译
   */
  const translate = useCallback(async () => {
    if (!sourceText.trim()) {
      setError("请输入要翻译的文本");
      return;
    }
    if (sourceLang !== "auto" && sourceLang === targetLang) {
      setError("源语言与目标语言不能相同");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response: TranslateResponse = await translateText({
        text: sourceText,
        sourceLang,
        targetLang,
        style,
      });

      setTargetText(response.translatedText);
      setAlternatives(response.alternatives);
      setDetectedLang(response.detectedLang);
      setModel(response.model);

      const item: TranslationHistoryItem = {
        id: createId(),
        sourceText,
        translatedText: response.translatedText,
        sourceLang: response.sourceLang,
        targetLang: response.targetLang,
        detectedLang: response.detectedLang,
        style: response.style,
        createdAt: new Date().toISOString(),
      };
      persistHistory([item, ...history].slice(0, HISTORY_LIMIT));
    } catch (err) {
      setError(err instanceof Error ? err.message : "翻译失败");
    } finally {
      setLoading(false);
    }
  }, [sourceText, sourceLang, targetLang, style, history, persistHistory]);

  /**
   * 交换源语言与目标语言（auto 模式下使用识别结果回填）
   */
  const swap = useCallback(() => {
    const effectiveSource = sourceLang === "auto" ? detectedLang : sourceLang;
    if (!effectiveSource) {
      // auto 模式但尚未翻译时无法可靠交换，提示用户
      setError("自动识别模式下请先翻译一次再交换语言");
      return;
    }
    setSourceLang(targetLang);
    setTargetLang(effectiveSource);
    setSourceText(targetText);
    setTargetText(sourceText);
    setAlternatives([]);
  }, [sourceLang, targetLang, detectedLang, sourceText, targetText]);

  /**
   * 采用某条备选译文
   * @param text 备选译文内容
   */
  const applyAlternative = useCallback((text: string) => {
    setTargetText(text);
  }, []);

  /**
   * 从历史记录恢复一次翻译
   * @param item 历史记录项
   */
  const restoreHistory = useCallback((item: TranslationHistoryItem) => {
    setSourceText(item.sourceText);
    setTargetText(item.translatedText);
    setSourceLang(item.sourceLang);
    setTargetLang(item.targetLang);
    setStyle(item.style);
    setDetectedLang(item.detectedLang);
    setAlternatives([]);
    setError(null);
  }, []);

  /**
   * 删除单条历史
   * @param id 历史记录 ID
   */
  const removeHistory = useCallback(
    (id: string) => {
      persistHistory(history.filter((item) => item.id !== id));
    },
    [history, persistHistory],
  );

  /**
   * 清空全部历史
   */
  const clearHistory = useCallback(() => {
    persistHistory([]);
  }, [persistHistory]);

  return {
    sourceText,
    targetText,
    sourceLang,
    targetLang,
    style,
    alternatives,
    detectedLang,
    model,
    loading,
    error,
    history,
    setSourceText,
    setTargetText,
    setSourceLang,
    setTargetLang,
    setStyle,
    translate,
    swap,
    clearError: () => setError(null),
    applyAlternative,
    restoreHistory,
    removeHistory,
    clearHistory,
  };
}
