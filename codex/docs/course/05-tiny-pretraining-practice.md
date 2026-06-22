# 05 第五章：教学型预训练实战

学习时长：100 分钟

本章类型：tiny causal LM 预训练 + 训练产物检查

本章产物：一个可以被本地加载的 GPT2 风格教学小模型

## 5.0 本章要完成什么

上一章我们训练了 tokenizer，知道模型不能直接读取字符串，而是读取 token id。

这一章继续往前走一步：

```text
文本
  -> tokenizer
  -> token ids
  -> 固定长度 block
  -> causal language model
  -> next-token prediction
```

也就是说，本章要做一个最小预训练实验。

注意：本章不是要训练一个真正强大的基座模型。

工业级预训练通常需要：

- 海量高质量语料
- 大规模 GPU 集群
- 长时间训练
- 完整的数据治理
- 分布式训练系统
- 严格评测和安全检查

本章的目标更务实：

```text
用很小的模型和很少的数据，在本地跑通预训练的工程流程。
```

你会逐步完成：

- 理解预训练和 SFT 的区别
- 理解 causal language modeling
- 理解为什么 labels 等于 input_ids
- 查看预训练配置
- 读取文本数据集
- 加载上一章训练的 tokenizer
- 把文本切成 token ids
- 把 token ids 拼接成固定长度 block
- 创建一个 tiny GPT2 风格模型
- 配置 `TrainingArguments`
- 用 `Trainer` 启动训练
- 检查 checkpoint、模型文件和 tokenizer 文件
- 理解 loss、block size、batch size、learning rate 的意义
- 知道为什么教学模型输出质量有限

完成本章后，你应该能回答：

```text
预训练到底在学什么？
为什么预训练需要 tokenizer？
为什么 tiny pretraining 不能等同于真正可用的大模型？
```

## 5.1 预训练和 SFT 有什么区别

先把两个概念分清楚。

预训练学习的是：

```text
语言规律、文本模式、一般知识、局部上下文关系
```

SFT 学习的是：

```text
在具体任务和指令下，应该如何回答
```

预训练样本通常是普通文本：

```text
系统：你是一个电商客服助手，回答准确、简洁、可执行。
用户：可以开发票吗？
助手：可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。
```

SFT 样本通常是结构化 messages：

```json
{
  "messages": [
    {"role": "system", "content": "你是一个电商客服助手，回答准确、简洁、可执行。"},
    {"role": "user", "content": "可以开发票吗？"},
    {"role": "assistant", "content": "可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。"}
  ]
}
```

预训练关注：

```text
给定前面的 token，预测下一个 token。
```

SFT 关注：

```text
给定 system 和 user，让模型学习 assistant 应该怎么回答。
```

本章做的是预训练。

第 6 章会进入 SFT 数据和聊天格式，第 7 章会进入 LoRA / QLoRA 微调。

## 5.2 什么是 causal language modeling

本章训练的是 causal language model。

它的训练目标是：

```text
根据前面的 token 预测下一个 token。
```

例如一句话：

```text
用户：可以开发票吗？
```

经过 tokenizer 变成：

```text
[用户, ：, 可以, 开发票, 吗, ？]
```

训练时模型会学习：

```text
看到 用户      -> 预测 ：
看到 用户：    -> 预测 可以
看到 用户：可以 -> 预测 开发票
看到 ...       -> 预测 下一个 token
```

所以它叫 causal：

```text
当前位置只能看见当前位置之前的内容，不能偷看未来 token。
```

这和 GPT 类模型的训练方式一致。

本章使用 `GPT2LMHeadModel` 创建一个非常小的 GPT2 风格模型。

它不是 GPT-2 原始模型，也不是下载来的大模型，而是从零初始化的小模型。

## 5.3 本章输入和输出

本章主要使用聊天 demo 预训练配置：

```text
configs/pretrain_chat_demo.json
```

输入文件：

```text
data/cleaned/chat_demo_corpus.txt
data/cleaned/chat_demo_corpus_valid.txt
outputs/tokenizer_chat_demo/
```

