# 01 第一章：用代码搭出大模型开发全景图

学习时长：90 分钟

本章类型：流程实现 + 工程地图

本章产物：一条“电商客服助手”的本地大模型开发流水线

## 1.0 本章要完成什么

上一章我们搭好了学习工作台，知道了 `configs/`、`data/`、`scripts/`、`outputs/` 分别负责什么。

这一章开始，我们不再只讲“大模型开发有哪些阶段”，而是用代码把这些阶段串成一条可理解的流水线。

你会逐步完成：

- 定义一个电商客服助手的业务目标
- 把业务目标写进配置和 system prompt
- 理解原始数据如何变成 SFT 数据
- 理解同一批数据如何分流到预训练、微调、蒸馏和评测
- 用代码骨架串起 tokenizer、预训练、SFT、推理和评测
- 理解 `make pipeline-local` 背后的真实执行顺序
- 建立“输入、处理、输出、验收”的工程思维

本章重点不是训练出一个很强的模型，而是让你看懂一条完整大模型开发链路如何在工程里落地。

这一章会展示每个阶段的真实命令和文件流。你可以先跟着理解这些命令背后的输入、处理和输出；如果还没有确认本机环境，建议完成第 2 章的 `make env-check` 后，再完整运行 `make pipeline-local`。

## 1.1 先看最终流水线

本课程围绕一个案例展开：

```text
电商客服助手
```

它要回答的问题包括：

- 订单为什么还没发货
- 发票怎么开
- 退款多久到账
- 物流显示签收但没收到怎么办
- 商品破损如何处理

完整开发流程可以表示为：

```text
业务目标
  -> 原始客服数据
  -> 数据清洗
  -> 数据分流
      -> 预训练语料
      -> SFT 数据
      -> 蒸馏问题
      -> 评测集
  -> tokenizer 训练
  -> tiny 预训练
  -> 最小 SFT
  -> 本地推理
  -> 相似训练样本检查
  -> 业务评测报告
  -> 部署准备
```

你可以把它想象成一条小型生产线。每一步都有明确的输入和输出。

```text
输入文件
  -> 脚本处理
  -> 输出文件
  -> 下一步继续使用
```

这一章会先实现“看得懂的全流程”，后面章节再把每个阶段展开成完整实战。

## 1.2 第一步：定义业务目标

大模型开发的第一步不是选模型，而是定义业务目标。

我们先用一个 Python 字典描述项目：

```python
project = {
    # 项目名称，用来区分不同实验或业务线。
    "name": "customer_support_assistant",

    # system prompt 会进入训练样本和推理 prompt。
    # 它告诉模型应该扮演什么角色、用什么方式回答。
    "system_prompt": "你是一个电商客服助手，回答准确、简洁、可执行。",

    # 原始数据路径，通常来自 FAQ、工单、客服对话或人工构造样本。
    "raw_file": "data/raw/customer_support_raw.jsonl",

    # 清洗后的 SFT 数据路径。
    "sft_file": "data/sft/customer_support_prepared.jsonl",

    # 教学型 tokenizer 输出目录。
    "tokenizer_dir": "outputs/tokenizer_chat_demo",

    # 教学型预训练模型输出目录。
    "base_model_dir": "outputs/pretrain_chat_demo",

    # 最小 CPU SFT 后的模型输出目录。
    "sft_model_dir": "outputs/sft_minimal_cpu_local",

    # 评测报告输出路径。
    "eval_report": "outputs/eval/customer_report.sample.md",
}
```

### 1.2.1 为什么业务目标要写进代码

很多新手会把业务目标只写在文档里，比如：

```text
我们要做一个客服助手。
```

这还不够。

模型真正能看到的是训练数据和推理 prompt，所以业务目标最终要进入：

- system prompt
- 数据清洗配置
- SFT 样本
- 推理脚本配置
- 评测集设计

例如在配置文件中：

```json
{
  "default_system_prompt": "你是一个电商客服助手，回答准确、简洁、可执行。"
}
```

后续清洗脚本会把它写进每条训练样本：

```json
{
  "messages": [
    {
      "role": "system",
      "content": "你是一个电商客服助手，回答准确、简洁、可执行。"
    },
    { "role": "user", "content": "可以开发票吗？" },
    { "role": "assistant", "content": "可以，请提供订单号、发票抬头和税号。" }
  ]
}
```

这就是业务目标落到模型训练里的方式。

## 1.3 第二步：明确每个阶段的输入和输出

