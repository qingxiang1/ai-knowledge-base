# 10 第十章：本地推理与交互式调试

学习时长：80 分钟

本章类型：本地推理 + REPL 调试 + 行为观察

本章产物：一次可复现的本地模型回答检查，以及一套用于排查模型输出问题的调试方法

## 10.0 本章要完成什么

上一章我们学习了批量评测。

批量评测适合回答：

```text
模型在一组固定样本上整体表现如何？
哪些样本需要复核？
是否可能背训练集？
```

本章关注另一类工作：

```text
本地推理和交互式调试
```

它适合回答：

```text
单个问题为什么这样回答？
换一种问法会怎样？
多轮对话会不会跑偏？
生成参数改了会怎样？
模型是否重复、串样本或角色漂移？
```

本章会围绕第 6 章输出的最小 SFT 模型：

```text
outputs/sft_minimal_cpu_local/
```

完成：

- 用 `make infer-minimal` 做单次推理
- 用 `--prompt` 覆盖默认问题
- 用 `--show-similar` 显示相似训练样本
- 理解推理脚本如何构造 prompt
- 理解 `max_new_tokens`、`temperature`、`top_p`、`repetition_penalty`
- 用 `make infer-repl` 做交互式测试
- 理解 REPL 的历史管理和 `/clear`
- 观察重复、串样本、角色漂移、空输出等问题
- 判断什么时候应该回去改数据、改训练或改解码参数

完成本章后，你应该能回答：

```text
为什么本地 tiny 模型输出会混乱？
REPL 为什么只是调试工具，不是评测工具？
怎样结合相似训练样本分析模型回答？
```

## 10.1 本地推理和评测有什么不同

评测是批量的。

它输入一组固定问题，输出报告。

本地推理是交互的。

它让你快速试一个问题，看模型怎么答。

两者关系是：

```text
评测发现问题
推理复现问题
REPL 追问问题
再回到数据和训练修复问题
```

不要只靠 REPL 判断模型好坏。

也不要只看评测报告而不亲自看模型输出。

两者要配合使用。

## 10.2 本章输入和输出

单次推理脚本：

```text
scripts/infer_minimal.py
```

单次推理配置：

```text
configs/infer_minimal_cpu_local.json
```

交互式 REPL 脚本：

```text
scripts/infer_repl.py
```

REPL 配置：

```text
configs/infer_repl_cpu_local.json
```

模型目录：

```text
outputs/sft_minimal_cpu_local/
```

训练样本：

```text
data/sft/customer_support_sample.jsonl
```

本章主要输出在控制台。

它不像评测章节那样默认写报告文件。

## 10.3 第一步：确认模型存在

先确认第 6 章输出：

```bash
find outputs/sft_minimal_cpu_local -maxdepth 1 -type f -print
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
make sft-minimal
```

本章推理脚本会从：

```text
outputs/sft_minimal_cpu_local/
```

加载模型和 tokenizer。

## 10.4 第二步：查看单次推理配置

打开：

```text
configs/infer_minimal_cpu_local.json
```

内容如下：

```json
{
  "model_name_or_path": "outputs/sft_minimal_cpu_local",
  "cache_dir": ".cache/huggingface",
  "debug_train_file": "data/sft/customer_support_sample.jsonl",
  "debug_top_k": 3,
  "system_prompt": "你是一个电商客服助手，回答准确、简洁、可执行。",
  "user_prompt": "订单显示已签收但我没有收到，该怎么办？",
  "max_new_tokens": 64,
  "min_new_tokens": 8,
  "temperature": 0.8,
  "top_p": 0.95,
  "do_sample": true,
  "repetition_penalty": 1.05
}
```

重点字段：

```text
model_name_or_path：加载哪个模型
debug_train_file：相似训练样本检查用的数据
system_prompt：角色设定
user_prompt：默认用户问题
max_new_tokens：最多生成多少新 token
temperature：随机性
top_p：采样候选范围
do_sample：是否采样
repetition_penalty：重复惩罚
```

