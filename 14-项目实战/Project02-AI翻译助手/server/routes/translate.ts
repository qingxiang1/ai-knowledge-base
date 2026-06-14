/**
 * 创建时间: 2026-06-03
 * 文件名: translate.ts
 * 文件描述: Project02 AI 翻译助手翻译与语言识别路由
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

import { Router } from "express";
import { detectLanguage, langMap, translate } from "../services/translator";
import { translationStyles, type TranslateRequest } from "../types";

const router = Router();

/**
 * 校验目标语言是否受支持
 * @param lang 语言代码
 * @returns 是否合法
 */
function isSupportedLang(lang: unknown): lang is string {
  return typeof lang === "string" && Object.keys(langMap).includes(lang);
}

/**
 * 翻译文本
 */
router.post("/translate", async (req, res) => {
  try {
    const { text, sourceLang, targetLang, style } =
      req.body as TranslateRequest;

    if (!text?.trim()) {
      return res.status(400).json({ message: "文本不能为空" });
    }
    if (!isSupportedLang(targetLang)) {
      return res.status(400).json({ message: "目标语言不受支持" });
    }
    if (sourceLang !== "auto" && !isSupportedLang(sourceLang)) {
      return res.status(400).json({ message: "源语言不受支持" });
    }
    if (sourceLang !== "auto" && sourceLang === targetLang) {
      return res.status(400).json({ message: "源语言与目标语言不能相同" });
    }
    if (style && !translationStyles.includes(style)) {
      return res.status(400).json({ message: "翻译风格不受支持" });
    }

    const result = await translate({ text, sourceLang, targetLang, style });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "翻译失败",
    });
  }
});

/**
 * 识别文本语言
 */
router.post("/detect", async (req, res) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text?.trim()) {
      return res.status(400).json({ message: "文本不能为空" });
    }

    const result = await detectLanguage(text);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "识别失败",
    });
  }
});

export default router;