在写具体脚本前，先画清楚文件流。

```text
data/raw/customer_support_raw.jsonl
  -> scripts/prepare_sft_data.py
  -> data/sft/customer_support_prepared.jsonl

data/cleaned/chat_demo_corpus.txt
  -> scripts/train_tokenizer.py
  -> outputs/tokenizer_chat_demo/

data/cleaned/chat_demo_corpus.txt
  -> scripts/pretrain.py
  -> outputs/pretrain_chat_demo/

data/sft/customer_support_sample.jsonl
  -> scripts/sft_train_minimal.py
  -> outputs/sft_minimal_cpu_local/

outputs/sft_minimal_cpu_local/
  -> scripts/infer_minimal.py
  -> 控制台输出模型回答

data/sft/customer_support_sample.jsonl
  -> scripts/retrieve_similar_examples.py
  -> 控制台输出相似训练样本

outputs/eval/customer_predictions.sample.jsonl
  -> scripts/generate_eval_report.py
  -> outputs/eval/customer_report.sample.md
```

### 1.3.1 用代码表达这个流程

我们可以先写一个“流程地图”。它不负责真正训练，只负责让你看清每一步要调用什么。

```python
pipeline_steps = [
    {
        "name": "prepare_sft_data",
        "input": "data/raw/customer_support_raw.jsonl",
        "script": "scripts/prepare_sft_data.py",
        "config": "configs/prepare_sft_data.json",
        "output": "data/sft/customer_support_prepared.jsonl",
    },
    {
        "name": "train_tokenizer",
        "input": "data/cleaned/chat_demo_corpus.txt",
        "script": "scripts/train_tokenizer.py",
        "config": "configs/train_tokenizer_chat_demo.json",
        "output": "outputs/tokenizer_chat_demo/",
    },
    {
        "name": "pretrain_tiny_model",
        "input": "data/cleaned/chat_demo_corpus.txt",
        "script": "scripts/pretrain.py",
        "config": "configs/pretrain_chat_demo.json",
        "output": "outputs/pretrain_chat_demo/",
    },
    {
        "name": "minimal_sft",
        "input": "data/sft/customer_support_sample.jsonl",
        "script": "scripts/sft_train_minimal.py",
        "config": "configs/sft_minimal_cpu_local.json",
        "output": "outputs/sft_minimal_cpu_local/",
    },
]
```

这段代码的价值是：让流程从“口头描述”变成“工程对象”。

后续如果你要写自动化编排脚本，就可以遍历这个列表。

```python
for step in pipeline_steps:
    # 打印当前阶段，方便调试时知道流水线走到哪里。
    print(f"Running step: {step['name']}")

    # 每个阶段都应该能说清楚输入和输出。
    print(f"Input : {step['input']}")
    print(f"Script: {step['script']}")
    print(f"Config: {step['config']}")
    print(f"Output: {step['output']}")
```

新手学大模型工程时，最先要练的不是复杂算法，而是这种清晰描述流程的能力。

## 1.4 第三步：实现数据清洗阶段

数据清洗阶段的目标是：

```text
原始问答数据
  -> 过滤低质量样本
  -> 转成 chat messages
  -> 输出 SFT JSONL
```

原始数据示例：

```json
{
  "question": "可以开发票吗？",
  "answer": "可以，请提供订单号、发票抬头和税号。",
  "quality": "high"
}
```

SFT 数据示例：

```json
{
  "messages": [
    {
      "role": "system",
      "content": "你是一个电商客服助手，回答准确、简洁、可执行。"
    },
    { "role": "user", "content": "可以开发票吗？" },
    { "role": "assistant", "content": "可以，请提供订单号、发票抬头和税号。" }
  ]
}
```

### 1.4.1 配置文件

`configs/prepare_sft_data.json`

```json
{
  "input_file": "data/raw/customer_support_raw.jsonl",
  "output_file": "data/sft/customer_support_prepared.jsonl",
  "rejected_file": "outputs/data_prep/customer_support_rejected.jsonl",
  "min_question_chars": 4,
  "min_answer_chars": 8,
  "allowed_quality": ["high", "medium"],
  "default_system_prompt": "你是一个电商客服助手，回答准确、简洁、可执行。"
}
```

这份配置定义了：

- 从哪里读原始数据
- 合格样本写到哪里
- 被过滤样本写到哪里
- 问题和答案的最短长度
- 哪些质量标签可以进入训练集
- 默认 system prompt 是什么