## 10.5 第三步：运行单次推理

执行：

```bash
make infer-minimal
```

它实际运行：

```bash
python3 scripts/infer_minimal.py --config configs/infer_minimal_cpu_local.json
```

输出类似：

```text
=== Prompt ===
订单显示已签收但我没有收到，该怎么办？

=== Response ===
请先核实签收人、快递柜和代收点信息。如果仍未找到，我可以为你发起物流核查。
```

教学 tiny 模型的输出可能不稳定，甚至混入其他样本片段。

这不代表脚本失败。

本章的重点是学会观察和分析。

## 10.6 第四步：覆盖默认 prompt

你可以临时换问题：

```bash
python3 scripts/infer_minimal.py \
  --config configs/infer_minimal_cpu_local.json \
  --prompt "发票抬头可以改成公司吗？"
```

这样不需要改配置文件。

适合快速比较：

```text
训练集中出现过的问题
训练集中没出现但相近的问题
完全无关的问题
```

如果模型只对训练集中高度相似的问题表现好，对改写问题明显变差，就要警惕过拟合或数据覆盖不足。

## 10.7 第五步：显示相似训练样本

运行：

```bash
python3 scripts/infer_minimal.py \
  --config configs/infer_minimal_cpu_local.json \
  --show-similar
```

脚本会先输出：

```text
=== Similar Training Examples ===
```

并列出最相近的训练问题和答案。

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
模型回答是否和训练样本高度相似？
是否只是替换了几个词？
有没有混入其他训练样本答案？
```

## 10.8 第六步：理解 infer_minimal 如何加载模型

脚本中：

```python
tokenizer = AutoTokenizer.from_pretrained(
    config["model_name_or_path"],
    use_fast=True,
    cache_dir=str(cache_dir / "transformers"),
)
```

然后加载模型：

```python
model = AutoModelForCausalLM.from_pretrained(
    config["model_name_or_path"],
    torch_dtype=torch.float32,
    cache_dir=str(cache_dir / "transformers"),
)
model.eval()
```

`model.eval()` 很重要。

它会关闭训练时行为，例如 dropout。

推理时还会使用：

```python
with torch.no_grad():
    outputs = model.generate(...)
```

`torch.no_grad()` 表示不计算梯度，可以节省内存和计算。

## 10.9 第七步：理解 prompt 如何构造

脚本会先构造 messages：

```python
messages = []
if config.get("system_prompt"):
    messages.append({"role": "system", "content": config["system_prompt"]})
