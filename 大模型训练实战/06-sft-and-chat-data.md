# 06 第六章：SFT 让模型学会回答

学习时长：100 分钟

本章类型：监督微调 + 聊天数据训练

本章产物：一个经过最小 SFT 的本地客服助手教学模型

## 6.0 本章要完成什么

上一章我们训练了一个 tiny causal language model。

它学到的是：

```text
给定前面的 token，预测下一个 token。
```

但客服助手真正需要的是：

```text
给定 system 和 user，生成符合业务规则的 assistant 回复。
```

这就是 SFT 要解决的问题。

SFT 的全称是：

```text
Supervised Fine-Tuning
```

可以翻译成监督微调。

本章会使用第 5 章输出的 tiny 预训练模型：

```text
outputs/pretrain_chat_demo/
```

再用一小份客服 `messages` 数据做最小 SFT，输出到：

```text
outputs/sft_minimal_cpu_local/
```

你会逐步完成：

- 理解 SFT 和预训练的区别
- 理解聊天数据 `messages` 格式
- 理解 prompt text 和 full text 的区别
- 理解为什么只训练 assistant 回复
- 理解 labels 中 `-100` 的作用
- 读取最小 SFT 配置
- 加载第 5 章的预训练模型
- 构造 supervised text
- tokenization 后生成 `input_ids`、`attention_mask`、`labels`
- padding 一个 batch
- 用 `Trainer` 跑最小 CPU SFT
- 检查 SFT 输出目录
- 运行最小推理检查

完成本章后，你应该能回答：

```text
SFT 为什么不是简单地继续预训练？
为什么 system/user 部分不应该计算 loss？
为什么 CPU SFT 只是教学路线，不是生产训练方案？
```

## 6.1 SFT 和预训练有什么区别

第 5 章的预训练目标是：

```text
整段文本都参与 next-token prediction。
```

例如：

```text
系统：你是一个电商客服助手。
用户：可以开发票吗？
助手：可以，请提供订单号、发票抬头和税号。
```

预训练会让模型在每个位置预测下一个 token。

它并不特别区分：

```text
哪些 token 是用户说的
哪些 token 是助手应该回答的
```

SFT 不一样。

SFT 更关心：

```text
在给定 system 和 user 的条件下，assistant 应该输出什么。
```

所以本章会把：

```text
system + user + 助手：
```

作为上下文 prompt，把：

```text
assistant 的具体回答
```

作为训练目标。

这就是 SFT 的核心：

```text
prompt 是条件
answer 是目标
```

## 6.2 为什么只训练 assistant 回复

假设有一条训练样本：

```json
{
  "messages": [
    {"role": "system", "content": "你是一个电商客服助手，回答准确、简洁、可执行。"},
    {"role": "user", "content": "可以开发票吗？"},
    {"role": "assistant", "content": "可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。"}
  ]
}
```

训练时我们希望模型学会：

```text
当看到 system 和 user 后，生成 assistant 回复。
```

不希望模型学会：

```text
生成 system prompt
生成用户问题
```

如果把 system 和 user 也当成训练目标，模型会被鼓励复述提示词和用户问题。

这会让训练目标变得混乱。

所以本章采用：

```text
system/user/助手： -> 不计算 loss
assistant answer   -> 计算 loss
```

在代码里，不计算 loss 的位置会被标成：

```text
-100
```

Hugging Face 的 loss 函数会忽略 labels 中为 `-100` 的 token。

## 6.3 本章输入和输出

输入模型：

```text
outputs/pretrain_chat_demo/
```

输入训练数据：

```text
data/sft/customer_support_sample.jsonl
```

配置文件：

```text
configs/sft_minimal_cpu_local.json
```

训练脚本：

```text
scripts/sft_train_minimal.py
```

输出目录：

```text
outputs/sft_minimal_cpu_local/
```

推理配置：

```text
configs/infer_minimal_cpu_local.json
```

本章完整流程可以表示为：

```text
outputs/pretrain_chat_demo/
data/sft/customer_support_sample.jsonl
  -> scripts/sft_train_minimal.py
  -> outputs/sft_minimal_cpu_local/
  -> scripts/infer_minimal.py
  -> 本地回答检查
```

## 6.4 第一步：确认预训练模型存在

