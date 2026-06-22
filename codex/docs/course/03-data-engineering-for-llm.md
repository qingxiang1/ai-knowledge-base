# 03 第三章：数据工程是模型质量的地基

学习时长：90 分钟

本章类型：数据清洗 + SFT 格式转换

本章产物：一份可用于监督微调的 `messages` 格式 JSONL 数据，以及一份可审计的数据清洗报告

## 3.0 本章要完成什么

前两章已经完成了两件事：

```text
00：搭好工程工作台，理解 configs/data/scripts/outputs 的分工
01：看懂电商客服助手的大模型开发全流程
02：检查本机环境，选择适合当前机器的运行路线
```

从这一章开始，我们进入真正会影响模型质量的第一件事：

```text
数据工程
```

很多新手会以为大模型效果主要取决于模型参数和训练技巧。实际项目里，数据质量经常更早决定上限。

如果训练数据里有大量重复、错误、噪声、短答、无效问答，模型会学习到这些问题：

- 回答啰嗦或答非所问
- 把错误业务规则当成正确答案
- 遇到相似问题时只会机械复读
- 对低质量样本过拟合
- 评测时看似命中，其实只是背了训练样本

本章会用“电商客服助手”案例完成一条真实可跑的数据处理流程：

```text
data/raw/customer_support_raw.jsonl
  -> scripts/prepare_sft_data.py
  -> data/sft/customer_support_prepared.jsonl
  -> outputs/data_prep/customer_support_rejected.jsonl
  -> outputs/data_prep/prepare_sft_summary.json
```

你会逐步完成：

- 理解原始业务数据长什么样
- 理解 SFT `messages` 格式为什么这样设计
- 配置数据清洗规则
- 过滤低质量样本
- 过滤过短问题和过短答案
- 对样本做归一化和去重
- 保存可训练样本
- 保存被拒绝样本
- 阅读清洗统计报告
- 判断清洗结果是否可信

完成本章后，你应该能明确回答：

```text
哪些数据可以进入 SFT？
哪些数据必须被拒绝？
为什么 rejected 文件也要保存？
```

## 3.1 为什么数据工程是模型质量的地基

SFT 的本质是让模型模仿训练样本中的回答方式。

如果样本是这样的：

```json
{
  "question": "发票抬头可以改成公司吗？",
  "answer": "如果订单尚未开票，可以修改。请把公司抬头和税号发给我，我帮你提交变更。"
}
```

模型学到的是：

```text
遇到发票抬头修改问题时，先说明条件，再要求用户提供必要信息。
```

如果样本是这样的：

```json
{
  "question": "发票？",
  "answer": "找客服"
}
```

模型可能学到的是：

```text
问题可以很含糊，回答可以很敷衍。
```

如果样本是这样的：

```json
{
  "question": "订单显示已签收但我没收到怎么办？",
  "answer": "不用管，等着。"
}
```

模型可能学到错误业务流程。

所以数据工程的目标不是“把所有日志都塞给模型”，而是做选择：

```text
保留能教会模型正确行为的样本
拒绝会污染模型行为的样本
记录每条样本为什么被拒绝
```

这就是本章脚本要完成的事情。

## 3.2 先看本章输入和输出

本章输入文件是：

[customer_support_raw.jsonl](/Users/luoqingxiang/Documents/codex/data/raw/customer_support_raw.jsonl)

它是一份原始客服问答数据。

本章输出三个文件：

```text
data/sft/customer_support_prepared.jsonl
outputs/data_prep/customer_support_rejected.jsonl
outputs/data_prep/prepare_sft_summary.json
```

三个文件各自负责不同目的。

`customer_support_prepared.jsonl` 是可以进入 SFT 的训练数据。

`customer_support_rejected.jsonl` 保存被拒绝的原始样本和拒绝原因。

`prepare_sft_summary.json` 保存本次清洗的统计结果，方便验收和后续追踪。

可以把这一步理解成：