messages.append({"role": "user", "content": user_prompt})
```

然后调用：

```python
prompt_text = build_text_from_messages(tokenizer, messages)
```

对于 tiny 教学模型，没有原生 chat template，所以会使用中文角色格式：

```text
系统：你是一个电商客服助手，回答准确、简洁、可执行。
用户：订单显示已签收但我没有收到，该怎么办？
助手：
```

这和第 6 章 SFT 训练时的 prompt 格式保持一致。

训练和推理格式一致，模型才更容易按预期回答。

## 10.10 第八步：理解上下文窗口限制

脚本会读取模型最大位置长度：

```python
max_positions = (
    getattr(model.config, "n_positions", None)
    or getattr(model.config, "max_position_embeddings", None)
    or 512
)
```

第 5 章的 tiny 模型通常是：

```text
n_positions = 64
```

这表示上下文窗口很短。

脚本会限制 prompt 长度：

```python
max_length=max_positions - 1
```

并计算还能生成多少新 token：

```python
available_new_tokens = max(1, max_positions - inputs["input_ids"].shape[1])
max_new_tokens = min(requested_new_tokens, available_new_tokens)
```

这就是为什么 tiny 模型有时生成很短或被截断。

它的上下文窗口本来就小。

## 10.11 第九步：理解生成参数

推理中：

```python
outputs = model.generate(
    **inputs,
    max_new_tokens=max_new_tokens,
    min_new_tokens=min_new_tokens,
    temperature=config.get("temperature", 1.0),
    top_p=config.get("top_p", 1.0),
    do_sample=config.get("do_sample", False),
    repetition_penalty=config.get("repetition_penalty", 1.0),
    pad_token_id=tokenizer.pad_token_id,
    eos_token_id=tokenizer.eos_token_id,
)
```

几个参数很常用。

`max_new_tokens`：

```text
最多生成多少新 token。
```

`temperature`：

```text
控制随机性。越高越发散，越低越稳定。
```

`top_p`：

```text
只在累计概率前 p 的候选 token 中采样。
```

`do_sample`：

```text
true 表示采样，false 表示更确定性的生成。
```

`repetition_penalty`：

```text
惩罚重复 token，减少复读。
```

如果模型输出很乱，可以先尝试：

```json
"do_sample": false
```

或者降低：

```json
"temperature": 0.2
```

但如果模型本身太弱，改解码参数只能缓解，不能根治。

## 10.12 第十步：运行 REPL

执行：

```bash
make infer-repl
```

它实际运行：

```bash
python3 scripts/infer_repl.py --config configs/infer_repl_cpu_local.json
```

启动后会看到：

```text
Entering local chat REPL. Type /exit to quit, /clear to reset history.
user>
```

输入问题：

```text
可以开发票吗？
```

模型会输出：

```text
assistant> ...
```

退出：

```text
/exit
```

清空历史：

```text
/clear
```

## 10.13 REPL 配置

打开：

```text
configs/infer_repl_cpu_local.json
```

内容类似：

```json
{
  "model_name_or_path": "outputs/sft_minimal_cpu_local",
  "system_prompt": "你是一个电商客服助手，回答准确、简洁、可执行。",
  "max_new_tokens": 32,
  "min_new_tokens": 8,
  "temperature": 0.8,
  "top_p": 0.95,
  "do_sample": true,
  "repetition_penalty": 1.05
}
```

REPL 的 `max_new_tokens` 比单次推理更小。

这是为了避免多轮对话时迅速占满 tiny 模型的小上下文窗口。

## 10.14 REPL 如何管理历史

REPL 会保存 messages：

```python
messages = []
if config.get("system_prompt"):
    messages.append({"role": "system", "content": config["system_prompt"]})