输出目录：

```text
outputs/pretrain_chat_demo/
```

还有一条基础教学预训练路线：

```text
configs/pretrain_tiny.json
data/cleaned/sample_corpus.txt
data/cleaned/sample_corpus_valid.txt
outputs/tokenizer_hf/
outputs/pretrain_tiny/
```

本章重点讲：

```bash
make pretrain-chat-demo
```

因为它承接第 4 章的聊天 demo tokenizer，也会被后续最小 SFT 示例继续使用。

## 5.4 第一步：确认 tokenizer 已经存在

预训练前必须先有 tokenizer。

确认输出目录：

```bash
find outputs/tokenizer_chat_demo -maxdepth 1 -type f -print
```

你应该至少看到：

```text
outputs/tokenizer_chat_demo/tokenizer.json
outputs/tokenizer_chat_demo/tokenizer_config.json
outputs/tokenizer_chat_demo/special_tokens_map.json
```

如果没有，先运行：

```bash
make tokenizer-chat-demo
```

原因是本章预训练配置里写了：

```json
"tokenizer_dir": "outputs/tokenizer_chat_demo"
```

预训练脚本会从这个目录加载 tokenizer。

如果目录不存在，训练无法开始。

## 5.5 第二步：查看预训练语料

查看训练语料：

```bash
sed -n '1,30p' data/cleaned/chat_demo_corpus.txt
```

你会看到类似：

```text
系统：你是一个电商客服助手，回答准确、简洁、可执行。
用户：可以开发票吗？
助手：可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。
系统：你是一个电商客服助手，回答准确、简洁、可执行。
用户：订单显示已签收但我没有收到，怎么办？
助手：请先核实签收人、快递柜和代收点信息。如果仍未找到，我可以为你发起物流核查。
```

验证集是：

```bash
sed -n '1,20p' data/cleaned/chat_demo_corpus_valid.txt
```

验证集用于观察模型在未参与训练的文本上的 loss。

教学语料很小，所以不要把验证 loss 当成严肃模型能力评估。

它主要用于让你理解训练流程。

## 5.6 第三步：查看预训练配置

打开：

```text
configs/pretrain_chat_demo.json
```

内容如下：

```json
{
  "train_file": "data/cleaned/chat_demo_corpus.txt",
  "validation_file": "data/cleaned/chat_demo_corpus_valid.txt",
  "tokenizer_dir": "outputs/tokenizer_chat_demo",
  "output_dir": "outputs/pretrain_chat_demo",
  "cache_dir": ".cache/huggingface",
  "block_size": 64,
  "num_train_epochs": 40,
  "per_device_train_batch_size": 2,
  "per_device_eval_batch_size": 2,
  "gradient_accumulation_steps": 1,
  "learning_rate": 0.0004,
  "logging_steps": 10,
  "save_steps": 400,
  "eval_steps": 400,
  "hidden_size": 320,
  "num_hidden_layers": 6,
  "num_attention_heads": 4,
  "intermediate_size": 1280,
  "bf16": false
}
```

先理解几个最重要的字段：

```text
train_file：训练文本
validation_file：验证文本
tokenizer_dir：第 4 章训练出的 tokenizer
output_dir：模型输出目录
block_size：每个训练样本包含多少 token
num_train_epochs：训练轮数
learning_rate：学习率
hidden_size：隐藏层维度
num_hidden_layers：Transformer 层数
num_attention_heads：注意力头数
```

这份配置故意把模型做得很小。

小模型的好处是：

```text
本地可跑
训练快
方便观察产物
适合教学
```

坏处也很明显：

```text
模型能力很弱
生成质量有限
容易背小语料
不能当生产模型
```

## 5.7 第四步：理解脚本入口

本章使用：

```text
scripts/pretrain.py
```

开头仍然是课程统一脚本模板：

```python
from __future__ import annotations

import argparse

from common import default_hf_cache_dir, ensure_dir, load_json
```

这里复用：

