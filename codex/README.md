# 大模型开发入门课程与脚本模板

这个仓库同时包含一套分章课程和一套最小可运行工程。推荐先从 [docs/course/index.md](/Users/luoqingxiang/Documents/codex/docs/course/index.md) 进入课程；如果机器学习、深度学习、神经网络、Transformer 或 PyTorch / TensorFlow 基础还不牢，可以先读 [基础知识附录](/Users/luoqingxiang/Documents/codex/docs/course/appendix-foundations.md)，遇到生词则查 [术语表](/Users/luoqingxiang/Documents/codex/docs/course/glossary.md)，学完每章用 [章节测试题](/Users/luoqingxiang/Documents/codex/docs/course/chapter-quizzes.md) 自测，并在 [学习进度表](/Users/luoqingxiang/Documents/codex/docs/course/learning-progress.md) 记录进度。

课程围绕同一个案例展开：

```text
电商客服助手
```

你会从数据清洗开始，依次走过 tokenizer、教学型预训练、SFT、LoRA / QLoRA、蒸馏、评测、本地推理、vLLM 部署和生产检查。仓库里的脚本不是孤立示例，而是服务于这条完整链路。

模板默认把 Hugging Face 缓存写到项目内的 `.cache/huggingface/`，这样在受限环境、远端开发机或容器里更容易直接跑通。

## 目录结构

```text
.
├── README.md
├── Makefile
├── requirements.txt
├── configs/
├── data/
├── docs/
├── scripts/
└── llm_development_beginner_tutorial.md
```

## 先从哪里开始

如果你是第一次学习，建议按下面顺序：

1. 阅读 [课程目录](/Users/luoqingxiang/Documents/codex/docs/course/index.md)，理解 00 到 13 章的整体路线。
2. 如果基础概念不稳，先读 [基础知识附录](/Users/luoqingxiang/Documents/codex/docs/course/appendix-foundations.md)。
3. 遇到 `loss`、`adapter`、`bf16`、`vLLM` 等术语时，查 [术语表](/Users/luoqingxiang/Documents/codex/docs/course/glossary.md)。
4. 打开 [学习进度表](/Users/luoqingxiang/Documents/codex/docs/course/learning-progress.md)，选择 CPU 教学路线或 GPU QLoRA 路线。
5. 运行 `make env-check`，确认当前机器适合哪条路线。
6. 没有 NVIDIA GPU 时，先跑 `make pipeline-local`，把完整教学闭环跑通。
7. 有 Linux + NVIDIA GPU 时，再进入 `make sft-8gb` / `make sft-16gb` / `make sft-24gb`。
8. 学完每章后，用 [章节测试题](/Users/luoqingxiang/Documents/codex/docs/course/chapter-quizzes.md) 自测。
9. 做完训练后，用评测、推理和相似样本分析判断模型是否真的可用。

## 推荐运行路线

### 30 分钟快速体验

先用三条轻量命令确认环境和样例工具可用：

```bash
make env-check
make report-eval-sample
make retrieve-similar
```

这条路径不会启动长时间训练，也不要求 GPU。

### CPU 教学路线

适合 macOS、本地笔记本、没有 NVIDIA GPU 的服务器，也适合课堂演示和自测。

```bash
make env-check
make pipeline-local
make infer-repl
make retrieve-similar
make report-eval-sample
```

这条路线会真实运行数据清洗、tokenizer 训练、tiny 预训练、最小 SFT、本地推理和样例评测报告，但它不追求模型质量。tiny 模型和小样本只是为了让你看懂工程链路。

### GPU QLoRA 路线

适合 Linux + NVIDIA GPU 环境。先准备数据，再按显存选择配置：

```bash
make env-check
make prepare-sft
make sft-8gb
```

或按显存选择：

```bash
make sft-16gb
make sft-24gb
```

训练完成后可以继续：

```bash
make merge-lora
make serve-vllm MODEL=outputs/qwen25_cs_merged
make eval-business
make report-eval
```

`make eval-business` 和蒸馏生成默认访问 OpenAI 兼容接口；如果你使用本地 vLLM，需要先启动服务。

## 一键命令入口

查看所有命令：

```bash
make help
```

常用命令：

```bash
make env-check
make prepare-sft
make pipeline-local
make infer-repl
make retrieve-similar
make retrieve-semantic
make analyze-preds
make report-eval-sample
make sft-8gb
make sft-16gb
make merge-lora
make serve-vllm
make eval-business
```

覆盖默认配置：

