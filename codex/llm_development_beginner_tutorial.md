# 大模型开发入门教程

适用人群：有 Python 基础、会用命令行、但还没有完整做过大模型项目的新手程序员。

更新时间：2026-05-13

本文目标不是把你培养成“会背术语的人”，而是让你建立一条真正能跑通的大模型开发路径。它和 [分章课程](/Users/luoqingxiang/Documents/codex/docs/course/index.md)、[基础知识附录](/Users/luoqingxiang/Documents/codex/docs/course/appendix-foundations.md)、[术语表](/Users/luoqingxiang/Documents/codex/docs/course/glossary.md)、[章节测试题](/Users/luoqingxiang/Documents/codex/docs/course/chapter-quizzes.md)、[学习进度表](/Users/luoqingxiang/Documents/codex/docs/course/learning-progress.md)、[工程 README](/Users/luoqingxiang/Documents/codex/README.md) 配套使用：本文讲全局原理，基础附录补机器学习、深度学习、神经网络、Transformer、PyTorch / TensorFlow 等地基，术语表用于随手查词，分章课程带你逐章练习，测试题和进度表帮助你检查学习效果，README 提供命令索引。

读完后，你应该能理解并实践下面这条主线：

1. 准备数据与训练环境
2. 做一个教学型预训练或继续预训练实验
3. 用 LoRA / QLoRA 做微调
4. 用蒸馏把大模型能力迁移到小模型
5. 用自动评测 + 业务评测验证效果
6. 用 vLLM 或 SGLang 把模型部署成 API 服务

如果你是第一次接触大模型开发，先记住一句最重要的话：

不要一上来就尝试“从零训练一个行业级 70B 模型”。新手最适合的入门顺序是：

1. 先学会微调
2. 再学评测
3. 再学部署
4. 最后再补预训练与蒸馏

不过因为你希望这份教程覆盖完整流程，本文会把预训练、微调、蒸馏、评测、部署都讲完整，并给出可落地案例。

***

## 1. 先建立全流程认知

一个典型的大模型项目，通常会经历下面几个阶段：

### 1.1 预训练（Pretraining）

模型在超大规模语料上学习“语言规律”和“世界知识”。最常见目标是“根据前文预测下一个 token”。

你可以把预训练理解成：

- 给模型打基础
- 让模型学会语言、代码、文档、问答等通用模式
- 决定模型的知识上限、表示能力和泛化能力

### 1.2 微调（Fine-tuning / Post-training）

在已有基座模型上继续训练，让模型更适合某个任务、风格或业务场景。

常见类型：

- SFT（监督微调）：给“输入-输出”样本，让模型学会按你想要的方式回答
- DPO / RLHF：进一步做偏好对齐，让模型更符合人类偏好
- 指令微调：让模型更会“听指令”
- 领域微调：让模型更懂法律、金融、医疗、客服、代码等领域

### 1.3 蒸馏（Distillation）

用一个大模型当老师，把知识迁移给一个小模型。目的通常是：

- 降低延迟
- 降低显存占用
- 降低部署成本
- 提升边缘设备可用性

### 1.4 评测（Evaluation）

判断模型“到底变好了没有”，包括：

- 学术 benchmark
- 业务集评测
- 人工评测
- 安全评测
- 延迟 / 吞吐 / 显存评测

### 1.5 部署（Deployment）

把训练好的模型变成一个稳定可调用的服务，常见形态：

- OpenAI 兼容 API
- 内部推理服务
- Agent 后端
- RAG 系统的生成模块
- 本地推理或边缘推理

***

## 2. 新手必须掌握的基础知识

这一节会稍微细一些，因为很多人不是不会写代码，而是不知道大模型到底在训练什么。

## 2.1 token、tokenizer 和“模型看到的世界”

大模型不是直接看汉字、英文单词或代码字符，而是先经过 tokenizer 切分成 token。

例如一句话：

```text
请帮我总结这篇文档
```

可能被切成若干 token，再映射为整数 id：

```text
[3812, 9271, 102, 6641, 583, 7710]
```

然后模型训练的对象其实是这些 token id 序列。

你需要知道：

- tokenizer 决定了文本如何被切分
- 切分方式会影响训练效率、上下文长度利用率和多语言能力
- 主流做法是 BPE、SentencePiece、Unigram、Byte-level BPE
- 如今很多开源模型会直接复用已有 tokenizer，而不是自己重新训练

对新手的建议：

- 从零预训练教学实验时，可以自己训练 tokenizer
- 做继续预训练、微调、蒸馏时，优先复用 teacher 或 base model 的 tokenizer

## 2.2 embedding 是什么

token id 只是整数，模型不能直接拿它做矩阵运算，所以第一步会把 token id 变成向量，这一步叫 embedding。

你可以把 embedding 理解成：

- 每个 token 在向量空间中的“坐标”
- 这些坐标会在训练中不断更新

## 2.3 Transformer 大概在做什么

主流大语言模型几乎都建立在 Transformer 架构上，尤其是 decoder-only Transformer。

你只需要先理解 4 个核心模块：

1. Token Embedding：把 token id 变成向量
2. Self-Attention：让当前 token 参考上下文中其他 token
3. MLP / FFN：做非线性变换，提升表达能力
4. LM Head：把隐藏状态投影回词表空间，预测下一个 token

### 2.3.1 Self-Attention 为什么重要

传统 RNN 按顺序处理文本，长距离依赖难。Attention 让模型在生成当前 token 时，可以直接“关注”前面更关键的位置。

例如：

```text
小王把书借给了小李，因为他明天要考试。
```

模型需要根据上下文判断“他”更可能指谁。Attention 可以帮助模型建立这种跨位置联系。

### 2.3.2 Decoder-only 为什么是主流

GPT、LLaMA、Qwen、Mistral、DeepSeek 等通用生成模型，大多属于 decoder-only 架构。它适合：

- 对话
- 代码生成
- 文本续写
- 指令跟随
- Agent 调用

这也是本文默认的主线架构。

## 2.4 训练目标是什么

大模型最经典的训练目标是下一 token 预测：

给定：

```text
今天上海天气很
```

模型去预测下一个 token，比如“好”“热”“冷”等。

训练时会得到一个概率分布，然后用交叉熵损失（cross entropy loss）衡量预测和真实答案之间的差距。

损失越低，通常说明模型越会预测训练数据中的模式。

但注意：

