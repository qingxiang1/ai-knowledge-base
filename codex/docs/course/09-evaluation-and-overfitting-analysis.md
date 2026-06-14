# 09 第九章：评测，不要被 loss 骗了

学习时长：100 分钟

本章类型：业务评测 + 过拟合分析 + 相似训练样本检查

本章产物：一份 Markdown 业务评测报告，以及一组可辅助判断背题风险的相似样本结果

## 9.0 本章要完成什么

前面几章我们已经完成了：

```text
数据清洗
tokenizer
tiny 预训练
最小 SFT
LoRA / QLoRA
蒸馏
```

但是模型训练完，并不代表它真的好用。

训练日志里的 loss 下降，只能说明：

```text
模型在当前训练目标上更容易预测训练 token。
```

它不能直接说明：

```text
业务回答是否正确
是否遗漏关键步骤
是否只是背了训练样本
是否在换一种问法后仍然稳定
是否成本和延迟可接受
```

本章会围绕“电商客服助手”做轻量业务评测。

你会逐步完成：

- 理解为什么不能只看 loss
- 理解 exact match 和 keyword coverage
- 生成样例评测报告
- 阅读 `customer_predictions.sample.jsonl`
- 阅读 Markdown 评测报告
- 理解真实业务评测如何调用 OpenAI 兼容模型服务
- 生成 predictions 和 metrics
- 分析最近训练样本
- 区分 lexical 相似度和 embedding 相似度
- 判断模型回答是泛化还是背题

完成本章后，你应该能回答：

```text
为什么 keyword coverage 可能虚高？
为什么要看最近训练样本？
为什么平均分不能代替样本级复核？
```

## 9.1 为什么 loss 会骗人

loss 是训练目标上的误差。

在第 5 章预训练中，loss 衡量：

```text
next-token prediction 是否更准确。
```

在第 6 章 SFT 中，loss 衡量：

```text
assistant answer token 是否更容易被预测。
```

但业务真正关心的是：

```text
回答是否符合业务流程。
```

例如用户问：

```text
订单显示已签收但我没收到怎么办？
```

一个业务可接受回答应该包含：

```text
核实签收人
核实快递柜 / 代收点
仍未找到时发起物流核查
```

如果模型只回答：

```text
请耐心等待。
```

它可能在语言上很流畅，但业务上不合格。

所以评测必须看具体样本。

## 9.2 本章评测分两条路线

第一条是本地样例报告路线。

它不需要模型服务，直接使用已有样例 predictions：

```bash
make report-eval-sample
```

输入：

```text
outputs/eval/customer_predictions.sample.jsonl
```

输出：

```text
outputs/eval/customer_report.sample.md
```

第二条是真实业务评测路线。

它会调用 OpenAI 兼容接口生成模型预测：

```bash
python3 scripts/eval_business.py --config configs/eval_business.json
```

然后生成报告：

```bash
make report-eval
```

真实业务评测需要你已经有可访问的模型服务，例如后续 vLLM 服务。

如果当前没有服务，可以先跑样例报告路线。

## 9.3 本章输入和输出

评测集：

```text
data/eval/customer_eval_sample.jsonl
```

真实预测输出：

```text
outputs/eval/customer_predictions.jsonl
```

真实指标输出：

```text
outputs/eval/customer_metrics.json
```

真实报告输出：

```text
outputs/eval/customer_report.md
```

样例预测：

```text
outputs/eval/customer_predictions.sample.jsonl
```

样例报告：

```text
outputs/eval/customer_report.sample.md
```

相似样本检索：

```text
scripts/retrieve_similar_examples.py
scripts/retrieve_similar_semantic.py
```

评测分析：

```text
scripts/analyze_predictions.py
```

## 9.4 第一步：查看评测集

打开：

```bash
sed -n '1,10p' data/eval/customer_eval_sample.jsonl
```

你会看到：

