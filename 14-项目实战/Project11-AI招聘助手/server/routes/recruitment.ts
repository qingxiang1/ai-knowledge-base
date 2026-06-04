import { Router } from 'express';

const router = Router();

/**
 * 评估简历
 */
router.post('/evaluate-resume', async (req: any, res: any) => {
  try {
    const { resume, jobDescription } = req.body;

    if (!resume?.trim() || !jobDescription?.trim()) {
      return res.status(400).json({ message: '简历和职位描述不能为空' });
    }

    const response = {
      score: 85,
      summary: `简历与职位匹配度评估:\n\n在实际项目中，这里会调用 OpenAI API 进行深度简历分析和匹配度评分。`,
      strengths: [
        '丰富的项目经验',
        '技术栈匹配度高',
        '良好的教育背景',
      ],
      weaknesses: [
        '缺少团队管理经验',
        '某些技能深度不足',
      ],
      matchDetails: [
        { skill: 'React', matched: true, level: '精通' },
        { skill: 'TypeScript', matched: true, level: '熟练' },
        { skill: 'Node.js', matched: true, level: '熟练' },
        { skill: 'Python', matched: false },
        { skill: 'Docker', matched: true, level: '了解' },
      ],
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '评估失败' });
  }
});

/**
 * 生成面试问题
 */
router.post('/interview-questions', async (req: any, res: any) => {
  try {
    const { jobTitle, jobDescription, questionTypes, count } = req.body;

    if (!jobTitle?.trim() || !jobDescription?.trim()) {
      return res.status(400).json({ message: '职位名称和描述不能为空' });
    }

    const typeMap: Record<string, string> = {
      technical: '技术问题',
      behavioral: '行为问题',
      situational: '情境问题',
      culture: '文化匹配',
    };

    const questions = [];
    const types = questionTypes || ['technical'];
    const numQuestions = count || 5;

    for (let i = 0; i < numQuestions; i++) {
      const type = types[i % types.length];
      questions.push({
        type: typeMap[type] || type,
        question: `${typeMap[type] || type} 示例问题 ${i + 1}:\n\n在实际项目中，这里会调用 OpenAI API 生成针对性的面试问题。`,
        purpose: `考察候选人的${typeMap[type] || '综合能力'}`,
      });
    }

    res.json({ questions });
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : '生成失败' });
  }
});

export default router;