SFT 是在已有模型基础上继续训练。

先确认第 5 章输出存在：

```bash
find outputs/pretrain_chat_demo -maxdepth 1 -type f -print
```

至少应该看到：

```text
config.json
model.safetensors
tokenizer.json
tokenizer_config.json
special_tokens_map.json
```

如果没有，先运行：

```bash
make tokenizer-chat-demo
make pretrain-chat-demo
```

本章配置里的：

```json
"model_name_or_path": "outputs/pretrain_chat_demo"
```

就是从这里加载模型和 tokenizer。

## 6.5 第二步：查看 SFT 数据

打开：

```bash
sed -n '1,5p' data/sft/customer_support_sample.jsonl
```

你会看到：

```json
{"messages":[{"role":"system","content":"你是一个电商客服助手，回答准确、简洁、可执行。"},{"role":"user","content":"我的订单一直显示待揽收怎么办？"},{"role":"assistant","content":"这通常表示商家已创建运单但快递尚未揽件。请提供订单号，我帮你核实仓库是否已经完成出库。"}]}
```

这和第 3 章清洗出的格式一致。

每条样本都有：

```text
system：角色和回答要求
user：用户问题
assistant：标准回答
```

这份文件只有少量样本，目的是让 CPU 快速跑通最小 SFT。

它不是生产级训练集。

## 6.6 第三步：查看 SFT 配置

打开：

```text
configs/sft_minimal_cpu_local.json
```

内容如下：

```json
{
  "model_name_or_path": "outputs/pretrain_chat_demo",
  "train_file": "data/sft/customer_support_sample.jsonl",
  "validation_split_ratio": 0.2,
  "output_dir": "outputs/sft_minimal_cpu_local",
  "cache_dir": ".cache/huggingface",
  "max_seq_length": 64,
  "per_device_train_batch_size": 1,
  "per_device_eval_batch_size": 1,
  "gradient_accumulation_steps": 1,
  "learning_rate": 0.0003,
  "num_train_epochs": 2,
  "logging_steps": 1,
  "save_steps": 20,
  "eval_steps": 20,
  "bf16": false,
  "fp16": false,
  "gradient_checkpointing": false,
  "system_prompt": "你是一个电商客服助手，回答准确、简洁、可执行。"
}
```

重点字段：

```text
model_name_or_path：从哪个模型继续微调
train_file：SFT 数据
validation_split_ratio：验证集比例
output_dir：SFT 后模型保存位置
max_seq_length：最大序列长度
learning_rate：学习率
num_train_epochs：训练轮数
system_prompt：默认 system prompt
```

本章使用很小的 batch 和很短的序列长度，是为了 CPU 也能运行。

## 6.7 第四步：理解脚本入口

本章脚本是：

```text
scripts/sft_train_minimal.py
```

开头导入：

```python
from __future__ import annotations

import argparse

from common import default_hf_cache_dir, ensure_dir, load_json
from training_utils import build_supervised_chat_texts, load_chat_examples, maybe_split_dataset
```

这里复用两类工具。

通用工具：

```text
load_json：读取配置
ensure_dir：创建输出目录
default_hf_cache_dir：默认缓存目录
```

训练工具：

```text
load_chat_examples：读取 SFT JSONL
build_supervised_chat_texts：把 messages 拆成 prompt_text 和 full_text
maybe_split_dataset：可选切分训练集和验证集
```

参数解析仍然是统一风格：

```python
def parse_args():
    parser = argparse.ArgumentParser(
        description="Run a minimal CPU-friendly SFT pipeline without TRL."
    )
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()
```

所以可以运行：

```bash
python3 scripts/sft_train_minimal.py --config configs/sft_minimal_cpu_local.json
```

`Makefile` 封装为：

```bash
make sft-minimal
```

## 6.8 第五步：读取配置、数据和缓存目录

脚本开头：

```python
args = parse_args()
config = load_json(args.config)
ensure_dir(config["output_dir"])
cache_dir = ensure_dir(config.get("cache_dir", default_hf_cache_dir()))
```

然后读取 SFT 样本：

```python
rows = load_chat_examples(config["train_file"])
```

`load_chat_examples` 会读取 JSONL。

如果文件为空，会直接报错：