```text
load_json：读取配置
ensure_dir：创建输出目录和缓存目录
default_hf_cache_dir：默认 Hugging Face 缓存目录
```

参数解析：

```python
def parse_args():
    parser = argparse.ArgumentParser(description="Run a tiny decoder-only pretraining experiment.")
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()
```

所以你可以运行：

```bash
python3 scripts/pretrain.py --config configs/pretrain_chat_demo.json
```

`Makefile` 对应命令是：

```bash
make pretrain-chat-demo
```

## 5.8 第五步：导入训练依赖

脚本在 `main()` 中导入训练相关库：

```python
import torch
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    DataCollatorForLanguageModeling,
    GPT2Config,
    GPT2LMHeadModel,
    Trainer,
    TrainingArguments,
)
```

这些组件分工如下：

```text
torch：底层张量计算
load_dataset：读取文本数据集
AutoTokenizer：加载第 4 章 tokenizer
DataCollatorForLanguageModeling：组 batch，并处理语言模型训练数据
GPT2Config：定义 GPT2 风格模型结构
GPT2LMHeadModel：创建 causal LM 模型
Trainer：封装训练循环
TrainingArguments：声明训练参数
```

如果这里报：

```text
ModuleNotFoundError
```

说明当前 Python 环境依赖没有装好，回到第 2 章运行：

```bash
make env-check
```

确认 `transformers`、`datasets`、`torch` 是否可用。

## 5.9 第六步：创建输出目录和缓存目录

脚本先创建目录：

```python
ensure_dir(config["output_dir"])
cache_dir = ensure_dir(config.get("cache_dir", default_hf_cache_dir()))
```

本章配置里：

```json
"output_dir": "outputs/pretrain_chat_demo",
"cache_dir": ".cache/huggingface"
```

所以脚本会使用：

```text
outputs/pretrain_chat_demo/
.cache/huggingface/
```

`outputs/pretrain_chat_demo/` 保存模型和 tokenizer。

`.cache/huggingface/` 保存 Hugging Face 数据集和模型相关缓存。

把缓存放在项目目录内的好处是：

```text
新手更容易找到
清理时更明确
不同项目不容易互相污染
```

## 5.10 第七步：读取文本数据集

脚本使用 `datasets` 读取普通文本：

```python
dataset = load_dataset(
    "text",
    data_files={
        "train": config["train_file"],
        "validation": config["validation_file"],
    },
    cache_dir=str(cache_dir / "datasets"),
)
```

这里会得到两个 split：

```text
train
validation
```

对应：

```text
data/cleaned/chat_demo_corpus.txt
data/cleaned/chat_demo_corpus_valid.txt
```

注意：这里读取的是纯文本，不是 JSONL messages。

预训练阶段关心的是连续文本的语言模式。

SFT 阶段才会关心 system/user/assistant 的结构化角色。

## 5.11 第八步：加载 tokenizer

脚本加载上一章输出的 tokenizer：

```python
tokenizer = AutoTokenizer.from_pretrained(
    config["tokenizer_dir"],
    use_fast=True,
    cache_dir=str(cache_dir / "transformers"),
)
```

配置里写的是：

```json
"tokenizer_dir": "outputs/tokenizer_chat_demo"
```

所以这里会读取：

```text
outputs/tokenizer_chat_demo/tokenizer.json
outputs/tokenizer_chat_demo/tokenizer_config.json
outputs/tokenizer_chat_demo/special_tokens_map.json
```

接着脚本处理 pad token：

```python
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
```

GPT 风格 tokenizer 有时没有明确的 pad token。

本课程第 4 章已经配置了 `[PAD]`，所以一般不会触发这个 fallback。

但保留这段逻辑可以增强脚本兼容性。

## 5.12 第九步：把文本转换成 token ids

脚本定义：

```python
def tokenize_fn(batch):
    # Convert raw text strings into token ids.
    return tokenizer(batch["text"])
```

然后执行：

```python
tokenized = dataset.map(tokenize_fn, batched=True, remove_columns=["text"])
```