### 1.4.2 核心代码

`scripts/prepare_sft_data.py` 中最关键的函数是 `build_messages`。

```python
def build_messages(system_prompt: str, question: str, answer: str):
    # 把普通问答样本转换成 chat model 常用的 messages 格式。
    # system 定义助手角色，user 是用户问题，assistant 是标准答案。
    return {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer},
        ]
    }
```

主流程可以理解成：

```python
config = load_json(args.config)
rows = read_jsonl(config["input_file"])

# seen 用于去重，accepted 保存合格样本，rejected 保存被过滤样本。
seen = set()
accepted = []
rejected = []

for row in rows:
    # 读取问题和答案，并把连续空白压成一个空格。
    question = " ".join(str(row.get("question", "")).split())
    answer = " ".join(str(row.get("answer", "")).split())

    # 如果原始样本没有 instruction，就使用配置里的默认 system prompt。
    system_prompt = row.get("instruction") or config["default_system_prompt"]

    # quality 用来做最基础的数据质量过滤。
    quality = row.get("quality", "unknown")

    if quality not in config["allowed_quality"]:
        rejected.append({"reason": "quality_filter", "row": row})
        continue

    if len(question) < config["min_question_chars"]:
        rejected.append({"reason": "question_too_short", "row": row})
        continue

    if len(answer) < config["min_answer_chars"]:
        rejected.append({"reason": "answer_too_short", "row": row})
        continue

    # 去重时同时考虑 system、question、answer，避免重复训练同一条样本。
    dedup_key = (
        normalize_text(system_prompt),
        normalize_text(question),
        normalize_text(answer),
    )
    if dedup_key in seen:
        rejected.append({"reason": "duplicate", "row": row})
        continue
    seen.add(dedup_key)

    # 合格样本转换成 messages 格式。
    accepted.append(build_messages(system_prompt, question, answer))

write_jsonl(config["output_file"], accepted)
write_jsonl(config["rejected_file"], rejected)
```

### 1.4.3 运行和验收

运行：

```bash
make prepare-sft
```

它等价于：

```bash
python3 scripts/prepare_sft_data.py --config configs/prepare_sft_data.json
```

验收时检查：

```text
data/sft/customer_support_prepared.jsonl 是否生成
outputs/data_prep/customer_support_rejected.jsonl 是否生成
控制台是否打印 accepted_rows 和 rejected_rows
```

## 1.5 第四步：理解数据如何分流

同一批业务数据不会只用于一个地方。

它会被加工成不同形态：

```text
纯文本语料       -> 预训练
chat messages    -> SFT
问题列表         -> 蒸馏
问题+参考答案    -> 评测
```

### 1.5.1 四类数据格式

预训练语料通常是纯文本：

```text
订单显示待揽收时，需要先确认仓库是否已经出库。
```

SFT 数据通常是 messages：

```json
{
  "messages": [
    { "role": "user", "content": "可以开发票吗？" },
    { "role": "assistant", "content": "可以，请提供订单号、抬头和税号。" }
  ]
}
```

蒸馏问题通常是问题列表：

```json
{ "question": "客户要求更改收货地址，系统里应该怎么处理？" }
```

评测集通常包含参考答案和关键词：

```json
{
  "question": "订单已签收但我没收到怎么办？",
  "reference": "请先核实签收人和快递柜信息。",
  "required_keywords": ["签收人", "物流核查"]
}
```

### 1.5.2 用代码表达数据分流

下面是一段教学用伪代码，用来说明同一批业务资料如何被分流。

```python
def split_business_data(raw_rows: list[dict]) -> dict:
    # 预训练文本：让模型熟悉领域语言。
    pretrain_texts = []

    # SFT 样本：让模型学习如何回答。
    sft_rows = []

    # 蒸馏问题：交给 teacher 模型生成更高质量答案。
    distill_questions = []

    # 评测样本：训练后用来判断模型是否真的变好。
    eval_cases = []

    for row in raw_rows:
        question = row["question"]
        answer = row["answer"]

        pretrain_texts.append(f"问题：{question}\n答案：{answer}")

        sft_rows.append({
            "messages": [
                {"role": "user", "content": question},
                {"role": "assistant", "content": answer},
            ]
        })

        distill_questions.append({"question": question})

        eval_cases.append({
            "question": question,
            "reference": answer,
            # required_keywords 真实项目中通常由人工标注或规则生成。
            "required_keywords": [],
        })

    return {
        "pretrain_texts": pretrain_texts,
        "sft_rows": sft_rows,
        "distill_questions": distill_questions,
        "eval_cases": eval_cases,
    }
```

