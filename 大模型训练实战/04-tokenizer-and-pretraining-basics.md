# 04 第四章：Tokenizer 与模型看到的世界

学习时长：90 分钟

本章类型：概念理解 + Tokenizer 训练实战

本章产物：一个可被 Hugging Face `AutoTokenizer` 加载的教学 tokenizer

## 4.0 本章要完成什么

上一章我们把原始客服问答清洗成了 SFT `messages` 格式。

但模型并不会直接“看见”中文句子。

例如这句话：

```text
订单显示已签收但我没有收到，怎么办？
```

在进入模型之前，必须先经过 tokenizer，被转换成 token，再变成 token id。

可以把这一步理解成：

```text
人类可读文本
  -> tokenizer 切分
  -> token
  -> token id
  -> 模型可以计算的向量
```

本章会带你完成：

- 理解 token、tokenizer、词表、token id
- 理解特殊 token 的作用
- 查看聊天 demo 语料
- 阅读 tokenizer 训练配置
- 用 BPE 训练一个教学 tokenizer
- 导出 Hugging Face 可加载格式
- 检查 tokenizer 输出目录
- 用 tokenizer 编码一条客服问题
- 理解为什么第 5 章预训练必须依赖 tokenizer
- 判断什么时候应该训练 tokenizer，什么时候应该复用开源模型 tokenizer

完成本章后，你应该能回答：

```text
模型为什么不能直接读取字符串？
tokenizer 输出目录里每个文件有什么用？
为什么微调已有开源模型时通常不能随便换 tokenizer？
```

## 4.1 为什么模型需要 tokenizer

神经网络处理的是数字，不是字符串。

对模型来说，下面这句话：

```text
用户：可以开发票吗？
```

不能直接送进模型。

它需要先变成类似这样的 token：

```text
["用户", "：", "可以", "开发票", "吗", "？"]
```

再变成 token id：

```text
[235, 223, 301, 487, 229, 225]
```

token id 才能进入模型的 embedding 层。

所以 tokenizer 是文本和模型之间的翻译器：

```text
文本 -> token -> id
id -> token -> 文本
```

如果 tokenizer 设计不好，模型看到的世界就会很碎。

例如一个中文业务词被切成很多碎片：

```text
发票抬头 -> 发 / 票 / 抬 / 头
```

模型需要用更多 token 表示同样意思，上下文窗口也会浪费。

如果 tokenizer 学得更贴近业务语料，可能切成：

```text
发票抬头
```

表示效率就更高。

## 4.2 token、字符、词不是一回事

初学者容易把 token 理解成“一个字”或“一个词”，但它们不是同一个概念。

一个 token 可能是：

- 一个汉字
- 一个中文词
- 一个英文单词
- 英文单词的一部分
- 一个标点
- 一个空格相关片段
- 一个特殊控制符

例如：

```text
订单显示已签收但我没有收到，怎么办？
```

在本课程训练出的聊天 demo tokenizer 中，可能被切成：

```text
["用户", "：", "订单显示已签收但我没有收到", "，", "怎么办", "？"]
```

这说明 tokenizer 从教学语料里学到了一些常见片段。

注意：不同 tokenizer 的切分结果可能完全不同。

同一句话在另一个开源模型 tokenizer 中，可能被切成更多或更少的 token。

所以当你比较模型上下文长度、训练成本和推理成本时，不能只看字符数，要看 token 数。

## 4.3 词表是什么

tokenizer 会维护一个词表。

词表可以理解为：

```text
token -> token id
```

例如：

```text
[PAD] -> 0
[UNK] -> 1
[BOS] -> 2
[EOS] -> 3
用户 -> 235
： -> 223
怎么办 -> 255
```

模型真正保存的是 token id，而不是 token 文本。

训练模型时，embedding 矩阵的大小会和词表大小直接相关：

```text
embedding 参数量 = vocab_size * hidden_size
```

如果词表太小：

```text
文本会被切得很碎，同一句话占用更多 token。
```

如果词表太大：

```text
embedding 参数更多，小数据下很多 token 学不到稳定表示。
```

所以 tokenizer 的词表大小不是越大越好。

本课程聊天 demo 使用较小的词表配置，是为了让训练能在本地快速完成。

## 4.4 特殊 token 是什么

本章配置里有四个特殊 token：

