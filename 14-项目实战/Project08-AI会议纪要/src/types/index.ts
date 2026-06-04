/**
 * 会议纪要生成请求
 */
export interface MinutesRequest {
  transcript: string;
  meetingTitle?: string;
  participants?: string[];
}

/**
 * 会议纪要响应
 */
export interface MinutesResponse {
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    task: string;
    assignee?: string;
    deadline?: string;
  }>;
  decisions: string[];
}