```python
if not rows:
    raise ValueError(f"No rows found in {path}")
```

这比空数据悄悄进入训练更安全。

## 6.9 第六步：加载 tokenizer

脚本先加载 tokenizer：

```python
tokenizer = AutoTokenizer.from_pretrained(
    config["model_name_or_path"],
    use_fast=True,
    cache_dir=str(cache_dir / "transformers"),
)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
```

这里从：

```text
outputs/pretrain_chat_demo/
```

加载 tokenizer。

为什么不是从 `outputs/tokenizer_chat_demo/` 加载？

因为第 5 章保存预训练模型时，已经把 tokenizer 一起保存到了模型目录。

这样 SFT 只需要一个 `model_name_or_path`，就能同时拿到模型和 tokenizer。

## 6.10 第七步：构造 prompt_text 和 full_text

核心函数在：

```text
scripts/training_utils.py
```

函数名是：

```python
build_supervised_chat_texts
```

它返回两个字符串：

```text
prompt_text：只包含条件
full_text：条件 + assistant 答案
```

对一条 messages 样本：

```json
{
  "messages": [
    {"role": "system", "content": "你是一个电商客服助手，回答准确、简洁、可执行。"},
    {"role": "user", "content": "可以开发票吗？"},
    {"role": "assistant", "content": "可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。"}
  ]
}
```

构造出的 `prompt_text` 类似：

```text
系统：你是一个电商客服助手，回答准确、简洁、可执行。
用户：可以开发票吗？
助手：
```

`full_text` 类似：

```text
系统：你是一个电商客服助手，回答准确、简洁、可执行。
用户：可以开发票吗？
助手：可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。
```

也就是说：

```text
full_text = prompt_text + assistant_answer
```

SFT 要做的是：

```text
给模型 prompt_text，让它学会生成后面的 assistant_answer。
```

## 6.11 第八步：把所有样本转成结构化 rows

脚本中：

```python
structured_rows = []
for row in rows:
    prompt_text, full_text = build_supervised_chat_texts(row, config.get("system_prompt"))
    structured_rows.append({"prompt_text": prompt_text, "full_text": full_text})

prepared = Dataset.from_list(structured_rows)
```

这一步把原始 JSONL 变成训练前的中间格式：

```json
{
  "prompt_text": "系统：...\n用户：...\n助手：",
  "full_text": "系统：...\n用户：...\n助手：标准回答..."
}
```

这样后面 tokenization 时，就能知道：

```text
prompt 部分有多长
哪些 label 应该被 mask
```

## 6.12 第九步：切分训练集和验证集

脚本调用：

```python
train_dataset, eval_dataset = maybe_split_dataset(
    prepared,
    config.get("validation_split_ratio", 0.0),
)
```

配置中：

```json
"validation_split_ratio": 0.2
```

表示拿 20% 样本作为验证集。

本章只有 5 条样本，所以大致会变成：

```text
训练集 4 条
验证集 1 条
```

真实项目中，验证集应该更稳定、更有代表性。

本章只是教学演示。

## 6.13 第十步：tokenize prompt 和 full text

脚本中的 `tokenize_function` 同时处理 prompt 和 full text：

```python
prompt_ids = tokenizer(
    prompt_text,
    truncation=True,
    max_length=max_seq_length,
    add_special_tokens=False,
)["input_ids"]
```

`prompt_ids` 是条件部分的 token id。

接着处理 full text：

```python
full_ids = tokenizer(
    full_text,
    truncation=True,
    max_length=max_seq_length - 1,
    add_special_tokens=False,
)["input_ids"] + [eos_id]
full_ids = full_ids[:max_seq_length]
```

这里额外添加了：

```text
eos_id
```

表示序列结束。

最终 `full_ids` 是模型输入：

```text
系统 + 用户 + 助手：+ assistant 答案 + EOS
```

## 6.14 第十一步：构造 labels 并 mask prompt

最关键的代码是：

```python
labels = full_ids.copy()
prompt_length = min(len(prompt_ids), len(labels))
for idx in range(prompt_length):
    labels[idx] = -100
```

这表示：

```text
先让 labels 等于 full_ids
再把 prompt 部分改成 -100
```

于是训练目标变成：

