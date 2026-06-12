/**
 * 创建时间: 2026-06-12
 * 文件名: useWriting.ts
 * 文件描述: Project01 企业级写作工作流核心状态管理 Hook
 * 作者: Felix(LQX5731@163.com)
 * 版本号: v2.0.0
 * 最后更新时间: 2026-06-12
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EnterpriseDocument,
  ReviewDocumentRequest,
  UserRole,
  WorkflowStatus,
  WritingAction,
  WritingFormState,
  WritingStyle,
  WritingTemplate,
} from "../types";
import {
  generateDocument,
  getDocuments,
  getTemplates,
  publishDocument,
  reviewDocument,
  submitDocumentForReview,
} from "../services/api";

interface UseWritingReturn {
  templates: WritingTemplate[];
  documents: EnterpriseDocument[];
  currentDocument: EnterpriseDocument | null;
  currentRole: UserRole;
  operatorName: string;
  form: WritingFormState;
  comment: string;
  loading: boolean;
  error: string | null;
  setCurrentRole: (role: UserRole) => void;
  setOperatorName: (name: string) => void;
  setComment: (comment: string) => void;
  updateForm: <K extends keyof WritingFormState>(
    field: K,
    value: WritingFormState[K],
  ) => void;
  selectDocument: (documentId: string) => void;
  createNewDraft: () => void;
  handleGenerateDraft: () => Promise<void>;
  handleSubmitReview: () => Promise<void>;
  handleReview: (decision: "approve" | "reject") => Promise<void>;
  handlePublish: () => Promise<void>;
}

/**
 * 创建默认表单数据
 * @param templateId 默认模板 ID
 * @returns 初始化表单
 */
function createEmptyForm(templateId = ""): WritingFormState {
  return {
    title: "",
    brief: "",
    templateId,
    style: WritingStyle.BUSINESS,
    action: WritingAction.GENERATE,
  };
}

/**
 * 将单据映射为表单状态
 * @param document 当前单据
 * @returns 表单状态
 */
function mapDocumentToForm(document: EnterpriseDocument): WritingFormState {
  return {
    title: document.title,
    brief: document.brief,
    templateId: document.templateId,
    style: document.style,
    action: document.action,
  };
}

/**
 * 企业写作工作流核心 Hook
 * 管理模板、单据、角色和状态流转操作
 */