```json
[
  "[PAD]",
  "[UNK]",
  "[BOS]",
  "[EOS]"
]
```

它们的作用分别是：

```text
[PAD]：padding，用来把一个 batch 中不同长度样本补齐
[UNK]：unknown，表示词表里没有的未知片段
[BOS]：begin of sequence，表示序列开始
[EOS]：end of sequence，表示序列结束
```

为什么这些 token 要在训练 tokenizer 时就加入？

因为后续模型训练和推理都会依赖它们。

例如 batch 训练时，两条样本长度不同：

```text
样本 A：10 个 token
样本 B：18 个 token
```

为了放进同一个张量，样本 A 需要补齐到 18 个 token。

补齐用的就是 `[PAD]`。

如果 tokenizer 没有 pad token，后续训练脚本就需要额外处理。

本课程在 `train_tokenizer.py` 里明确设置了：

```python
hf_tokenizer = PreTrainedTokenizerFast(
    tokenizer_file=str(tokenizer_json),
    unk_token="[UNK]",
    pad_token="[PAD]",
    bos_token="[BOS]",
    eos_token="[EOS]",
)
```

这样导出的 tokenizer 可以被后续训练脚本直接加载。

## 4.5 本章输入和输出

本章主要使用聊天 demo 配置：

```text
configs/train_tokenizer_chat_demo.json
```

输入语料：

```text
data/cleaned/chat_demo_corpus.txt
data/cleaned/chat_demo_corpus_valid.txt
```

输出目录：

```text
outputs/tokenizer_chat_demo/
```

还有一条基础 tokenizer 路线：

```text
configs/train_tokenizer.json
data/cleaned/sample_corpus.txt
outputs/tokenizer_hf/
```

两者的区别是：

```text
tokenizer：基础教学语料
tokenizer-chat-demo：电商客服聊天 demo 语料
```

本章重点讲 `tokenizer-chat-demo`，因为它会被第 5 章的聊天 demo 预训练继续使用。

## 4.6 第一步：查看聊天 demo 语料

打开训练语料：

```bash
sed -n '1,30p' data/cleaned/chat_demo_corpus.txt
```

你会看到类似内容：

```text
系统：你是一个电商客服助手，回答准确、简洁、可执行。
用户：可以开发票吗？
助手：可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。
系统：你是一个电商客服助手，回答准确、简洁、可执行。
用户：订单显示已签收但我没有收到，怎么办？
助手：请先核实签收人、快递柜和代收点信息。如果仍未找到，我可以为你发起物流核查。
```

这份语料不是 SFT JSONL，而是普通文本语料。

它保留了聊天结构：

```text
系统：
用户：
助手：
```

为什么 tokenizer 训练可以使用普通文本？

因为 tokenizer 学的是文本如何切分，不需要知道哪一句是 label、哪一句计算 loss。

它只需要看到足够多的业务文本，从中学习常见字符、词片段和标点组合。

## 4.7 第二步：查看 tokenizer 配置

打开：

```text
configs/train_tokenizer_chat_demo.json
```

内容如下：

```json
{
  "files": [
    "data/cleaned/chat_demo_corpus.txt",
    "data/cleaned/chat_demo_corpus_valid.txt"
  ],
  "vocab_size": 2000,
  "min_frequency": 1,
  "output_dir": "outputs/tokenizer_chat_demo",
  "special_tokens": [
    "[PAD]",
    "[UNK]",
    "[BOS]",
    "[EOS]"
  ]
}
```

这些字段含义是：

```text
files：训练 tokenizer 使用的文本文件
vocab_size：目标词表大小上限
min_frequency：进入词表的最低频次
output_dir：tokenizer 输出目录
special_tokens：必须保留的特殊 token
```

注意 `vocab_size` 是上限，不保证最终词表一定达到这个数字。

本课程聊天 demo 语料很小，所以即使配置写了：

```json
"vocab_size": 2000
```

实际训练出的词表可能只有几百个 token。

你可以在输出的 metadata 里看到真实词表大小。

## 4.8 第三步：理解训练脚本入口

本章使用：

```text
scripts/train_tokenizer.py
```

脚本开头仍然采用统一模板：

```python
from __future__ import annotations

import argparse
import json

from common import ensure_dir, iter_text_lines, load_json
```

这里复用了第 00 章的公共工具：