这段代码不是让你直接用于生产，而是帮你建立一个直觉：

```text
数据不是一个文件，而是一组面向不同阶段的视图。
```

## 1.6 第五步：实现 tokenizer 训练阶段

模型不能直接理解字符串，它只能处理 token id。

Tokenizer 的作用是：

```text
文本
  -> token
  -> token id
```

例如：

```text
订单显示已签收
  -> ["订单", "显示", "已", "签收"]
  -> [153, 876, 42, 901]
```

### 1.6.1 配置文件

`configs/train_tokenizer_chat_demo.json`

```json
{
  "files": [
    "data/cleaned/chat_demo_corpus.txt",
    "data/cleaned/chat_demo_corpus_valid.txt"
  ],
  "vocab_size": 2000,
  "min_frequency": 1,
  "output_dir": "outputs/tokenizer_chat_demo",
  "special_tokens": ["[PAD]", "[UNK]", "[BOS]", "[EOS]"]
}
```

### 1.6.2 核心代码

`scripts/train_tokenizer.py`

```python
from tokenizers import Tokenizer
from tokenizers.models import BPE
from tokenizers.pre_tokenizers import Whitespace
from tokenizers.trainers import BpeTrainer
from transformers import PreTrainedTokenizerFast

# 创建一个 BPE tokenizer。
# unk_token 用来处理词表中不存在的字符或子词。
tokenizer = Tokenizer(BPE(unk_token="[UNK]"))

# 先按空白进行初步切分，适合作为教学版本。
tokenizer.pre_tokenizer = Whitespace()

# BpeTrainer 负责从语料中学习词表。
trainer = BpeTrainer(
    vocab_size=config.get("vocab_size", 16000),
    min_frequency=config.get("min_frequency", 2),
    special_tokens=config.get("special_tokens", ["[PAD]", "[UNK]", "[BOS]", "[EOS]"]),
)

# iter_text_lines 会逐行读取训练语料。
tokenizer.train_from_iterator(iter_text_lines(files), trainer=trainer)

# 保存 tokenizers 原生格式。
tokenizer_json = output_dir / "tokenizer.json"
tokenizer.save(str(tokenizer_json))

# 转成 Hugging Face Transformers 可以直接加载的格式。
hf_tokenizer = PreTrainedTokenizerFast(
    tokenizer_file=str(tokenizer_json),
    unk_token="[UNK]",
    pad_token="[PAD]",
    bos_token="[BOS]",
    eos_token="[EOS]",
)

hf_tokenizer.save_pretrained(output_dir)
```

### 1.6.3 运行和验收

运行：

```bash
make tokenizer-chat-demo
```

验收时检查：

```text
outputs/tokenizer_chat_demo/tokenizer.json
outputs/tokenizer_chat_demo/tokenizer_config.json
outputs/tokenizer_chat_demo/special_tokens_map.json
```

如果这些文件存在，说明 tokenizer 已经可以被后续模型训练脚本加载。

## 1.7 第六步：实现 tiny 预训练阶段

预训练的目标是让模型学习语言规律。

教学版本使用一个很小的 GPT2 风格模型，训练目标是：

```text
给定前面的 token，预测下一个 token
```

### 1.7.1 配置文件

`configs/pretrain_chat_demo.json`

```json
{
  "train_file": "data/cleaned/chat_demo_corpus.txt",
  "validation_file": "data/cleaned/chat_demo_corpus_valid.txt",
  "tokenizer_dir": "outputs/tokenizer_chat_demo",
  "output_dir": "outputs/pretrain_chat_demo",
  "block_size": 64,
  "num_train_epochs": 40,
  "per_device_train_batch_size": 2,
  "learning_rate": 0.0004,
  "hidden_size": 320,
  "num_hidden_layers": 6,
  "num_attention_heads": 4
}
```

### 1.7.2 核心代码

预训练脚本先读取纯文本：

```python
dataset = load_dataset(
    "text",
    data_files={
        "train": config["train_file"],
        "validation": config["validation_file"],
    },
)
```

然后加载上一节训练好的 tokenizer：

