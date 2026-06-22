# 学习进度表

这份进度表用于安排学习节奏。你可以把每个勾选项当成一个小里程碑：不是“看过”，而是“能运行、能找到产物、能解释原因”。

## 使用方式

建议每章完成后填写四件事：

```text
读完正文
运行关键命令
找到关键产物
完成测试题
```

如果某章因为没有 GPU 或模型服务不能运行，勾选“读懂命令和前提”，并在备注里写清楚缺少什么条件。

## 推荐学习节奏

### 轻量体验：30 分钟

| 状态 | 任务 | 命令或产物 | 备注 |
| --- | --- | --- | --- |
| [ ] | 检查环境 | `make env-check` | 确认 Python、PyTorch、CUDA、可选依赖 |
| [ ] | 生成样例报告 | `make report-eval-sample` | 不需要模型服务 |
| [ ] | 检索相似样本 | `make retrieve-similar` | 理解过拟合分析的入口 |
| [ ] | 阅读课程首页 | `docs/course/index.md` | 确认自己走 CPU 还是 GPU 路线 |

### CPU 教学路线：建议 3 到 5 天

| 状态 | 章节 | 目标 | 关键命令或产物 | 测试 |
| --- | --- | --- | --- | --- |
| [ ] | 附录 | 补齐基础概念 | 最小 PyTorch 练习 | [测试题](./chapter-quizzes.md) |
| [ ] | 00 | 理解工程骨架 | `make env-check` | [测试题](./chapter-quizzes.md) |
| [ ] | 01 | 看懂全流程 | `make pipeline-local` | [测试题](./chapter-quizzes.md) |
| [ ] | 02 | 选择学习路线 | `recommended_sft_config` | [测试题](./chapter-quizzes.md) |
| [ ] | 03 | 清洗 SFT 数据 | `make prepare-sft` | [测试题](./chapter-quizzes.md) |
| [ ] | 04 | 训练 tokenizer | `make tokenizer-chat-demo` | [测试题](./chapter-quizzes.md) |
| [ ] | 05 | tiny 预训练 | `make pretrain-chat-demo` | [测试题](./chapter-quizzes.md) |
| [ ] | 06 | 最小 SFT | `make sft-minimal` | [测试题](./chapter-quizzes.md) |
| [ ] | 09 | 业务评测 | `make report-eval-sample` | [测试题](./chapter-quizzes.md) |
| [ ] | 10 | 本地推理 | `make infer-repl` | [测试题](./chapter-quizzes.md) |
| [ ] | 13 | 毕业项目 | 项目报告 | [测试题](./chapter-quizzes.md) |

### GPU QLoRA 路线：建议 3 到 5 天

| 状态 | 章节 | 目标 | 关键命令或产物 | 前提 |
| --- | --- | --- | --- | --- |
| [ ] | 07 | 跑 QLoRA 微调 | `make sft-8gb` / `make sft-16gb` / `make sft-24gb` | Linux + NVIDIA GPU + CUDA |
| [ ] | 07 | 理解 adapter | LoRA adapter 输出目录 | `peft`、`trl`、`bitsandbytes` |
| [ ] | 08 | teacher 生成 | `make distill-generate` | OpenAI 兼容 teacher 服务 |
| [ ] | 08 | student 训练 | `make distill-train` | GPU 和训练依赖 |
| [ ] | 11 | 合并模型 | `make merge-lora` | base model + adapter |
| [ ] | 11 | 启动服务 | `make serve-vllm` | vLLM + GPU |
| [ ] | 12 | 生产检查 | 上线前检查清单 | 评测报告和服务指标 |
| [ ] | 13 | GPU 版毕业项目 | 完整项目报告 | 训练、部署、评测闭环 |

如果没有 GPU，也可以把 GPU 路线当成阅读路线。完成标准改为：

```text
能解释命令前提
能解释输入输出
能解释为什么当前机器不能运行
```

## 每章完成标准