```bash
make sft SFT_CONFIG=configs/my_sft.json
make serve-vllm MODEL=outputs/my_merged_model
```

## 1. 安装依赖

```bash
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

如果你要做多卡或正式部署，再额外安装：

```bash
pip install deepspeed
pip install vllm
```

## 2. 环境检查

```bash
make env-check
```

它会输出：

- Python 与核心依赖版本
- PyTorch / CUDA / GPU 信息
- `trl`、`bitsandbytes`、`vllm` 是否可用
- 推荐使用哪份 SFT 配置

没有 CUDA 也没关系，可以先跑 CPU 教学链路。

## 3. 数据准备

如果你手里是比较原始的客服问答 JSONL，可以先清洗成 SFT 格式：

```bash
make prepare-sft
```

这一步会做：

- 过滤低质量样本
- 过滤过短问题或回答
- 去重
- 统一转成 `messages` 格式
- 把被拒绝样本单独输出，方便复查

样例原始输入：[customer_support_raw.jsonl](/Users/luoqingxiang/Documents/codex/data/raw/customer_support_raw.jsonl)

清洗配置：[prepare_sft_data.json](/Users/luoqingxiang/Documents/codex/configs/prepare_sft_data.json)

输出示例：

```text
data/sft/customer_support_prepared.jsonl
outputs/data_prep/customer_support_rejected.jsonl
outputs/data_prep/prepare_sft_summary.json
```

## 4. 本地教学 Pipeline

如果你想一次性跑完最适合新手练习的本地闭环：

```bash
make pipeline-local
```

它会依次完成：

- 原始数据清洗
- 本地聊天 demo tokenizer 训练
- 本地聊天 demo 预训练
- 最小 CPU SFT
- 本地推理和相似训练样本显示
- 样例评测报告生成

这条命令适合课堂演示、个人自测和快速确认工程模板是否可用。它不是为了产出高质量模型，而是为了跑通模型开发链路。

## 5. Tokenizer 与预训练

训练基础 tokenizer：

```bash
make tokenizer
```

或显式运行：

```bash
python scripts/train_tokenizer.py --config configs/train_tokenizer.json
```

跑教学型预训练：

```bash
make pretrain
```

如果你想跑更适合本地聊天 demo 的小基座：

```bash
make tokenizer-chat-demo
make pretrain-chat-demo
```

## 6. 微调

### 6.1 QLoRA 微调

默认示例配置使用 `Qwen/Qwen2.5-0.5B-Instruct` 作为基座模型。

```bash
python scripts/sft_train.py --config configs/sft_qlora.json
```

按显存选择预设：

```bash
make sft-8gb
make sft-16gb
make sft-24gb
```

如果显存不足：

- 把 `per_device_train_batch_size` 调小
- 把 `max_seq_length` 调小
- 保持 `load_in_4bit=true`

GPU 实战说明：[qlora_gpu_walkthrough.md](/Users/luoqingxiang/Documents/codex/docs/qlora_gpu_walkthrough.md)

### 6.2 最小 CPU SFT

如果当前环境缺少 `trl`，或者只是想在 CPU 上验证 SFT 训练链路：

```bash
make sft-minimal
```

这条链路的特点：

- 不依赖 `trl`
- 不依赖 `bitsandbytes`
- 训练时只对 assistant 回复部分计算 loss
- 适合调试数据格式、tokenizer、Trainer 和输出目录

## 7. 本地推理与调试

单次推理：

```bash
make infer-minimal
```

临时换一个问题：

```bash
python scripts/infer_minimal.py \
  --config configs/infer_minimal_cpu_local.json \
  --prompt "订单待揽收超过 48 小时怎么办？"
```

交互式 REPL：

```bash
make infer-repl
```

REPL 支持：

- `/clear`：清空会话历史
- `/exit`：退出 REPL

## 8. 相似样本与过拟合分析

检查问题是否和训练样本太像：

```bash
make retrieve-similar
```

指定自己的问题：

```bash
python scripts/retrieve_similar_examples.py \
  --config configs/retrieve_similar_examples.json \
  --query "订单显示已签收但我没有收到，该怎么办？"
```

embedding 版语义检索：

```bash
make retrieve-semantic
```

单次推理时一并显示相似样本：

```bash
python scripts/infer_minimal.py \
  --config configs/infer_minimal_cpu_local.json \
  --prompt "订单显示已签收但我没有收到，该怎么办？" \
  --show-similar