```

每次用户输入后：

```python
messages.append({"role": "user", "content": user_text})
```

模型回复后：

```python
messages.append({"role": "assistant", "content": reply})
```

为了不超过上下文窗口，脚本会调用：

```python
trim_history(messages, tokenizer, max_positions)
```

它会从最近消息往前保留，直到 token 数接近模型上限。

这意味着：

```text
很早的对话会被丢弃
tiny 模型很容易忘记多轮上下文
```

## 10.15 你应该观察什么

调试时不要只看“像不像人话”。

重点观察：

```text
是否回答了用户问题
是否符合 system 角色
是否包含必要业务步骤
是否重复
是否混入其他样本答案
是否输出 system / 用户 / 助手 等角色文本
是否换一种问法就失败
是否多轮后角色漂移
```

例如模型回答中出现：

```text
系统：你是一个电商客服助手
用户：
```

这可能说明模型在复现训练语料格式，而不是稳定扮演 assistant。

## 10.16 常见输出问题

### 10.16.1 重复输出

表现：

```text
请提供订单号，请提供订单号，请提供订单号...
```

可能原因：

- 模型太小
- 训练数据重复
- 解码随机性过高
- repetition penalty 太弱

可尝试：

```text
提高 repetition_penalty
降低 temperature
增加高质量反例和多样数据
```

### 10.16.2 串样本

表现：

```text
用户问签收问题，模型回答里混入开发票或退款流程。
```

可能原因：

- 训练样本太少
- 样本之间模式过近
- tiny 模型记忆混乱
- prompt / answer 边界不够稳定

这类问题通常要回到数据和训练。

### 10.16.3 角色漂移

表现：

```text
模型开始生成“系统：”“用户：”。
```

可能原因：

- 预训练语料里包含大量角色标记
- SFT 数据太少
- assistant-only 学习不够稳定
- 解码没有及时停止

真实 chat model 通常依赖更成熟的 chat template 和更大规模对齐数据。

### 10.16.4 空输出

表现：

```text
[empty generation]
```

可能原因：

- prompt 太长，几乎没有可生成空间
- 模型直接生成 EOS
- `max_new_tokens` 太小
- 解码参数过严

先检查上下文窗口和可生成 token 数。

## 10.17 什么时候改解码参数

如果问题是：

```text
轻微重复
回答太发散
输出太长
输出太短
```

可以先调解码参数。

例如：

```json
"temperature": 0.2,
"do_sample": false,
"repetition_penalty": 1.1
```

如果问题是：

```text
业务规则错误
缺少关键步骤
总是混入其他场景
换问法就不会
```

优先回到数据、训练和评测。

解码参数不能弥补模型没有学到的业务能力。

## 10.18 什么时候回去改数据

如果你发现：

- 某类问题总是答错
- 最近训练样本里没有类似问题
- 训练样本答案本身不完整
- 模型经常复读某个模板
- 相似问题之间答案互相矛盾

应该回到第 3 章和第 6 章：

```text
补数据
清洗数据
去重
修正答案
增加评测样本
重新 SFT
```

模型输出问题经常是数据问题的放大镜。

## 10.19 本章练习

### 10.19.1 练习一：单次推理

运行：

```bash
make infer-minimal
```

回答：

```text
模型是否回答了问题？
是否出现重复？
是否混入其他业务场景？
```

### 10.19.2 练习二：换一种问法

运行：

```bash
python3 scripts/infer_minimal.py \
  --config configs/infer_minimal_cpu_local.json \
  --prompt "物流显示签收了，但我没拿到包裹怎么办？"
```

和默认问题比较。

观察模型是否仍然提到：

```text
签收人
快递柜
物流核查
```

### 10.19.3 练习三：显示相似训练样本

运行：

```bash
python3 scripts/infer_minimal.py \
  --config configs/infer_minimal_cpu_local.json \
  --prompt "物流显示签收了，但我没拿到包裹怎么办？" \
  --show-similar
```

回答：

```text
最近训练样本相似度是多少？
模型回答是否像在复述训练答案？
```

### 10.19.4 练习四：REPL 多轮调试

运行：

```bash
make infer-repl
```

依次输入：

```text
可以开发票吗？
要改成公司抬头呢？
订单显示签收但我没收到呢？
/clear
退款多久到账？
/exit
```

观察：

```text
多轮后是否角色漂移？
/clear 后回答是否变化？
是否混入前面问题的信息？
```

## 10.20 本章验收标准

完成本章后，你应该能做到：

- 运行 `make infer-minimal`
- 用 `--prompt` 覆盖默认问题
- 用 `--show-similar` 查看相似训练样本
- 解释 `temperature`、`top_p`、`max_new_tokens`、`repetition_penalty`
- 运行 `make infer-repl`
- 使用 `/clear` 和 `/exit`
- 识别重复、串样本、角色漂移、空输出
- 说明什么时候改解码参数，什么时候回去改数据

## 10.21 下一章衔接

本章完成了本地推理和交互式调试。

下一章会进入部署：

```text
vLLM
OpenAI 兼容接口
模型服务
业务评测调用
```

本地推理适合开发调试。

部署服务适合让评测脚本、业务系统或前端应用统一调用。

也就是说，第 10 章解决的是：

```text
我能不能在本地加载模型并观察行为？
```

第 11 章解决的是：

```text
我能不能把模型作为服务提供给其他程序调用？
```