- 训练 loss 低，不代表业务效果一定好
- 模型也可能过拟合
- 所以后面一定要做评测

## 2.5 上下文长度（Context Length）

上下文长度指模型一次能看到多少 token。

例如：

- 4K
- 8K
- 32K
- 128K

上下文越长，不一定越好，因为会带来：

- 更高显存
- 更慢训练
- 更慢推理
- 更复杂的位置编码和注意力优化问题

新手入门时：

- 训练实验可先用 1K 到 4K
- 真正业务部署再根据文档长度决定是否做长上下文

## 2.6 常见精度：FP32、FP16、BF16、INT8、INT4

这是最容易让新手困惑，但工程上又非常关键的一块。

- FP32：精度高，但显存大，训练慢
- FP16：训练常见，省显存
- BF16：现代 GPU 上很常见，数值稳定性通常更好
- INT8：多用于推理量化
- INT4：更省显存，常见于 QLoRA 和低成本推理

经验规则：

- 训练优先 BF16
- 显存不够时，微调优先 QLoRA
- 部署时根据吞吐和质量取舍做 8bit / 4bit 量化

## 2.7 为什么大模型训练这么吃显存

显存不只装模型参数，还要装：

- 前向激活值
- 梯度
- 优化器状态
- KV cache（推理阶段）

所以一个“7B 模型”并不是“只有 7B 参数这么简单”。

这也就是为什么 FSDP、DeepSpeed ZeRO、梯度检查点、量化这些技术非常重要。

***

## 3. 截至 2026-05-08 的主流技术栈

下面这套组合，是目前最适合新手入门，也最接近真实工程环境的一条主流路线。

### 3.1 训练与数据

- `PyTorch`：底层训练框架
- `transformers`：模型与 Trainer 生态
- `datasets`：数据集加载与处理
- `tokenizers`：训练 tokenizer 或做高速分词
- `accelerate`：统一单卡、多卡、FSDP、DeepSpeed 启动方式

### 3.2 大模型训练加速与并行

- `PyTorch FSDP`：主流参数分片训练方案
- `DeepSpeed ZeRO`：主流显存优化和大模型训练方案
- `Megatron-Core`：更偏大规模预训练和高性能集群训练

### 3.3 微调与对齐

- `PEFT`：LoRA / AdaLoRA / IA3 等参数高效微调
- `TRL`：SFT、DPO、偏好优化等后训练流程
- `bitsandbytes`：8bit / 4bit 量化，QLoRA 常用

### 3.4 评测

- `lm-evaluation-harness`：学术 benchmark 统一评测
- `OpenCompass`：适合中英文、多 benchmark、配置化评测
- 自建业务评测集：实际项目必须有

### 3.5 部署

- `vLLM`：当前最主流的开源高性能推理服务框架之一
- `SGLang`：当前主流高性能推理框架之一，生产场景越来越常见
- `safetensors`：主流模型权重存储格式

### 3.6 一句话技术选型建议

如果你不知道怎么选，直接用下面这套：

- 训练：`PyTorch + transformers + datasets + accelerate`
- 微调：`TRL + PEFT + bitsandbytes`
- 多卡：`FSDP` 或 `DeepSpeed ZeRO`
- 评测：`lm-evaluation-harness + OpenCompass + 自建业务集`
- 部署：`vLLM`

***

## 4. 环境准备

## 4.1 推荐硬件分级

### A 档：没有独立 GPU

能做：

- 看懂流程
- 处理数据
- 跑超小模型
- 用 API 做蒸馏数据生成

不适合：

- 真正训练中型以上模型

### B 档：单张 16GB 到 24GB GPU

能做：

- 0.5B 到 3B 量级模型的 LoRA / QLoRA
- 教学型小模型预训练
- 量化推理部署实验

这是很多个人开发者最现实的起点。

### C 档：单张 48GB 或双卡 24GB

能做：

- 更稳妥的 7B 级 LoRA / QLoRA
- 更长上下文
- 蒸馏与评测更从容

### D 档：多卡服务器

适合：

- 中型继续预训练
- 真正意义上的多卡预训练
- 高吞吐推理部署

## 4.2 推荐系统环境

优先级建议：

1. Linux + NVIDIA GPU + CUDA
2. Python 3.10 或 3.11
3. PyTorch 对应 CUDA 版本

## 4.3 一个常见的环境安装示例

```bash
python -m venv .venv
source .venv/bin/activate

pip install --upgrade pip
pip install torch torchvision torchaudio
pip install transformers datasets tokenizers accelerate peft trl bitsandbytes
pip install deepspeed
pip install lm-eval
pip install opencompass
pip install vllm
pip install safetensors
```

说明：

- `deepspeed`、`vllm` 的安装常受 CUDA、编译环境影响
- 如果你只是先练微调，可以先不装 `vllm`
- 如果你是 macOS 本机，没有 NVIDIA GPU，建议把“训练”理解为教学实验，把“部署”理解为 CPU 或远端服务器实验

***

## 5. 从零开始的项目目录建议

建议一开始就把项目目录规范起来：

```text
llm-project/
├── data/
│   ├── raw/
│   ├── cleaned/
│   ├── sft/
│   ├── distill/
│   └── eval/
├── scripts/
│   ├── train_tokenizer.py
│   ├── pretrain.py
│   ├── sft_train.py
│   ├── distill_generate.py
│   ├── distill_train.py
│   ├── eval_lm.py
│   └── serve_vllm.sh
├── configs/
├── outputs/
├── notebooks/
└── README.md
```

这样做的好处是：

- 数据、训练脚本、结果不混
- 后续蒸馏、评测、部署都好接入
- 更接近真实工程

***

## 6. 阶段一：预训练

## 6.1 预训练到底在干什么

如果一句话总结：

预训练是在大量语料上训练一个“会预测下一个 token 的 Transformer”，让它获得通用语言能力。

### 6.1.1 预训练的两种常见形式

1. 从零预训练
2. 继续预训练（Continued Pretraining / Domain Adaptive Pretraining）

从工程上说，新手更建议先理解继续预训练，因为：

- 成本远低于从零训练
- 更接近中小团队真实做法
- 更容易看到业务收益

但为了把底层逻辑讲清楚，本文先讲“教学型从零预训练”。

## 6.2 预训练的数据准备

预训练里，数据质量往往比“多堆几个训练技巧”更重要。

一个基本的数据流水线通常包括：