```json
{"question":"订单显示已签收但我没收到怎么办？","reference":"请先核实签收人和快递柜信息，再发起物流核查。","required_keywords":["签收人","物流核查"]}
```

每条评测样本包含：

```text
question：评测问题
reference：参考答案
required_keywords：关键业务词
```

注意：reference 不是唯一正确答案。

客服问题经常允许不同表达方式。

所以本课程除了 exact match，还会看 keyword coverage。

## 9.5 exact match 是什么

脚本中：

```python
def exact_match(prediction: str, reference: str) -> float:
    return 1.0 if normalize_text(prediction) == normalize_text(reference) else 0.0
```

exact match 要求预测和参考答案归一化后完全一致。

优点：

```text
严格
简单
容易理解
```

缺点：

```text
对开放式回答过于苛刻
同义表达会被判错
客服回答通常不适合只看 exact match
```

例如：

```text
参考答案：请先核实签收人和快递柜信息，再发起物流核查。
模型预测：请先查看签收人、快递柜和代收点，仍未找到时我可以帮你发起物流核查。
```

业务上可能是对的。

exact match 仍然是 0。

## 9.6 keyword coverage 是什么

脚本中：

```python
def keyword_coverage(prediction: str, keywords: List[str]) -> float:
    if not keywords:
        return 1.0
    hits = sum(1 for keyword in keywords if keyword in prediction)
    return hits / len(keywords)
```

它检查模型回答是否覆盖关键业务词。

例如 required keywords 是：

```json
["签收人", "物流核查"]
```

如果预测里都出现了：

```text
keyword_coverage = 1.0
```

如果只出现一个：

```text
keyword_coverage = 0.5
```

这个指标比 exact match 更适合开放式客服回答。

但它也可能虚高。

例如模型回答：

```text
签收人。物流核查。
```

关键词都出现了，但回答并不完整。

所以 keyword coverage 只能作为轻量信号，不能替代人工复核。

## 9.7 第二步：生成本地样例报告

先运行：

```bash
make report-eval-sample
```

它实际执行：

```bash
python3 scripts/generate_eval_report.py \
  --predictions outputs/eval/customer_predictions.sample.jsonl \
  --output outputs/eval/customer_report.sample.md
```

这一步不需要模型服务。

它使用已经准备好的样例预测文件。

成功后会看到：

```text
Report saved to outputs/eval/customer_report.sample.md
```

## 9.8 第三步：查看样例 predictions

打开：

```bash
sed -n '1,5p' outputs/eval/customer_predictions.sample.jsonl
```

样例内容类似：

```json
{
  "question": "订单显示已签收但我没有收到，该怎么办？",
  "reference": "请先核实签收人和快递柜信息，再发起物流核查。",
  "prediction": "请先核实签收人、快递柜和代收点信息。如果仍未找到，我可以为你发起物流核查。",
  "exact_match": 0.0,
  "keyword_coverage": 1.0,
  "nearest_training_examples": [
    {
      "score": 0.65,
      "question": "订单显示已签收但我没收到怎么办？",
      "answer": "请先核实签收人、门卫、快递柜和代收点信息。如果仍未找到，我可以为你发起物流核查。"
    }
  ]
}
```

这条样本很适合说明：

```text
exact_match = 0
keyword_coverage = 1
最近训练样本相似度较高
```

也就是说，模型预测虽然不完全等于参考答案，但覆盖了关键业务步骤。

同时，它和训练集中某条样本很接近，需要注意背题风险。

## 9.9 第四步：查看 Markdown 报告

打开：

```bash
sed -n '1,120p' outputs/eval/customer_report.sample.md
```

报告包含：

```text
总览
指标
详细样本
问题
参考答案
模型预测
Exact Match
Keyword Coverage
最近训练样本
```

报告中的分类逻辑来自：

```python
def classify_row(row):
    if row.get("exact_match", 0) == 1.0:
        return "exact_match"
    if row.get("keyword_coverage", 0) >= 0.8:
        return "partial_pass"
    return "needs_review"
```

