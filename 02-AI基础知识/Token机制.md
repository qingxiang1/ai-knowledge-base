<!--
  文件描述: Token化原理与分词机制详解，理解大模型处理文本的基础
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Token机制

> 理解Token化的核心原理、主流算法与在产品中的实际影响

---

## 一、Token概述

### 1.1 什么是Token

**Token** 是大语言模型处理文本的基本单位。模型不会直接处理原始字符或单词，而是将文本切分为Token序列，再将每个Token映射为向量进行计算。

```
文本到Token的转换：

原始文本："Hello, world!"
    │
    ▼
Token化：["Hello", ",", " world", "!"]
    │
    ▼
Token ID：[15496, 11, 995, 0]
    │
    ▼
Embedding向量：[0.23, -0.56, ...] × 4
    │
    ▼
模型输入
```

### 1.2 为什么需要Token

| 原因 | 说明 |
|------|------|
| **离散到连续** | 将离散文本转为连续向量，供神经网络处理 |
| **控制词表大小** | 平衡表达能力与计算效率 |
| **处理未登录词** | 通过子词切分处理新词、专有名词 |
| **统一输入格式** | 不同语言的文本统一为Token序列 |

### 1.3 Token与字符、单词的区别

| 单位 | 示例（"unhappiness"） | 特点 |
|------|---------------------|------|
| **字符** | u, n, h, a, p, p, i, n, e, s, s | 粒度太细，丢失语义 |
| **单词** | unhappiness | 词表太大，无法处理新词 |
| **子词（Token）** | un, happiness | 平衡粒度，处理未登录词 |

---

## 二、Tokenization算法

### 2.1 基于空格的分词（Whitespace）

最简单的方法，按空格和标点切分。

```
输入："Hello, world! How are you?"
输出：["Hello", ",", "world", "!", "How", "are", "you", "?"]

问题：
1. 无法处理中文（中文无空格）
2. 词表过大（英文单词量巨大）
3. 无法处理拼写错误、新词
```

### 2.2 BPE（Byte Pair Encoding）

#### 核心思想

从字符开始，迭代合并频率最高的字符对，直到达到目标词表大小。

```
BPE训练过程示例：

初始语料（已按空格分词）：
- low: l, o, w
- lower: l, o, w, e, r
- lowest: l, o, w, e, s, t
- newer: n, e, w, e, r
- wider: w, i, d, e, r

初始词表：{a, b, c, ..., z}

迭代合并：
1. "e" + "r" 出现3次（lower, newer, wider）→ 加入 "er"
2. "w" + "er" 出现2次（newer, wider不对）→ 实际看频率
   假设 "l" + "o" 出现3次 → 加入 "lo"
3. "lo" + "w" 出现3次 → 加入 "low"
4. "n" + "e" 出现2次 → 加入 "ne"
5. "ne" + "w" 出现2次 → 加入 "new"

最终词表包含：{a, b, ..., z, er, lo, low, ne, new, ...}
```

#### BPE编码过程

```
编码 "lowest"：

1. 拆分为字符：l, o, w, e, s, t
2. 查找词表中的最长子串：
   - "low" 在词表中 ✓
   - "est" 不在词表中
   - "e" 在词表中 ✓
   - "st" 不在词表中
   - "s" 在词表中 ✓
   - "t" 在词表中 ✓
3. 最终切分：["low", "e", "s", "t"]
```

**使用BPE的模型**：GPT-2、RoBERTa、LLaMA

### 2.3 WordPiece

#### 核心思想

与BPE类似，但使用**语言模型似然度**而非频率来决定合并哪个字符对。

```
WordPiece vs BPE：

BPE：选择频率最高的字符对合并
WordPiece：选择合并后使训练数据似然度增加最多的字符对

WordPiece目标：
最大化 P(数据|词表)

即：选择合并后能让训练数据概率最大的字符对
```

**使用WordPiece的模型**：BERT、DistilBERT、Electra

### 2.4 SentencePiece

#### 核心思想

将空格也视为一个特殊字符（"▁"），统一处理所有语言，不依赖预分词。