```text
prompt token：忽略 loss
assistant answer token：计算 loss
```

可以用一个简化例子理解：

```text
full_ids: [系统, 用户, 助手:, 可以, 开发票, EOS]
labels:   [-100, -100, -100, 可以, 开发票, EOS]
```

`-100` 是 PyTorch / Transformers 里常用的 ignore index。

loss 函数看到 `-100` 会跳过这个位置。

这就是 assistant-only loss。

## 6.15 第十二步：为什么 max_seq_length 很重要

配置里：

```json
"max_seq_length": 64
```

它限制每条训练样本最长 64 个 token。

如果样本太长，会被截断。

截断风险包括：

- assistant 答案被截掉
- EOS 被挤掉
- prompt 占满长度，答案几乎没有训练信号

所以真实训练中要检查：

```text
样本 token 长度分布
被截断比例
assistant answer 是否保留完整
```

本章数据很短，`64` 足够教学使用。

## 6.16 第十三步：padding 一个 batch

不同样本 token 数不同。

为了组成 batch，需要 padding。

本章自定义了一个小的 data collator：

```python
class SupervisedDataCollator:
    def __init__(self, pad_token_id: int):
        self.pad_token_id = pad_token_id

    def __call__(self, features):
        import torch

        max_length = max(len(feature["input_ids"]) for feature in features)
        batch = {"input_ids": [], "attention_mask": [], "labels": []}
        for feature in features:
            pad_length = max_length - len(feature["input_ids"])
            batch["input_ids"].append(feature["input_ids"] + [self.pad_token_id] * pad_length)
            batch["attention_mask"].append(feature["attention_mask"] + [0] * pad_length)
            batch["labels"].append(feature["labels"] + [-100] * pad_length)
        return {
            key: torch.tensor(value, dtype=torch.long)
            for key, value in batch.items()
        }
```

这里三类字段 padding 值不同：

```text
input_ids：使用 pad_token_id
attention_mask：真实 token 为 1，padding 为 0
labels：padding 位置为 -100
```

为什么 labels 的 padding 也是 `-100`？

因为 padding 不是真实文本，不应该参与 loss。

## 6.17 第十四步：加载预训练模型

脚本加载模型：

```python
model = AutoModelForCausalLM.from_pretrained(
    config["model_name_or_path"],
    torch_dtype=torch.float32,
    cache_dir=str(cache_dir / "transformers"),
)
```

这里使用：

```text
torch.float32
```

原因是本章走 CPU 友好的教学路线，不依赖 GPU 半精度或量化库。

接着：

```python
model.config.use_cache = False
```

训练时通常关闭 cache。

如果配置开启：

```json
"gradient_checkpointing": true
```

脚本还会调用：

```python
model.gradient_checkpointing_enable()
```

本章默认关闭，因为模型很小。

## 6.18 第十五步：配置训练参数

训练参数如下：

```python
training_args = TrainingArguments(
    output_dir=config["output_dir"],
    per_device_train_batch_size=config["per_device_train_batch_size"],
    per_device_eval_batch_size=config.get(
        "per_device_eval_batch_size", config["per_device_train_batch_size"]
    ),
    gradient_accumulation_steps=config["gradient_accumulation_steps"],
    learning_rate=config["learning_rate"],
    num_train_epochs=config["num_train_epochs"],
    logging_steps=config["logging_steps"],
    save_steps=config["save_steps"],
    eval_steps=config.get("eval_steps", config["save_steps"]),
    eval_strategy="steps" if eval_dataset is not None else "no",
    save_total_limit=config.get("save_total_limit", 2),
    bf16=config.get("bf16", False),
    fp16=config.get("fp16", False),
    report_to="none",
    remove_unused_columns=False,
)
```

本章配置很保守：

```json
"per_device_train_batch_size": 1,
"learning_rate": 0.0003,
"num_train_epochs": 2
```

这是为了让 CPU 快速跑通。

训练效果不是重点。

重点是理解：

```text
模型如何从 prompt 学 assistant answer
labels 如何 mask prompt
SFT 输出目录如何被推理脚本加载
```

## 6.19 第十六步：创建 Trainer 并训练

创建 Trainer：

```python
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=SupervisedDataCollator(tokenizer.pad_token_id),
)
```

启动训练：