分类含义：

```text
exact_match：严格命中
partial_pass：关键词覆盖较高，但仍需人工看具体内容
needs_review：需要重点复核
```

## 9.10 真实业务评测如何运行

真实评测使用：

```text
scripts/eval_business.py
```

配置文件：

```text
configs/eval_business.json
```

配置内容类似：

```json
{
  "input_file": "data/eval/customer_eval_sample.jsonl",
  "predictions_file": "outputs/eval/customer_predictions.jsonl",
  "metrics_file": "outputs/eval/customer_metrics.json",
  "debug_train_file": "data/sft/customer_support_sample.jsonl",
  "model": "outputs/qwen25_cs_merged",
  "base_url": "http://localhost:8000/v1",
  "api_key": "dev-token",
  "system_prompt": "你是一个电商客服助手，回答准确、简洁、可执行。",
  "temperature": 0.0,
  "max_tokens": 256
}
```

这里的 `base_url` 表示模型服务地址。

如果你还没有启动服务，真实评测会连接失败。

这不是评测脚本错误，而是缺少模型服务。

## 9.11 eval_business 做了什么

脚本会逐条读取评测集：

```python
rows = read_jsonl(config["input_file"])
```

然后调用模型服务：

```python
response = client.chat.completions.create(
    model=config["model"],
    messages=build_messages(config.get("system_prompt"), row["question"]),
    temperature=config.get("temperature", 0.0),
    max_tokens=config.get("max_tokens", 256),
)
```

拿到预测后计算：

```text
exact_match
keyword_coverage
nearest_training_examples
prediction length
```

最后写入：

```text
outputs/eval/customer_predictions.jsonl
outputs/eval/customer_metrics.json
```

## 9.12 运行真实业务评测

确认模型服务可用后，运行：

```bash
python3 scripts/eval_business.py --config configs/eval_business.json
```

如果只是调试，可以限制样本数：

```bash
python3 scripts/eval_business.py --config configs/eval_business.json --limit 1
```

然后生成报告：

```bash
make report-eval
```

或显式运行：

```bash
python3 scripts/generate_eval_report.py \
  --predictions outputs/eval/customer_predictions.jsonl \
  --metrics outputs/eval/customer_metrics.json \
  --output outputs/eval/customer_report.md
```

## 9.13 metrics 文件怎么看

`customer_metrics.json` 类似：

```json
{
  "num_samples": 3,
  "avg_exact_match": 0.0,
  "avg_keyword_coverage": 0.83,
  "avg_prediction_chars": 47.6
}
```

这些指标适合看趋势。

例如你比较两个模型：

```text
模型 A keyword coverage = 0.60
模型 B keyword coverage = 0.85
```

说明模型 B 可能覆盖了更多关键业务词。

但仍然要看样本细节。

因为平均值可能掩盖严重错误。

## 9.14 为什么要看最近训练样本

模型回答正确有两种可能：

```text
真正泛化
背了相似训练样本
```

例如评测问题：

```text
订单显示已签收但我没有收到，该怎么办？
```

最近训练样本：

```text
订单显示已签收但我没收到怎么办？
```

两者非常接近。

如果模型回答也几乎复述训练答案，就要谨慎。

这不一定是坏事。

客服业务里，标准问答本来就会有模板化回答。

但你需要知道：

```text
模型是在稳定执行标准答案，还是只会背相似样本？
```

## 9.15 lexical 相似样本检索

运行：

```bash
make retrieve-similar
```

实际执行：

```bash
python3 scripts/retrieve_similar_examples.py \
  --config configs/retrieve_similar_examples.json \
  --query "订单显示已签收但我没有收到，该怎么办？"
```

它使用字符 n-gram Jaccard 相似度。

优点：

```text
快
无需模型
CPU 可跑
结果容易解释
```

缺点：