```python
tokenizer = AutoTokenizer.from_pretrained(config["tokenizer_dir"], use_fast=True)

if tokenizer.pad_token is None:
    # 部分 tokenizer 没有 pad token。
    # 训练时需要 padding，所以用 eos token 兜底。
    tokenizer.pad_token = tokenizer.eos_token
```

接着把文本转成 token id：

```python
def tokenize_fn(batch):
    # batch["text"] 是一批原始文本。
    # tokenizer 会把文本变成 input_ids、attention_mask 等字段。
    return tokenizer(batch["text"])


tokenized = dataset.map(tokenize_fn, batched=True, remove_columns=["text"])
```

语言模型通常按固定长度训练，所以还要把 token 拼接后切块：

```python
def group_texts(examples):
    # 把一个 batch 内的 token 列表拼成一条长 token 序列。
    concatenated = {k: sum(examples[k], []) for k in examples.keys()}

    # 只保留 block_size 的整数倍，剩下不足一个 block 的尾巴丢弃。
    total_length = len(concatenated["input_ids"])
    total_length = (total_length // block_size) * block_size

    # 按 block_size 切成多个训练样本。
    result = {
        k: [t[i : i + block_size] for i in range(0, total_length, block_size)]
        for k, t in concatenated.items()
    }

    # causal LM 的 labels 通常等于 input_ids。
    # Transformers 内部会处理“预测下一个 token”的位移。
    result["labels"] = result["input_ids"].copy()
    return result
```

最后创建 tiny GPT2 模型：

```python
model_config = GPT2Config(
    # 词表大小必须和 tokenizer 一致。
    vocab_size=tokenizer.vocab_size,

    # 最大上下文长度，本课程教学配置较小，方便 CPU 跑通。
    n_positions=block_size,
    n_ctx=block_size,

    # 模型宽度、层数、注意力头数越大，模型越强但越慢。
    n_embd=config.get("hidden_size", 256),
    n_layer=config.get("num_hidden_layers", 4),
    n_head=config.get("num_attention_heads", 4),
)

model = GPT2LMHeadModel(model_config)
```

### 1.7.3 运行和验收

运行：

```bash
make pretrain-chat-demo
```

验收时检查：

```text
outputs/pretrain_chat_demo/config.json
outputs/pretrain_chat_demo/model.safetensors 或 pytorch_model.bin
outputs/pretrain_chat_demo/tokenizer.json
```

注意：这个 tiny 模型只是教学模型，不代表真实大模型效果。

## 1.8 第七步：实现最小 SFT 阶段

SFT 的目标是让模型学习“如何回答用户问题”。

预训练学习的是：

```text
任意文本续写
```

SFT 学习的是：

```text
系统提示 + 用户问题 -> 助手答案
```

### 1.8.1 配置文件

`configs/sft_minimal_cpu_local.json`

```json
{
  "model_name_or_path": "outputs/pretrain_chat_demo",
  "train_file": "data/sft/customer_support_sample.jsonl",
  "validation_split_ratio": 0.2,
  "output_dir": "outputs/sft_minimal_cpu_local",
  "max_seq_length": 64,
  "per_device_train_batch_size": 1,
  "learning_rate": 0.0003,
  "num_train_epochs": 2,
  "system_prompt": "你是一个电商客服助手，回答准确、简洁、可执行。"
}
```

### 1.8.2 核心代码：构造 prompt 和 full text

SFT 训练前，先把一条 messages 样本拆成两段：

```python
prompt_text, full_text = build_supervised_chat_texts(row, config.get("system_prompt"))
```

你可以理解为：

```text
prompt_text = 系统提示 + 用户问题 + 助手：
full_text   = 系统提示 + 用户问题 + 助手：标准答案
```

### 1.8.3 核心代码：只训练助手答案

SFT 最关键的是 label mask。

```python
prompt_ids = tokenizer(
    prompt_text,
    truncation=True,
    max_length=max_seq_length,
    add_special_tokens=False,
)["input_ids"]

full_ids = tokenizer(
    full_text,
    truncation=True,
    max_length=max_seq_length - 1,
    add_special_tokens=False,
)["input_ids"] + [eos_id]

# labels 默认等于 full_ids，表示每个位置都参与训练。
labels = full_ids.copy()

# prompt 部分只是条件，不应该计算 loss。
# 所以把 prompt 对应位置设为 -100。
prompt_length = min(len(prompt_ids), len(labels))
for idx in range(prompt_length):
    labels[idx] = -100
```

`-100` 是 Transformers 里常用的忽略标记。

它的意思是：

