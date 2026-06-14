# 08 第八章：蒸馏，把大模型能力迁移给小模型

学习时长：90 分钟

本章类型：Response Distillation + Student 微调

本章产物：一份 teacher 生成的蒸馏数据，以及一个 student adapter 输出目录

## 8.0 本章要完成什么

上一章我们学习了 LoRA / QLoRA。

它解决的是：

```text
如何低成本微调一个已有开源模型？
```

这一章进入蒸馏。

蒸馏要解决的是：

```text
如何把更强 teacher 模型的回答能力迁移给更小、更便宜的 student 模型？
```

本章使用的是最容易落地的一类蒸馏：

```text
response distillation
```

也就是：

```text
准备问题
  -> 调用 teacher 生成高质量答案
  -> 保存 question/answer 数据
  -> 用这些数据训练 student
```

你会逐步完成：

- 理解 teacher 和 student
- 理解 response distillation
- 区分 response distillation 和 logit distillation
- 查看蒸馏问题集
- 配置 teacher 服务
- 调用 OpenAI 兼容接口生成 teacher answer
- 保存蒸馏 JSONL
- 用蒸馏数据训练 student
- 理解为什么必须过滤 teacher 低质量回答
- 知道蒸馏后应该比较质量、延迟和成本

完成本章后，你应该能回答：

```text
teacher 和 student 分别是什么？
蒸馏数据从哪里来？
为什么 teacher 生成的答案不能不检查就训练？
蒸馏后应该怎么判断 student 是否值得上线？
```

## 8.1 teacher 和 student 是什么

teacher 是更强的模型。

它通常特点是：

```text
参数更多
推理更贵
延迟更高
回答质量更好
```

student 是更小的模型。

它通常特点是：

```text
参数更少
推理更便宜
延迟更低
更容易部署
```

蒸馏的目标不是让 student 无损复制 teacher。

更现实的目标是：

```text
在关键业务问题上，尽量接近 teacher 的效果
同时显著降低成本和延迟
```

所以蒸馏要比较的不只是回答质量，还包括：

- 推理延迟
- 单次调用成本
- 吞吐
- 部署资源
- 失败样本类型

## 8.2 response distillation 是什么

response distillation 的流程很直观。

先准备问题：

```json
{ "question": "订单显示待揽收超过 48 小时，客服应该如何回复？" }
```

再让 teacher 回答：

```text
请先安抚用户，并核实订单是否已经出库、快递是否完成揽件。如果超过承诺时效，可以继续发起仓库和物流核查。
```

保存成训练数据：

```json
{
  "question": "订单显示待揽收超过 48 小时，客服应该如何回复？",
  "answer": "请先安抚用户，并核实订单是否已经出库、快递是否完成揽件。如果超过承诺时效，可以继续发起仓库和物流核查。",
  "system_prompt": "你是企业知识助手，请回答准确、简洁、可执行。",
  "teacher_model": "Qwen/Qwen2.5-7B-Instruct"
}
```

然后用这些 question/answer 训练 student。

本工程的 `distill_train.py` 支持这种 flat `question + answer` 格式。

## 8.3 response distillation 和 logit distillation 的区别

response distillation 学的是 teacher 的最终回答。

也就是：

```text
teacher 输出文本
student 学文本
```

优点是：

- 实现简单
- 不需要访问 teacher logits
- 可以通过 API 调用 teacher
- 适合真实业务落地

缺点是：

- 只看到最终答案
- 看不到 teacher 对其他 token 的概率分布
- 对 teacher 输出质量非常敏感

logit distillation 学的是 teacher 的概率分布。

也就是：

```text
teacher 对每个 token 的 logits / probabilities
student 学这些分布
```

优点是信号更细。

缺点是工程成本更高，通常需要：

- 能访问 teacher logits
- 模型和 tokenizer 对齐
- 更复杂的训练代码
- 更高存储和计算成本

本课程采用 response distillation，因为它最适合初学者和业务项目落地。

## 8.4 本章输入和输出

输入问题：

```text
data/distill/questions_sample.jsonl
```

teacher 生成脚本：

```text
scripts/distill_generate.py
```

teacher 生成配置：

```text
configs/distill_generate.json
```

teacher 输出：

```text
outputs/distill/generated_teacher_answers.jsonl
```

student 训练脚本：

```text
scripts/distill_train.py
```

student 训练配置：

```text
configs/distill_train.json
```

student 输出：

```text
outputs/distilled_student/
```

完整流程：

```text
questions_sample.jsonl
  -> teacher API
  -> generated_teacher_answers.jsonl
  -> LoRA / QLoRA SFT
  -> distilled_student adapter
```

