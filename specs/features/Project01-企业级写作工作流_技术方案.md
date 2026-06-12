<!--
  创建时间: 2026-06-12
  文件名: Project01-企业级写作工作流_技术方案.md
  文件描述: Project01 企业级写作工作流技术设计文档
  作者: Felix(LQX5731@163.com)
  版本号: v1.0.0
  最后更新时间: 2026-06-12
-->

# Project01 企业级写作工作流技术方案

## 设计原则

- 保持现有 `React + Express` 轻量栈
- 先把流程、状态机和接口契约做正确
- 所有状态流转都保留审计日志
- 数据层先用内存存储，结构按未来数据库字段设计
- 品牌规则能力先做本地规则引擎，接口契约预留未来接入真实规则中心

## 前端设计

- 保留单页工作台结构
- 顶部增加角色切换
- 主编辑区负责模板、标题、摘要、生成结果和流程动作
- 主编辑区新增品牌规则面板，展示合规状态、命中项和修正建议
- 侧边栏负责单据列表与审计轨迹
- 使用一个核心 Hook 管理模板、单据、当前角色和所有动作

## 后端设计

### API

- `GET /api/writing/templates`：获取模板列表
- `GET /api/writing/documents`：获取单据列表
- `POST /api/writing/documents/generate`：创建或重新生成草稿
- `POST /api/writing/documents/:id/submit-review`：提交审核
- `POST /api/writing/documents/:id/review`：审核通过或驳回
- `POST /api/writing/documents/:id/publish`：内部模拟发布

### 品牌规则设计

- 新增 `ComplianceCheckResult`、`ComplianceIssue` 作为单据字段
- 规则引擎在草稿生成后自动执行扫描，输出 `passed / warning / blocked`
- 规则按 `severity` 区分 `warning` 与 `blocker`
- 提交审核前再次扫描，若存在 `blocker` 则返回 `409`
- 存储层在启动时兼容旧单据结构，自动补齐合规字段

### 存储设计

- 使用 `server/data/documents.json` 作为默认本地持久化文件
- 服务启动时加载已有单据快照
- 单据创建、重新生成、提审、审核、发布后立即落盘
- 存储层与路由解耦，后续可替换为 SQLite / PostgreSQL

### 核心数据结构

- `WritingTemplate`
- `EnterpriseDocument`
- `WorkflowAuditLog`
- `ComplianceCheckResult`
- `ComplianceIssue`

### 状态机

- `draft -> in_review -> approved -> published`
- `in_review -> rejected`
- `rejected -> in_review` 通过作者修改后再次提交实现

## 异常处理

- 参数缺失返回 `400`
- 角色不匹配返回 `403`
- 单据不存在返回 `404`
- 状态流转非法返回 `409`
- 品牌规则阻断返回 `409`，并直接返回合规摘要给前端

## AC 映射

- AC-001 / AC-005：草稿生成接口 + 前端表单校验
- AC-002 / AC-006：提交审核接口 + 状态限制
- AC-003 / AC-008：审核接口 + 驳回原因校验
- AC-004：发布接口 + 发布角色校验
- AC-007：所有接口统一角色校验
- AC-009 / AC-010：审计日志与版本号机制
- AC-011：草稿生成后自动执行品牌规则扫描
- AC-012：提审前阻断 `blocked` 状态
- AC-013：前端展示合规结果与整改建议