```text
这些 token 给模型看，但不要求模型学习预测它们。
```

所以 SFT 实际训练的是：

```text
看到系统提示和用户问题后，生成助手答案。
```

### 1.8.4 核心代码：padding 一个 batch

每条样本长度不同，所以训练前要 padding。

```python
class SupervisedDataCollator:
    def __init__(self, pad_token_id: int):
        self.pad_token_id = pad_token_id

    def __call__(self, features):
        import torch

        # 找到当前 batch 中最长的样本长度。
        max_length = max(len(feature["input_ids"]) for feature in features)

        batch = {"input_ids": [], "attention_mask": [], "labels": []}
        for feature in features:
            # 当前样本距离最长样本还差多少 token。
            pad_length = max_length - len(feature["input_ids"])

            # input_ids 用 pad_token_id 补齐。
            batch["input_ids"].append(feature["input_ids"] + [self.pad_token_id] * pad_length)

            # attention_mask 中真实 token 是 1，padding 是 0。
            batch["attention_mask"].append(feature["attention_mask"] + [0] * pad_length)

            # labels 中 padding 位置也设为 -100，不参与 loss。
            batch["labels"].append(feature["labels"] + [-100] * pad_length)

        return {
            key: torch.tensor(value, dtype=torch.long)
            for key, value in batch.items()
        }
```

### 1.8.5 运行和验收

运行：

```bash
make sft-minimal
```

验收时检查：

```text
outputs/sft_minimal_cpu_local/config.json
outputs/sft_minimal_cpu_local/tokenizer.json
outputs/sft_minimal_cpu_local/model.safetensors 或 pytorch_model.bin
```

## 1.9 第八步：实现本地推理阶段

训练后要实际问模型问题。

推理阶段的输入是：

```text
模型目录 + 用户问题
```

输出是：

```text
模型回答
```

### 1.9.1 配置文件

`configs/infer_minimal_cpu_local.json`

```json
{
  "model_name_or_path": "outputs/sft_minimal_cpu_local",
  "debug_train_file": "data/sft/customer_support_sample.jsonl",
  "system_prompt": "你是一个电商客服助手，回答准确、简洁、可执行。",
  "user_prompt": "订单显示已签收但我没有收到，该怎么办？",
  "max_new_tokens": 64,
  "temperature": 0.8,
  "top_p": 0.95,
  "do_sample": true
}
```

### 1.9.2 核心代码

```python
tokenizer = AutoTokenizer.from_pretrained(config["model_name_or_path"], use_fast=True)
model = AutoModelForCausalLM.from_pretrained(config["model_name_or_path"])

# 推理时切换到 eval 模式，关闭 dropout 等训练行为。
model.eval()

messages = []
if config.get("system_prompt"):
    messages.append({"role": "system", "content": config["system_prompt"]})
messages.append({"role": "user", "content": user_prompt})

# 把 messages 转成模型能理解的纯文本 prompt。
prompt_text = build_text_from_messages(tokenizer, messages)

inputs = tokenizer(
    prompt_text,
    return_tensors="pt",
    truncation=True,
)

with torch.no_grad():
    outputs = model.generate(
        **inputs,
        max_new_tokens=config.get("max_new_tokens", 64),
        temperature=config.get("temperature", 1.0),
        top_p=config.get("top_p", 1.0),
        do_sample=config.get("do_sample", False),
        repetition_penalty=config.get("repetition_penalty", 1.0),
        pad_token_id=tokenizer.pad_token_id,
        eos_token_id=tokenizer.eos_token_id,
    )

# 只截取新生成的 token，避免把 prompt 一起打印出来。
generated_ids = outputs[0][inputs["input_ids"].shape[1] :]
generated_text = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
```

### 1.9.3 运行和验收

运行：

```bash
make infer-minimal
```

验收时观察：

```text
是否输出 Prompt
是否输出 Response
Response 是否为空
是否出现明显重复
是否保持客服助手角色
```

## 1.10 第九步：实现相似训练样本检查

模型回答看起来正确，不代表它真的学会了。

它可能只是背了训练集里非常相似的问题。

所以本课程会检查：

```text
当前问题和训练集中哪些问题最相似
```

### 1.10.1 配置文件

`configs/retrieve_similar_examples.json`

```json
{
  "train_file": "data/sft/customer_support_sample.jsonl",
  "ngram_size": 2
}
```

### 1.10.2 核心代码