```
SentencePiece特点：

1. 不依赖语言特定的预分词器
2. 将空格编码为 "▁"（U+2581）
3. 可以直接处理中文、日文等无空格语言
4. 支持BPE和Unigram两种算法

示例：
输入："Hello world"
输出：["▁Hello", "▁world"] 或 ["▁He", "llo", "▁wor", "ld"]

（取决于词表大小和训练结果）
```

**使用SentencePiece的模型**：T5、ALBERT、XLNet、ChatGLM

### 2.5 Unigram Language Model

#### 核心思想

从一个很大的初始词表开始，迭代删除对整体似然度影响最小的Token。

```
Unigram算法流程：

1. 初始化：构建一个很大的词表（如所有字符+高频子串）
2. 训练语言模型：基于当前词表，计算每个子词的概率
3. 评估：计算删除每个子词对整体似然度的影响
4. 删除：移除影响最小的子词（通常是最不常用的）
5. 重复2-4步，直到达到目标词表大小

特点：
- 一个词可能有多种切分方式
- 选择概率最大的切分
- 适合处理多语言混合文本
```

**使用Unigram的模型**：Albert、XLNet（与SentencePiece结合）

### 2.6 算法对比

| 算法 | 合并策略 | 初始词表 | 处理空格 | 代表模型 |
|------|---------|---------|---------|---------|
| **BPE** | 频率最高 | 字符 | 预分词 | GPT-2、LLaMA |
| **WordPiece** | 似然度最大 | 字符 | 预分词 | BERT |
| **SentencePiece** | BPE或Unigram | 字符 | 编码为▁ | T5、ChatGLM |
| **Unigram** | 删除影响最小 | 大词表 | 编码为▁ | XLNet |

---

## 三、Token与模型的关系

### 3.1 Token对模型的影响

```
Token设计影响模型多个方面：

词表大小 ──→ 模型参数量、内存占用
Token粒度 ──→ 表达能力、序列长度
语言覆盖 ──→ 多语言支持能力
特殊Token ──→ 功能扩展（如对话、代码）
```

| 因素 | 影响 | 说明 |
|------|------|------|
| **词表大小** | 模型Embedding层参数量 | 词表越大，Embedding参数越多 |
| **Token粒度** | 序列长度、表达精度 | 子词粒度平衡序列长度和表达能力 |
| **语言覆盖** | 多语言处理能力 | 多语言词表支持跨语言任务 |
| **特殊Token** | 功能扩展 | 如 `<|im_start|>` 用于对话格式 |

### 3.2 常见模型的Tokenizer

| 模型 | Tokenizer | 词表大小 | 特点 |
|------|-----------|---------|------|
| **GPT-2** | BPE | 50,257 | 英文为主，子词切分 |
| **GPT-3/4** | BPE | 100,256 | 多语言支持增强 |
| **BERT** | WordPiece | 30,522 | 中文按字切分 |
| **T5** | SentencePiece | 32,000 | 统一多语言处理 |
| **LLaMA** | BPE | 32,000 | 多语言优化 |
| **ChatGLM** | SentencePiece | 130,344 | 中英双语优化 |
| **Claude** | BPE | ~100,000 | 多语言+代码 |

### 3.3 Token与成本的关系

```
Token数量直接影响API成本：

输入Token数 + 输出Token数 = 总Token数

成本 = 总Token数 × 单价

示例（GPT-4）：
- 输入：1K tokens，$0.03
- 输出：1K tokens，$0.06

中文文本Token数约为英文的1.5-2倍
```

---

## 四、Token化实践

### 4.1 使用Tiktoken（OpenAI）

```python
import tiktoken

# 获取GPT-4的编码器
encoding = tiktoken.encoding_for_model("gpt-4")

# 编码文本
text = "Hello, world!"
tokens = encoding.encode(text)
print(tokens)  # [9906, 11, 1917, 0]

# 解码Token
decoded = encoding.decode(tokens)
print(decoded)  # "Hello, world!"

# 查看Token数量
num_tokens = len(encoding.encode(text))
print(f"Token数: {num_tokens}")
```