```text
原始数据
  -> 清洗规则
      -> 合格样本
      -> 拒绝样本
      -> 统计报告
```

## 3.3 第一步：理解原始数据格式

打开原始数据：

```bash
sed -n '1,10p' data/raw/customer_support_raw.jsonl
```

你会看到类似内容：

```json
{"instruction":"你是一个电商客服助手，回答准确、简洁、可执行。","question":"可以开发票吗？","answer":"可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。","source":"faq","quality":"high"}
```

每一行是一条 JSON。

这种格式叫 JSONL：

```text
JSON Lines
```

它的特点是：

```text
一行一条样本
每行都是独立 JSON
可以按行流式读取
适合训练数据和评测数据
```

本章原始样本包含这些字段：

```text
instruction：角色和回答要求
question：用户问题
answer：客服标准回答
source：样本来源
quality：质量标签
```

其中最关键的是：

- `instruction`
- `question`
- `answer`
- `quality`

`source` 暂时不参与过滤，但它对真实项目很有用。后续你可以用它分析样本来自 FAQ、工单、人工标注还是线上日志。

## 3.4 第二步：理解 SFT `messages` 格式

本章要把原始问答转换成 SFT 常用的聊天格式。

目标格式如下：

```json
{
  "messages": [
    {
      "role": "system",
      "content": "你是一个电商客服助手，回答准确、简洁、可执行。"
    },
    {
      "role": "user",
      "content": "可以开发票吗？"
    },
    {
      "role": "assistant",
      "content": "可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。"
    }
  ]
}
```

这三个角色分别表示：

```text
system：告诉模型应该扮演什么角色、遵守什么回答风格
user：用户输入
assistant：模型应该学习生成的目标回答
```

为什么不直接用 `question` 和 `answer`？

因为后续训练、推理、部署都会围绕聊天格式展开。

在第 1 章里，我们已经看到推理请求也是类似结构：

```python
messages = [
    {"role": "system", "content": "你是一个电商客服助手。"},
    {"role": "user", "content": "订单显示已签收但没收到怎么办？"},
]
```

训练格式和推理格式越一致，工程链路越简单。

所以本章要完成的是：

```text
instruction -> system
question    -> user
answer      -> assistant
```

## 3.5 第三步：查看清洗配置

清洗脚本不把规则写死在代码里，而是读取配置文件。

打开：

```text
configs/prepare_sft_data.json
```

内容如下：

```json
{
  "input_file": "data/raw/customer_support_raw.jsonl",
  "output_file": "data/sft/customer_support_prepared.jsonl",
  "rejected_file": "outputs/data_prep/customer_support_rejected.jsonl",
  "min_question_chars": 4,
  "min_answer_chars": 8,
  "allowed_quality": [
    "high",
    "medium"
  ],
  "default_system_prompt": "你是一个电商客服助手，回答准确、简洁、可执行。"
}
```

这些字段的含义是：

```text
input_file：原始 JSONL 文件
output_file：清洗后 SFT JSONL 文件
rejected_file：被拒绝样本保存位置
min_question_chars：问题最少字符数
min_answer_chars：答案最少字符数
allowed_quality：允许进入训练集的质量标签
default_system_prompt：原始样本缺少 instruction 时使用的默认 system prompt
```

配置文件让同一个脚本可以服务不同实验。

如果你以后要清洗另一批客服数据，可以复制一份配置：

```text
configs/prepare_sft_data_my_case.json
```

然后修改输入、输出和过滤规则，不需要改 Python 脚本。

## 3.6 第四步：理解清洗脚本入口

本章使用的脚本是：

```text
scripts/prepare_sft_data.py
```

先看入口：

```python
from __future__ import annotations

import argparse
import json
from collections import Counter

from common import ensure_parent, load_json, normalize_text, read_jsonl, write_jsonl
```

这里复用了第 00 章写过的公共工具：

```text
load_json：读取配置
read_jsonl：读取原始 JSONL
write_jsonl：写入输出 JSONL
normalize_text：文本归一化，用于去重
ensure_parent：写 summary 前确保父目录存在
```

