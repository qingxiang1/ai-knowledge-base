# 07 第七章：LoRA / QLoRA 微调实战

学习时长：120 分钟

本章类型：GPU 参数高效微调 + 配置选择

本章产物：一个 LoRA adapter 目录，以及可选的 merged model 目录

## 7.0 本章要完成什么

上一章我们用 CPU 跑通了最小 SFT。

那条路线的重点是理解：

```text
prompt
assistant answer
label mask
assistant-only loss
```

但真实项目里，你通常不会从零训练一个 tiny 模型，也不会在 CPU 上全量微调大模型。

更常见的路线是：

```text
选择一个开源基座模型
  -> 准备高质量 SFT 数据
  -> 使用 LoRA / QLoRA 做参数高效微调
  -> 保存 adapter
  -> 可选合并为 merged model
  -> 评测和部署
```

本章会围绕 `Qwen/Qwen2.5-0.5B-Instruct` 的教学配置，讲清楚：

- LoRA 为什么省显存
- QLoRA 为什么更省显存
- 为什么 QLoRA 需要 NVIDIA CUDA 和 `bitsandbytes`
- 如何根据显存选择 `8gb`、`16gb`、`24gb` 配置
- `scripts/sft_train.py` 如何复用 SFT 训练工具
- LoRA adapter 和 merged model 有什么区别
- 为什么训练完 adapter 后还要评测和合并
- 在没有 CUDA 的机器上应该怎么学习本章

完成本章后，你应该能回答：

```text
我当前机器能不能跑 QLoRA？
如果能跑，应该选择哪份配置？
训练输出的是 adapter 还是完整模型？
部署前为什么常常需要 merge？
```

## 7.1 先说清楚：本章不是 CPU 路线

第 6 章的 `make sft-minimal` 是 CPU 教学路线。

本章的 `make sft-8gb`、`make sft-16gb`、`make sft-24gb` 是 GPU 微调路线。

它们依赖的条件不同。

CPU 教学路线需要：

```text
torch
transformers
datasets
一个 tiny 本地模型
```

QLoRA 路线通常需要：

```text
Linux
NVIDIA GPU
CUDA 可用
CUDA 版 PyTorch
transformers
datasets
peft
trl
bitsandbytes
```

如果你在 macOS 或普通 CPU 环境上学习本章，不建议强行运行 QLoRA。

你可以先做到：

```text
读懂配置
读懂脚本
知道如何选择显存档位
知道 adapter 和 merged model 的关系
```

真正运行可以放到 Linux NVIDIA GPU 机器上。

## 7.2 LoRA 的核心思想

全量微调会更新模型的大部分或全部参数。

对于大模型来说，这会带来几个问题：

- 显存占用高
- 训练成本高
- 保存一个完整模型很大
- 多个业务版本管理困难

LoRA 的思路是：

```text
冻结原始基座模型参数
只在部分线性层旁边训练小的低秩 adapter
```

可以简单理解为：

```text
原模型保持不动
训练一小组可插拔参数
```

这样做的好处是：

```text
训练参数少
显存占用低
adapter 文件小
不同业务可以保存不同 adapter
```

LoRA 不是把模型变小，而是让训练时需要更新的参数变少。

## 7.3 QLoRA 的核心思想

QLoRA 比 LoRA 更进一步。

它会把基座模型用 4bit 量化方式加载：

```text
base model -> 4bit quantized base model
```

然后仍然训练 LoRA adapter。

可以理解成：

```text
基座模型以更省显存的形式放进 GPU
训练时只更新 LoRA adapter
```

这就是为什么 QLoRA 适合显存有限的 GPU。

但是 4bit 加载通常依赖：

```text
bitsandbytes
CUDA
合适的 NVIDIA GPU 环境
```

如果没有 CUDA，`bitsandbytes` 4bit 路线通常不能正常工作。

这也是第 2 章反复强调环境检查的原因。

## 7.4 adapter 和 merged model 的区别

LoRA / QLoRA 训练完成后，输出目录通常保存的是 adapter。

adapter 不是完整模型。

它需要和原始基座模型一起使用：

```text
base model + adapter -> 微调后的行为
```

merged model 是把 adapter 合并回基座模型后的结果：

```text
base model + adapter -> merge -> merged model
```

两者区别：

```text
adapter：体积小，适合保存多个业务版本
merged model：体积大，部署时通常更方便
```

本课程的合并脚本是：

```text
scripts/merge_lora.py
```

配置文件是：

```text
configs/merge_lora.json
```

合并输出目录是：

