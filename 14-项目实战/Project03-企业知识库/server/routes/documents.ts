/**
 * 创建时间: 2026-06-03
 * 文件名: documents.ts
 * 文件描述: Project03 企业知识库文档路由，处理上传（读取正文并切片）、列表与删除
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-14
 */

import { Router } from "express";
import multer from "multer";
import { readFile, unlink } from "node:fs/promises";
import {
  addDocument,
  buildDocument,
  deleteDocument,
  listDocuments,
} from "../services/document-store";

const router = Router();
const upload = multer({ dest: "uploads/" });

/**
 * 上传文档：读取正文文本，切片后入库
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  try {
    const { title, description } = req.body as {
      title?: string;
      description?: string;
    };

    if (!file || !title?.trim()) {
      return res.status(400).json({ message: "缺少文件或标题" });
    }

    const ext = (file.originalname?.split(".").pop() || "txt").toLowerCase();
    // 演示版仅解析纯文本类文件（txt/md），其它类型读取为 utf-8 文本做最佳努力处理
    const content = await readFile(file.path, "utf-8");

    const { record, chunks } = buildDocument({
      title: title.trim(),
      description: description?.trim() || null,
      file_type: ext,
      file_size: file.size,
      content,
    });

    if (chunks.length === 0) {
      return res
        .status(400)
        .json({ message: "未能从文件中解析出文本内容，请上传 txt 或 md 文档" });
    }

    await addDocument(record, chunks);
    return res.json(record);
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "上传失败",
    });
  } finally {
    // 清理 multer 落盘的临时文件
    if (file?.path) {
      await unlink(file.path).catch(() => undefined);
    }
  }
});

/**
 * 获取文档列表
 */
router.get("/", (req, res) => {
  const skip = parseInt((req.query.skip as string) || "0", 10);
  const limit = parseInt((req.query.limit as string) || "20", 10);
  res.json(listDocuments(skip, limit));
});

/**
 * 删除文档
 */
router.delete("/:docId", async (req, res) => {
  await deleteDocument(req.params.docId);
  res.status(204).send();
});

export default router;