export function useWriting(): UseWritingReturn {
  const [templates, setTemplates] = useState<WritingTemplate[]>([]);
  const [documents, setDocuments] = useState<EnterpriseDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.AUTHOR);
  const [operatorName, setOperatorName] = useState("Felix");
  const [form, setForm] = useState<WritingFormState>(createEmptyForm());
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDocument = useMemo(
    () => documents.find((item) => item.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  /**
   * 根据最新单据列表同步选中状态和表单
   * @param nextDocuments 最新单据列表
   * @param nextTemplates 最新模板列表
   * @param preferredId 希望优先选中的单据 ID
   */
  const syncWorkspace = useCallback(
    (
      nextDocuments: EnterpriseDocument[],
      nextTemplates: WritingTemplate[],
      preferredId?: string | null,
    ) => {
      setDocuments(nextDocuments);
      setTemplates(nextTemplates);

      const targetId = preferredId ?? selectedDocumentId;
      const targetDocument = targetId
        ? (nextDocuments.find((item) => item.id === targetId) ?? null)
        : (nextDocuments[0] ?? null);

      if (targetDocument) {
        setSelectedDocumentId(targetDocument.id);
        setForm(mapDocumentToForm(targetDocument));
      } else {
        setSelectedDocumentId(null);
        setForm(createEmptyForm(nextTemplates[0]?.id ?? ""));
      }

      setComment("");
    },
    [selectedDocumentId],
  );

  /**
   * 初始化模板与单据数据
   */
  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [templateData, documentData] = await Promise.all([
        getTemplates(),
        getDocuments(),
      ]);
      syncWorkspace(documentData, templateData, documentData[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "初始化数据失败");
    } finally {
      setLoading(false);
    }
  }, [syncWorkspace]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  /**
   * 刷新单据列表并保持当前选择
   * @param preferredId 希望刷新后选中的单据 ID
   */
  const refreshDocuments = useCallback(
    async (preferredId?: string | null) => {
      const documentData = await getDocuments();
      syncWorkspace(documentData, templates, preferredId ?? selectedDocumentId);
    },
    [selectedDocumentId, syncWorkspace, templates],
  );

  /**
   * 更新表单字段
   * @param field 字段名
   * @param value 字段值
   */
  const updateForm = useCallback(
    <K extends keyof WritingFormState>(
      field: K,
      value: WritingFormState[K],
    ) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  /**
   * 选择单据并同步表单
   * @param documentId 单据 ID
   */
  const selectDocument = useCallback(
    (documentId: string) => {
      const target = documents.find((item) => item.id === documentId);
      if (!target) return;

      setSelectedDocumentId(target.id);
      setForm(mapDocumentToForm(target));
      setComment("");
      setError(null);
    },
    [documents],
  );

  /**
   * 新建一条空白草稿
   */
  const createNewDraft = useCallback(() => {
    setSelectedDocumentId(null);
    setForm(createEmptyForm(templates[0]?.id ?? ""));
    setComment("");
    setError(null);
    setCurrentRole(UserRole.AUTHOR);
  }, [templates]);

  /**
   * 校验作者操作的前置条件
   */
  const validateAuthorAction = useCallback(() => {
    if (currentRole !== UserRole.AUTHOR) {
      throw new Error("当前仅作者角色可以编辑和提交内容");
    }

    if (!operatorName.trim()) {
      throw new Error("请输入当前操作者姓名");
    }
  }, [currentRole, operatorName]);

  /**
   * 创建或重新生成企业草稿
   */
  const handleGenerateDraft = useCallback(async () => {
    try {
      validateAuthorAction();

      if (!form.title.trim()) {
        throw new Error("请输入内容标题");
      }

      if (!form.brief.trim()) {
        throw new Error("请输入写作需求摘要");
      }

      if (!form.templateId) {
        throw new Error("请选择企业模板");
      }

      if (
        currentDocument &&
        ![WorkflowStatus.DRAFT, WorkflowStatus.REJECTED].includes(
          currentDocument.status,
        )
      ) {
        throw new Error("当前单据已进入审核或发布流程，请新建草稿后再编辑");
      }

      setLoading(true);
      setError(null);

      const document = await generateDocument({
        documentId: currentDocument?.id,
        title: form.title.trim(),
        brief: form.brief.trim(),
        templateId: form.templateId,
        style: form.style,
        action: form.action,
        operatorName: operatorName.trim(),
        operatorRole: currentRole,
      });

      await refreshDocuments(document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "草稿生成失败");
    } finally {
      setLoading(false);
    }
  }, [
    currentDocument,
    currentRole,
    form,
    operatorName,
    refreshDocuments,
    validateAuthorAction,
  ]);

  /**
   * 提交当前草稿进入审核
   */
  const handleSubmitReview = useCallback(async () => {
    try {
      validateAuthorAction();

      if (!currentDocument) {
        throw new Error("请先生成草稿后再提交审核");
      }

      setLoading(true);
      setError(null);

      const document = await submitDocumentForReview(currentDocument.id, {
        operatorName: operatorName.trim(),
        operatorRole: currentRole,
        comment: comment.trim() || undefined,
      });

      await refreshDocuments(document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交审核失败");
    } finally {
      setLoading(false);
    }
  }, [
    comment,
    currentDocument,
    currentRole,
    operatorName,
    refreshDocuments,
    validateAuthorAction,
  ]);

  /**
   * 执行审核通过或驳回
   * @param decision 审核决策
   */
  const handleReview = useCallback(
    async (decision: "approve" | "reject") => {
      try {
        if (currentRole !== UserRole.REVIEWER) {
          throw new Error("当前仅审核人角色可以执行审核操作");
        }

        if (!operatorName.trim()) {
          throw new Error("请输入当前操作者姓名");
        }

        if (!currentDocument) {
          throw new Error("请选择待审核单据");
        }

        if (decision === "reject" && !comment.trim()) {
          throw new Error("驳回时请填写驳回原因");
        }

        setLoading(true);
        setError(null);

        const request: ReviewDocumentRequest = {
          operatorName: operatorName.trim(),
          operatorRole: currentRole,
          comment: comment.trim() || undefined,
          decision,
        };

        const document = await reviewDocument(currentDocument.id, request);
        await refreshDocuments(document.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "审核失败");
      } finally {
        setLoading(false);
      }
    },
    [comment, currentDocument, currentRole, operatorName, refreshDocuments],
  );

  /**
   * 执行内部模拟发布
   */
  const handlePublish = useCallback(async () => {
    try {
      if (currentRole !== UserRole.PUBLISHER) {
        throw new Error("当前仅发布人角色可以执行发布操作");
      }

      if (!operatorName.trim()) {
        throw new Error("请输入当前操作者姓名");
      }

      if (!currentDocument) {
        throw new Error("请选择待发布单据");
      }

      setLoading(true);
      setError(null);

      const document = await publishDocument(currentDocument.id, {
        operatorName: operatorName.trim(),
        operatorRole: currentRole,
        comment: comment.trim() || undefined,
      });

      await refreshDocuments(document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setLoading(false);
    }
  }, [comment, currentDocument, currentRole, operatorName, refreshDocuments]);

  return {
    templates,
    documents,
    currentDocument,
    currentRole,
    operatorName,
    form,
    comment,
    loading,
    error,
    setCurrentRole,
    setOperatorName,
    setComment,
    updateForm,
    selectDocument,
    createNewDraft,
    handleGenerateDraft,
    handleSubmitReview,
    handleReview,
    handlePublish,
  };
}