```text
outputs/qwen25_cs_merged
```

## 7.5 本章输入和输出

输入模型：

```text
Qwen/Qwen2.5-0.5B-Instruct
```

输入数据：

```text
data/sft/customer_support_sample.jsonl
```

训练脚本：

```text
scripts/sft_train.py
```

显存配置：

```text
configs/sft_qlora_8gb.json
configs/sft_qlora_16gb.json
configs/sft_qlora_24gb.json
```

输出目录：

```text
outputs/sft_qwen25_8gb/
outputs/sft_qwen25_16gb/
outputs/sft_qwen25_24gb/
```

可选合并脚本：

```text
scripts/merge_lora.py
```

可选合并输出：

```text
outputs/qwen25_cs_merged/
```

## 7.6 第一步：先检查环境

运行：

```bash
make env-check
```

重点看：

```text
torch.cuda_available
torch.devices
packages.trl
packages.peft
packages.bitsandbytes
recommended_sft_config
```

如果输出显示：

```json
{
  "cuda_available": false
}
```

就不要在当前机器强行跑 QLoRA。

如果输出显示有 CUDA GPU，并且显存足够，就根据推荐配置继续。

第 2 章的推荐规则是：

```text
显存小于 12GB：configs/sft_qlora_8gb.json
显存 12GB 到 24GB：configs/sft_qlora_16gb.json
显存 24GB 及以上：configs/sft_qlora_24gb.json
```

## 7.7 第二步：选择显存配置

8GB 配置：

```bash
make sft-8gb
```

对应：

```text
configs/sft_qlora_8gb.json
```

16GB 配置：

```bash
make sft-16gb
```

对应：

```text
configs/sft_qlora_16gb.json
```

24GB 配置：

```bash
make sft-24gb
```

对应：

```text
configs/sft_qlora_24gb.json
```

显存越小，配置越保守。

主要差异通常在：

```text
max_seq_length
per_device_train_batch_size
gradient_accumulation_steps
lora_r
```

8GB 配置更保守：

```json
{
  "max_seq_length": 512,
  "per_device_train_batch_size": 1,
  "gradient_accumulation_steps": 16,
  "lora_r": 8
}
```

24GB 配置更宽松：

```json
{
  "max_seq_length": 1536,
  "per_device_train_batch_size": 4,
  "gradient_accumulation_steps": 4,
  "lora_r": 16
}
```

如果显存不够，优先降低：

```text
max_seq_length
per_device_train_batch_size
```

不要只盯着 batch size。

长上下文的显存开销也很明显。

## 7.8 第三步：查看 QLoRA 配置

以 16GB 配置为例：

```text
configs/sft_qlora_16gb.json
```

核心内容如下：

```json
{
  "model_name_or_path": "Qwen/Qwen2.5-0.5B-Instruct",
  "train_file": "data/sft/customer_support_sample.jsonl",
  "output_dir": "outputs/sft_qwen25_16gb",
  "max_seq_length": 1024,
  "per_device_train_batch_size": 2,
  "gradient_accumulation_steps": 8,
  "learning_rate": 0.0001,
  "num_train_epochs": 3,
  "load_in_4bit": true,
  "bf16": true,
  "gradient_checkpointing": true,
  "lora_r": 16,
  "lora_alpha": 32,
  "lora_dropout": 0.05,
  "target_modules": [
    "q_proj",
    "k_proj",
    "v_proj",
    "o_proj",
    "up_proj",
    "down_proj",
    "gate_proj"
  ]
}
```

关键字段解释：

```text
model_name_or_path：基座模型
train_file：SFT 数据
output_dir：adapter 输出目录
max_seq_length：最大序列长度
load_in_4bit：是否 4bit 加载基座模型
bf16：是否使用 bfloat16 训练
gradient_checkpointing：是否用计算换显存
lora_r：LoRA 秩
lora_alpha：LoRA 缩放系数
lora_dropout：LoRA dropout
target_modules：在哪些模块上挂 LoRA
```

## 7.9 target_modules 为什么这么写

配置里：

```json
"target_modules": [
  "q_proj",
  "k_proj",
  "v_proj",
  "o_proj",
  "up_proj",
  "down_proj",
  "gate_proj"
]
```

这些名字对应 Transformer 中常见线性层。

注意力部分：

```text
q_proj
k_proj
v_proj
o_proj
```

前馈网络部分：

```text
up_proj
down_proj
gate_proj
```

LoRA 会在这些模块上训练 adapter。

不同模型的模块命名可能不同。

如果你换成别的基座模型，需要检查它的模块名，不要盲目复制 Qwen 的配置。

