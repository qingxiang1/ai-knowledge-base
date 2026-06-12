/**
 * 创建时间: 2026-06-12
 * 文件名: templates.ts
 * 文件描述: Project01 企业级写作工作流模板配置
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v1.0.0
 * 最后更新时间: 2026-06-12
 */

import type { WritingTemplate } from '../types';

/**
 * 企业写作模板配置
 */
export const writingTemplates: WritingTemplate[] = [
  {
    id: 'brand-campaign',
    name: '品牌公告模板',
    description: '适用于品牌升级、产品更新和市场宣传类正式内容。',
    channel: '官网公告',
    promptHint: '强调品牌表达、核心收益和统一口径。',
  },
  {
    id: 'customer-email',
    name: '客户触达邮件模板',
    description: '适用于面向客户的升级通知、运营邮件和服务说明。',
    channel: '邮件触达',
    promptHint: '强调客户价值、行动指引和风险提示。',
  },
  {
    id: 'internal-update',
    name: '内部同步模板',
    description: '适用于内部周报、发布说明和跨团队协同通知。',
    channel: '内部协同',
    promptHint: '强调任务背景、影响范围和对齐动作。',
  },
];
