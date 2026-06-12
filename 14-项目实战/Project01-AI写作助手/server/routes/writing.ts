/**
 * 创建时间: 2026-06-12
 * 文件名: writing.ts
 * 文件描述: Project01 企业级写作工作流路由，管理草稿、审核和发布状态流转
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-12
 */

import { Router, type Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { AIWritingResponse, generateEnterpriseDraft } from "../services/openai";
import { runComplianceCheck } from "../services/compliance";
import { writingTemplates } from "../config/templates";
import {
  addDocument,
  findDocumentById,
  listDocuments,
  persistDocument,
} from "../services/document-store";
import type {
  EnterpriseDocument,
  GenerateDocumentRequest,
  ReviewDocumentRequest,
  UserRole,
  WorkflowAuditLog,
  WorkflowMutationRequest,
  WorkflowStatus,
  WritingTemplate,
} from "../types";

const router = Router();

interface HttpError extends Error {
  status?: number;
}

/**
 * 创建带状态码的业务错误
 * @param message 错误信息
 * @param status HTTP 状态码
 * @returns 错误对象
 */
function createHttpError(message: string, status = 400): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}

/**
 * 断言业务条件
 * @param condition 条件
 * @param message 错误信息
 * @param status 状态码
 */
function ensure(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) {
    throw createHttpError(message, status);
  }
}

/**
 * 获取模板定义
 * @param templateId 模板 ID
 * @returns 模板对象
 */
function findTemplate(templateId: string): WritingTemplate {
  const template = writingTemplates.find((item) => item.id === templateId);
  ensure(template, "所选企业模板不存在", 404);
  return template;
}

/**
 * 获取单据对象
 * @param documentId 单据 ID
 * @returns 单据对象
 */
function findDocument(documentId: string): EnterpriseDocument {
  const document = findDocumentById(documentId);
  ensure(document, "目标单据不存在", 404);
  return document;
}

/**
 * 计算内容字数
 * @param content 内容文本
 * @returns 字数结果
 */
function calculateWordCount(content: string): number {
  return content.replace(/\s+/g, "").length;
}

/**
 * 创建审计日志
 * @param action 审计动作
 * @param fromStatus 变更前状态
 * @param toStatus 变更后状态
 * @param operatorRole 操作者角色
 * @param operatorName 操作者姓名
 * @param comment 附加备注
 * @returns 审计日志对象
 */