这一步把：

```text
系统：你是一个电商客服助手...
```

转换成：

```text
input_ids
attention_mask
```

`input_ids` 是 token id 列表。

`attention_mask` 表示哪些位置是真实 token，哪些位置是 padding。

在本章这个阶段，还没有形成固定长度训练样本。

每行文本的 token 数可能不同。

## 5.13 第十步：理解 block_size

语言模型训练通常不会直接一行一行训练。

脚本会把 token 拼接起来，然后切成固定长度块。

配置里：

```json
"block_size": 64
```

表示每个训练样本包含 64 个 token。

可以理解成：

```text
很多行 token ids
  -> 拼成一条长 token 流
  -> 每 64 个 token 切一块
```

为什么要固定长度？

因为 batch 训练需要张量形状稳定。

例如一个 batch 里有 2 条样本：

```text
sample_1: 64 tokens
sample_2: 64 tokens
```

才能组成：

```text
[batch_size=2, sequence_length=64]
```

如果 `block_size` 太大，而语料太短，可能切不出足够多训练样本。

如果 `block_size` 太小，模型看到的上下文太短，学不到较长依赖。

教学实验里，`64` 是一个方便本地快速运行的折中值。

## 5.14 第十一步：把 token 流切成固定 block

脚本中的 `group_texts` 负责这件事：

```python
def group_texts(examples):
    # Concatenate tokenized examples, then cut them into fixed-size blocks.
    concatenated = {k: sum(examples[k], []) for k in examples.keys()}
    total_length = len(concatenated["input_ids"])
    # Drop the remainder so every sample has exactly block_size tokens.
    total_length = (total_length // block_size) * block_size
    result = {
        k: [t[i : i + block_size] for i in range(0, total_length, block_size)]
        for k, t in concatenated.items()
    }
    # For causal LM, labels mirror input_ids; the model learns next-token prediction.
    result["labels"] = result["input_ids"].copy()
    return result
```

这段代码做了四件事。

第一，拼接：

```python
concatenated = {k: sum(examples[k], []) for k in examples.keys()}
```

把多条样本的 `input_ids` 拼成连续 token 流。

第二，计算总长度：

```python
total_length = len(concatenated["input_ids"])
```

第三，丢弃不足一个 block 的尾巴：

```python
total_length = (total_length // block_size) * block_size
```

例如总共有 150 个 token，`block_size=64`：

```text
可用长度 = 128
剩余 22 个 token 被丢弃
```

这是为了保证每个样本长度一致。

第四，切块：

```python
k: [t[i : i + block_size] for i in range(0, total_length, block_size)]
```

最终每条训练样本都有固定长度。

## 5.15 第十二步：为什么 labels 等于 input_ids

`group_texts` 里有一行：

```python
result["labels"] = result["input_ids"].copy()
```

这对 causal LM 很关键。

它表示：

```text
模型输入 token 序列，同时学习预测这个序列中的下一个 token。
```

看起来 labels 和 input_ids 一样，但训练时模型内部会做 shift。

直观理解：

```text
input_ids: A B C D
labels:    A B C D

训练目标实际是：
看到 A     -> 预测 B
看到 A B   -> 预测 C
看到 A B C -> 预测 D
```

Hugging Face 的 causal LM 模型会在内部处理这个错位。

所以训练数据里可以把 labels 设置成 input_ids 的复制。

这和 SFT 不同。

SFT 中通常不希望模型学习 system 和 user 部分，所以会把 prompt 部分 labels 设置成 `-100`。

本章预训练则是整段文本都参与 next-token prediction。

## 5.16 第十三步：创建 tiny GPT2 模型配置

脚本创建模型配置：

```python
model_config = GPT2Config(
    vocab_size=tokenizer.vocab_size,
    n_positions=block_size,
    n_ctx=block_size,
    n_embd=config.get("hidden_size", 256),
    n_layer=config.get("num_hidden_layers", 4),
    n_head=config.get("num_attention_heads", 4),
    n_inner=config.get("intermediate_size", 1024),
    bos_token_id=tokenizer.bos_token_id,
    eos_token_id=tokenizer.eos_token_id,
)
```