## 8.5 先说明运行前提

本章分两段。

第一段：生成 teacher 回答。

需要一个 OpenAI 兼容接口：

```text
http://localhost:8000/v1
```

配置里默认 teacher 是：

```text
Qwen/Qwen2.5-7B-Instruct
```

这意味着你需要先有一个本地或远程模型服务。

例如后续第 11 章会讲 vLLM 服务。

第二段：训练 student。

默认配置使用：

```text
Qwen/Qwen2.5-0.5B-Instruct
```

并且走 QLoRA：

```json
"load_in_4bit": true
```

所以 student 训练也需要合适的 GPU 环境。

如果你当前没有 teacher 服务或 GPU，本章仍然可以先读懂配置和脚本，不建议硬跑。

## 8.6 第一步：查看蒸馏问题集

打开：

```bash
sed -n '1,20p' data/distill/questions_sample.jsonl
```

内容类似：

```json
{"question":"客户要求更改收货地址，系统里应该怎么处理？"}
{"question":"订单显示待揽收超过 48 小时，客服应该如何回复？"}
{"question":"用户要求开具企业发票，需要收集哪些信息？"}
```

这些问题应该覆盖你希望 student 学会的业务场景。

问题集质量很重要。

如果问题集太窄，student 只会学到很小范围的能力。

如果问题集包含错误或无意义问题，teacher 生成的答案也会被污染。

## 8.7 第二步：查看 teacher 生成配置

打开：

```text
configs/distill_generate.json
```

内容如下：

```json
{
  "input_file": "data/distill/questions_sample.jsonl",
  "output_file": "outputs/distill/generated_teacher_answers.jsonl",
  "model": "Qwen/Qwen2.5-7B-Instruct",
  "base_url": "http://localhost:8000/v1",
  "api_key": "dev-token",
  "system_prompt": "你是企业知识助手，请回答准确、简洁、可执行。",
  "temperature": 0.2,
  "max_tokens": 256
}
```

字段含义：

```text
input_file：问题输入文件
output_file：teacher 回答输出文件
model：teacher 模型名
base_url：OpenAI 兼容服务地址
api_key：API key，本地开发可用占位 token
system_prompt：teacher 回答时使用的系统提示
temperature：回答随机性
max_tokens：teacher 最多生成多少 token
```

`temperature` 设置为 `0.2`，是为了让 teacher 回答更稳定。

蒸馏数据通常不希望太随机。

## 8.8 第三步：理解生成脚本入口

本章生成脚本是：

```text
scripts/distill_generate.py
```

入口参数：

```python
def parse_args():
    parser = argparse.ArgumentParser(description="Generate distillation data from a teacher model.")
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    parser.add_argument("--limit", type=int, default=None, help="Optional maximum number of rows.")
    return parser.parse_args()
```

`--limit` 很实用。

第一次调试 teacher 服务时，可以只生成 1 条：

```bash
python3 scripts/distill_generate.py --config configs/distill_generate.json --limit 1
```

这样可以避免配置错误时批量浪费调用成本。

## 8.9 第四步：构造 teacher messages

脚本中：

```python
def build_messages(system_prompt: str | None, question: str):
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": question})
    return messages
```

它会把问题变成 OpenAI 兼容聊天格式：

```json
[
  {
    "role": "system",
    "content": "你是企业知识助手，请回答准确、简洁、可执行。"
  },
  {
    "role": "user",
    "content": "订单显示待揽收超过 48 小时，客服应该如何回复？"
  }
]
```

这和前面章节的 `messages` 思想一致。

区别是：

```text
这里 messages 是发给 teacher 服务的请求
第 3 / 6 章 messages 是训练样本格式
```

## 8.10 第五步：调用 OpenAI 兼容接口

脚本创建客户端：

```python
from openai import OpenAI

client = OpenAI(base_url=config["base_url"], api_key=config["api_key"])
```

然后逐条调用：

```python
response = client.chat.completions.create(
    model=config["model"],
    messages=build_messages(config.get("system_prompt"), question),
    temperature=config.get("temperature", 0.2),
    max_tokens=config.get("max_tokens", 256),
)
answer = response.choices[0].message.content.strip()
```

这要求 `base_url` 后面有一个可用服务。

如果本地没有服务，会连接失败。

这不是脚本错误，而是 teacher 服务没启动。

## 8.11 第六步：保存蒸馏数据

每条输出会保存：

```python
{
    "question": question,
    "answer": answer,
    "system_prompt": config.get("system_prompt", ""),
    "teacher_model": config["model"],
}
```