1. 采集语料
2. 清洗乱码、HTML、广告、模板垃圾
3. 去重
4. 过滤低质量文本
5. 统一编码
6. 切分训练集 / 验证集
7. 分词与打包

### 6.2.1 数据格式建议

最简单可用的是 JSONL：

```json
{"text": "用户：请帮我查询订单状态。客服：好的，请提供订单号。"}
{"text": "机器学习是一类让系统从数据中学习规律的方法。"}
{"text": "def quick_sort(arr): ..."}
```

### 6.2.2 数据清洗要点

至少做这些：

- 去除重复样本
- 去掉太短样本
- 去掉乱码和无意义模板
- 统一空白符
- 保留文档边界

更进阶的做法还包括：

- 语言识别
- 质量打分
- PII 脱敏
- 毒性与安全过滤
- 长文切分

## 6.3 tokenizer 怎么做

从零训练小模型时，你可以自己训练 tokenizer。主流工具是 `tokenizers`。

### 6.3.1 教学案例：训练一个 BPE tokenizer

`data/cleaned/corpus.txt` 示例：

```text
请总结下面这段话的重点。
人工智能正在改变软件开发方式。
def add(a, b):
    return a + b
```

示例脚本：

```python
from tokenizers import Tokenizer
from tokenizers.models import BPE
from tokenizers.pre_tokenizers import Whitespace
from tokenizers.trainers import BpeTrainer

tokenizer = Tokenizer(BPE(unk_token="[UNK]"))
tokenizer.pre_tokenizer = Whitespace()

trainer = BpeTrainer(
    vocab_size=16000,
    min_frequency=2,
    special_tokens=["[PAD]", "[UNK]", "[BOS]", "[EOS]"]
)

tokenizer.train(["data/cleaned/corpus.txt"], trainer)
tokenizer.save("outputs/tokenizer.json")
```

解释一下这里在做什么：

- `BPE` 决定切词算法
- `vocab_size` 决定词表大小
- `special_tokens` 决定特殊标记
- 训练结果会得到一个可复用 tokenizer

如果你后面想直接配合 `transformers.AutoTokenizer.from_pretrained()` 使用，最好再把 tokenizer 导出成 Hugging Face 目录格式，例如：

```text
outputs/tokenizer_hf/
├── tokenizer.json
├── tokenizer_config.json
├── special_tokens_map.json
└── added_tokens.json
```

这样后面的训练脚本里直接写：

```python
AutoTokenizer.from_pretrained("outputs/tokenizer_hf")
```

就更顺手。

### 6.3.2 什么时候不要自己训 tokenizer

如果你做的是：

- 继续预训练
- 基于现成开源模型做微调
- 蒸馏已有模型

通常应该直接复用原模型 tokenizer。否则会造成：

- 词表不兼容
- embedding 无法直接复用
- teacher/student 对齐更麻烦

## 6.4 模型结构怎么定

教学型预训练，建议从一个小型 decoder-only 模型开始。

例如：

- 层数：6 到 12 层
- hidden size：384 到 768
- attention heads：6 到 12
- context length：1024

这样做的意义不是训练出最强模型，而是：

- 理解训练流程
- 跑通 checkpoint
- 学会数据管道、损失曲线和评测闭环

## 6.5 训练时会遇到的关键概念

### 6.5.1 batch size

每次送进模型多少条样本。

### 6.5.2 gradient accumulation

显存不够时，把多个小 batch 的梯度累积后再更新一次，相当于“伪装成更大的 batch”。

### 6.5.3 learning rate

学习率太大容易炸，太小收敛慢。新手可以先用已有训练脚本默认值。

### 6.5.4 warmup

刚开始训练时先用较小学习率，再逐步拉升，通常更稳定。

### 6.5.5 checkpoint

定期保存模型、优化器、训练状态，避免训练中断后从零开始。

### 6.5.6 perplexity

语言模型中常见指标，越低通常越好，但它不等于真实任务表现。

## 6.6 预训练并行与显存优化

单机教学实验里，知道这些就够用了：

- 梯度检查点：省显存，略慢
- BF16：主流训练精度
- FSDP：按参数切分，适合 PyTorch 生态
- DeepSpeed ZeRO：按参数 / 梯度 / 优化器状态切分
- Megatron-Core：更偏大规模工业预训练

### 6.6.1 FSDP 和 DeepSpeed 怎么理解

直觉上你可以这样记：

- FSDP：PyTorch 原生风格更强
- DeepSpeed：显存优化和大模型训练生态更成熟

新手建议：

- 单卡先不用
- 双卡以上先学 `accelerate + FSDP`
- 再学 `DeepSpeed ZeRO`

## 6.7 教学案例 A：训练一个迷你语言模型

目标：

- 用自己的语料训练一个教学型 100M 左右语言模型
- 理解预训练最核心的流程

### 6.7.1 数据准备

假设你有一个面向客服问答与产品文档的语料库：

- 产品说明书
- FAQ
- 历史客服对话
- 帮助中心文章

整理后得到：

```text
data/cleaned/train.txt
data/cleaned/valid.txt
```

### 6.7.2 一个简化训练脚本

```python
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    GPT2Config,
    GPT2LMHeadModel,
    DataCollatorForLanguageModeling,
    Trainer,
    TrainingArguments,
)

dataset = load_dataset(
    "text",
    data_files={
        "train": "data/cleaned/train.txt",
        "validation": "data/cleaned/valid.txt",
    },
)

tokenizer = AutoTokenizer.from_pretrained("outputs/tokenizer_hf")
tokenizer.pad_token = tokenizer.eos_token

def tokenize_fn(batch):
    return tokenizer(
        batch["text"],
        truncation=True,
        max_length=1024,
    )

tokenized = dataset.map(tokenize_fn, batched=True, remove_columns=["text"])

config = GPT2Config(
    vocab_size=tokenizer.vocab_size,
    n_positions=1024,
    n_ctx=1024,
    n_embd=512,
    n_layer=8,
    n_head=8,
)

model = GPT2LMHeadModel(config)

args = TrainingArguments(
    output_dir="outputs/pretrain-mini",
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    gradient_accumulation_steps=8,
    learning_rate=3e-4,
    num_train_epochs=3,
    bf16=True,
    logging_steps=20,
    save_steps=500,
    eval_steps=500,
    evaluation_strategy="steps",
    save_total_limit=2,
    report_to="none",
)

trainer = Trainer(
    model=model,
    args=args,
    train_dataset=tokenized["train"],
    eval_dataset=tokenized["validation"],
    data_collator=DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False),
)

trainer.train()
trainer.save_model("outputs/pretrain-mini/final")
```