这些参数含义是：

```text
vocab_size：词表大小，必须和 tokenizer 匹配
n_positions：最大位置长度
n_ctx：上下文长度
n_embd：隐藏层维度
n_layer：Transformer 层数
n_head：注意力头数
n_inner：前馈网络中间层维度
bos_token_id：序列开始 token id
eos_token_id：序列结束 token id
```

聊天 demo 的实际模型配置会类似：

```json
{
  "model_type": "gpt2",
  "vocab_size": 624,
  "n_positions": 64,
  "n_ctx": 64,
  "n_embd": 320,
  "n_layer": 6,
  "n_head": 4,
  "n_inner": 1280
}
```

这里的 `vocab_size=624` 来自第 4 章 tokenizer 的实际词表大小。

如果 tokenizer 和模型 vocab_size 不匹配，后续加载和训练都可能出问题。

## 5.17 第十四步：初始化模型

脚本使用：

```python
model = GPT2LMHeadModel(model_config)
```

这会从零初始化一个 GPT2 风格模型。

注意：

```text
不是加载已有 GPT-2 权重
不是加载 Qwen/Llama/DeepSeek
不是继续训练一个强基座模型
```

它只是创建一个随机初始化的小模型。

这也是为什么本章输出质量有限。

模型一开始什么都不会，需要从很小的教学语料中学习。

它能帮你理解流程，但不能替代真实基座模型。

## 5.18 第十五步：配置 TrainingArguments

训练参数由 `TrainingArguments` 管理：

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
    eval_steps=config["eval_steps"],
    eval_strategy="steps",
    save_total_limit=config.get("save_total_limit", 2),
    bf16=config.get("bf16", False),
    fp16=config.get("fp16", False),
    report_to="none",
    remove_unused_columns=False,
)
```

几个参数需要重点理解。

`per_device_train_batch_size`：

```text
每张设备上一次放入多少样本。
```

`gradient_accumulation_steps`：

```text
梯度累积步数，用多个小 batch 模拟更大的 batch。
```

有效 batch size 可以粗略理解为：

```text
per_device_train_batch_size * gradient_accumulation_steps * 设备数
```

`learning_rate`：

```text
每次参数更新的步子大小。
```

`logging_steps`：

```text
每隔多少 step 打印一次训练日志。
```

`save_steps`：

```text
每隔多少 step 保存一次 checkpoint。
```

`eval_steps`：

```text
每隔多少 step 在验证集上评估一次。
```

教学配置里 `save_steps=400`、`eval_steps=400`，而训练总步数可能不到 400 时，中间不会频繁保存 checkpoint，只会在最后保存模型。

如果之前跑过更长或不同配置，输出目录里可能还保留旧 checkpoint。

## 5.19 第十六步：创建 Trainer

训练器创建如下：

```python
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=lm_dataset["train"],
    eval_dataset=lm_dataset["validation"],
    data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
)
```

这里的 `mlm=False` 很重要。

它表示：

```text
不做 masked language modeling
做 causal language modeling
```

masked language modeling 是 BERT 类模型常见训练方式：

```text
把中间某些 token mask 掉，让模型预测被遮住的 token。
```

causal language modeling 是 GPT 类模型常见训练方式：

```text
根据前文预测下一个 token。
```

本课程训练的是 GPT2 风格 decoder-only 模型，所以使用：

```python
mlm=False
```

## 5.20 第十七步：启动训练并保存模型

训练启动：

```python
trainer.train()
```

训练完成后保存：

```python
trainer.save_model(config["output_dir"])
tokenizer.save_pretrained(config["output_dir"])
```

这里同时保存模型和 tokenizer。

原因是后续推理或 SFT 时，希望直接加载一个目录：

```text
outputs/pretrain_chat_demo/
```

这个目录里既有模型权重，也有 tokenizer 文件。

如果只保存模型，不保存 tokenizer，后续加载时就需要额外指定 tokenizer 目录，容易出错。

最后脚本打印当前训练设备：

```python
if torch.cuda.is_available():
    print("CUDA is available. Training finished on GPU.")