function createAuditLog(
  action: string,
  fromStatus: WorkflowStatus | null,
  toStatus: WorkflowStatus,
  operatorRole: UserRole,
  operatorName: string,
  comment?: string,
): WorkflowAuditLog {
  return {
    id: uuidv4(),
    action,
    fromStatus,
    toStatus,
    operatorRole,
    operatorName,
    comment,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 按更新时间倒序返回单据列表
 * @returns 排序后的单据数组
 */
function getSortedDocuments(): EnterpriseDocument[] {
  return listDocuments().sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

/**
 * 校验操作者角色
 * @param actualRole 当前角色
 * @param expectedRole 期待角色
 */
function assertRole(actualRole: UserRole, expectedRole: UserRole): void {
  ensure(
    actualRole === expectedRole,
    `当前流程仅允许 ${expectedRole} 执行该操作`,
    403,
  );
}

/**
 * 校验草稿是否允许编辑
 * @param document 单据对象
 */
function assertEditableDocument(document: EnterpriseDocument): void {
  ensure(
    ["draft", "rejected"].includes(document.status),
    "当前单据已进入审核或发布流程，请新建草稿后再编辑",
    409,
  );
}

/**
 * 对单据执行品牌规则扫描并回写结果
 * @param document 单据对象
 */
function refreshDocumentCompliance(document: EnterpriseDocument): void {
  document.compliance = runComplianceCheck({
    title: document.title,
    brief: document.brief,
    content: document.generatedContent,
  });
}

/**
 * 统一处理异步路由错误
 * @param error 捕获到的错误
 * @param res Express 响应对象
 */
function handleRouteError(error: unknown, res: Response) {
  const typedError = error as HttpError;
  const status = typedError.status ?? 500;
  res.status(status).json({
    message: typedError.message || "服务异常",
  });
}

router.get("/templates", (_req, res) => {
  res.json({ templates: writingTemplates });
});

router.get("/documents", (_req, res) => {
  res.json({ documents: getSortedDocuments() });
});

/**
 * 创建或重新生成企业草稿
 */
router.post("/documents/generate", async (req, res) => {
  try {
    const request = req.body as GenerateDocumentRequest;
    ensure(request.title?.trim(), "标题不能为空");
    ensure(request.brief?.trim(), "业务需求摘要不能为空");
    ensure(request.operatorName?.trim(), "操作者姓名不能为空");
    assertRole(request.operatorRole, "author");

    const template = findTemplate(request.templateId);
    const aiResponse: AIWritingResponse = await generateEnterpriseDraft({
      title: request.title.trim(),
      brief: request.brief.trim(),
      templateName: template.name,
      channel: template.channel,
      style: request.style,
      action: request.action,
    });

    if (request.documentId) {
      const document = findDocument(request.documentId);
      assertEditableDocument(document);

      document.title = request.title.trim();
      document.brief = request.brief.trim();
      document.templateId = template.id;
      document.templateName = template.name;
      document.channel = template.channel;
      document.style = request.style;
      document.action = request.action;
      document.generatedContent = aiResponse.result;
      document.updatedAt = new Date().toISOString();
      document.wordCount = calculateWordCount(aiResponse.result);
      document.version += 1;
      document.tokensUsed = aiResponse.tokensUsed;
      document.model = aiResponse.model;
      refreshDocumentCompliance(document);
      document.auditLogs.unshift(
        createAuditLog(
          "重新生成草稿",
          document.status,
          document.status,
          request.operatorRole,
          request.operatorName.trim(),
          "作者更新了草稿内容",
        ),
      );

      await persistDocument(document);
      return res.json(document);
    }

    const now = new Date().toISOString();
    const document: EnterpriseDocument = {
      id: uuidv4(),
      title: request.title.trim(),
      brief: request.brief.trim(),
      templateId: template.id,
      templateName: template.name,
      channel: template.channel,
      style: request.style,
      action: request.action,
      status: "draft",
      authorName: request.operatorName.trim(),
      generatedContent: aiResponse.result,
      createdAt: now,
      updatedAt: now,
      version: 1,
      wordCount: calculateWordCount(aiResponse.result),
      tokensUsed: aiResponse.tokensUsed,
      model: aiResponse.model,
      compliance: runComplianceCheck({
        title: request.title.trim(),
        brief: request.brief.trim(),
        content: aiResponse.result,
      }),
      auditLogs: [
        createAuditLog(
          "创建草稿",
          null,
          "draft",
          request.operatorRole,
          request.operatorName.trim(),
          "作者基于企业模板创建了草稿",
        ),
      ],
    };

    await addDocument(document);
    return res.json(document);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

/**
 * 提交审核
 */
router.post("/documents/:id/submit-review", async (req, res) => {
  try {
    const request = req.body as WorkflowMutationRequest;
    const document = findDocument(req.params.id);
    ensure(request.operatorName?.trim(), "操作者姓名不能为空");
    assertRole(request.operatorRole, "author");
    ensure(
      document.generatedContent.trim(),
      "当前单据缺少草稿内容，无法提交审核",
    );
    ensure(
      ["draft", "rejected"].includes(document.status),
      "当前单据状态不允许提交审核",
      409,
    );
    refreshDocumentCompliance(document);
    if (document.compliance.status === "blocked") {
      document.updatedAt = new Date().toISOString();
      await persistDocument(document);
      throw createHttpError(document.compliance.summary, 409);
    }

    const previousStatus = document.status;
    document.status = "in_review";
    document.updatedAt = new Date().toISOString();
    document.auditLogs.unshift(
      createAuditLog(
        "提交审核",
        previousStatus,
        "in_review",
        request.operatorRole,
        request.operatorName.trim(),
        request.comment?.trim() || "作者提交审核",
      ),
    );

    await persistDocument(document);
    res.json(document);
  } catch (error) {
    handleRouteError(error, res);
  }
});

/**
 * 审核通过或驳回
 */
router.post("/documents/:id/review", async (req, res) => {
  try {
    const request = req.body as ReviewDocumentRequest;
    const document = findDocument(req.params.id);
    ensure(request.operatorName?.trim(), "操作者姓名不能为空");
    assertRole(request.operatorRole, "reviewer");
    ensure(document.status === "in_review", "当前单据不处于待审核状态", 409);

    const nextStatus: WorkflowStatus =
      request.decision === "approve" ? "approved" : "rejected";
    if (request.decision === "reject") {
      ensure(request.comment?.trim(), "驳回时必须填写驳回原因");
    }

    const previousStatus = document.status;
    document.status = nextStatus;
    document.updatedAt = new Date().toISOString();
    document.reviewerComment = request.comment?.trim() || "审核通过";
    document.auditLogs.unshift(
      createAuditLog(
        request.decision === "approve" ? "审核通过" : "审核驳回",
        previousStatus,
        nextStatus,
        request.operatorRole,
        request.operatorName.trim(),
        request.comment?.trim(),
      ),
    );

    await persistDocument(document);
    res.json(document);
  } catch (error) {
    handleRouteError(error, res);
  }
});

/**
 * 执行内部模拟发布
 */
router.post("/documents/:id/publish", async (req, res) => {
  try {
    const request = req.body as WorkflowMutationRequest;
    const document = findDocument(req.params.id);
    ensure(request.operatorName?.trim(), "操作者姓名不能为空");
    assertRole(request.operatorRole, "publisher");
    ensure(
      document.status === "approved",
      "当前单据尚未审核通过，不能发布",
      409,
    );

    const previousStatus = document.status;
    document.status = "published";
    document.updatedAt = new Date().toISOString();
    document.publishNote = request.comment?.trim() || "已完成内部模拟发布";
    document.auditLogs.unshift(
      createAuditLog(
        "内部模拟发布",
        previousStatus,
        "published",
        request.operatorRole,
        request.operatorName.trim(),
        document.publishNote,
      ),
    );

    await persistDocument(document);
    res.json(document);
  } catch (error) {
    handleRouteError(error, res);
  }
});

export default router;