### 6.7.3 这个案例能学到什么

- 数据如何进入训练
- tokenizer 如何参与建模
- decoder-only 模型如何训练
- loss 如何下降
- checkpoint 如何保存

### 6.7.4 这个案例学不到什么

- 真正的大规模集群预训练
- 最优架构搜索
- 工业级数据清洗
- 复杂并行策略

所以它的定位是“训练认知实验”，不是“商业可交付基座模型”。

## 6.8 更接近真实工程的做法：继续预训练

如果你已经有一个开源 base model，比如：

- Qwen base
- Llama base
- Mistral base

你可以在自己的领域语料上继续训练，让模型更懂你的行业文档和术语。

这类场景很常见：

- 法务文档
- 医疗文献
- 金融报告
- 企业知识库
- 代码仓库

继续预训练通常比从零训练更划算，因为：

- 起点高
- 数据需求更小
- 训练时间更短
- 效果更容易落地

***

## 7. 阶段二：微调

## 7.1 微调的本质

微调是把一个“会说话的模型”变成“更会按你要求说话的模型”。

最常见的是 SFT，也就是监督微调。

训练样本长这样：

```json
{
  "messages": [
    { "role": "system", "content": "你是一个电商客服助手。" },
    { "role": "user", "content": "我的订单为什么还没发货？" },
    {
      "role": "assistant",
      "content": "请提供订单号，我帮你查询物流和仓储状态。"
    }
  ]
}
```

模型会学习：

- 什么语气回答
- 信息怎么组织
- 是否遵守角色设定
- 是否更贴近业务领域

## 7.2 全量微调 vs LoRA vs QLoRA

### 7.2.1 全量微调

更新所有参数。

优点：

- 理论上自由度最大

缺点：

- 显存贵
- 训练慢
- 存储多个版本成本高

### 7.2.2 LoRA

冻结原模型参数，只训练少量低秩适配矩阵。

优点：

- 显存需求小
- 训练快
- adapter 易管理

缺点：

- 并非所有任务都和全量微调一样强

### 7.2.3 QLoRA

把基座模型以 4bit 量化加载，再训练 LoRA adapter。

优点：

- 对单卡开发者非常友好
- 7B 级模型也更容易微调

缺点：

- 配置更复杂
- 训练速度和数值稳定性要更谨慎

新手建议：

- 默认从 LoRA / QLoRA 开始
- 没有充分理由，不要先做全量微调

## 7.3 微调数据怎么做

SFT 数据质量常常决定上限。

好的 SFT 数据要满足：

- 指令清楚
- 回答高质量
- 风格一致
- 覆盖核心场景
- 不互相矛盾

### 7.3.1 常见数据来源

- 人工编写
- 业务日志清洗
- 老模型生成后再人工修订
- 用强模型生成高质量样本

### 7.3.2 数据构造注意点

- system 提示词不要乱写一堆重复废话
- 用户问题要像真实场景
- assistant 回答要可执行、可验证
- 不要把错误答案混进训练集

### 7.3.3 原始数据到 SFT 数据的最小清洗流程

很多新手第一次做微调时，手里并不是现成的 `messages` 格式数据，而是更原始的业务记录，例如：

```json
{
  "instruction": "你是一个电商客服助手，回答准确、简洁、可执行。",
  "question": "可以开发票吗？",
  "answer": "可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。",
  "source": "faq",
  "quality": "high"
}
```

这时候建议至少做 5 步：

1. 过滤低质量样本
2. 过滤过短问题和回答
3. 统一空白符
4. 去重
5. 转成统一的 `messages` 格式

一个清洗后的目标格式：

```json
{
  "messages": [
    {
      "role": "system",
      "content": "你是一个电商客服助手，回答准确、简洁、可执行。"
    },
    { "role": "user", "content": "可以开发票吗？" },
    {
      "role": "assistant",
      "content": "可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。"
    }
  ]
}
```

如果你正在使用本文配套工程，可以直接参考：

- 原始样例数据：`data/raw/customer_support_raw.jsonl`
- 清洗配置：`configs/prepare_sft_data.json`
- 清洗脚本：`scripts/prepare_sft_data.py`

它会把可用样本输出到：

```text
data/sft/customer_support_prepared.jsonl
```

并把被拒绝样本单独输出，方便复查。

### 7.3.4 一个很重要但常被忽略的原则

不要只保存“清洗后的最终结果”，还要保存：

- 原始输入
- 清洗配置
- 被拒绝样本
- 清洗汇总统计

因为后续你经常会需要回答这些问题：

- 为什么某些样本没进训练集
- 为什么业务覆盖不够
- 为什么模型学到了某种错误风格

如果没有这些中间产物，排查会很痛苦。

## 7.4 教学案例 B：用 QLoRA 微调一个客服助手

目标：

- 基于开源小模型做一个“电商客服问答助手”
- 用单卡也能跑通

建议模型：

- `Qwen/Qwen3-0.6B` 或同级别小模型

### 7.4.1 准备数据

`data/sft/customer_support.jsonl`

```json
{"messages":[{"role":"system","content":"你是一个电商客服助手，回答简洁准确。"},{"role":"user","content":"我的订单一直显示待揽收怎么办？"},{"role":"assistant","content":"这通常表示商家已创建运单但快递尚未揽件。请提供订单号，我帮你确认仓库是否已出库。"}]}
{"messages":[{"role":"system","content":"你是一个电商客服助手，回答简洁准确。"},{"role":"user","content":"可以开发票吗？"},{"role":"assistant","content":"可以。请告诉我订单号、发票抬头和税号，我会为你提交开票申请。"}]}
```

### 7.4.2 微调代码