```python
trainer.train()
```

保存模型：

```python
trainer.save_model(config["output_dir"])
tokenizer.save_pretrained(config["output_dir"])
```

最后打印：

```text
Minimal SFT finished. Artifacts saved to outputs/sft_minimal_cpu_local
```

这说明最小 SFT 流程已经完成。

## 6.20 第十七步：运行最小 SFT

执行：

```bash
make sft-minimal
```

它实际运行：

```bash
python3 scripts/sft_train_minimal.py --config configs/sft_minimal_cpu_local.json
```

训练日志可能类似：

```text
{'loss': 1.4699, 'grad_norm': 15.9000, 'learning_rate': 0.0003, 'epoch': 0.25}
{'loss': 7.4282, 'grad_norm': 21.7425, 'learning_rate': 0.0002625, 'epoch': 0.5}
...
Minimal SFT finished. Artifacts saved to outputs/sft_minimal_cpu_local
```

因为样本极少，loss 可能波动很大。

不要用这份 loss 判断模型是否真正可用。

## 6.21 第十八步：检查输出目录

查看：

```bash
find outputs/sft_minimal_cpu_local -maxdepth 1 -type f -print
```

你应该看到：

```text
outputs/sft_minimal_cpu_local/config.json
outputs/sft_minimal_cpu_local/generation_config.json
outputs/sft_minimal_cpu_local/model.safetensors
outputs/sft_minimal_cpu_local/tokenizer.json
outputs/sft_minimal_cpu_local/tokenizer_config.json
outputs/sft_minimal_cpu_local/special_tokens_map.json
outputs/sft_minimal_cpu_local/training_args.bin
```

这些文件说明：

```text
模型权重已保存
模型结构已保存
tokenizer 已保存
训练参数已保存
```

后续推理脚本只需要加载：

```text
outputs/sft_minimal_cpu_local/
```

## 6.22 第十九步：运行本地推理检查

SFT 后可以运行：

```bash
make infer-minimal
```

它实际执行：

```bash
python3 scripts/infer_minimal.py --config configs/infer_minimal_cpu_local.json
```

推理配置里：

```json
{
  "model_name_or_path": "outputs/sft_minimal_cpu_local",
  "user_prompt": "订单显示已签收但我没有收到，该怎么办？",
  "system_prompt": "你是一个电商客服助手，回答准确、简洁、可执行。"
}
```

这一步检查：

```text
SFT 输出模型能否加载
tokenizer 能否加载
prompt 能否构造
模型能否生成文本
```

生成质量可能仍然不好。

这是因为：

```text
基座模型很小
SFT 样本只有几条
训练轮数很少
没有真实大模型的通用能力
```

本章目标是跑通 SFT 机制，而不是训练生产客服助手。

## 6.23 第二十步：查看相似训练样本

你也可以运行：

```bash
python3 scripts/infer_minimal.py --config configs/infer_minimal_cpu_local.json --show-similar
```

它会先输出相似训练样本。

例如：

```json
{
  "score": 0.65,
  "question": "订单显示已签收但我没收到怎么办？",
  "answer": "请先核实签收人、门卫、快递柜和代收点信息。如果仍未找到，我可以为你发起物流核查。"
}
```

这能帮助你判断：

```text
模型回答是泛化出来的，还是在背相似训练样本？
```

后续评测章节会更系统地使用这个思想。

## 6.24 SFT 常见数据问题

### 6.24.1 assistant 回复太短

如果 assistant 回复过短，例如：

```text
好的
可以
找客服
```

模型会学到敷衍回答。

好的 SFT 回复应该：

- 回答准确
- 简洁
- 可执行
- 包含必要条件
- 不随意承诺

### 6.24.2 prompt 太长，答案被截断

如果 `max_seq_length` 太小，而 system/user 很长，assistant answer 可能被截断。

这会导致模型学不到完整答案。

真实项目中要统计 token 长度分布。

### 6.24.3 多轮对话没有处理清楚

本章工具会训练最后一条 assistant 回复。

如果 messages 中有多轮对话，要确认：

```text
前文是否完整
最后一个 assistant 是否是想训练的目标
```

否则可能把错误轮次当成监督目标。

### 6.24.4 把用户问题也训练成答案