```python
rows = read_jsonl(config["train_file"])

scored = []
for row in rows:
    # 从 messages 或 question/answer 中提取用户问题和助手答案。
    question, answer = extract_question_and_answer(row)
    if not question:
        continue

    scored.append(
        {
            # 使用字符 ngram Jaccard 做轻量相似度。
            "score": round(
                jaccard_similarity(args.query, question, n=config.get("ngram_size", 2)),
                4,
            ),
            "question": question,
            "answer": answer,
        }
    )

# 分数越高，说明和当前问题越像。
scored.sort(key=lambda item: item["score"], reverse=True)
```

### 1.10.3 运行和验收

运行：

```bash
make retrieve-similar
```

你应该看到：

```json
{
  "query": "订单显示已签收但我没有收到，该怎么办？",
  "matches": [
    {
      "score": 0.8,
      "question": "...",
      "answer": "..."
    }
  ]
}
```

如果相似度非常高，要警惕模型可能在背训练样本。

## 1.11 第十步：实现业务评测报告

评测阶段的目标是判断模型是否真的符合业务要求。

不要只看训练 loss。

业务评测至少要看：

- 是否答对核心问题
- 是否覆盖必需关键词
- 是否遗漏关键步骤
- 是否出现胡编
- 是否和训练样本过于相似

### 1.11.1 评测输入格式

预测文件通常长这样：

```json
{
  "question": "订单显示已签收但我没有收到，该怎么办？",
  "reference": "请先核实签收人和快递柜信息。",
  "prediction": "建议先联系快递员核实签收情况。",
  "exact_match": 0,
  "keyword_coverage": 0.5,
  "nearest_training_examples": []
}
```

### 1.11.2 核心代码

`scripts/generate_eval_report.py`

```python
def classify_row(row):
    # 完全匹配参考答案，通常只适合非常严格的短答案场景。
    if row.get("exact_match", 0) == 1.0:
        return "exact_match"

    # 关键词覆盖率高，说明回答大概率包含关键业务步骤。
    if row.get("keyword_coverage", 0) >= 0.8:
        return "partial_pass"

    # 其余样本需要人工重点复核。
    return "needs_review"
```

渲染单条样本：

```python
def render_row(index, row):
    nearest = row.get("nearest_training_examples", [])
    nearest_md = "无"

    if nearest:
        # 只展示最相似的一条训练样本，避免报告过长。
        nearest_md = (
            f"相似度 `{nearest[0].get('score', 0)}`\n\n"
            f"问题：{nearest[0].get('question', '')}\n\n"
            f"答案：{nearest[0].get('answer', '')}"
        )

    lines = [
        f"### 样本 {index}",
        f"- 分类：`{classify_row(row)}`",
        f"- 问题：{row.get('question', '')}",
        f"- 参考答案：{row.get('reference', '')}",
        f"- 模型预测：{row.get('prediction', '')}",
        f"- Exact Match：`{row.get('exact_match', 0)}`",
        f"- Keyword Coverage：`{row.get('keyword_coverage', 0)}`",
        f"- 最近训练样本：{nearest_md}",
        "",
    ]
    return "\n".join(lines)
```

### 1.11.3 运行和验收

运行：

```bash
make report-eval-sample
```

验收时检查：

```text
outputs/eval/customer_report.sample.md 是否生成
报告里是否包含总览
报告里是否包含详细样本
样本是否有分类和关键词覆盖率
```

## 1.12 第十一步：理解部署阶段

部署不是训练脚本的延续，而是把模型变成服务。

训练阶段关注：

```text
loss、数据、显存、checkpoint
```

部署阶段关注：

```text
API、并发、延迟、吞吐、稳定性
```

### 1.12.1 vLLM 服务形态

本课程使用 vLLM 作为部署示例。

概念上可以理解为：

```bash
python -m vllm.entrypoints.openai.api_server \
  --model outputs/qwen25_cs_merged \
  --host 0.0.0.0 \
  --port 8000
```

启动后，应用侧按 OpenAI 兼容格式请求：

```python
payload = {
    # model 字段对应服务端加载的模型。
    "model": "outputs/qwen25_cs_merged",

    # messages 和训练时的 messages 格式保持一致。
    "messages": [
        {"role": "system", "content": "你是一个电商客服助手。"},
        {"role": "user", "content": "订单显示已签收但没收到怎么办？"},
    ],

    # temperature 控制回答随机性。
    "temperature": 0.7,
}
```

部署阶段先理解接口形态即可。真正部署会在第 11 章展开。