```

经验上：

- `lexical` 更适合发现几乎同表述的“背题”
- `embedding` 更适合发现换一种问法但语义接近的样本

## 9. 业务评测与报告

运行业务评测：

```bash
python scripts/eval_business.py --config configs/eval_business.json
```

这个脚本默认通过 OpenAI 兼容接口访问模型服务，适合直接评测本地 `vLLM` 服务。

查看预测结果摘要：

```bash
make analyze-preds
```

生成 Markdown 报告：

```bash
make report-eval
```

没有真实 API 评测结果时，可以先用样例预测生成报告：

```bash
make report-eval-sample
```

样例报告：[customer_report.sample.md](/Users/luoqingxiang/Documents/codex/outputs/eval/customer_report.sample.md)

## 10. 蒸馏

先准备 teacher 服务，例如本地 `vLLM` 或远端 OpenAI 兼容 API，然后执行：

```bash
python scripts/distill_generate.py --config configs/distill_generate.json
```

再用生成的蒸馏数据训练 student：

```bash
python scripts/distill_train.py --config configs/distill_train.json
```

## 11. 合并 LoRA 权重

如果你微调得到的是 adapter，部署前建议先合并：

```bash
python scripts/merge_lora.py --config configs/merge_lora.json
```

## 12. vLLM 部署

```bash
bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

多卡部署：

```bash
TP_SIZE=2 bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

## 13. 配套文档

主教程：[llm_development_beginner_tutorial.md](/Users/luoqingxiang/Documents/codex/llm_development_beginner_tutorial.md)

分章课程：[course/index.md](/Users/luoqingxiang/Documents/codex/docs/course/index.md)

基础知识附录：[appendix-foundations.md](/Users/luoqingxiang/Documents/codex/docs/course/appendix-foundations.md)

术语表：[glossary.md](/Users/luoqingxiang/Documents/codex/docs/course/glossary.md)

章节测试题：[chapter-quizzes.md](/Users/luoqingxiang/Documents/codex/docs/course/chapter-quizzes.md)

学习进度表：[learning-progress.md](/Users/luoqingxiang/Documents/codex/docs/course/learning-progress.md)

GPU QLoRA 实战：[qlora_gpu_walkthrough.md](/Users/luoqingxiang/Documents/codex/docs/qlora_gpu_walkthrough.md)

教学讲义：[training_handout.md](/Users/luoqingxiang/Documents/codex/docs/training_handout.md)

排障手册：[troubleshooting.md](/Users/luoqingxiang/Documents/codex/docs/troubleshooting.md)

## 14. 数据格式约定

### 14.1 预训练语料

纯文本，每行一条：

```text
人工智能正在改变软件开发方式。
请帮我总结下面这段话。
```

### 14.2 SFT / 蒸馏训练数据

推荐 JSONL，每行一条，字段为 `messages`：

```json
{
  "messages": [
    { "role": "system", "content": "你是一个电商客服助手。" },
    { "role": "user", "content": "可以开发票吗？" },
    { "role": "assistant", "content": "可以，请提供订单号、抬头和税号。" }
  ]
}
```

### 14.3 业务评测集

推荐 JSONL，至少包含 `question` 和 `reference`，可选 `required_keywords`：

```json
{
  "question": "订单已签收但我没收到怎么办？",
  "reference": "请先核实签收人和快递柜信息，再发起物流核查。",
  "required_keywords": ["签收人", "物流核查"]
}
```

## 15. 最小闭环命令

CPU 教学闭环：

```bash
make pipeline-local
```

GPU QLoRA 闭环：

```bash
make prepare-sft
make sft-16gb
python scripts/merge_lora.py --config configs/merge_lora.json
bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
python scripts/eval_business.py --config configs/eval_business.json
make report-eval
```

最小 smoke test：

```bash
make smoke
```

## 16. 注意事项

- 这些脚本优先面向“单机单卡入门”设计，正式生产环境请再接入 `accelerate`、FSDP 或 DeepSpeed。
- `bitsandbytes` 和 `vllm` 对 CUDA 环境较敏感，安装前先确认驱动和 CUDA 版本。
- 样例数据很小，只是为了跑通流程，不代表真实业务质量。
- `distill_generate.py` 和 `eval_business.py` 默认走 OpenAI 兼容接口，所以很适合接入本地 `vLLM`。
- 遇到报错先看 [troubleshooting.md](/Users/luoqingxiang/Documents/codex/docs/troubleshooting.md)，通常能更快定位问题属于环境、数据、训练、推理、评测还是部署。