```text
load_json：读取配置
ensure_dir：确保输出目录存在
iter_text_lines：逐行读取文本语料
```

参数解析：

```python
def parse_args():
    parser = argparse.ArgumentParser(description="Train a BPE tokenizer and export HF format.")
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()
```

所以可以用同一个脚本训练不同 tokenizer：

```bash
python3 scripts/train_tokenizer.py --config configs/train_tokenizer.json
python3 scripts/train_tokenizer.py --config configs/train_tokenizer_chat_demo.json
```

`Makefile` 把它们封装成：

```bash
make tokenizer
make tokenizer-chat-demo
```

## 4.9 第四步：理解 BPE tokenizer

脚本中使用的是 BPE：

```python
from tokenizers import Tokenizer
from tokenizers.models import BPE
from tokenizers.pre_tokenizers import Whitespace
from tokenizers.trainers import BpeTrainer
```

BPE 的全称是：

```text
Byte Pair Encoding
```

直观理解是：

```text
先从小片段开始
不断合并语料中高频相邻片段
最终形成一个词表
```

例如在电商客服语料里，下面这些片段经常出现：

```text
订单
发票
退款
签收
订单号
发票抬头
```

BPE 会倾向于把高频组合学成较长 token。

本章脚本创建 tokenizer：

```python
tokenizer = Tokenizer(BPE(unk_token="[UNK]"))
```

这里指定 `[UNK]` 用来表示未知片段。

接着设置预切分器：

```python
tokenizer.pre_tokenizer = Whitespace()
```

`Whitespace` 会先按空白和边界做简单切分。

这不是最强方案，但足够适合作为教学版本，因为它容易观察和解释。

## 4.10 第五步：配置 BpeTrainer

训练器配置如下：

```python
trainer = BpeTrainer(
    vocab_size=config.get("vocab_size", 16000),
    min_frequency=config.get("min_frequency", 2),
    special_tokens=config.get("special_tokens", ["[PAD]", "[UNK]", "[BOS]", "[EOS]"]),
)
```

这三个参数最重要：

```text
vocab_size：词表最大规模
min_frequency：片段至少出现多少次才考虑进入词表
special_tokens：强制加入词表的控制 token
```

聊天 demo 配置使用：

```json
"vocab_size": 2000,
"min_frequency": 1
```

为什么 `min_frequency` 设置为 1？

因为教学语料很小，如果要求一个片段至少出现 2 次或更多，很多业务词可能进不了词表。

真实项目里，语料更大时通常会提高 `min_frequency`，避免把偶然出现的噪声片段加入词表。

## 4.11 第六步：流式读取语料并训练

训练调用是：

```python
tokenizer.train_from_iterator(iter_text_lines(files), trainer=trainer)
```

这里没有把所有文本一次性拼成一个巨大的字符串，而是使用：

```python
iter_text_lines(files)
```

它会逐行读取多个文件。

这样做有两个好处：

- 语料大时更省内存
- 多文件输入更自然

对于本章的小语料，内存差异不明显。

但从课程一开始就使用流式读取，可以让脚本更接近真实项目习惯。

## 4.12 第七步：保存 tokenizers 原生文件

训练完成后，先保存原生 tokenizer：

```python
tokenizer_json = output_dir / "tokenizer.json"
tokenizer.save(str(tokenizer_json))
```

这会生成：

```text
outputs/tokenizer_chat_demo/tokenizer.json
```

`tokenizer.json` 里包含：

- 模型类型
- 词表
- merge 规则
- pre-tokenizer 配置
- special token 配置

它是 tokenizer 的核心文件。

如果缺少这个文件，后续 `AutoTokenizer.from_pretrained` 通常无法正确加载本章训练出的 tokenizer。

## 4.13 第八步：导出 Hugging Face 格式

为了让后续训练脚本可以直接加载，脚本会把 tokenizer 包装成 Hugging Face 格式：

```python
hf_tokenizer = PreTrainedTokenizerFast(
    tokenizer_file=str(tokenizer_json),
    unk_token="[UNK]",
    pad_token="[PAD]",
    bos_token="[BOS]",
    eos_token="[EOS]",
)
hf_tokenizer.save_pretrained(output_dir)
```

这一步会在输出目录生成：

```text
tokenizer_config.json
special_tokens_map.json
```

后续第 5 章预训练脚本会这样加载：