### 4.2 使用Hugging Face Tokenizer

```python
from transformers import AutoTokenizer

# 加载BERT的Tokenizer
tokenizer = AutoTokenizer.from_pretrained("bert-base-chinese")

# 编码文本
text = "自然语言处理很有趣"
tokens = tokenizer.tokenize(text)
print(tokens)  # ['自', '然', '语', '言', '处', '理', '很', '有', '趣']

# 获取Token ID
inputs = tokenizer(text, return_tensors="pt")
print(inputs["input_ids"])
```

### 4.3 Token数量估算

| 语言 | 估算比例 | 示例 |
|------|---------|------|
| **英文** | 1词 ≈ 1.3 tokens | "Hello world" ≈ 3 tokens |
| **中文** | 1字 ≈ 1.5-2 tokens | "你好世界" ≈ 6-8 tokens |
| **代码** | 1行 ≈ 5-20 tokens | 取决于复杂度 |
| **数字** | 1位 ≈ 1 token | "12345" ≈ 5 tokens |

---

## 五、AI产品经理的Token关注点

### 5.1 产品层面的Token影响

```
AI产品经理需要关注的Token问题：

1. 成本控制
   └── Token数直接决定API调用成本
   └── 中文内容成本约为英文的1.5-2倍

2. 上下文长度
   └── 模型有最大Token限制（如4K、8K、128K）
   └── 需要设计内容截断策略

3. 用户体验
   └── 输入框需要提示Token限制
   └── 长文本需要分段处理

4. 功能设计
   └── 特殊Token可实现特定功能
   └── 如系统提示、角色设定
```

### 5.2 Token优化策略

| 策略 | 说明 | 效果 |
|------|------|------|
| **精简Prompt** | 去除冗余描述 | 减少输入Token |
| **使用英文** | 英文Token效率更高 | 降低30-50%成本 |
| **模板化** | 预定义格式减少变长 | 可控Token数 |
| **分段处理** | 长文本分多次调用 | 避免超限 |
| **缓存复用** | 复用系统Prompt | 减少重复Token |

### 5.3 与团队沟通要点

| 场景 | 关注点 |
|------|--------|
| **成本预算** | "单次请求平均多少Token？月预算多少？" |
| **性能优化** | "能否优化Prompt减少Token数？" |
| **长文本** | "超过上下文限制如何处理？" |
| **多语言** | "中文Token效率如何？成本影响？" |

---

## 六、本章小结

```
Token机制核心知识框架：

Token
│
├── 基础
│   ├── Token是模型处理文本的基本单位
│   ├── 子词切分平衡词表大小和表达能力
│   └── Token数直接影响成本和上下文长度
│
├── 算法
│   ├── BPE：频率合并，GPT系列使用
│   ├── WordPiece：似然度合并，BERT使用
│   ├── SentencePiece：统一多语言处理
│   └── Unigram：从大到小删除
│
├── 产品影响
│   ├── 成本：Token数 × 单价
│   ├── 上下文：最大Token限制
│   ├── 多语言：中文Token效率较低
│   └── 优化：精简Prompt、模板化
│
└── 实践
    ├── Tiktoken/HuggingFace工具
    ├── Token数量估算
    └── 成本优化策略
```

**关键认知**：
1. Token是大模型处理文本的基础单位，理解Token机制是理解模型行为的前提
2. 不同语言的Token效率不同，中文通常比英文消耗更多Token
3. Token数量直接决定API调用成本，是产品成本模型的核心变量
4. 模型的上下文长度限制本质上是Token数量限制
5. AI产品经理需要掌握Token估算方法，以做出合理的成本和功能设计决策

---

## 参考资料

1. 《Neural Machine Translation of Rare Words with Subword Units》- Sennrich et al., 2015 (BPE)
2. Google SentencePiece：https://github.com/google/sentencepiece
3. OpenAI Tiktoken：https://github.com/openai/tiktoken
4. Hugging Face Tokenizers：https://huggingface.co/docs/tokenizers
5. OpenAI Tokenizer工具：https://platform.openai.com/tokenizer