```python
import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig
from trl import SFTConfig, SFTTrainer

model_name = "Qwen/Qwen3-0.6B"

dataset = load_dataset("json", data_files="data/sft/customer_support.jsonl", split="train")

tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    quantization_config=bnb_config,
    torch_dtype=torch.bfloat16,
    trust_remote_code=True,
)

peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "up_proj", "down_proj", "gate_proj"],
    task_type="CAUSAL_LM",
)

training_args = SFTConfig(
    output_dir="outputs/sft-qwen3-cs",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,
    learning_rate=1e-4,
    num_train_epochs=3,
    logging_steps=10,
    save_steps=100,
    bf16=True,
    max_seq_length=1024,
    report_to="none",
)

trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=dataset,
    processing_class=tokenizer,
    peft_config=peft_config,
)

trainer.train()
trainer.save_model("outputs/sft-qwen3-cs/final")
tokenizer.save_pretrained("outputs/sft-qwen3-cs/final")
```

### 7.4.3 这个案例的关键点

- `BitsAndBytesConfig`：让模型以 4bit 方式加载
- `LoRAConfig`：指定只训练一小部分 adapter 参数
- `SFTTrainer`：简化监督微调流程
- `learning_rate=1e-4`：LoRA 常用学习率量级

### 7.4.4 训练完成后你会得到什么

- 一个可复用 adapter
- 一个更懂客服问答风格的小模型
- 一个可以继续评测、部署、蒸馏的中间产物

### 7.4.5 GPU 上第一次跑 QLoRA 的建议顺序

如果你已经有 GPU，不建议直接盲跑。更稳妥的顺序是：

1. 先运行环境自检
2. 根据显存选择配置
3. 先跑小步长、小 batch 的基线实验
4. 确认能正常保存 checkpoint
5. 再加长训练轮数或增大样本规模

如果你使用本文配套工程，建议先跑：

```bash
make env-check
```

然后根据显存选：

```bash
make sft-8gb
make sft-16gb
make sft-24gb
```

如果你想看更完整的 GPU 微调实战流程，可以直接参考配套文档：

```text
docs/qlora_gpu_walkthrough.md
```

## 7.5 微调阶段的常见坑

### 7.5.1 数据量不大但风格太乱

结果：

- 模型回答忽长忽短
- 语气不稳定
- 格式漂移

### 7.5.2 只看训练 loss，不做验证

结果：

- 模型在训练集上看起来很好
- 真实问答效果反而下降

### 7.5.3 system prompt 在训练集里写法不一致

结果：

- 模型角色不稳
- 有时像助手，有时像百科，有时像客服

### 7.5.4 把错误知识“微调进去了”

微调不会自动帮你纠错，它只会忠实学习你的样本分布。

***

## 8. 阶段三：蒸馏

## 8.1 为什么要蒸馏

很多团队最后上线的不是训练时最强的模型，而是一个“足够强、但更便宜”的模型。

蒸馏的核心目标就是：

- 用更小的模型接近更大的模型
- 把高成本模型的能力压缩到低成本模型中

## 8.2 蒸馏的主流做法

### 8.2.1 Response Distillation

让老师模型先生成高质量答案，再拿这些答案训练学生模型。

优点：

- 简单
- 最适合新手
- 不需要拿到 teacher 的内部 logits

### 8.2.2 Logit Distillation

让学生去拟合老师输出的 token 概率分布，常用 KL 散度。

优点：

- 信息更细

缺点：

- 工程复杂度更高
- 需要 teacher 端暴露 logits 或离线保存

### 8.2.3 Hidden-state Distillation

对齐中间层表示。

优点：

- 对表征迁移更直接

缺点：

- 架构差异时更难做

### 8.2.4 Prune + Distill

先剪枝，再用蒸馏恢复能力。这在做模型家族压缩时很常见。

## 8.3 新手最推荐的蒸馏路线

直接记这个最实用：

1. 选一个强 teacher
2. 用 teacher 生成高质量训练样本
3. 过滤低质量答案
4. 用 student 做 SFT
5. 再做评测

这条路线虽然没有“纯 logit distillation”那么学术，但对新人最容易落地。

## 8.4 教学案例 C：7B 教师蒸馏到 1.5B 学生

目标：

- teacher：一个 7B 指令模型
- student：一个 1.5B 指令模型
- 场景：企业知识问答

### 8.4.1 蒸馏数据生产流程

输入样本：

```json
{ "question": "客户要求更改收货地址，系统里应该怎么处理？" }
```

teacher 生成：

```json
{
  "question": "客户要求更改收货地址，系统里应该怎么处理？",
  "answer": "先核验订单状态。若订单未出库，可在后台修改地址；若已出库，则需要联系物流拦截或指导客户拒收后重寄。"
}
```

### 8.4.2 过滤规则建议

- 去掉太短答案
- 去掉明显空话套话
- 去掉自相矛盾答案
- 去掉幻觉严重答案
- 抽样做人工质检

### 8.4.3 把蒸馏数据转成 SFT 格式

```json
{
  "messages": [
    {
      "role": "system",
      "content": "你是企业运营助手，请回答准确、简洁、可执行。"
    },
    { "role": "user", "content": "客户要求更改收货地址，系统里应该怎么处理？" },
    {
      "role": "assistant",
      "content": "先核验订单状态。若订单未出库，可在后台修改地址；若已出库，则需要联系物流拦截或指导客户拒收后重寄。"
    }
  ]
}
```

然后 student 的训练流程和 SFT 基本一致。

## 8.5 进阶：Logit Distillation 的损失函数怎么理解

如果学生模型输出为 `student_logits`，老师模型输出为 `teacher_logits`，常见的损失写法是：

```text
Loss = alpha * CE(student, label) + beta * KL(student/T, teacher/T)
```

其中：

- `CE`：学生对真实标签的交叉熵
- `KL`：学生与老师概率分布的差异
- `T`：temperature，常用来让分布更平滑

一个简化伪代码：

```python
import torch.nn.functional as F

ce_loss = F.cross_entropy(student_logits.view(-1, vocab_size), labels.view(-1))

student_log_probs = F.log_softmax(student_logits / temperature, dim=-1)
teacher_probs = F.softmax(teacher_logits / temperature, dim=-1)
kd_loss = F.kl_div(student_log_probs, teacher_probs, reduction="batchmean")

loss = alpha * ce_loss + beta * kd_loss
```

如果你是第一次上手，先把 response distillation 跑通，再做这一步。

## 8.6 蒸馏阶段的判断标准

什么时候可以说蒸馏“有价值”：

- 质量下降在可接受范围内
- 延迟显著下降
- 显存显著下降
- 吞吐显著提升
- 单次请求成本显著降低

***

## 9. 阶段四：评测

## 9.1 为什么评测不能只看一个分数

因为模型可能出现：