命令行参数由 `parse_args` 负责：

```python
def parse_args():
    parser = argparse.ArgumentParser(
        description="Prepare raw customer-support style data into chat-format SFT JSONL."
    )
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()
```

这和前面章节讲过的脚本模板一致：

```bash
python3 scripts/prepare_sft_data.py --config configs/prepare_sft_data.json
```

`--config` 让清洗规则由配置文件决定。

## 3.7 第五步：把原始问答转成 messages

核心转换函数是：

```python
def build_messages(system_prompt: str, question: str, answer: str):
    # Convert a raw QA row into the chat-style format used by SFT.
    return {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer},
        ]
    }
```

它做的事情很直接：

```text
system_prompt 放到 system
question 放到 user
answer 放到 assistant
```

例如输入：

```json
{
  "instruction": "你是一个电商客服助手，回答准确、简洁、可执行。",
  "question": "发票抬头可以改成公司吗？",
  "answer": "如果订单尚未开票，可以修改。请把公司抬头和税号发给我，我帮你提交变更。"
}
```

输出：

```json
{
  "messages": [
    {
      "role": "system",
      "content": "你是一个电商客服助手，回答准确、简洁、可执行。"
    },
    {
      "role": "user",
      "content": "发票抬头可以改成公司吗？"
    },
    {
      "role": "assistant",
      "content": "如果订单尚未开票，可以修改。请把公司抬头和税号发给我，我帮你提交变更。"
    }
  ]
}
```

这个函数看起来简单，但它把业务数据变成了训练框架能理解的数据。

## 3.8 第六步：读取配置和原始数据

`main()` 的开头负责读取配置和数据：

```python
def main():
    args = parse_args()
    config = load_json(args.config)
    rows = read_jsonl(config["input_file"])
```

这里的执行顺序是：

```text
读取命令行参数
  -> 读取 JSON 配置
  -> 根据 config["input_file"] 读取原始 JSONL
```

如果运行：

```bash
make prepare-sft
```

实际执行的是：

```bash
python3 scripts/prepare_sft_data.py --config configs/prepare_sft_data.json
```

于是脚本会读取：

```text
data/raw/customer_support_raw.jsonl
```

这就是第 00 章反复强调的配置驱动开发。

## 3.9 第七步：准备 accepted、rejected 和 stats

脚本里先创建几个容器：

```python
seen = set()
accepted = []
rejected = []
stats = Counter()
```

它们分别表示：

```text
seen：记录已经出现过的样本，用于去重
accepted：保存通过清洗的样本
rejected：保存被拒绝的样本和拒绝原因
stats：统计每类结果的数量
```

为什么要保存 `rejected`？

因为数据清洗不是一次性动作，而是需要审计和迭代。

如果你只保存清洗后的结果，就很难回答：

```text
到底删掉了哪些样本？
为什么删掉？
有没有误删重要业务问题？
```

真实项目中，经常需要产品、运营、客服专家一起看 rejected 样本，判断过滤规则是否合理。

## 3.10 第八步：归一化问题和答案

循环处理每一行原始数据：

```python
for row in rows:
    # Normalize whitespace before filtering and deduplication.
    question = " ".join(str(row.get("question", "")).split())
    answer = " ".join(str(row.get("answer", "")).split())
    system_prompt = row.get("instruction") or config["default_system_prompt"]
    quality = row.get("quality", "unknown")
```

这里先做了最基础的空白归一化。

例如原始答案是：

```text
  请先核实仓库是否出库，再确认快递是否已揽件。  
```

归一化后会变成：

```text
请先核实仓库是否出库，再确认快递是否已揽件。
```

这样做有两个好处：

- 输出数据更干净
- 去重更准确

`system_prompt` 的逻辑是：

```python
system_prompt = row.get("instruction") or config["default_system_prompt"]
```

意思是：

```text
如果原始样本有 instruction，就用原始 instruction
如果没有 instruction，就用配置里的 default_system_prompt
```

