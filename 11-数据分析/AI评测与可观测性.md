<!--
  文件描述: 企业 AI 评测数据、发布门禁、线上可观测和持续运营闭环
  版本号: v1.0.0
  最后更新时间: 2026-08-12
-->

# AI 评测与可观测性：从离线黄金集到线上业务结果

> 评测回答“新版本能否发布”，可观测性回答“生产环境正在发生什么”，业务分析回答“投入是否产生价值”。大型企业需要把三者连接成同一个闭环。

## 一、完整闭环

```text
业务目标与风险
  → 黄金数据集与切片
  → 离线组件/任务评测
  → 发布回归门禁
  → 灰度与在线实验
  → Trace、反馈、事件和业务指标
  → Bad Case 分流与根因分析
  → 数据/Prompt/模型/流程改进
  → 回写黄金集并再次回归
```

## 二、先建立评测资产，而不是先选工具

| 资产 | 内容 | Owner |
| --- | --- | --- |
| 用例清单 | 场景、用户、频率、业务价值、风险等级 | 产品 + 业务 |
| 黄金集 | 输入、上下文、期望/禁止行为、引用、工具路径 | 领域专家 + 产品 |
| 评分规则 | 指标定义、阈值、人工 Rubric、裁判 Prompt | 产品 + 算法/测试 |
| 切片 | 角色、权限、语言、长尾、攻击、业务风险 | 产品 + 风险团队 |
| 运行记录 | 数据集/Prompt/模型/代码版本与结果 | 工程/评测平台 |
| Bad Case 库 | 现象、严重度、根因、修复、回归用例 | 产品 Owner |

## 三、黄金集版本规范

```yaml
dataset_name: customer-service-golden
version: 1.4.0
owner: ai-cs-product
source_window: 2026-Q2
consent_and_usage: internal-evaluation-only
pii_status: deidentified
slices:
  - common
  - long_tail
  - vip_policy
  - prompt_injection
  - permission_boundary
review_policy:
  double_review_risk_tier: high
  expiry_days: 180
change_log:
  - added: 25
  - modified: 8
  - removed: 2
```

版本规则建议：修正文案但不改变语义用 Patch；新增样本/切片用 Minor；改变评分标准或任务定义用 Major。历史版本不可被静默覆盖。

## 四、指标分层与诊断关系

| 层级 | 指标示例 | 可以回答 |
| --- | --- | --- |
| 检索/组件 | Recall@K、Rerank 命中、Schema 通过率、工具参数正确率 | 哪个组件坏了 |
| 端到端任务 | 成功率、忠实性、引用完整、步骤效率、拒答正确率 | 用户任务是否完成 |
| 运行可靠性 | P50/P95/P99 延迟、错误率、超时、重试、降级 | 服务是否稳定 |
| 安全治理 | 注入成功率、权限泄漏、未确认高风险动作、策略拒绝 | 控制是否有效 |
| 产品体验 | 采用率、修改率、复用率、接管率、满意度 | 用户是否信任和使用 |
| 业务结果 | AHT、一次解决率、收入、返工、风险损失避免 | 项目是否值得继续 |
| 经济性 | 单成功任务成本、每千次成本、人工复核成本、边际成本 | 是否可规模化 |

不要用总平均掩盖高风险切片。例如总体成功率 92%，但 VIP 退款场景只有 65%，产品仍不应发布。

## 五、LLM-as-a-Judge 的正确用法

模型裁判适合扩大覆盖和提高回归速度，但必须：

1. 先由领域专家定义 Rubric 与锚点样本。
2. 隐藏候选模型/方案身份，减少位置和品牌偏差。
3. 同时报告裁判与人工的一致率、分歧切片和置信区间。
4. 对安全、合规、高金额决策保留人工最终判断。
5. 版本化裁判模型和 Prompt；裁判升级也要做回归。
6. 防止被评内容中的指令影响裁判，隔离数据与评分指令。

## 六、发布门禁模板

```yaml
release: rag-assistant-2.3.0
candidate_model: provider/model-version
dataset_version: golden-1.4.0
gates:
  task_success_rate: ">= 0.88"
  critical_slice_regression: "<= 0"
  permission_leak_count: "= 0"
  unauthorized_write_count: "= 0"
  p95_latency_ms: "<= 4000"
  cost_per_success_cny: "<= 0.35"
approvals:
  product_owner: required
  engineering_owner: required
  risk_owner: required_if_high_risk
rollback_trigger:
  - severe_incident
  - task_success_drop_gt_5pct
```

阈值必须来自当前生产基线、业务容忍度和风险要求，不应照抄示例。

## 七、Trace 事件模型

一次用户任务应使用同一个 `trace_id` 串起：

```json
{
  "trace_id": "tr_123",
  "task_id": "task_456",
  "tenant_id": "tenant_a",
  "user_role": "service_agent",
  "use_case": "refund_policy_query",
  "risk_tier": "medium",
  "prompt_version": "cs-12",
  "policy_version": "refund-7",
  "model": "provider/model-version",
  "retrieval": {"source_ids": ["kb_1"], "latency_ms": 180},
  "tools": [{"name": "order_lookup", "status": "success"}],
  "outcome": "completed",
  "latency_ms": 2200,
  "cost_cny": 0.18,
  "feedback": null
}
```

### 日志红线

- 不默认记录完整 Prompt、文档和工具结果；根据调试价值做字段级最小化。
- 敏感字段脱敏/令牌化，访问日志本身也要有权限和审计。
- 建立留存期限、删除流程和调试采样率，不以“将来可能有用”为由永久保存。
- Trace 用于诊断，不应成为监控员工的隐性工具。

## 八、Bad Case 分流表

| 表象 | 优先检查 | 常见修复 Owner |
| --- | --- | --- |
| 找不到正确内容 | 数据同步、切分、召回、权限过滤 | 数据/RAG 团队 |
| 找到内容但答错 | 上下文组装、Prompt、模型、引用约束 | 算法/产品 |
| 工具调用失败 | Schema、参数、鉴权、超时、下游 SLA | 工程/平台 |
| 做了不该做的动作 | 意图判断、工具分级、策略、确认 | 产品/安全 |
| 用户频繁修改 | 输出格式、业务规则、操作流程 | 产品/领域专家 |
| 成功但成本过高 | 重复步骤、上下文、路由、失败重试 | 产品/架构/FinOps |

## 九、运营节奏

| 频率 | 会议/动作 | 决策 |
| --- | --- | --- |
| 每日 | P0/P1 事件和异常消费 | 熔断、回滚、临时策略 |
| 每周 | Top Bad Case 与指标切片 | 修复优先级、补充黄金集 |
| 每月 | 业务价值、SLO、成本与风险 | 扩量、降本、流程调整 |
| 每季度 | 模型/供应商重评与数据集校准 | 路由、合同、路线图 |

## 十、AI 产品经理验收

- [ ] 指标能从组件追踪到任务、用户和业务结果。
- [ ] 黄金集有 Owner、版本、切片、授权与过期复核机制。
- [ ] 发布门禁能自动阻止关键退化，不只生成报告。
- [ ] 模型裁判经过人工校准，并能看到分歧。
- [ ] Trace 能定位根因，同时符合数据最小化要求。
- [ ] 每个 Bad Case 都能进入明确的 Owner 和回归用例。
- [ ] 能用单成功任务成本而不是单次调用价格评估经济性。
