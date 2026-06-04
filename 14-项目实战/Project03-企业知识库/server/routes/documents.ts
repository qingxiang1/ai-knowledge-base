import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { DocumentStatus, DocumentType } from '../../src/types/index.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

const documents_db: Record<string, any> = {};

/**
 * 上传文档
 */
router.post('/upload', upload.single('file'), async (req: any, res: any) => {
  try {
    const { title, description } = req.body;
    const file = req.file;

    if (!file || !title) {
      return res.status(400).json({ message: '缺少文件或标题' });
    }

    const docId = uuidv4();
    const ext = file.originalname.split('.').pop() || 'txt';

    documents_db[docId] = {
      id: docId,
      title,
      description: description || null,
      file_type: ext as DocumentType,
      file_size: file.size,
      status: DocumentStatus.COMPLETED,
      chunk_count: 1,
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
router.get('/', (req: any, res: any) => {
  const skip = parseInt(req.query.skip || '0');
  const limit = parseInt(req.query.limit || '20');
  const items = Object.values(documents_db).slice(skip, skip + limit);

  res.json({
    total: Object.keys(documents_db).length,
    items,
  });
});

/**
 * 删除文档
 */
router.delete('/:docId', (req: any, res: any) => {
  const { docId } = req.params;
  if (documents_db[docId]) {
    delete documents_db[docId];
  }
  res.status(204).send();
});

export default router;