```python
tokenizer = AutoTokenizer.from_pretrained(
    config["tokenizer_dir"],
    use_fast=True,
)
```

其中 `config["tokenizer_dir"]` 来自：

```json
"tokenizer_dir": "outputs/tokenizer_chat_demo"
```

所以本章输出目录就是下一章模型训练的输入。

## 4.14 第九步：保存训练 metadata

脚本最后保存一份 metadata：

```python
metadata = {
    "files": files,
    "vocab_size": hf_tokenizer.vocab_size,
    "special_tokens": config.get("special_tokens", ["[PAD]", "[UNK]", "[BOS]", "[EOS]"]),
}
with (output_dir / "tokenizer_training_meta.json").open("w", encoding="utf-8") as fh:
    json.dump(metadata, fh, ensure_ascii=False, indent=2)
```

输出文件是：

```text
outputs/tokenizer_chat_demo/tokenizer_training_meta.json
```

它记录：

```text
使用了哪些语料文件
实际词表大小是多少
有哪些特殊 token
```

例如你可能看到：

```json
{
  "files": [
    "data/cleaned/chat_demo_corpus.txt",
    "data/cleaned/chat_demo_corpus_valid.txt"
  ],
  "vocab_size": 624,
  "special_tokens": [
    "[PAD]",
    "[UNK]",
    "[BOS]",
    "[EOS]"
  ]
}
```

这里的 `624` 是实际词表大小。

它小于配置中的 `2000`，原因是教学语料很小，没有足够多的片段填满 2000 个词表位置。

## 4.15 第十步：运行 tokenizer 训练

执行聊天 demo tokenizer 训练：

```bash
make tokenizer-chat-demo
```

它实际运行：

```bash
python3 scripts/train_tokenizer.py --config configs/train_tokenizer_chat_demo.json
```

成功后你会看到：

```text
Tokenizer saved to outputs/tokenizer_chat_demo
```

如果你要训练基础 tokenizer，可以运行：

```bash
make tokenizer
```

它使用：

```text
configs/train_tokenizer.json
```

输出到：

```text
outputs/tokenizer_hf/
```

本课程后续聊天 demo 主要使用：

```text
outputs/tokenizer_chat_demo/
```

## 4.16 第十一步：检查输出目录

查看输出文件：

```bash
find outputs/tokenizer_chat_demo -maxdepth 1 -type f -print
```

你应该看到：

```text
outputs/tokenizer_chat_demo/tokenizer.json
outputs/tokenizer_chat_demo/tokenizer_config.json
outputs/tokenizer_chat_demo/special_tokens_map.json
outputs/tokenizer_chat_demo/tokenizer_training_meta.json
```

每个文件的作用是：

```text
tokenizer.json：tokenizers 原生核心文件，包含词表和切分规则
tokenizer_config.json：Hugging Face tokenizer 配置
special_tokens_map.json：特殊 token 映射
tokenizer_training_meta.json：本课程额外保存的训练记录
```

检查 metadata：

```bash
cat outputs/tokenizer_chat_demo/tokenizer_training_meta.json
```

重点确认：

- `files` 是否是你期望的训练语料
- `vocab_size` 是否合理
- `special_tokens` 是否包含 `[PAD]`、`[UNK]`、`[BOS]`、`[EOS]`

## 4.17 第十二步：用 tokenizer 编码一句话

如果当前 Python 环境已经安装 `transformers`，可以运行：

```bash
python3 -c "from transformers import AutoTokenizer; tok=AutoTokenizer.from_pretrained('outputs/tokenizer_chat_demo'); text='用户：订单显示已签收但我没有收到，怎么办？'; print(tok.tokenize(text)); print(tok(text, add_special_tokens=False)['input_ids']); print(tok.vocab_size)"
```

你可能看到类似结果：

```text
['用户', '：', '订单显示已签收但我没有收到', '，', '怎么办', '？']
[235, 223, 582, 222, 255, 225]
624
```

这说明：

```text
原始文本被切成了 6 个 token
每个 token 被映射成一个 id
当前词表大小是 624
```

如果你看到的 token id 不完全一样，也不一定有问题。

只要 tokenizer 是重新训练过的，词表顺序和 id 都可能变化。

真正要检查的是：

- 能否成功加载 tokenizer
- 能否把文本切成 token
- 能否得到 input_ids
- 词表大小是否和 metadata 一致