```text
依赖字面重合
同义改写可能识别不好
```

适合本地调试和轻量背题检查。

## 9.16 embedding 相似样本检索

运行：

```bash
make retrieve-semantic
```

它使用：

```text
scripts/retrieve_similar_semantic.py
```

配置里默认 embedding 模型是：

```text
intfloat/multilingual-e5-small
```

优点：

```text
能识别语义相近但字面不同的问题
```

缺点：

```text
需要下载 embedding 模型
更慢
依赖 transformers 和模型缓存
相似度阈值更难解释
```

脚本支持 fallback。

如果 embedding 加载失败，会退回 lexical 检索，并在输出中写 warnings。

## 9.17 analyze-preds 做什么

运行：

```bash
make analyze-preds
```

它会读取：

```text
outputs/eval/customer_predictions.jsonl
```

然后打印前几条样本：

```text
Question
Reference
Prediction
Exact Match
Keyword Coverage
Nearest Training Example
```

它适合快速在终端里检查失败样本。

如果没有 `customer_predictions.jsonl`，说明真实业务评测还没跑。

可以先看样例报告。

## 9.18 常见评测误区

### 9.18.1 只看平均分

平均分会隐藏具体错误。

一个模型可能平均分不错，但在退款、发票、售后中某个关键场景严重失败。

所以要看分场景样本。

### 9.18.2 keyword coverage 虚高

模型可能堆关键词，但没有完整流程。

因此关键词覆盖高，只能说明“可能不错”，不能自动通过。

### 9.18.3 不看最近训练样本

如果评测问题和训练问题高度相似，模型表现好可能只是记忆。

这不是绝对坏事，但要区分：

```text
模板执行
泛化理解
机械背题
```

### 9.18.4 评测集太小

本课程评测集是教学样例。

真实项目应该覆盖：

- 高频问题
- 长尾问题
- 边界问题
- 业务规则变更问题
- 用户表达不清的问题
- 安全和合规问题

## 9.19 本章练习

### 9.19.1 练习一：生成样例报告

运行：

```bash
make report-eval-sample
```

打开：

```text
outputs/eval/customer_report.sample.md
```

回答：

```text
为什么 exact_match 是 0？
为什么 keyword_coverage 是 1？
最近训练样本说明了什么？
```

### 9.19.2 练习二：运行 lexical 检索

运行：

```bash
make retrieve-similar
```

回答：

```text
最高相似度样本是哪条？
它和 query 的差异在哪里？
```

### 9.19.3 练习三：分析真实 predictions

如果你已经启动模型服务并跑过真实评测，运行：

```bash
make analyze-preds
```

如果还没有真实服务，只需要读懂脚本输出格式。

### 9.19.4 练习四：扩展评测集

在：

```text
data/eval/customer_eval_sample.jsonl
```

新增一条退款问题。

字段包括：

```text
question
reference
required_keywords
```

思考哪些关键词能代表这个业务问题必须回答到位。

## 9.20 本章验收标准

完成本章后，你应该能做到：

- 解释为什么 loss 下降不代表业务效果好
- 解释 exact match 和 keyword coverage 的区别
- 运行 `make report-eval-sample`
- 读懂 `outputs/eval/customer_report.sample.md`
- 说明为什么 keyword coverage 可能虚高
- 运行 `make retrieve-similar`
- 说明 lexical 和 embedding 检索的区别
- 说明为什么要看最近训练样本
- 说明真实业务评测为什么需要模型服务

## 9.21 下一章衔接

本章关注的是：

```text
批量评测和报告
```

下一章会关注：

```text
本地单次推理和交互式调试
```

评测报告能告诉你哪些样本失败。

本地推理和 REPL 能帮助你进一步追问：

```text
换一种问法会怎样？
多轮对话会不会角色漂移？
模型是不是重复输出？
是不是混入了训练样本片段？
```

这就是第 10 章要解决的问题。
