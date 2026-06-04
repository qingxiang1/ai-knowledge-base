import { useState, useCallback } from 'react';
import { WritingRequest, WritingResponse, WritingStyle, WritingAction } from '../types';
import { generateWriting } from '../services/api';

interface UseWritingReturn {
  content: string;
  result: string;
  loading: boolean;
  error: string | null;
  style: WritingStyle;
  setStyle: (style: WritingStyle) => void;
  setContent: (content: string) => void;
  handleAction: (action: WritingAction) => Promise<void>;
  clearResult: () => void;
}

/**
 * 写作功能核心 Hook
 * 管理写作状态和处理写作请求
 */
export function useWriting(): UseWritingReturn {
  const [content, setContent] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [style, setStyle] = useState<WritingStyle>(WritingStyle.FORMAL);

  /**
   * 执行写作操作
   * @param action 操作类型
   */
  const handleAction = useCallback(async (action: WritingAction) => {
    if (!content.trim()) {
      setError('请输入内容');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: WritingRequest = {
        content,
        style,
        action,
        temperature: action === WritingAction.CREATIVE ? 0.8 : 0.5,
      };

      const response = await generateWriting(request);
      setResult(response.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, [content, style]);

  const clearResult = useCallback(() => {
    setResult('');
    setError(null);
  }, []);

  return {
    content,
    result,
    loading,
    error,
    style,
    setStyle,
    setContent,
    handleAction,
    clearResult,
  };
}
