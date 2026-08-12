<!--
  文件描述: A2A 与 MCP 的边界、企业采用方法和产品验收方案
  版本号: v1.0.0
  最后更新时间: 2026-08-12
-->

# A2A 协议与企业 Agent 协作

> A2A（Agent2Agent Protocol）用于独立 Agent 之间的发现、任务委派和结果交换；MCP 用于 Agent 与工具、资源之间的连接。二者互补，但都不应替代普通 API、工作流和清晰的业务边界。

## 一、先用一句话判断是否需要 A2A

只有当两个系统都具备独立 Agent 身份、独立能力边界、可能由不同团队或厂商维护，而且需要在不暴露内部实现的前提下协作时，才优先评估 A2A。

以下情况通常不需要：

- 单应用内部三个固定步骤：使用代码或工作流。
- Agent 调用数据库、搜索、CRM：使用 API 或 MCP。
- 为了显得“智能”把每个函数包装成 Agent：保持函数/服务即可。
- 同一团队内两个高度耦合模块：先使用内部接口和事件。

## 二、API、MCP、A2A 的产品边界

| 维度 | 普通 API/事件 | MCP | A2A |
| --- | --- | --- | --- |
| 连接对象 | 系统 ↔ 系统 | Agent/Host ↔ 工具与资源 | 独立 Agent ↔ 独立 Agent |
| 能力发现 | 通常靠文档/OpenAPI | Resources、Prompts、Tools | Agent 能力与任务接口 |
| 典型交互 | 确定性请求或事件 | 读取上下文、调用工具 | 委派长任务、协作、返回产物 |
| 内部实现 | 调用方了解接口语义 | 工具实现可隐藏 | Agent 内存、工具、框架可保持不透明 |
| 首要风险 | 接口与数据安全 | 工具越权、不可信描述 | 身份冒用、委派失控、跨域责任不清 |

## 三、企业案例：采购尽调协作

```text
采购 Agent（任务 Owner）
   ├── A2A → 法务 Agent：合同条款风险审查
   ├── A2A → 安全 Agent：供应商安全问卷审查
   └── A2A → 财务 Agent：TCO 与付款条件分析

每个专业 Agent
   └── MCP → 各自获准的文档、政策库和业务工具
```

这个设计成立的前提是：三个专业 Agent 属于独立责任域，可能有不同数据权限与迭代周期，并且只需交换任务、状态和产物，不应共享完整内部上下文。

### 产品经理要定义的任务契约

```yaml
task_type: vendor_due_diligence
requester_identity: procurement-agent
business_owner: procurement-director
purpose: 新供应商准入
input_artifacts:
  - artifact_id: contract-v3
    classification: confidential
allowed_use: 仅用于本次准入审查
expected_output:
  schema: risk_findings_v2
  required_citations: true
deadline: 2026-08-15T10:00:00+08:00
budget:
  max_cost_cny: 30
  max_duration_minutes: 20
approval_policy: high_risk_finding_requires_human_review
retention: P30D
```

## 四、企业采用的七个控制点

1. **Agent 身份**：每个 Agent 使用可验证的工作负载身份，不冒用最终用户身份。
2. **委派授权**：发起者有权委派，接收者只获得完成当前任务所需的最小权限。
3. **用途约束**：输入产物带分类、用途、留存和再分享限制。
4. **能力信任**：Agent Card/能力声明只能用于发现，不能替代准入、合同和安全审查。
5. **预算与终止**：限制时间、费用、轮次和并发，任务必须可取消。
6. **责任链**：明确任务 Owner、执行 Agent、人工审批人和最终业务责任人。
7. **审计追踪**：保留委派、状态变化、产物、策略判断、版本和异常事件。

## 五、长任务状态机

```text
submitted → accepted → working → input-required → working
                                 ↓
completed ← verifying ← artifact-ready

任意阶段 → cancelled / failed / expired
```

产品不能只设计“成功返回”。还要定义：重复提交如何幂等、输入缺失向谁询问、超时由谁续期、部分产物能否使用、失败是否重试、取消后下游凭证和临时数据如何清理。

## 六、A2A 试点评估表

| 问题 | 通过标准 |
| --- | --- |
| 是否有两个真正独立的 Agent 责任域？ | 团队、权限、能力或供应商至少一项独立 |
| 普通 API/事件为何不足？ | 需要能力发现、长任务或不透明 Agent 协作 |
| 是否减少集成成本？ | 与现有方案对比，接口与维护成本有量化下降 |
| 是否增加不可控性？ | 委派深度、循环、预算、取消和责任均可控制 |
| 数据能否跨边界？ | 数据 Owner、安全/隐私团队已批准用途 |
| 出错能否追责和恢复？ | 有端到端 trace、人工 Owner、补偿与事件流程 |

任一关键问题无法回答时，保持 API/MCP/工作流方案。

## 七、验收指标

| 类别 | 指标 |
| --- | --- |
| 结果 | 端到端任务成功率、产物验收率、业务处理时长 |
| 协作 | 委派接受率、平均往返轮次、input-required 比例 |
| 可靠性 | 超时率、重复任务率、取消生效率、恢复成功率 |
| 安全 | 未授权委派、越权数据访问、违规再分享事件（均应为 0） |
| 经济性 | 单成功任务成本、跨系统集成维护工时、人工协调时间 |

## 八、AI 产品经理交付物

- A2A 采用决策记录：为什么不是 API、MCP 或工作流。
- Agent/责任域地图：身份、Owner、能力、数据与信任等级。
- 任务与产物契约：Schema、状态、预算、时限、确认和留存。
- 威胁模型与异常流：冒用、循环委派、提示注入、产物污染、超时。
- 试点评测报告：与现有集成方式对照业务价值和新增风险。

## 九、阶段验收

- [ ] 能准确解释 MCP 与 A2A 的边界。
- [ ] 能识别“不需要 A2A”的伪多 Agent 场景。
- [ ] 能为跨团队 Agent 设计任务契约、状态机和责任链。
- [ ] 能设计身份、最小权限、预算、取消和审计控制。
- [ ] 能用业务指标证明 A2A 比既有集成方式更有价值。

## 十、参考资料

- [A2A Protocol 官方文档](https://a2a-protocol.org/latest/)，访问于 2026-08-12。
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/latest)，访问于 2026-08-12。