else:
    print("CUDA is not available. Training finished on CPU.")
```

在 macOS 或普通 CPU 环境下，你通常会看到：

```text
CUDA is not available. Training finished on CPU.
```

这符合第 2 章的环境判断。

## 5.21 第十八步：运行聊天 demo 预训练

如果还没有训练 tokenizer，先运行：

```bash
make tokenizer-chat-demo
```

然后运行：

```bash
make pretrain-chat-demo
```

它实际执行：

```bash
python3 scripts/pretrain.py --config configs/pretrain_chat_demo.json
```

训练过程中你会看到类似日志：

```text
{'loss': 4.8466, 'grad_norm': 6.6229, 'learning_rate': 0.00037, 'epoch': 3.33}
{'loss': 2.5328, 'grad_norm': 5.9710, 'learning_rate': 0.00033, 'epoch': 6.67}
{'loss': 1.7558, 'grad_norm': 3.8294, 'learning_rate': 0.00030, 'epoch': 10.0}
```

这些数字每次运行可能不同。

重点不是逐字匹配日志，而是确认：

- loss 能正常打印
- 训练没有报错
- 输出目录生成模型文件
- 最后保存了 tokenizer

## 5.22 第十九步：检查输出目录

查看输出：

```bash
find outputs/pretrain_chat_demo -maxdepth 1 -type f -print
```

你应该看到：

```text
outputs/pretrain_chat_demo/config.json
outputs/pretrain_chat_demo/generation_config.json
outputs/pretrain_chat_demo/model.safetensors
outputs/pretrain_chat_demo/tokenizer.json
outputs/pretrain_chat_demo/tokenizer_config.json
outputs/pretrain_chat_demo/special_tokens_map.json
outputs/pretrain_chat_demo/training_args.bin
```

几个关键文件含义：

```text
config.json：模型结构配置
model.safetensors：模型权重
generation_config.json：生成相关默认配置
tokenizer.json：tokenizer 核心文件
tokenizer_config.json：tokenizer 配置
special_tokens_map.json：特殊 token 映射
training_args.bin：训练参数快照
```

如果你看到：

```text
checkpoint-60/
checkpoint-120/
```

这表示训练过程中或之前运行中保存过 checkpoint。

checkpoint 目录通常包含：

```text
模型权重
优化器状态
学习率调度器状态
随机数状态
trainer_state.json
```

它的作用是：

```text
中断后可以恢复训练
保留某个训练阶段的模型状态
```

## 5.23 第二十步：检查模型配置

打开：

```bash
cat outputs/pretrain_chat_demo/config.json
```

你会看到类似：

```json
{
  "architectures": [
    "GPT2LMHeadModel"
  ],
  "model_type": "gpt2",
  "n_ctx": 64,
  "n_embd": 320,
  "n_head": 4,
  "n_inner": 1280,
  "n_layer": 6,
  "n_positions": 64,
  "vocab_size": 624
}
```

重点检查：

```text
model_type 是否是 gpt2
vocab_size 是否和 tokenizer 词表一致
n_positions / n_ctx 是否等于 block_size
n_embd / n_layer / n_head 是否来自配置文件
```

这些字段能帮助你判断：

```text
当前模型到底是什么结构？
它能处理多长上下文？
它是不是用当前 tokenizer 训练出来的？
```

## 5.24 第二十一步：加载模型做一个最小生成检查

如果当前 Python 环境可用，可以运行：

```bash
python3 -c "from transformers import AutoModelForCausalLM, AutoTokenizer; model_dir='outputs/pretrain_chat_demo'; tok=AutoTokenizer.from_pretrained(model_dir); model=AutoModelForCausalLM.from_pretrained(model_dir); inputs=tok('用户：可以开发票吗？\\n助手：', return_tensors='pt'); out=model.generate(**inputs, max_new_tokens=30, do_sample=False); print(tok.decode(out[0]))"
```

你可能看到不太稳定的回答。

这很正常。

原因是：

```text
模型很小
语料很少
训练时间很短
没有经过完整 SFT 对齐
```

本章的生成检查只验证：

```text
模型目录能加载
tokenizer 能加载
generate 能跑通
```

不要把生成内容当成模型质量评估。

## 5.25 loss 应该怎么看

训练日志里的 `loss` 表示模型预测下一个 token 的误差。

一般来说：

```text
loss 下降：模型在训练数据上拟合得更好
loss 不动：可能学习率、数据、模型或训练设置有问题
loss 爆炸：可能学习率过大或训练不稳定
```

但本章要特别注意：

```text
loss 下降不等于模型真正好用。
```

因为教学数据很少，loss 下降可能只是模型记住了这些短文本。

判断模型是否有实际价值，还要看：

- 验证集 loss
- 业务评测
- 泛化问题表现
- 是否背训练样本
- 是否符合安全和业务规则

这也是为什么后面会有评测和相似样本检查章节。

## 5.26 为什么教学型预训练效果有限

本章模型效果有限，不是你操作失败，而是实验目标本来就不同。

主要限制包括：

```text
语料太少
模型太小
训练时间短
没有大规模通用知识
没有指令对齐
没有人工偏好优化
```

真实大模型预训练需要海量语料和算力。

本章的价值在于让你看懂：

```text
文本如何进入模型
tokenizer 如何参与训练
block_size 如何影响样本
Trainer 如何保存模型
输出目录如何被后续脚本复用
```

工程流程跑通后，未来换成更强模型、更大数据、更复杂训练方式，你才知道每个部件在哪里。

## 5.27 常见参数问题

### 5.27.1 block_size 太大

如果 `block_size` 太大，而语料很短，切出来的训练样本会很少。

例如总 token 数只有 300，`block_size=512`：

```text
total_length = (300 // 512) * 512 = 0
```

这会导致没有可训练样本。

所以小语料要使用较小 `block_size`。

本章聊天 demo 使用：

```json
"block_size": 64
```

### 5.27.2 learning_rate 太大

学习率太大可能导致训练不稳定。

表现包括：

- loss 不下降
- loss 剧烈波动
- loss 变成 NaN

教学配置使用：

```json
"learning_rate": 0.0004
```

这是为了让小模型在小语料上快速看到变化。

真实训练通常需要更谨慎的学习率、warmup、调度器和更长观察。

### 5.27.3 epoch 太多

本章聊天 demo 使用：

```json
"num_train_epochs": 40
```

看起来很多，但因为数据非常小，实际训练很快。

这也意味着模型很容易记住训练语料。

所以不要把训练 loss 很低理解成模型能力强。

### 5.27.4 batch size 太大

batch size 太大会占用更多显存或内存。

CPU 教学路线里，建议保持较小：

```json
"per_device_train_batch_size": 2
```

如果你在 GPU 上训练，可以根据显存增加 batch size。

但每次修改后都应该观察：

- 是否 OOM
- loss 是否正常
- 训练速度是否改善

## 5.28 常见运行问题

### 5.28.1 找不到 tokenizer

报错可能类似：

```text
Can't load tokenizer for 'outputs/tokenizer_chat_demo'
```

先运行：

```bash
make tokenizer-chat-demo
```

再运行：

```bash
make pretrain-chat-demo
```

并确认你在项目根目录。

### 5.28.2 缺少 transformers、datasets 或 torch

如果出现：

```text
ModuleNotFoundError
```

运行：

```bash
make env-check
```

确认当前 Python 环境。

如果 `make env-check` 显示依赖缺失，先安装：

```bash
make install
```

如果你有多个 Python 环境，可以显式指定：

```bash
make pretrain-chat-demo PYTHON=/path/to/python
```

### 5.28.3 CPU 训练很慢

本章模型已经很小，但 CPU 仍然比 GPU 慢。

如果只是想快速验证流程，可以减少：

- `num_train_epochs`
- `hidden_size`
- `num_hidden_layers`
- `intermediate_size`

建议复制一份配置再改，不要直接覆盖原配置：

```text
configs/pretrain_chat_demo_fast.json
```

### 5.28.4 输出目录里有旧 checkpoint

如果你多次运行训练，输出目录里可能保留旧 checkpoint。

这不一定是问题。

但如果你想对比实验，最好使用新的 `output_dir`：

```json
"output_dir": "outputs/pretrain_chat_demo_exp2"
```

这样不同实验不会混在一起。

## 5.29 本章练习

### 5.29.1 练习一：跑通聊天 demo 预训练

依次运行：

```bash
make tokenizer-chat-demo
make pretrain-chat-demo
```

确认输出目录：

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
training_args.bin
```

### 5.29.2 练习二：解释模型结构

打开：

```text
outputs/pretrain_chat_demo/config.json
```

回答：

```text
vocab_size 是多少？
n_positions 是多少？
n_embd 是多少？
n_layer 是多少？
n_head 是多少？
```

这些值分别来自哪里？

### 5.29.3 练习三：修改 block_size

仓库已经提供了一份 `block_size=32` 的可运行配置：

```bash
python3 scripts/pretrain.py --config configs/pretrain_chat_demo_block32.json
```

你也可以自己复制一份配置再手动修改：

```bash
cp configs/pretrain_chat_demo.json configs/pretrain_chat_demo_my_block32.json
```

把自定义配置里的：

```json
"block_size": 64
```

改成：

```json
"block_size": 32
```

并把输出目录改成：

```json
"output_dir": "outputs/pretrain_chat_demo_block32"
```

然后运行：

```bash
python3 scripts/pretrain.py --config configs/pretrain_chat_demo_my_block32.json
```

观察：

```text
训练样本数量是否变化？
训练速度是否变化？
模型 config.json 里的 n_positions 是否变化？
```

### 5.29.4 练习四：做一次最小生成检查

训练完成后运行：

```bash
python3 -c "from transformers import AutoModelForCausalLM, AutoTokenizer; model_dir='outputs/pretrain_chat_demo'; tok=AutoTokenizer.from_pretrained(model_dir); model=AutoModelForCausalLM.from_pretrained(model_dir); inputs=tok('用户：订单显示已签收但我没收到怎么办？\\n助手：', return_tensors='pt'); out=model.generate(**inputs, max_new_tokens=40, do_sample=False); print(tok.decode(out[0]))"
```

回答：

```text
模型能否成功生成文本？
生成质量是否稳定？
为什么不能用这一步判断模型已经可用？
```

## 5.30 本章验收标准

完成本章后，你应该能做到：

- 解释预训练和 SFT 的区别
- 解释 causal language modeling 的训练目标
- 说明为什么 labels 可以复制 input_ids
- 说明 `block_size` 的作用
- 运行 `make pretrain-chat-demo`
- 找到并解释 `outputs/pretrain_chat_demo/config.json`
- 找到并解释 `outputs/pretrain_chat_demo/model.safetensors`
- 找到并解释 `outputs/pretrain_chat_demo/training_args.bin`
- 说明 checkpoint 的作用
- 说明为什么教学型预训练模型输出质量有限

## 5.31 下一章衔接

本章训练了一个很小的 GPT2 风格 causal language model。

它学习的是：

```text
给定前文，预测下一个 token。
```

但客服助手真正需要的是：

```text
给定 system 和 user，生成符合业务规则的 assistant 回复。
```

这就需要 SFT。

下一章会进入：

```text
SFT 数据与聊天格式
```

你会看到：

```text
messages
  -> prompt
  -> assistant answer
  -> label mask
  -> 最小 CPU SFT
```

也就是说，第 5 章让模型获得一个最小语言模型能力；第 6 章开始让模型学习“怎么像客服助手一样回答”。