## 7.10 第四步：理解训练脚本

本章脚本很短：

```python
from __future__ import annotations

import argparse

from common import ensure_dir, load_json
from training_utils import create_sft_trainer, load_chat_examples
```

入口：

```python
def main():
    args = parse_args()
    config = load_json(args.config)
    ensure_dir(config["output_dir"])

    rows = load_chat_examples(config["train_file"])
    trainer, tokenizer = create_sft_trainer(config, rows)

    trainer.train()
    trainer.save_model(config["output_dir"])
    tokenizer.save_pretrained(config["output_dir"])
    print(f"SFT finished. Artifacts saved to {config['output_dir']}")
```

真正的 LoRA / QLoRA 逻辑在：

```text
scripts/training_utils.py
```

这样设计的好处是：

```text
sft_train.py 保持清晰
通用训练逻辑可以被 distill_train.py 复用
后续改 LoRA 配置时不用改入口脚本
```

## 7.11 第五步：理解 4bit 加载

`training_utils.py` 中有函数：

```python
def load_quantization_config(load_in_4bit: bool):
    if not load_in_4bit:
        return None

    import torch
    from transformers import BitsAndBytesConfig

    return BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
    )
```

如果配置里：

```json
"load_in_4bit": true
```

就会创建 `BitsAndBytesConfig`。

这就是 QLoRA 依赖 `bitsandbytes` 的地方。

如果配置里：

```json
"load_in_4bit": false
```

就不走 4bit 加载。

CPU debug 配置就是：

```json
"load_in_4bit": false
```

但它仍然不是推荐的真实训练路线，因为加载开源模型本身可能需要下载模型和较多内存。

## 7.12 第六步：创建 LoRA 配置

`training_utils.py` 中：

```python
def create_lora_config(config):
    from peft import LoraConfig

    return LoraConfig(
        r=config["lora_r"],
        lora_alpha=config["lora_alpha"],
        lora_dropout=config["lora_dropout"],
        target_modules=config["target_modules"],
        task_type="CAUSAL_LM",
    )
```

几个参数含义：

```text
r：低秩矩阵的秩，越大可训练参数越多
lora_alpha：缩放系数
lora_dropout：训练 adapter 时的 dropout
target_modules：挂载 LoRA 的模块
task_type：任务类型，这里是 causal LM
```

`r` 不是越大越好。

更大的 `r` 可能带来更强表达能力，也会增加训练参数和显存占用。

教学配置中：

```text
8GB：lora_r = 8
16GB / 24GB：lora_r = 16
```

## 7.13 第七步：创建 SFTTrainer

`create_sft_trainer` 会做几件事：

```text
加载模型和 tokenizer
把 messages 转成 text
切分训练集和验证集
创建 SFTConfig
创建 SFTTrainer
挂上 LoRA 配置
```

关键是：

```python
trainer = SFTTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    processing_class=tokenizer,
    peft_config=create_lora_config(config),
)
```

`peft_config` 就是让 SFTTrainer 使用 LoRA 的关键。

这条路线依赖 `trl` 和 `peft`。

如果缺少 `trl`，会出现：

```text
ModuleNotFoundError: No module named 'trl'
```

解决方式是安装依赖，并确认当前 Python 环境正确。

## 7.14 第八步：运行 QLoRA 训练

以 16GB 配置为例：

```bash
make sft-16gb
```

等价于：

```bash
python3 scripts/sft_train.py --config configs/sft_qlora_16gb.json
```

成功结束后会看到：

```text
SFT finished. Artifacts saved to outputs/sft_qwen25_16gb
```

输出目录通常包含 adapter 相关文件，例如：

```text
adapter_config.json
adapter_model.safetensors
tokenizer.json
tokenizer_config.json
special_tokens_map.json
```

具体文件可能随 `peft` 和 `transformers` 版本略有差异。

重点是确认：

```text
adapter 权重已保存
tokenizer 已保存
训练脚本正常结束
```

## 7.15 第九步：合并 LoRA adapter

训练完成后，可以合并：

```bash
make merge-lora
```

等价于：

```bash
python3 scripts/merge_lora.py --config configs/merge_lora.json
```

合并配置：

```json
{
  "base_model": "Qwen/Qwen2.5-0.5B-Instruct",
  "adapter_path": "outputs/sft_qwen25_cs",
  "output_dir": "outputs/qwen25_cs_merged",
  "torch_dtype": "bfloat16"
}
```

注意：如果你训练的是 16GB 配置，adapter 输出目录是：

