# 大模型开发入门教学讲义

这份讲义适合两种使用方式：

1. 团队内部培训：按 1 到 2 天 workshop 讲完
2. 个人自学：按 7 天节奏边看边跑

配套主教程：`codex/llm_development_beginner_tutorial.md`

配套工程入口：`codex/README.md`

分章课程：[course/index.md](./index.md)

排障手册：[troubleshooting.md](./troubleshooting.md)

---

## 1. 学习目标

完成这套练习后，学习者应该能做到：

- 说清楚预训练、SFT、蒸馏、评测、部署分别解决什么问题
- 看懂一个最小大模型工程目录
- 把原始问答数据清洗成 SFT 训练格式
- 跑通一个 CPU 教学型训练闭环
- 理解 QLoRA 在 GPU 上的基本运行方式
- 用业务评测和最近训练样本对照分析模型输出
- 知道模型回答不好时，应该先查数据、评测还是部署配置

---

## 2. 建议课程安排

### 半天版

适合只做概览和演示。

1. 讲解全流程：数据、预训练、微调、蒸馏、评测、部署
2. 现场跑 `make env-check`
3. 现场跑 `make prepare-sft`
4. 现场跑 `make pipeline-local`
5. 讲解评测报告和最近训练样本对照

### 一天版

适合让学习者亲自操作。

上午：

1. 通读主教程的第 1 到 5 章
2. 跑环境检查
3. 跑数据清洗
4. 讲解 SFT 数据格式和 assistant-only loss

下午：

1. 跑 CPU 教学型 demo
2. 用 REPL 连续测试模型
3. 跑相似样本检索
4. 生成评测报告
5. 复盘模型为什么会过拟合

### 两天版

适合团队训练营。

第一天：

1. 原理讲解
2. 数据清洗
3. CPU demo
4. 评测分析

第二天：

1. GPU QLoRA 实战说明
2. LoRA 合并和 vLLM 部署说明
3. 业务评测报告
4. 小组复盘和下一步数据改进计划

---

## 3. 课前准备

学习者需要：

- 会使用命令行
- 会读基础 Python
- 知道 JSON / JSONL 是什么
- 本机能运行 Python 3.10 或 3.11

可选：

- NVIDIA GPU
- CUDA 环境

如果没有 GPU，也可以完成 CPU 教学型闭环。

---

## 4. 第一组练习：环境检查

命令：

```bash
make env-check
```

学习者需要观察：

- Python 版本
- PyTorch 版本
- 是否有 CUDA
- 是否安装 `trl`
- 是否安装 `bitsandbytes`
- 是否安装 `vllm`

讲解重点：

- 没有 CUDA 不代表不能学，只是不能高效跑 QLoRA
- `trl` 负责 SFTTrainer 等训练流程
- `bitsandbytes` 是 QLoRA 4bit 量化的关键依赖
- `vllm` 主要用于部署和推理服务

---

## 5. 第二组练习：数据清洗

命令：

```bash
make prepare-sft
```

输入：

```text
data/raw/customer_support_raw.jsonl
```

输出：

```text
data/sft/customer_support_prepared.jsonl
outputs/data_prep/customer_support_rejected.jsonl
outputs/data_prep/prepare_sft_summary.json
```

学习者需要回答：

- 哪些样本被接受了
- 哪些样本被拒绝了
- 为什么重复样本要删掉
- 为什么过短样本要删掉
- 为什么被拒绝样本也要保存

讲解重点：

- 微调不是把所有数据都塞进去
- 数据质量比数据数量更先决定结果
- 清洗配置应该可追溯

---

## 6. 第三组练习：CPU 本地闭环

命令：

```bash
make pipeline-local
```

它会依次执行：

1. 数据清洗
2. 本地聊天 demo tokenizer 训练
3. 本地聊天 demo 预训练
4. 最小 CPU SFT
5. 本地单次推理
6. 相似训练样本检索
7. 样例评测报告生成

讲解重点：

- 这条链路不是为了得到高质量模型
- 它的价值是让学习者第一次看见完整工程流动起来
- 教学型模型输出不好很正常，关键是能定位为什么不好

---

## 7. 第四组练习：交互式推理

命令：

```bash
make infer-repl
```

可输入：

```text
可以开发票吗？
订单显示已签收但我没收到怎么办？
/clear
/exit
```

学习者需要观察：

- 模型是否容易重复
- 模型是否混入训练样本片段
- 模型是否能保持客服角色
- 上下文历史是否影响回答

讲解重点：

- 推理脚本是调试工具，不是正式产品
- REPL 能快速暴露重复、串样本、格式漂移等问题

---

## 8. 第五组练习：判断是否背训练集

命令：

```bash
make retrieve-similar
make retrieve-semantic
```

也可以在推理时一起看：

```bash
python scripts/infer_minimal.py \
  --config configs/infer_minimal_cpu_local.json \
  --prompt "订单显示已签收但我没有收到，该怎么办？" \
  --show-similar
```

学习者需要判断：

- 当前问题是否和训练样本高度相似
- 模型输出是否直接复用了训练答案片段
- 评测分数是否可能虚高

讲解重点：

- `lexical` 更适合发现同表述背题
- `embedding` 更适合发现语义接近样本
- 业务评测不能只看分数

---

## 9. 第六组练习：评测报告

命令：

```bash
make report-eval-sample
```

输出：

```text
outputs/eval/customer_report.sample.md
```

学习者需要检查：

- 评测问题
- 参考答案
- 模型预测
- Keyword Coverage
- 最近训练样本

讲解重点：

- 评测报告是团队复盘材料
- 报告要能帮助人判断下一步该改数据、模型还是提示词

---

## 10. GPU QLoRA 补充练习

如果有 GPU，继续阅读：

[qlora_gpu_walkthrough.md](./qlora_gpu_walkthrough.md)

建议命令：

```bash
make env-check
make prepare-sft
make sft-8gb
```

或：

```bash
make sft-16gb
```

学习者需要理解：

- 为什么 QLoRA 要用 4bit 加载基座模型
- 为什么 LoRA 只训练 adapter
- 为什么训练后常需要合并 LoRA
- 为什么上线前必须做业务评测

---

## 11. 结课验收

学习者能完成下面任务，就可以认为已经入门：

1. 解释 SFT 数据中的 `system`、`user`、`assistant`
2. 运行 `make prepare-sft` 并解释输出统计
3. 运行 `make pipeline-local`
4. 用 `make infer-repl` 问至少 3 个问题
5. 用 `make retrieve-similar` 判断一个问题是否接近训练样本
6. 打开评测报告并指出至少一个模型问题
7. 说出 GPU QLoRA 路线下一步该怎么跑

---

## 12. 讲师提示

讲这套课时，不要把重点放在“模型输出看起来聪不聪明”。

更重要的是让学习者形成工程直觉：

- 数据是训练的起点
- 训练只是链路中间的一步
- 评测决定你是否真的进步
- 部署前必须考虑成本和稳定性
- 分析工具能帮助你避免被表面分数骗到

学到这一步，新手就不再只是“调用大模型 API 的人”，而是开始理解模型开发工程的人。

---

## 13. 常见卡点处理

课堂上如果学习者遇到问题，优先让他们查：

```text
docs/troubleshooting.md
```

建议讲师现场强调一个习惯：

先判断问题属于环境、数据、训练、推理、评测还是部署，再动手改配置。这样排障会快很多。