- benchmark 分数更高，但业务效果更差
- 训练 loss 下降，但幻觉更严重
- 回答更长，但有用信息更少

所以评测必须分层做。

## 9.2 评测的四层结构

### 9.2.1 基础能力评测

例如：

- MMLU
- HellaSwag
- GSM8K
- HumanEval

### 9.2.2 中文 / 多语言 / 综合评测

例如：

- C-Eval
- CMMLU
- 多轮对话测试集

### 9.2.3 业务评测

这是最重要的一层。

例如你做电商客服模型，就应该有：

- 订单问题
- 发票问题
- 物流问题
- 退款问题
- 敏感问题

### 9.2.4 系统评测

包括：

- 首 token 延迟
- 吞吐
- 显存占用
- 并发稳定性

## 9.3 当前主流评测工具怎么选

### 9.3.1 lm-evaluation-harness

适合：

- 快速跑通学术 benchmark
- 统一不同模型的评测方式
- 和 vLLM / 本地模型 / API 模型结合

### 9.3.2 OpenCompass

适合：

- 配置化管理多个 benchmark
- 中英文综合评测
- 团队化维护评测任务

### 9.3.3 自建业务评测集

真实项目里，这是不可替代的。

建议至少维护一份：

- 200 到 1000 条黄金样本
- 覆盖主要业务场景
- 带标准答案或评分规则

## 9.4 教学案例 D：用 lm-eval 跑基础能力评测

安装：

```bash
pip install "lm_eval[hf,vllm]"
```

直接评测 Hugging Face 模型：

```bash
lm_eval --model hf \
  --model_args pretrained=outputs/sft-qwen3-cs/final \
  --tasks hellaswag \
  --device cuda:0 \
  --batch_size 8
```

如果模型由 vLLM 服务托管，也可以通过兼容接口评测。

## 9.5 教学案例 E：用 OpenCompass 跑综合评测

一个简化命令示例：

```bash
python run.py \
  --datasets siqa_gen winograd_ppl \
  --hf-type chat \
  --hf-path outputs/sft-qwen3-cs/final
```

OpenCompass 更适合后续把模型、数据集、提示词、输出目录都配置化管理。

## 9.6 如何做业务评测

以客服模型为例，你可以做一个 `data/eval/customer_eval.jsonl`：

```json
{"question":"订单显示已签收但我没收到怎么办？","reference":"建议先核实签收人和快递柜信息，再发起物流核查。"}
{"question":"发票能改成公司抬头吗？","reference":"若订单尚未开票，可提供公司抬头和税号进行修改。"}
```

然后做 3 类评分：

1. 正确性
2. 完整性
3. 可执行性

如果资源允许，再加：

1. 安全性
2. 语气与格式一致性

### 9.6.1 不要只看分数，还要看“模型像不像在背训练集”

很多新手第一次做业务评测时，只会看：

- exact match
- accuracy
- keyword coverage

这些分数当然重要，但还不够。你还应该问一个更关键的问题：

这个问题模型答得好，是因为它真的学会了，还是因为这个问题和训练样本几乎一模一样？

一个非常实用的做法是：

对每条评测样本，额外找出“最近训练样本”，并一起展示：

- 评测问题
- 参考答案
- 模型预测
- 最近训练样本
- 最近训练样本相似度

这样你就能更快判断：

- 是正常泛化
- 还是训练集记忆

如果你使用本文配套工程，可以直接用：

- `scripts/retrieve_similar_examples.py`
- `scripts/retrieve_similar_semantic.py`
- `scripts/analyze_predictions.py`

### 9.6.2 lexical 相似度和 embedding 相似度怎么选

两者都值得保留：

- `lexical`：适合发现几乎同表述的“背题”
- `embedding`：适合发现换一种问法但语义接近的样本

新手建议：

1. 先用 lexical 检索建立直觉
2. 条件允许时再上 embedding 检索
3. 最后把两者都纳入评测分析

### 9.6.3 业务评测结果最好输出成报告

如果你只是在终端里看几行 JSON，后续复盘会很不方便。

更推荐的做法是把评测结果整理成 Markdown 报告，至少包含：

- 总样本数
- 平均指标
- 每条样本的问题、参考答案、模型预测
- 最近训练样本
- 人工复核意见栏

如果你使用本文配套工程，可以直接参考：

```text
scripts/generate_eval_report.py
```

它会把评测结果整理成 Markdown 报告，便于团队共享和人工复核。

## 9.7 一个实用的验收标准模板

在你自己的项目里，可以这样定义：

- 基础 benchmark 不低于基座模型
- 客服业务集正确率提升 10% 以上
- 高风险问题拒答正确率达到 95% 以上
- 单次回答 P95 延迟小于 2 秒

没有验收标准，就很容易陷入“感觉模型好像不错”的幻觉。

***

## 10. 阶段五：部署

## 10.1 部署前先想清楚 4 个问题

1. 是本地离线推理，还是在线 API 服务
2. 是单用户工具，还是高并发业务系统
3. 是部署 base+adapter，还是合并后的模型
4. 是否需要 OpenAI 兼容接口

## 10.2 当前主流部署路线

截至 2026-05-08，更主流的开源服务框架是：

- `vLLM`
- `SGLang`

如果你看到很多旧教程还在推荐 `TGI`，要注意：Hugging Face 文档已经明确说明 `text-generation-inference` 进入 maintenance mode，并推荐后续更多使用 `vLLM`、`SGLang` 等推理引擎。

## 10.3 为什么 vLLM 很常用

因为它通常具备这些优点：

- OpenAI 兼容 API
- 启动简单
- 吞吐高
- 生态成熟
- 很适合接入现有应用

## 10.4 教学案例 F：用 vLLM 部署模型

### 10.4.1 启动服务

```bash
vllm serve outputs/sft-qwen3-cs/final \
  --dtype auto \
  --api-key dev-token
```

如果是多卡：

```bash
vllm serve outputs/sft-qwen3-cs/final \
  --tensor-parallel-size 2 \
  --dtype auto \
  --api-key dev-token
```

### 10.4.2 用 OpenAI Python SDK 调用

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="dev-token",
)

resp = client.chat.completions.create(
    model="outputs/sft-qwen3-cs/final",
    messages=[
        {"role": "system", "content": "你是一个电商客服助手。"},
        {"role": "user", "content": "我的订单还没发货怎么办？"},
    ],
    temperature=0.2,
)