最终写入：

```text
outputs/distill/generated_teacher_answers.jsonl
```

每一行类似：

```json
{
  "question": "用户要求开具企业发票，需要收集哪些信息？",
  "answer": "需要收集订单号、发票抬头、税号、发票类型和接收邮箱等信息。",
  "system_prompt": "你是企业知识助手，请回答准确、简洁、可执行。",
  "teacher_model": "Qwen/Qwen2.5-7B-Instruct"
}
```

这个格式可以被后续 `distill_train.py` 读取。

## 8.12 第七步：运行 teacher 生成

先用 limit 测试：

```bash
python3 scripts/distill_generate.py --config configs/distill_generate.json --limit 1
```

确认服务可用后，再生成完整数据：

```bash
make distill-generate
```

或：

```bash
python3 scripts/distill_generate.py --config configs/distill_generate.json
```

成功后会看到：

```text
[1/3] generated
[2/3] generated
[3/3] generated
Generated distillation data saved to outputs/distill/generated_teacher_answers.jsonl
```

如果失败，优先检查：

- teacher 服务是否启动
- `base_url` 是否正确
- `model` 名称是否和服务端一致
- API key 是否被服务端接受
- 网络是否可达

## 8.13 第八步：人工检查 teacher 回答

生成后先不要立刻训练。

先查看：

```bash
sed -n '1,20p' outputs/distill/generated_teacher_answers.jsonl
```

重点检查：

- 是否答非所问
- 是否编造业务规则
- 是否过长
- 是否不够可执行
- 是否包含敏感信息
- 是否风格和业务要求一致

低质量 teacher 回答不能直接训练 student。

否则蒸馏会把 teacher 的错误一起迁移给 student。

真实项目通常会加一个过滤环节：

```text
teacher answers
  -> 自动规则检查
  -> 模型辅助打分
  -> 人工抽检
  -> 合格蒸馏数据
```

本课程脚本保留最小实现，方便你看清流程。

## 8.14 第九步：查看 student 训练配置

打开：

```text
configs/distill_train.json
```

内容如下：

```json
{
  "model_name_or_path": "Qwen/Qwen2.5-0.5B-Instruct",
  "train_file": "outputs/distill/generated_teacher_answers.jsonl",
  "validation_split_ratio": 0.2,
  "output_dir": "outputs/distilled_student",
  "max_seq_length": 1024,
  "per_device_train_batch_size": 2,
  "gradient_accumulation_steps": 8,
  "learning_rate": 0.0001,
  "num_train_epochs": 3,
  "load_in_4bit": true,
  "lora_r": 16,
  "lora_alpha": 32,
  "lora_dropout": 0.05
}
```

可以看到，它和第 7 章的 QLoRA SFT 配置非常像。

区别主要是：

```text
train_file 来自 teacher 生成数据
output_dir 是 distilled_student
system_prompt 使用企业知识助手风格
```

## 8.15 第十步：理解 student 训练脚本

`scripts/distill_train.py` 很短：

```python
from common import ensure_dir, load_json
from training_utils import create_sft_trainer, load_chat_examples
```

主流程：

```python
config = load_json(args.config)
ensure_dir(config["output_dir"])

rows = load_chat_examples(config["train_file"])
trainer, tokenizer = create_sft_trainer(config, rows)

trainer.train()
trainer.save_model(config["output_dir"])
tokenizer.save_pretrained(config["output_dir"])
```

它复用的是第 7 章同一套 LoRA / QLoRA SFT 工具。

为什么蒸馏训练也可以用 SFT？

因为 response distillation 最终得到的仍然是：

```text
question -> answer
```

这和监督微调的训练形式一致。

## 8.16 第十一步：运行 student 训练

确认蒸馏数据存在：

```bash
test -f outputs/distill/generated_teacher_answers.jsonl
```

然后运行：

```bash
make distill-train
```

或：

```bash
python3 scripts/distill_train.py --config configs/distill_train.json
```

成功后输出：

```text
Distillation training finished. Artifacts saved to outputs/distilled_student
```

注意：默认 student 训练使用 QLoRA。

如果没有 GPU 或 `bitsandbytes`，这一步可能不能在本机运行。

## 8.17 第十二步：检查 student 输出

查看：

```bash
find outputs/distilled_student -maxdepth 1 -type f -print
```

你通常会看到 adapter 相关文件：

```text
adapter_config.json
adapter_model.safetensors
tokenizer.json
tokenizer_config.json
special_tokens_map.json
```

具体文件名可能随版本略有差异。

重点是：

```text
student adapter 是否生成
tokenizer 是否保存
训练是否正常结束
```