这能避免某些样本缺失 instruction 时直接报错。

## 3.11 第九步：过滤低质量样本

第一道过滤规则是质量标签：

```python
if quality not in config["allowed_quality"]:
    rejected.append({"reason": "quality_filter", "row": row})
    stats["rejected_quality"] += 1
    continue
```

配置里允许：

```json
"allowed_quality": [
  "high",
  "medium"
]
```

所以 `quality` 为 `high` 或 `medium` 的样本可以继续往下检查。

如果是 `low`，就会被拒绝。

例如原始数据中有一条：

```json
{
  "question": "a",
  "answer": "好的",
  "source": "noise",
  "quality": "low"
}
```

它会进入 rejected 文件，并标记：

```json
{
  "reason": "quality_filter",
  "row": {
    "question": "a",
    "answer": "好的",
    "source": "noise",
    "quality": "low"
  }
}
```

注意：这条样本其实也满足“问题太短”和“答案太短”，但脚本会先命中质量过滤。

清洗规则是按顺序执行的。一个样本一旦被拒绝，就不会继续检查后面的规则。

## 3.12 第十步：过滤过短问题和答案

第二道规则检查问题长度：

```python
if len(question) < config["min_question_chars"]:
    rejected.append({"reason": "question_too_short", "row": row})
    stats["rejected_short_question"] += 1
    continue
```

配置里写的是：

```json
"min_question_chars": 4
```

这表示问题少于 4 个字符时拒绝。

第三道规则检查答案长度：

```python
if len(answer) < config["min_answer_chars"]:
    rejected.append({"reason": "answer_too_short", "row": row})
    stats["rejected_short_answer"] += 1
    continue
```

配置里写的是：

```json
"min_answer_chars": 8
```

这表示答案少于 8 个字符时拒绝。

为什么要过滤过短问题和答案？

因为它们通常训练信号很弱。

例如：

```text
问：发票？
答：可以
```

模型很难从中学到完整业务规则。

更好的样本应该包含：

```text
清楚的问题
明确的条件
可执行的下一步
```

例如：

```text
问：发票抬头可以改成公司吗？
答：如果订单尚未开票，可以修改。请把公司抬头和税号发给我，我帮你提交变更。
```

## 3.13 第十一步：对样本去重

第四道规则是去重：

```python
dedup_key = (
    normalize_text(system_prompt),
    normalize_text(question),
    normalize_text(answer),
)
if dedup_key in seen:
    rejected.append({"reason": "duplicate", "row": row})
    stats["rejected_duplicate"] += 1
    continue
seen.add(dedup_key)
```

这里不是只按问题去重，而是按完整训练三元组去重：

```text
system_prompt
question
answer
```

为什么不只按 `question` 去重？

因为同一个问题在不同业务策略下可能有不同回答。

例如：

```text
问题：发票抬头可以改成公司吗？
回答 A：未开票可以修改。
回答 B：已经开票后不能直接修改，需要重新申请。
```

如果只按问题去重，可能会误删不同业务条件下的有效样本。

为什么要调用 `normalize_text`？

因为重复样本可能只有大小写、空格或换行差异。

例如原始数据中有两条：

```json
{"question":"订单待揽收很久怎么办？","answer":"请先核实仓库是否出库，再确认快递是否已揽件。"}
```

和：

```json
{"question":"订单待揽收很久怎么办？","answer":"  请先核实仓库是否出库，再确认快递是否已揽件。  "}
```

肉眼看是同一条业务规则。

归一化之后，它们会被识别为重复。

## 3.14 第十二步：保存合格样本

通过所有过滤规则后，样本会进入 `accepted`：

```python
accepted.append(build_messages(system_prompt, question, answer))
stats["accepted"] += 1
```

也就是：

```text
质量标签允许
问题长度合格
答案长度合格
没有重复
```

才会被写入 SFT 数据。

最终合格样本会保存到：

```text
data/sft/customer_support_prepared.jsonl
```