print(resp.choices[0].message.content)
```

## 10.5 什么时候考虑 SGLang

如果你更关注：

- 低延迟
- 高吞吐
- 多 GPU 推理
- 大规模生产部署

可以重点研究 SGLang。

它很适合后续做高性能推理服务，但对新手而言，第一步还是建议先把 vLLM 跑通。

## 10.6 部署时别忽略这些工程项

- 请求日志
- 错误日志
- Prometheus / Grafana 监控
- 限流
- 重试
- 超时
- Prompt 注入防护
- 敏感信息脱敏
- 模型版本管理

## 10.7 量化部署怎么理解

如果模型太大，常见选择是：

- FP16 / BF16：质量最好，成本较高
- INT8：折中
- INT4：成本最低，但可能掉点

新手实践建议：

1. 先用原精度验证业务效果
2. 再尝试量化
3. 对比延迟、吞吐、业务分数

不要一开始就为了省显存把模型压太狠，最后连基线效果都没搞清楚。

***

## 11. 一个适合新手的端到端实战路线

下面给你一条现实、清晰、成功率高的路线。

项目目标：

做一个“企业知识库问答助手”。

### 第 1 步：收集数据

收集：

- FAQ
- 帮助中心文档
- 内部 SOP
- 常见工单问答

产出：

- `data/raw/`

### 第 2 步：清洗与整理

把文档转成：

- 预训练文本
- SFT 问答样本
- 评测样本

产出：

- `data/cleaned/`
- `data/sft/`
- `data/eval/`

### 第 3 步：先做一个基线微调

选择一个小模型：

- 0.5B 到 3B 量级

用 QLoRA 做 SFT，先拿到第一版结果。

### 第 4 步：评测

比较：

- 基座模型
- 微调后模型

看：

- 业务问答正确率
- 幻觉情况
- 回答风格

### 第 5 步：如果效果还不够，再做继续预训练

用领域文档继续预训练 base model，再重新做 SFT。

### 第 6 步：如果部署成本太高，再做蒸馏

用较大的 teacher 生成更高质量样本，蒸馏到更小 student。

### 第 7 步：部署为 API

用 vLLM 启动服务，接到你的 Web、App、机器人或 Agent 中。

这条路线的优点是：

- 每一步都能看到中间成果
- 新手不容易卡死在“从零预训练超大模型”上
- 更接近真实团队做法

### 11.1 和本文配套工程对应的一条实操命令链

如果你正在使用本文配套的脚本模板，可以按下面这条线实践。

#### 路线 A：CPU 教学型闭环

适合：

- 没有 CUDA GPU
- 先学流程
- 先验证数据格式和训练逻辑

建议命令：

```bash
make env-check
make prepare-sft
make pipeline-local
make infer-repl
make retrieve-similar
```

你会得到：

- 一个可运行的小型本地 demo 基座
- 一个最小 SFT 模型
- 一个本地推理脚本
- 一个交互式 REPL
- 一个训练样本相似度分析工具
- 一份样例业务评测报告

#### 路线 B：GPU QLoRA 闭环

适合：

- 有 NVIDIA GPU
- 想真正跑一轮 QLoRA
- 想体验更接近真实项目的路径

建议命令：

```bash
make env-check
make prepare-sft
make sft-16gb
python scripts/merge_lora.py --config configs/merge_lora.json
bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
python scripts/eval_business.py --config configs/eval_business.json
make analyze-preds
make report-eval
```

这条线的核心意义是：

- 不只训练
- 还要能评测、能分析、能产出报告

#### 路线 C：只做数据与评测认知训练

适合：

- 暂时没有 GPU
- 还不想马上训练大模型
- 想先把“数据质量”和“评测方法”学扎实

建议命令：

```bash
make prepare-sft
make retrieve-similar
make retrieve-semantic
make analyze-preds
```

这条路线特别适合产品、算法初学者、数据工程师协作入门。

***

## 12. 常见误区

## 12.1 误区一：参数越大越好

错。

很多业务场景里：

- 3B 调得好，比没调好的 14B 更有价值
- 1.5B 蒸馏得好，比昂贵 7B 更适合上线

## 12.2 误区二：有数据就能微调

错。

低质量数据会把模型越调越差。

## 12.3 误区三：只要 loss 下降就说明项目成功

错。

真正重要的是：

- 业务效果
- 安全性
- 成本
- 稳定性

## 12.4 误区四：预训练一定比微调高级，所以应该先学预训练

不一定。

对绝大多数个人开发者和中小团队，微调、评测、部署更先产生价值。

## 12.5 误区五：部署就是把模型跑起来

不够。

真正的部署还包括：

- 监控
- 告警
- 限流
- 版本回滚
- 安全策略

***

## 13. 学习顺序建议

如果你打算按周推进，可以这样安排：

### 第 1 周

- 补 Transformer、tokenizer、loss、采样基础
- 跑通一个 Hugging Face 模型推理脚本

### 第 2 周

- 做一个 LoRA / QLoRA 微调实验
- 学会看训练日志和验证集结果

### 第 3 周

- 接入 lm-eval 或 OpenCompass
- 做自己的业务评测集

### 第 4 周

- 用 vLLM 部署成本地 API
- 做简单前后端联调

### 第 5 周

- 学继续预训练
- 学蒸馏

这时候你对整个流程就已经算真正入门了。

### 13.1 一个更贴近当前工程模板的学习节奏

如果你准备直接使用本文配套工程，建议这样安排：

#### 第 1 天

- 通读本文
- 跑 `make env-check`
- 理解目录结构和配置文件

#### 第 2 天

- 跑 `make prepare-sft`
- 看清洗前后的数据差异
- 学会检查 rejected 样本

#### 第 3 天

- 没 GPU：跑 `make demo-local`
- 有 GPU：跑 `make sft-8gb` 或 `make sft-16gb`

#### 第 4 天

- 跑 `make infer-minimal` 或 `make infer-repl`
- 观察模型输出风格和常见错误

#### 第 5 天

- 跑 `make retrieve-similar`
- 跑 `make retrieve-semantic`
- 学会判断模型是在泛化还是在背训练集

#### 第 6 天

- 跑业务评测
- 用 `make analyze-preds`
- 用 `make report-eval`

#### 第 7 天

- 复盘数据问题
- 调整配置
- 再跑一轮更小范围实验

***

## 14. 你可以直接照着做的最小闭环

如果你只想先做一个最小可用实验，请直接执行这条线：

1. 选一个小开源模型
2. 准备 500 到 5000 条高质量 SFT 样本
3. 用 QLoRA 跑一轮微调
4. 做 100 条业务集评测
5. 用 vLLM 部署

这条路线是新手投入产出比最高的起点。

等你跑通这个闭环，再去做：

- 继续预训练
- 蒸馏
- 多卡训练
- 高并发部署

### 14.1 一个更现实的新手落地建议

如果你是第一次做模型开发，我建议把目标分成 3 个层次：

#### 层次 1：跑通流程

目标：

- 知道每一步在做什么
- 能成功运行脚本

这时不要太在意模型回答质量。

#### 层次 2：看懂问题

目标：

- 知道数据哪里差
- 知道模型哪里过拟合
- 知道评测分数为什么高或低

这时重点是调试能力。

#### 层次 3：开始做真实优化

目标：

- 提升数据质量
- 提升评测分数
- 降低延迟和成本

这时才真正进入“模型工程实践”。

***

## 15. 总结

把整篇文章压缩成一句话：

大模型开发不是“训练一个模型”这么简单，而是一条从数据、训练、微调、蒸馏、评测到部署的完整工程链路。

对新手最实用的建议是：

1. 先微调，再评测，再部署
2. 预训练先做教学实验，继续预训练更有现实价值
3. 蒸馏的目标不是炫技，而是降低成本
4. 评测一定要包含业务集
5. 部署优先选择主流推理引擎和标准化 API

如果你按照本文的案例一步步实践，你已经可以完成一次真正意义上的“大模型开发入门项目”了。

***

## 16. 教程与工程模板怎么配合使用

本文负责两件事：

1. 帮你建立完整知识框架
2. 帮你理解每个阶段为什么这么做

而配套工程负责三件事：

1. 把抽象概念变成可运行脚本
2. 让你能快速看到中间产物
3. 让你学会调试和复盘

建议的使用方式是：

- 先通读本文，建立全流程认知
- 再看工程模板 README，知道命令入口
- 遇到某个阶段卡住时，再回到本文对应章节查原理

如果你能反复做 2 到 3 轮这种“读原理 -> 跑脚本 -> 看结果 -> 回来复盘”的循环，你就不只是“看过教程”，而是真的开始进入模型开发了。

如果你要做团队培训或系统自学，可以直接使用配套讲义：

```text
docs/training_handout.md
```

这份讲义把学习目标、课程安排、课堂练习和结课验收整理在一起，适合带新人时直接照着走。

如果你更喜欢像课程平台那样按章节学习，可以使用分章课程：

```text
docs/course/index.md
```

它把本文拆成序章到毕业项目的连续章节，每章都有学习目标、实操命令、产物和验收标准。

如果你对机器学习、深度学习、神经网络、Transformer、TensorFlow 或 PyTorch 的基础概念不稳，可以先读基础知识附录：

```text
docs/course/appendix-foundations.md
```

这份附录会把 loss、梯度、embedding、attention、decoder-only、训练框架和大模型工程工具之间的关系先讲清楚。

如果你只是临时忘了某个词的含义，可以直接查术语表：

```text
docs/course/glossary.md
```

如果你想检查自己是否真正掌握每章内容，可以使用章节测试题和学习进度表：

```text
docs/course/chapter-quizzes.md
docs/course/learning-progress.md
```

遇到报错时，可以优先查看排障手册：

```text
docs/troubleshooting.md
```

它按环境、数据、训练、推理、评测、部署几个类别整理了常见问题和处理方式。

***

## 17. 参考资料与主流技术依据

下面这些资料用于确认本文提到的“当前主流技术栈”与关键工程实践，时间基准为 2026-05-08。

- PyTorch FSDP 官方文档：<https://docs.pytorch.org/docs/stable/fsdp.html>
- Hugging Face Accelerate 文档：<https://huggingface.co/docs/accelerate/main/en/index>
- Transformers 中 Accelerate/FSDP 指南：<https://huggingface.co/docs/transformers/v4.52.2/en/accelerate>
- Hugging Face Tokenizers 文档：<https://huggingface.co/docs/tokenizers/en/quicktour>
- Hugging Face Tokenizers 训练文档：<https://huggingface.co/docs/tokenizers/main/en/training_from_memory>
- PEFT LoRA 文档：<https://huggingface.co/docs/peft/main/en/developer_guides/lora>
- TRL SFTTrainer 文档：<https://huggingface.co/docs/trl/en/sft_trainer>
- Transformers bitsandbytes / QLoRA 文档：<https://huggingface.co/docs/transformers/en/quantization/bitsandbytes>
- DeepSpeed ZeRO 文档：<https://deepspeed.readthedocs.io/en/stable/zero3.html>
- NVIDIA Megatron-Core 文档：<https://docs.nvidia.com/megatron-core/index.html>
- lm-evaluation-harness：<https://github.com/EleutherAI/lm-evaluation-harness>
- OpenCompass 文档：<https://opencompass.readthedocs.io/en/stable/get_started/quick_start.html>
- vLLM OpenAI 兼容服务文档：<https://docs.vllm.ai/en/latest/serving/openai_compatible_server/>
- SGLang 文档：<https://docs.sglang.io/>
- Hugging Face TGI 文档：<https://huggingface.co/docs/text-generation-inference/en/index>
- safetensors 文档：<https://huggingface.co/docs/safetensors/en/index>
- LoRA 论文：<https://huggingface.co/papers/2106.09685>
- QLoRA 论文：<https://huggingface.co/papers/2305.14314>
- DistilBERT 论文：<https://huggingface.co/papers/1910.01108>

当前仓库已经配好三种学习入口：

1. 想先理解全局：继续读本文。
2. 想补基础概念：阅读 `docs/course/appendix-foundations.md`。
3. 想随手查词：打开 `docs/course/glossary.md`。
4. 想自测和记录进度：使用 `docs/course/chapter-quizzes.md` 和 `docs/course/learning-progress.md`。
5. 想按课程推进：进入 `docs/course/index.md`，从 00 章学到 13 章。
6. 想直接跑命令：查看 `README.md` 和 `Makefile`。

更推荐的学习方式是：先用本文建立框架，再按分章课程完成实操，最后用第 13 章的毕业项目报告把数据、训练、评测、推理和部署串成一次完整复盘。