## 4.18 第十三步：理解 tokenizer 和预训练的关系

第 5 章会运行：

```bash
make pretrain-chat-demo
```

对应配置是：

```text
configs/pretrain_chat_demo.json
```

里面有一项：

```json
"tokenizer_dir": "outputs/tokenizer_chat_demo"
```

这表示预训练脚本会加载本章输出的 tokenizer。

预训练时，每一行文本会先经过：

```python
tokenizer(batch["text"])
```

变成：

```text
input_ids
attention_mask
```

然后再按 `block_size` 拼接成固定长度训练样本。

所以第 5 章的输入链路是：

```text
data/cleaned/chat_demo_corpus.txt
  -> outputs/tokenizer_chat_demo/
  -> token ids
  -> fixed block
  -> tiny causal LM 训练
```

如果 tokenizer 输出目录不存在，预训练会失败。

所以在运行：

```bash
make pretrain-chat-demo
```

之前，应该先运行：

```bash
make tokenizer-chat-demo
```

## 4.19 什么时候训练 tokenizer

你应该考虑训练 tokenizer 的场景包括：

- 从零预训练一个模型
- 业务语料和通用语料差异很大
- 有大量专有术语、代码、公式或结构化文本
- 你需要控制词表大小和特殊 token
- 你正在做教学实验，需要理解 tokenizer 工作方式

例如本课程前几章的 tiny 预训练，就是从零搭一个教学模型。

所以我们训练自己的 tokenizer。

但这不代表真实项目里总要训练 tokenizer。

## 4.20 什么时候复用已有 tokenizer

如果你是在微调已有开源模型，例如：

```text
Qwen
Llama
Mistral
DeepSeek
```

通常应该复用原模型 tokenizer。

原因很简单：

```text
模型 embedding 层是按原 tokenizer 词表训练出来的。
```

如果你随便换 tokenizer，会出现严重不匹配：

```text
同一个 token id 在新旧 tokenizer 中可能代表完全不同的 token
词表大小可能不一致
embedding 矩阵维度可能不匹配
模型原先学到的语言能力被破坏
```

所以：

```text
从零预训练：可以训练 tokenizer
微调已有模型：优先复用原 tokenizer
```

如果确实需要给开源模型增加特殊 token，也要谨慎扩展 tokenizer，并同步调整模型 embedding。

这会在后续 SFT 和 LoRA 章节继续看到。

## 4.21 常见 tokenizer 质量问题

### 4.21.1 词表太小

词表太小时，文本会被切得很碎。

问题包括：

- 同一句话 token 数变多
- 上下文窗口浪费
- 长业务词难以稳定表示
- 训练和推理成本上升

例如：

```text
发票抬头 -> 发 / 票 / 抬 / 头
```

如果业务里经常出现“发票抬头”，更希望 tokenizer 能学到更长片段。

### 4.21.2 词表太大

词表太大也有问题。

尤其是小语料训练 tokenizer 时，过大的词表可能把很多低频片段都收进去。

结果是：

- embedding 参数变多
- 很多 token 训练次数太少
- 模型更难学到稳定表示
- 小模型训练更浪费

所以本章虽然配置 `vocab_size=2000`，实际词表只有几百个 token，这对教学语料是合理的。

### 4.21.3 特殊 token 没配好

如果缺少 `[PAD]`，batch padding 会麻烦。

如果缺少 `[UNK]`，未知片段处理会出问题。

如果 BOS/EOS 设置混乱，生成任务中序列开始和结束可能不稳定。

所以训练完 tokenizer 后，一定要检查：

```bash
cat outputs/tokenizer_chat_demo/special_tokens_map.json
```

确保特殊 token 符合预期。

### 4.21.4 训练语料和任务不一致

如果 tokenizer 用新闻语料训练，但模型要处理电商客服对话，很多业务词可能切得不好。

所以本章使用的语料包含：

```text
系统
用户
助手
订单
发票
退款
签收
物流
售后
```

这让 tokenizer 更贴近后续 tiny pretraining 和 SFT 示例。

## 4.22 常见运行问题

### 4.22.1 `ModuleNotFoundError: No module named 'tokenizers'`

说明当前 Python 环境没有安装依赖，或者你没有激活正确环境。

先运行：

```bash
make env-check
```

看 `packages.tokenizers` 和 `packages.transformers` 是否 missing。