这个文件中的每一行都是一条 `messages` 样本。

## 3.15 第十三步：写入输出文件和统计报告

循环结束后，脚本写入结果：

```python
write_jsonl(config["output_file"], accepted)
write_jsonl(config["rejected_file"], rejected)
```

接着生成 summary：

```python
summary = {
    "input_rows": len(rows),
    "accepted_rows": len(accepted),
    "rejected_rows": len(rejected),
    "stats": dict(stats),
    "output_file": config["output_file"],
    "rejected_file": config["rejected_file"],
}
summary_path = ensure_parent("outputs/data_prep/prepare_sft_summary.json")
with summary_path.open("w", encoding="utf-8") as fh:
    json.dump(summary, fh, ensure_ascii=False, indent=2)

print(json.dumps(summary, ensure_ascii=False, indent=2))
```

这里有三个设计点。

第一，accepted 和 rejected 都写入文件：

```text
合格样本用于训练
拒绝样本用于审计
```

第二，summary 写入 JSON：

```text
方便人看，也方便脚本检查
```

第三，summary 同时打印到控制台：

```text
运行命令后立刻能看到清洗结果
```

## 3.16 第十四步：运行数据清洗

执行：

```bash
make prepare-sft
```

它实际运行：

```bash
python3 scripts/prepare_sft_data.py --config configs/prepare_sft_data.json
```

你应该看到类似输出：

```json
{
  "input_rows": 7,
  "accepted_rows": 4,
  "rejected_rows": 3,
  "stats": {
    "accepted": 4,
    "rejected_duplicate": 2,
    "rejected_quality": 1
  },
  "output_file": "data/sft/customer_support_prepared.jsonl",
  "rejected_file": "outputs/data_prep/customer_support_rejected.jsonl"
}
```

这个结果说明：

```text
一共读取 7 条原始样本
4 条进入 SFT 数据
3 条被拒绝
2 条因为重复被拒绝
1 条因为质量标签不允许被拒绝
```

如果你的数字不同，先检查：

- 是否改过原始数据
- 是否改过配置文件
- 是否在项目根目录运行命令
- 是否使用了同一个 Python 环境

## 3.17 第十五步：检查 SFT 输出文件

查看清洗后的训练数据：

```bash
sed -n '1,5p' data/sft/customer_support_prepared.jsonl
```

你应该看到每一行都是 `messages` 格式：

```json
{"messages": [{"role": "system", "content": "你是一个电商客服助手，回答准确、简洁、可执行。"}, {"role": "user", "content": "可以开发票吗？"}, {"role": "assistant", "content": "可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。"}]}
```

检查时重点看三件事：

- 是否每条都有 `system`、`user`、`assistant`
- `user` 是否来自原始 `question`
- `assistant` 是否来自原始 `answer`

如果这里格式错了，后面的 SFT 脚本就很可能失败。

## 3.18 第十六步：检查 rejected 文件

查看被拒绝样本：

```bash
sed -n '1,10p' outputs/data_prep/customer_support_rejected.jsonl
```

你会看到类似：

```json
{"reason": "duplicate", "row": {"question": "可以开发票吗？", "answer": "可以。请提供订单号、发票抬头和税号，我会为你提交开票申请。", "quality": "high"}}
```

每条 rejected 样本都有：

```text
reason：拒绝原因
row：原始样本
```

本章会出现的拒绝原因包括：

```text
quality_filter：质量标签不在 allowed_quality 中
question_too_short：问题太短
answer_too_short：答案太短
duplicate：重复样本
```

为什么要人工检查 rejected 文件？

因为过滤规则可能过严，也可能过松。

例如你看到很多重要业务问题都因为 `question_too_short` 被拒绝，就应该考虑：

```text
是否 min_question_chars 设置太高？
是否原始问题需要先补全？
是否短问题其实来自按钮、菜单或结构化入口？
```

数据清洗不是一次写完就永远正确，而是要根据 rejected 样本反复调整。

## 3.19 第十七步：检查 summary 文件