如果不 mask prompt，模型可能学会复述 system 和 user。

这就是本章强调 `-100` 的原因。

## 6.25 常见运行问题

### 6.25.1 找不到预训练模型

如果报错找不到：

```text
outputs/pretrain_chat_demo
```

先运行：

```bash
make tokenizer-chat-demo
make pretrain-chat-demo
```

再运行：

```bash
make sft-minimal
```

### 6.25.2 当前 Python 环境缺依赖

如果出现：

```text
ModuleNotFoundError
```

先运行：

```bash
make env-check
```

确认 `torch`、`transformers`、`datasets` 是否可用。

如果有多个 Python 环境，可以显式指定：

```bash
make sft-minimal PYTHON=/path/to/python
```

### 6.25.3 loss 波动很大

本章样本非常少，loss 波动正常。

它不是稳定训练曲线示例。

更可靠的判断方式是：

- 输出目录是否生成
- 推理是否能加载
- label mask 是否理解正确
- 后续评测是否有基本通过

### 6.25.4 生成回答仍然很差

这不是失败。

原因是本章模型和数据都非常小。

真正提升效果需要：

- 更强基座模型
- 更高质量 SFT 数据
- 更系统评测集
- LoRA / QLoRA 训练
- 多轮调试

这些会在后续章节继续展开。

## 6.26 本章练习

### 6.26.1 练习一：跑通最小 SFT

依次运行：

```bash
make tokenizer-chat-demo
make pretrain-chat-demo
make sft-minimal
```

确认：

```text
outputs/sft_minimal_cpu_local/model.safetensors
```

是否存在。

### 6.26.2 练习二：手写 prompt_text 和 full_text

选择一条 SFT 样本，手写：

```text
prompt_text：
full_text：
```

然后标出：

```text
哪些 token 应该是 -100？
哪些 token 应该计算 loss？
```

### 6.26.3 练习三：运行推理并查看相似样本

运行：

```bash
python3 scripts/infer_minimal.py --config configs/infer_minimal_cpu_local.json --show-similar
```

回答：

```text
最相似训练样本是哪一条？
模型回答和这条样本有多像？
这更像泛化还是记忆？
```

### 6.26.4 练习四：调整训练轮数

仓库已经提供了一份 `num_train_epochs=5` 的可运行配置：

```bash
python3 scripts/sft_train_minimal.py --config configs/sft_minimal_cpu_local_epoch5.json
```

你也可以自己复制一份配置再手动修改：

```bash
cp configs/sft_minimal_cpu_local.json configs/sft_minimal_cpu_local_my_epoch5.json
```

把自定义配置里的：

```json
"num_train_epochs": 2
```

改成：

```json
"num_train_epochs": 5
```

并把输出目录改成：

```json
"output_dir": "outputs/sft_minimal_cpu_local_epoch5"
```

运行：

```bash
python3 scripts/sft_train_minimal.py --config configs/sft_minimal_cpu_local_my_epoch5.json
```

观察 loss 和生成结果有什么变化。

## 6.27 本章验收标准

完成本章后，你应该能做到：

- 解释 SFT 和预训练的区别
- 解释 `messages` 中 system、user、assistant 的作用
- 说明 `prompt_text` 和 `full_text` 的区别
- 说明为什么只对 assistant 回复计算 loss
- 解释 labels 中 `-100` 的作用
- 运行 `make sft-minimal`
- 找到并解释 `outputs/sft_minimal_cpu_local/`
- 运行 `make infer-minimal`
- 说明为什么 CPU 最小 SFT 只是教学调试路线

## 6.28 下一章衔接

本章使用的是最小 CPU SFT。

它直接更新 tiny 模型参数，适合教学理解。

真实项目中，如果你要微调较大的开源模型，通常不会从零训练，也不会在 CPU 上全量更新参数。

下一章会进入：

```text
LoRA 与 QLoRA 微调
```

你会看到：

```text
为什么只训练少量 adapter 参数
为什么 QLoRA 需要合适的 NVIDIA GPU
为什么 bitsandbytes、显存和配置选择很重要
```

也就是说，本章解决的是：

```text
SFT 的训练目标是什么？
```

下一章解决的是：

```text
如何在真实开源模型上更高效地做 SFT？
```
