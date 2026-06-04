/**
 * 文件描述: 文档路由，处理文档上传、列表和删除
 * 作者: AI-PM-Knowledge
 * 创建日期: 2026-06-03
 * 最后修改日期: 2026-06-04
 */

import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const upload = multer({ dest: 'uploads/' });

interface DocumentRecord {
  id: string;
  title: string;
  description: string | null;
  file_type: string;
  file_size: number;
  status: string;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

const documents_db: Record<string, DocumentRecord> = {};

/**
 * 上传文档
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;

    if (!file || !title) {
      return res.status(400).json({ message: '缺少文件或标题' });
    }

    const docId = uuidv4();
    const ext = file.originalname?.split('.').pop() || 'txt';

    documents_db[docId] = {
      id: docId,
      title,
      description: description || null,
      file_type: ext,
      file_size: file.size,
      status: 'completed',
      chunk_count: Math.floor(Math.random() * 10) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    res.json(documents_db[docId]);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '上传失败' });
  }
});

/**
 * 获取文档列表
 */
router.get('/', (req, res) => {
  const skip = parseInt(req.query.skip as string || '0');
  const limit = parseInt(req.query.limit as string || '20');
  const items = Object.values(documents_db).slice(skip, skip + limit);

  res.json({
    total: Object.keys(documents_db).length,
    items,
  });
});

/**
 * 删除文档
 */
router.delete('/:docId', (req, res) => {
  const { docId } = req.params;
  if (documents_db[docId]) {
    delete documents_db[docId];
  }
  res.status(204).send();
});

export default router;