查看统计报告：

```bash
cat outputs/data_prep/prepare_sft_summary.json
```

你会看到：

```json
{
  "input_rows": 7,
  "accepted_rows": 4,
  "rejected_rows": 3,
  "stats": {
    "accepted": 4,
    "rejected_duplicate": 2,
    "rejected_quality": 1
  },
  "output_file": "data/sft/customer_support_prepared.jsonl",
  "rejected_file": "outputs/data_prep/customer_support_rejected.jsonl"
}
```

这个文件可以回答三个问题：

```text
这次清洗处理了多少数据？
有多少数据进入训练集？
数据主要被什么原因拒绝？
```

真实项目里，summary 特别适合做版本对比。

例如你改了过滤规则后，发现：

```text
accepted_rows 从 10000 降到 1200
rejected_short_answer 从 300 增加到 6000
```

这通常说明规则可能过严，需要人工复查。

## 3.20 第十八步：理解本章和后续章节的关系

本章输出的 SFT 文件和第 6 章使用的数据格式完全一致：

```text
data/sft/customer_support_prepared.jsonl
```

第 1 章和本地流水线里使用的最小 SFT 示例是：

```text
data/sft/customer_support_sample.jsonl
```

两者格式相同，都是 `messages`。

区别是：

```text
customer_support_sample.jsonl：更小的教学样本，用于快速 CPU 演示
customer_support_prepared.jsonl：本章从原始数据清洗得到的训练数据
```

为了让本地 CPU 路线更快，第 6 章默认使用 `customer_support_sample.jsonl`。如果你想用本章清洗出的数据做 SFT，可以复制一份 SFT 配置，把 `train_file` 改成 `data/sft/customer_support_prepared.jsonl`。

本章的 rejected 和 summary 会在第 9 章评测时继续派上用场。

因为评测一个模型回答是否可靠，不能只看模型输出，还要回头看：

```text
训练数据里有没有类似问题？
类似问题的标准答案是什么？
清洗时是否误删了关键样本？
```

## 3.21 常见数据质量问题

### 3.21.1 重复样本太多

重复样本会让模型过度记住某些问法和答案。

少量重复不一定致命，但大量重复会让训练分布失真。

例如 10000 条数据里有 3000 条都是“可以开发票吗”，模型就会过度偏向发票场景。

本章脚本会用完整三元组去重：

```text
system + question + answer
```

这比只按问题去重更稳妥。

### 3.21.2 低质量标签混入训练集

如果 `quality=low` 的样本进入训练，模型可能学到：

- 错误业务规则
- 不完整回答
- 情绪化回复
- 无意义短答

所以配置里只允许：

```json
["high", "medium"]
```

真实项目中，质量标签可以来自人工标注，也可以来自规则打分或模型辅助筛选。

但无论来源是什么，都要抽样人工检查。

### 3.21.3 只清洗问题，不清洗答案

SFT 中真正计算 loss 的主要是 assistant 答案。

如果答案质量差，影响比问题质量差更直接。

好答案通常应该满足：

```text
准确
简洁
可执行
符合业务流程
没有泄露隐私
没有编造承诺
```

例如：

```text
请提供订单号，我帮你核实仓库是否已经完成出库。
```

就比：

```text
等等吧。
```

更适合训练客服助手。

### 3.21.4 不保存 rejected 样本

不保存 rejected 样本会让清洗过程不可解释。

后续如果模型效果不好，你很难判断：

```text
是模型没学会？
还是关键训练样本被清洗掉了？
还是低质量样本混进来了？
```

保留 rejected 文件能让数据工程变成可审计流程。

### 3.21.5 清洗规则写死在脚本里

如果把阈值写死在脚本里，例如：

```python
if len(question) < 4:
    ...
```

以后每次实验都要改代码。

本课程把阈值放在配置里：

```json
"min_question_chars": 4,
"min_answer_chars": 8
```

这样你可以保留多份配置，对比不同清洗策略。

## 3.22 本章练习