## 8.18 蒸馏后应该评测什么

蒸馏不是只看 student 会不会回答。

至少比较三类指标。

第一，质量：

```text
teacher 回答质量
student 回答质量
人工标准答案或业务规则符合度
```

第二，效率：

```text
平均延迟
吞吐
显存占用
部署成本
单次调用成本
```

第三，失败类型：

```text
是否遗漏关键信息
是否编造
是否答非所问
是否风格不一致
是否在长尾问题上退化明显
```

理想情况不是 student 每题都和 teacher 字面一致。

而是：

```text
在业务关键指标上接近 teacher，同时显著降低成本。
```

## 8.19 常见数据问题

### 8.19.1 teacher 回答质量不稳定

如果 teacher 回答本身不稳定，student 会学习这种不稳定。

降低 `temperature` 可以让输出更稳定。

本章配置使用：

```json
"temperature": 0.2
```

### 8.19.2 问题集覆盖不足

如果问题集只有发票问题，student 就学不到物流、退款、售后等场景。

蒸馏问题集应该覆盖真实业务分布。

### 8.19.3 不过滤低质量回答

这是蒸馏最常见问题。

teacher 也会犯错。

不能因为答案来自大模型，就默认它一定正确。

### 8.19.4 student 太小

如果 student 能力太弱，即使 teacher 数据很好，也可能学不到。

蒸馏不是魔法。

它通常是质量、成本、延迟之间的折中。

## 8.20 常见运行问题

### 8.20.1 teacher 服务连不上

现象可能是：

```text
Connection refused
```

检查：

- `base_url` 是否正确
- 本地服务是否启动
- 端口是否是 8000
- 服务是否支持 OpenAI chat completions 接口

### 8.20.2 model 名称不匹配

如果服务端加载的模型名和配置里的：

```text
Qwen/Qwen2.5-7B-Instruct
```

不一致，可能会报 model not found。

把配置里的 `model` 改成服务端实际模型名。

### 8.20.3 没有 generated_teacher_answers.jsonl

如果运行 student 训练时报找不到：

```text
outputs/distill/generated_teacher_answers.jsonl
```

说明 teacher 生成阶段还没成功。

先运行：

```bash
make distill-generate
```

### 8.20.4 student 训练缺 GPU

默认 `distill_train.json` 使用：

```json
"load_in_4bit": true
```

所以需要 QLoRA 环境。

如果当前机器没有 CUDA，先只读懂流程，或换到 GPU 机器运行。

## 8.21 本章练习

### 8.21.1 练习一：检查蒸馏问题集

打开：

```text
data/distill/questions_sample.jsonl
```

回答：

```text
问题覆盖了哪些业务场景？
是否有重复问题？
是否有表达不清的问题？
```

### 8.21.2 练习二：读懂 teacher 配置

打开：

```text
configs/distill_generate.json
```

回答：

```text
teacher model 是谁？
base_url 指向哪里？
temperature 为什么不宜太高？
output_file 会写到哪里？
```

### 8.21.3 练习三：只生成一条 teacher 回答

在 teacher 服务可用时运行：

```bash
python3 scripts/distill_generate.py --config configs/distill_generate.json --limit 1
```

然后查看输出文件。

如果没有 teacher 服务，本练习只需要读懂命令。

### 8.21.4 练习四：比较 student 训练和 QLoRA SFT

比较：

```text
configs/distill_train.json
configs/sft_qlora_16gb.json
```

回答：

```text
train_file 有什么不同？
output_dir 有什么不同？
system_prompt 有什么不同？
训练方法有什么相同？
```

## 8.22 本章验收标准

完成本章后，你应该能做到：

- 解释 teacher 和 student 的区别
- 解释 response distillation 的流程
- 区分 response distillation 和 logit distillation
- 读懂 `configs/distill_generate.json`
- 读懂 `scripts/distill_generate.py`
- 说明为什么 teacher 输出需要过滤
- 读懂 `configs/distill_train.json`
- 说明为什么 student 训练可以复用 SFT / QLoRA 工具
- 说明蒸馏后应该比较质量、延迟和成本

## 8.23 下一章衔接

本章讲了如何生成蒸馏数据并训练 student。

但是无论是：

```text
SFT 模型
LoRA adapter
蒸馏 student
```

都不能只看训练日志。

下一章会进入评测与过拟合分析。

我们要回答：

```text
模型回答到底好不好？
它是不是只背了训练样本？
哪些问题回答失败？
失败原因和训练数据有什么关系？
```

这也是从“能训练”走向“能判断质量”的关键一步。