| 章节 | 必须能解释 | 必须能找到或运行 |
| --- | --- | --- |
| 附录 | loss、梯度、Transformer、PyTorch / TensorFlow 的位置 | 最小 PyTorch 练习 |
| 00 | 为什么要拆目录和配置 | `scripts/common.py`、`scripts/env_check.py`、`Makefile` |
| 01 | pipeline-local 的阶段顺序 | `make pipeline-local` |
| 02 | CPU / GPU 路线如何选择 | `make env-check` 输出 |
| 03 | 原始数据如何变成 messages | `data/sft/customer_support_prepared.jsonl` |
| 04 | tokenizer 如何把文本变成 token id | `outputs/tokenizer_chat_demo/` |
| 05 | next-token prediction | `outputs/pretrain_chat_demo/` |
| 06 | 为什么只训练 assistant 回复 | `outputs/sft_minimal_cpu_local/` |
| 07 | LoRA、QLoRA、adapter、merged model | 显存配置和 adapter 输出 |
| 08 | teacher / student / 蒸馏数据 | teacher answers 和 student adapter |
| 09 | loss 与业务评测的区别 | 样例评测报告、相似样本结果 |
| 10 | prompt、生成参数和 REPL 调试 | `make infer-minimal`、`make infer-repl` |
| 11 | vLLM 服务和 OpenAI 兼容接口 | `scripts/serve_vllm.sh` |
| 12 | 上线前必须检查什么 | 生产检查清单 |
| 13 | 如何复盘完整项目 | 毕业项目报告 |

## 个人学习记录

| 日期 | 学到哪里 | 跑过的命令 | 遇到的问题 | 下一步 |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |
|  |  |  |  |  |

## 里程碑

### 里程碑一：能跑起来

完成条件：

- [ ] `make env-check` 成功
- [ ] `make report-eval-sample` 成功
- [ ] `make retrieve-similar` 成功
- [ ] 知道当前机器是否适合 GPU 路线

### 里程碑二：理解本地闭环

完成条件：

- [ ] `make pipeline-local` 成功
- [ ] 能解释 `data/`、`configs/`、`scripts/`、`outputs/` 的职责
- [ ] 能说出 tokenizer、pretraining、SFT 的衔接关系
- [ ] 能解释 tiny 模型效果差为什么不代表流程失败

### 里程碑三：会评测和调试

完成条件：

- [ ] 能生成样例评测报告
- [ ] 能运行相似样本检索
- [ ] 能用 REPL 做多轮调试
- [ ] 能区分泛化、背题和 prompt 问题

### 里程碑四：读懂 GPU 路线

完成条件：

- [ ] 能解释 LoRA 和 QLoRA 的区别
- [ ] 能解释为什么需要 CUDA、`bitsandbytes` 和 `trl`
- [ ] 能根据显存选择 `sft-8gb`、`sft-16gb` 或 `sft-24gb`
- [ ] 能解释 adapter 和 merged model 的区别

### 里程碑五：完成毕业项目

完成条件：

- [ ] 有一份项目目标说明
- [ ] 有数据清洗记录
- [ ] 有训练路线记录
- [ ] 有至少 5 条推理样例
- [ ] 有评测报告
- [ ] 有失败样例分析
- [ ] 有下一轮改进计划

## 常见卡点记录

| 卡点 | 优先检查 |
| --- | --- |
| 命令找不到文件 | 是否在项目根目录、上游产物是否已生成 |
| Python 包缺失 | `make env-check`、当前虚拟环境是否正确 |
| QLoRA 跑不动 | CUDA、GPU 显存、`bitsandbytes`、`trl` |
| 推理输出很差 | 数据、训练轮数、prompt、生成参数、模型规模 |
| 评测结果看不懂 | 先读第 09 章，再看样例 predictions 和报告 |
| Mermaid 图不显示 | 换支持 Mermaid 的 Markdown 预览器；文字说明仍可阅读 |

## 最终自评

学完后，给自己打分：

| 能力 | 1 分 | 3 分 | 5 分 | 自评分 |
| --- | --- | --- | --- | --- |
| 工程结构 | 只能照着跑 | 能找到输入输出 | 能独立解释和改配置 |  |
| 数据处理 | 看不懂 JSONL | 能解释 messages | 能设计清洗规则 |  |
| 训练理解 | 只看 loss | 能解释 SFT | 能分析过拟合和配置影响 |  |
| 推理调试 | 只会运行命令 | 能改 prompt 和参数 | 能定位数据/训练/推理问题 |  |
| 评测复盘 | 只看一个分数 | 能读报告 | 能提出下一轮改进计划 |  |
| 部署理解 | 不懂服务 | 知道 vLLM 入口 | 能说明部署前提和生产风险 |  |