### 3.22.1 练习一：解释清洗结果

运行：

```bash
make prepare-sft
```

然后打开：

```text
outputs/data_prep/prepare_sft_summary.json
```

用自己的话解释：

```text
input_rows 是多少？
accepted_rows 是多少？
rejected_rows 是多少？
最多的拒绝原因是什么？
```

### 3.22.2 练习二：检查 rejected 样本

打开：

```text
outputs/data_prep/customer_support_rejected.jsonl
```

回答：

```text
哪些样本是重复？
哪条样本因为质量标签被拒绝？
有没有你认为不该被拒绝的样本？
```

### 3.22.3 练习三：修改清洗规则

仓库已经提供了一份可直接运行的严格配置：

```bash
python3 scripts/prepare_sft_data.py --config configs/prepare_sft_data_strict.json
```

你也可以自己从默认配置复制一份，再手动修改：

```bash
cp configs/prepare_sft_data.json configs/prepare_sft_data_my_strict.json
```

把自定义配置里的：

```json
"allowed_quality": [
  "high",
  "medium"
]
```

改成：

```json
"allowed_quality": [
  "high"
]
```

然后运行：

```bash
python3 scripts/prepare_sft_data.py --config configs/prepare_sft_data_my_strict.json
```

观察 accepted 和 rejected 数量如何变化。

注意：这是练习，不要求你把 `Makefile` 改成使用这份配置。

## 3.23 本章验收标准

完成本章后，你应该能做到：

- 解释原始 JSONL 和 SFT `messages` JSONL 的区别
- 说清楚 `system`、`user`、`assistant` 三个角色分别是什么
- 运行 `make prepare-sft`
- 找到并解释 `data/sft/customer_support_prepared.jsonl`
- 找到并解释 `outputs/data_prep/customer_support_rejected.jsonl`
- 找到并解释 `outputs/data_prep/prepare_sft_summary.json`
- 说明为什么要过滤低质量样本
- 说明为什么要去重
- 说明为什么 rejected 样本也必须保存

## 3.24 常见问题

### 3.24.1 为什么本章数据这么少

因为本课程当前阶段是教学样例。

少量数据方便你完整看懂：

```text
每条原始样本如何被处理
每条 rejected 为什么被拒绝
summary 数字如何产生
```

真实项目中，数据量会大得多，但处理思想相同。

### 3.24.2 数据越多越好吗

不一定。

更多数据只有在质量可靠、分布合理、业务规则一致时才有价值。

低质量数据变多，可能让模型更差。

优先级通常是：

```text
正确性 > 覆盖面 > 数量
```

### 3.24.3 能不能把线上客服日志直接拿来训练

不建议直接拿来训练。

线上日志通常需要先处理：

- 去除隐私信息
- 删除脏话和情绪化内容
- 修正错误业务答案
- 合并多轮上下文
- 去除无意义寒暄
- 统一回答风格
- 人工抽检高风险样本

本章只是最小清洗流程，真实生产数据还需要更完整的数据治理。

### 3.24.4 为什么不用更复杂的语义去重

本章使用的是规则型去重，优点是简单、可解释、稳定。

语义去重可以发现“表达不同但含义相同”的样本，例如：

```text
订单显示签收但我没收到怎么办？
物流显示签收了，可我没有拿到包裹怎么办？
```

但语义去重需要 embedding 模型或相似度模型，也会引入新的阈值问题。

所以本章先用规则去重。后续做评测和相似样本分析时，会继续扩展相似度方法。

## 3.25 下一章衔接

本章把原始问答数据清洗成了 SFT 的 `messages` 格式。

下一章会进入 tokenizer。

你会看到模型并不是直接读取中文句子，而是先把文本切成 token，再变成 token id。

也就是说，下一章要解决的问题是：

```text
模型到底是怎样“看见”文本的？
```

本章的数据工程关注的是：

```text
哪些文本值得给模型学习？
```

第四章 tokenizer 关注的是：

```text
这些文本如何变成模型可以计算的数字？
```