## 1.13 第十二步：把全流程接入 `Makefile`

现在回头看 `Makefile` 里的本地流水线：

```makefile
pipeline-local:
	$(PYTHON) scripts/prepare_sft_data.py --config configs/prepare_sft_data.json
	$(PYTHON) scripts/train_tokenizer.py --config $(CHAT_DEMO_TOKENIZER_CONFIG)
	$(PYTHON) scripts/pretrain.py --config $(CHAT_DEMO_PRETRAIN_CONFIG)
	$(PYTHON) scripts/sft_train_minimal.py --config configs/sft_minimal_cpu_local.json
	$(PYTHON) scripts/infer_minimal.py --config configs/infer_minimal_cpu_local.json --show-similar
	$(PYTHON) scripts/retrieve_similar_examples.py --config configs/retrieve_similar_examples.json --query "订单显示已签收但我没有收到，该怎么办？"
	$(PYTHON) scripts/generate_eval_report.py --predictions outputs/eval/customer_predictions.sample.jsonl --output outputs/eval/customer_report.sample.md
```

逐行解释：

```text
prepare_sft_data.py
  清洗原始客服数据，生成 SFT JSONL。

train_tokenizer.py
  根据教学语料训练 tokenizer。

pretrain.py
  用教学语料训练 tiny causal LM。

sft_train_minimal.py
  不依赖 TRL，在 CPU 上跑最小 SFT。

infer_minimal.py
  加载 SFT 后模型，进行一次本地推理。

retrieve_similar_examples.py
  查找最相似训练样本，辅助判断是否背题。

generate_eval_report.py
  生成 Markdown 业务评测报告。
```

完成第 2 章的环境检查后，再完整运行：

```bash
make pipeline-local
```

注意：这条流水线是教学路线，模型很小，数据也少。它的目标是让你理解完整流程，而不是得到生产级客服模型。

## 1.14 本章练习

### 1.14.1 练习一：画出自己的文件流

在笔记里写出：

```text
原始数据文件：
清洗脚本：
SFT 输出文件：
tokenizer 输出目录：
预训练模型输出目录：
SFT 模型输出目录：
评测报告输出文件：
```

### 1.14.2 练习二：解释 SFT 的 label mask

用自己的话回答：

```text
为什么 prompt 部分的 labels 要设置成 -100？
如果不设置 -100，模型会学到什么错误行为？
```

### 1.14.3 练习三：找出 `pipeline-local` 的真实命令

打开：

```text
Makefile
```

找到：

```text
pipeline-local
```

然后逐行写下：

```text
第 1 行脚本负责：
第 2 行脚本负责：
第 3 行脚本负责：
第 4 行脚本负责：
第 5 行脚本负责：
第 6 行脚本负责：
第 7 行脚本负责：
```

## 1.15 本章验收标准

完成本章后，你应该能做到：

- 说清楚大模型项目从数据到部署的完整流程
- 解释每个阶段的输入、脚本和输出
- 看懂 `make pipeline-local` 每一行在做什么
- 理解 tokenizer、预训练、SFT、推理、评测之间的关系
- 解释为什么评测要结合最近训练样本分析
- 知道本地教学路线和真实生产模型之间的差异

## 1.16 常见问题

### 1.16.1 为什么第一章没有一上来讲 Transformer 结构

因为新手最容易卡住的不是 Transformer 公式，而是不知道一个模型项目如何从数据走到部署。

Transformer 结构重要，但工程流程同样重要。

本课程先建立工程地图，再逐步深入训练细节。

### 1.16.2 `make pipeline-local` 跑出来的模型很差，是不是失败

不是。

本地教学模型很小，训练数据也少，目标是让你看懂流程。

真正追求效果时，需要：

- 更强的开源基座模型
- 更高质量的 SFT 数据
- 更系统的评测集
- GPU QLoRA 或更完整的训练方案

### 1.16.3 为什么要做相似训练样本检查

因为模型回答正确有两种可能：

```text
真正学会了业务规则
只是背了相似训练样本
```

相似样本检查可以帮助你区分这两种情况。

## 1.17 下一章预告

下一章会继续采用这种逐步实现方式，带你检查和整理项目环境。

你会更系统地理解：

```text
Python 环境
依赖安装
目录结构
配置文件
运行产物
常见报错
```

从第 2 章开始，每一章都会把一个阶段拆成更细的“文件、代码、运行、验收”。