```text
outputs/sft_qwen25_16gb
```

那就需要把 `adapter_path` 改成对应目录。

合并后的目录可用于后续 vLLM 部署。

## 7.16 第十步：评测 adapter 或 merged model

训练完成不代表模型可用。

至少要做：

```text
业务评测
相似训练样本检查
人工抽查
失败样本分析
延迟和成本评估
```

后续第 9 章会展开评测。

本章先记住一件事：

```text
QLoRA 训练成功只是起点，评测通过才有意义。
```

如果只是看到 loss 下降就认为模型变好，很容易误判。

## 7.17 常见显存问题

### 7.17.1 显存不够

常见报错是：

```text
CUDA out of memory
```

处理顺序建议：

```text
降低 max_seq_length
降低 per_device_train_batch_size
提高 gradient_accumulation_steps
使用更小的 lora_r
确认 load_in_4bit=true
开启 gradient_checkpointing
```

不要只改 batch size。

长序列对显存影响很明显。

### 7.17.2 没有 CUDA

如果报：

```text
No CUDA GPUs are available
```

回到第 2 章检查环境。

当前机器不适合跑 QLoRA 时，先继续 CPU 教学路线。

### 7.17.3 bitsandbytes 不可用

如果 `bitsandbytes` 安装失败或加载失败，优先确认：

- 是否是 Linux
- 是否有 NVIDIA GPU
- CUDA 版 PyTorch 是否可用
- CUDA / 驱动 / PyTorch 版本是否匹配
- 当前 Python 环境是否正确

macOS 本地不适合作为 QLoRA 运行环境。

## 7.18 常见训练问题

### 7.18.1 target_modules 写错

如果模块名不匹配，LoRA 可能挂不上。

换模型时要检查模型结构。

Qwen 的配置不能无脑套到所有模型。

### 7.18.2 数据太少

本课程样本很少，主要用于教学。

真实业务微调需要更多高质量数据和评测集。

不要用几条样本期待生产效果。

### 7.18.3 adapter 不等于完整模型

训练输出通常是 adapter。

部署时要么：

```text
加载 base model + adapter
```

要么：

```text
先 merge，再部署 merged model
```

不要把 adapter 目录误当成完整模型目录。

## 7.19 本章练习

### 7.19.1 练习一：读懂环境推荐

运行：

```bash
make env-check
```

回答：

```text
当前 CUDA 是否可用？
最大 GPU 显存是多少？
recommended_sft_config 是哪份？
是否安装了 bitsandbytes 和 trl？
```

### 7.19.2 练习二：比较三份 QLoRA 配置

打开：

```text
configs/sft_qlora_8gb.json
configs/sft_qlora_16gb.json
configs/sft_qlora_24gb.json
```

比较：

```text
max_seq_length
per_device_train_batch_size
gradient_accumulation_steps
lora_r
output_dir
```

说明为什么显存越小，配置越保守。

### 7.19.3 练习三：检查 merge 配置

打开：

```text
configs/merge_lora.json
```

回答：

```text
base_model 是谁？
adapter_path 指向哪里？
output_dir 会保存到哪里？
如果你跑的是 sft-16gb，adapter_path 应该怎么改？
```

### 7.19.4 练习四：在 GPU 机器上跑一次

如果你有合适 GPU，运行：

```bash
make sft-8gb
```

或：

```bash
make sft-16gb
```

确认输出目录中是否有 adapter 文件。

如果没有 GPU，本练习只需要读懂配置，不要求本地执行。

## 7.20 本章验收标准

完成本章后，你应该能做到：

- 解释 LoRA 为什么省显存
- 解释 QLoRA 为什么更省显存
- 说明为什么 QLoRA 通常需要 `bitsandbytes`
- 根据显存选择 8GB、16GB、24GB 配置
- 读懂 `load_in_4bit`、`lora_r`、`target_modules`
- 运行或解释 `make sft-8gb` / `make sft-16gb` / `make sft-24gb`
- 说明 adapter 和 merged model 的区别
- 说明为什么训练后必须评测

## 7.21 下一章衔接

本章讲的是：

```text
用少量 adapter 参数让开源模型学习业务数据。
```

下一章会进入蒸馏。

蒸馏的目标不是直接更新大模型，而是：

```text
让更强的 teacher 生成高质量答案
再用这些答案训练更小、更便宜的 student
```

如果说 LoRA / QLoRA 关注的是：

```text
如何低成本微调一个模型？
```

那么蒸馏关注的是：

```text
如何把更强模型的回答能力迁移给更小模型？
```