如果缺失，回到第 2 章安装依赖：

```bash
make install
```

如果你有多个 Python 环境，要确认 `make` 使用的 Python 和你安装依赖的 Python 是同一个。

可以运行：

```bash
which python3
python3 -c "import sys; print(sys.executable)"
```

### 4.22.2 `outputs/tokenizer_chat_demo` 里没有文件

先确认命令是否成功结束。

然后检查配置：

```text
configs/train_tokenizer_chat_demo.json
```

确认：

```text
output_dir 是否写成 outputs/tokenizer_chat_demo
files 中的语料文件是否存在
```

### 4.22.3 词表大小和配置不一致

这是正常现象。

配置里的 `vocab_size` 是最大目标，不是保证值。

如果语料很小，实际词表可能小于配置值。

本课程聊天 demo 的实际词表大小可能是：

```text
624
```

这不表示训练失败。

### 4.22.4 token 切分结果和文档示例不同

只要你重新训练 tokenizer，token id 和部分切分结果就可能变化。

原因包括：

- 语料文件变化
- `vocab_size` 变化
- `min_frequency` 变化
- tokenizer 库版本变化

检查重点不是每个 id 是否完全一致，而是流程是否跑通、输出是否可加载。

## 4.23 本章练习

### 4.23.1 练习一：训练聊天 demo tokenizer

运行：

```bash
make tokenizer-chat-demo
```

然后确认目录存在：

```bash
find outputs/tokenizer_chat_demo -maxdepth 1 -type f -print
```

确认至少包含：

```text
tokenizer.json
tokenizer_config.json
special_tokens_map.json
tokenizer_training_meta.json
```

### 4.23.2 练习二：查看词表大小

打开：

```text
outputs/tokenizer_chat_demo/tokenizer_training_meta.json
```

回答：

```text
实际 vocab_size 是多少？
它为什么可能小于配置里的 2000？
```

### 4.23.3 练习三：编码一条新问题

运行：

```bash
python3 -c "from transformers import AutoTokenizer; tok=AutoTokenizer.from_pretrained('outputs/tokenizer_chat_demo'); text='用户：退款申请提交后多久能到账？'; print(tok.tokenize(text)); print(tok(text, add_special_tokens=False)['input_ids'])"
```

观察：

```text
这句话被切成了哪些 token？
一共有多少个 token？
有没有你认为切得太碎的地方？
```

### 4.23.4 练习四：比较两份 tokenizer 配置

打开：

```text
configs/train_tokenizer.json
configs/train_tokenizer_chat_demo.json
```

比较：

```text
files 有什么不同？
vocab_size 有什么不同？
min_frequency 有什么不同？
output_dir 有什么不同？
```

思考为什么聊天 demo 要单独训练一份 tokenizer。

## 4.24 本章验收标准

完成本章后，你应该能做到：

- 解释 token、tokenizer、token id、词表的关系
- 说明 `[PAD]`、`[UNK]`、`[BOS]`、`[EOS]` 的作用
- 运行 `make tokenizer-chat-demo`
- 找到并解释 `outputs/tokenizer_chat_demo/tokenizer.json`
- 找到并解释 `outputs/tokenizer_chat_demo/tokenizer_config.json`
- 找到并解释 `outputs/tokenizer_chat_demo/special_tokens_map.json`
- 找到并解释 `outputs/tokenizer_chat_demo/tokenizer_training_meta.json`
- 使用 `AutoTokenizer.from_pretrained` 加载本章 tokenizer
- 说明为什么第 5 章预训练依赖本章 tokenizer
- 说明为什么微调开源模型时通常复用原 tokenizer

## 4.25 下一章衔接

本章解决的是：

```text
文本如何变成 token id？
```

下一章会继续往前走一步：

```text
模型如何用 token id 学习下一个 token？
```

第 5 章会使用本章输出的：

```text
outputs/tokenizer_chat_demo/
```

以及聊天语料：

```text
data/cleaned/chat_demo_corpus.txt
data/cleaned/chat_demo_corpus_valid.txt
```

训练一个非常小的 causal language model。

它不会成为真正可用的客服模型，但会让你完整看懂：

```text
语料
  -> tokenizer
  -> token ids
  -> block_size
  -> next-token prediction
  -> checkpoint
  -> 可加载的本地模型目录
```
