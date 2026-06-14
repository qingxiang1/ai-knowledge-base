# 02 第二章：环境与工程目录

学习时长：75 分钟

本章类型：环境检查 + 工程目录理解

本章产物：一份可读懂的本机环境检查结果，以及一条适合当前机器的学习路线

## 2.0 本章要完成什么

上一章我们已经看到了完整的大模型开发流水线：

```text
原始数据
  -> 数据清洗
  -> tokenizer 训练
  -> tiny 预训练
  -> SFT 微调
  -> 本地推理
  -> 评测报告
  -> 部署准备
```

第 00 章已经把 `scripts/env_check.py` 和 `make env-check` 接进了工程骨架；本章不再只是说明“有这个脚本”，而是系统讲清楚如何阅读检查结果，并据此选择 CPU 教学路线、GPU 微调路线或后续部署路线。

但是在真正开始跑脚本前，还必须先回答一个非常实际的问题：

```text
当前这台机器适合跑哪一段？
```

大模型开发对环境很敏感。Python 版本、PyTorch 版本、CUDA 是否可用、显存大小、`bitsandbytes` 是否能正常加载，都会影响你应该选择哪条学习路线。

本章会带你完成：

- 跑通 `make env-check`
- 看懂环境检查脚本输出的 JSON
- 判断当前机器是否有 CUDA GPU
- 知道 CPU、8GB GPU、16GB GPU、24GB GPU 分别适合跑什么
- 理解项目目录中每个目录的职责
- 理解为什么课程坚持使用配置文件驱动脚本
- 学会在没有 GPU 时继续学习，而不是卡在 QLoRA 上

完成本章后，你应该能明确说出：

```text
我当前应该先跑 make pipeline-local，还是可以跑 make sft-8gb / make sft-16gb / make sft-24gb。
```

## 2.1 为什么大模型课程要先检查环境

普通 Python 项目通常只要安装依赖就能运行。

大模型项目不一样。它至少会遇到三类环境差异。

第一类是 Python 依赖差异：

- `torch` 负责张量计算和模型训练
- `transformers` 负责模型、tokenizer 和生成接口
- `datasets` 负责读取和处理数据集
- `tokenizers` 负责训练和加载 tokenizer
- `accelerate` 负责设备分配和训练加速
- `peft` 负责 LoRA / QLoRA 参数高效微调
- `trl` 负责 SFTTrainer 等对齐训练工具
- `bitsandbytes` 负责常见的 4bit / 8bit 量化训练
- `vllm` 负责高吞吐部署推理

第二类是硬件差异：

- 只有 CPU
- 有 Apple Silicon，但是没有 CUDA
- 有 NVIDIA GPU，但显存较小
- 有 NVIDIA GPU，且显存足够
- 云服务器有多张 GPU

第三类是系统差异：

- macOS 上不能直接使用 CUDA
- Windows、Linux 的安装方式不同
- `bitsandbytes` 对平台和 CUDA 版本有要求
- `vllm` 通常更适合 Linux GPU 环境

所以本课程不会一上来就要求你跑完整 QLoRA，而是先通过环境检查决定路线。

```text
先检查环境
  -> 再选择命令
  -> 再开始训练
```

这比盲目安装和报错排查更适合初学者。

## 2.2 第一步：确认你在项目根目录

后续命令都默认在项目根目录执行。

你可以先查看当前目录：

```bash
pwd
```

然后查看项目文件：

```bash
ls
```

你应该能看到类似结构：

```text
.
├── configs/
├── data/
├── docs/
├── outputs/
├── scripts/
├── Makefile
├── README.md
└── requirements.txt
```

如果你看不到 `Makefile` 或 `scripts/`，通常说明你不在项目根目录。

这时先切换到正确目录，再继续：

```bash
cd /path/to/your/project
```

### 2.2.1 为什么必须在项目根目录运行

本课程中的配置路径都是相对项目根目录写的。

例如 `configs/prepare_sft_data.json` 里可能会写：

```json
{
  "input_file": "data/raw/customer_support_raw.jsonl",
  "output_file": "data/sft/customer_support_prepared.jsonl"
}
```

脚本会从当前工作目录解析这些相对路径。

如果你在别的目录执行命令，就可能遇到：

```text
FileNotFoundError: data/raw/customer_support_raw.jsonl
```

这不是数据真的不存在，而是命令运行位置不对。

## 2.3 第二步：准备 Python 环境

推荐使用虚拟环境隔离本课程依赖。

创建虚拟环境：

```bash
python3 -m venv .venv
```

激活虚拟环境：

```bash
source .venv/bin/activate
```

确认当前 Python：

```bash
which python
python --version
```

安装依赖：

```bash
make install
```

`make install` 实际会执行：

```bash
pip install -r requirements.txt
```

课程的 `requirements.txt` 包含：

```text
torch
transformers
datasets
tokenizers
accelerate
peft
trl
openai
safetensors
sentencepiece
lm-eval
bitsandbytes; platform_system == "Linux"
```

注意最后一行：

```text
bitsandbytes; platform_system == "Linux"
```

这表示 `bitsandbytes` 主要按 Linux 环境安装。它常用于 QLoRA 的 4bit 训练，但不是 CPU 教学路线的必要条件。

如果你在 macOS 上看到 `bitsandbytes` 缺失，不要慌。你仍然可以继续跑本课程的 CPU 本地流水线。

## 2.4 第三步：运行环境检查

执行：

```bash
make env-check
```

这条命令会调用：

```bash
python3 scripts/env_check.py
```

环境检查脚本会输出一段 JSON。

它不会只告诉你“能不能跑”，而是把关键环境信息都列出来，方便你判断下一步该跑哪条路线。

输出结构大致如下：

```json
{
  "python_version": "3.11.8",
  "platform": "macOS-...",
  "cwd": "/path/to/project",
  "packages": {
    "transformers": "4.x.x",
    "datasets": "2.x.x",
    "tokenizers": "0.x.x",
    "accelerate": "0.x.x",
    "peft": "0.x.x",
    "trl": "0.x.x",
    "openai": "1.x.x",
    "bitsandbytes": "missing (...)",
    "vllm": "missing (...)"
  },
  "torch": {
    "torch_version": "2.x.x",
    "cuda_available": false,
    "cuda_device_count": 0,
    "devices": []
  },
  "nvidia_smi": "nvidia-smi not found",
  "recommended_sft_config": "configs/sft_qlora_cpu_debug.json",
  "notes": [
    "当前未检测到可用 CUDA GPU，建议先用 configs/sft_qlora_cpu_debug.json 或仅跑 smoke test。"
  ]
}
```

不同机器上的版本号和平台信息会不同，这是正常的。

你需要重点看四个字段：

- `packages`
- `torch.cuda_available`
- `torch.devices`
- `recommended_sft_config`

## 2.5 第四步：看懂依赖检查结果

`packages` 里每个字段代表一个 Python 包是否能成功导入。

例如：

```json
{
  "transformers": "4.40.0",
  "datasets": "2.19.0",
  "trl": "missing (ModuleNotFoundError)",
  "bitsandbytes": "missing (ModuleNotFoundError)"
}
```

这说明：

- `transformers` 已安装
- `datasets` 已安装
- `trl` 没安装或当前环境不可见
- `bitsandbytes` 没安装或当前平台不可用

如果 `trl` 缺失：

```text
完整 SFTTrainer 路线不能跑。
```

但你仍然可以跑：

```bash
make sft-minimal
```

因为 `scripts/sft_train_minimal.py` 是教学型 CPU 微调脚本，不依赖完整的 TRL 训练栈。

如果 `bitsandbytes` 缺失：

```text
常见 QLoRA 4bit 微调可能不能跑。
```

但你仍然可以跑：

```bash
make pipeline-local
```

因为本地教学流水线不要求 4bit QLoRA。

如果 `vllm` 缺失：

```text
第 11 章的 vLLM 部署阶段需要补装或换到合适的 Linux GPU 环境。
```

这不会影响前面章节的数据清洗、tokenizer、tiny 预训练、最小 SFT 和评测。

## 2.6 第五步：看懂 CUDA 和显存信息

环境检查中的 `torch` 字段最关键。

如果你看到：

```json
{
  "cuda_available": false,
  "cuda_device_count": 0,
  "devices": []
}
```

说明当前 PyTorch 没有检测到可用 CUDA GPU。

这通常出现在：

- macOS 本地
- 普通 CPU 服务器
- 没有 NVIDIA GPU 的电脑
- NVIDIA 驱动或 CUDA 环境没有配置好
- 安装了 CPU 版 PyTorch

这种情况下，优先走 CPU 教学路线：

```bash
make pipeline-local
```

如果你看到：

```json
{
  "cuda_available": true,
  "cuda_device_count": 1,
  "devices": [
    {
      "index": 0,
      "name": "NVIDIA GeForce RTX 4090",
      "total_memory_gb": 24.0
    }
  ]
}
```

说明当前有可用 CUDA GPU。

这时可以根据显存选择 SFT 配置：

```text
显存小于 12GB：configs/sft_qlora_8gb.json
显存 12GB 到 24GB：configs/sft_qlora_16gb.json
显存 24GB 及以上：configs/sft_qlora_24gb.json
```

环境检查脚本会把推荐结果写在：

```json
{
  "recommended_sft_config": "configs/sft_qlora_24gb.json"
}
```

这个字段不是魔法，它只是根据 CUDA 是否可用和显存大小做保守推荐。

## 2.7 第六步：选择你的学习路线

本课程按环境分成三条路线。

### 2.7.1 CPU 教学路线

适合：

- macOS 本地
- 没有 NVIDIA GPU 的机器
- 初学者第一次跑通流程
- 想先理解工程链路，而不是追求模型效果

推荐命令：

```bash
make pipeline-local
```

它会按顺序执行：

```text
prepare-sft
tokenizer-chat-demo
pretrain-chat-demo
sft-minimal
infer-minimal
retrieve-similar
report-eval-sample
```

也就是：

```text
清洗数据
  -> 训练教学 tokenizer
  -> 跑 tiny 预训练
  -> 跑最小 CPU SFT
  -> 本地推理
  -> 查看相似训练样本
  -> 生成样例评测报告
```

这条路线的目标是“理解完整流程”，不是训练出生产级模型。

### 2.7.2 单卡 GPU 学习路线

适合：

- 有 NVIDIA GPU
- 已经能正确运行 CUDA 版 PyTorch
- 想体验 LoRA / QLoRA 微调

根据显存选择：

```bash
make sft-8gb
```

或：

```bash
make sft-16gb
```

或：

```bash
make sft-24gb
```

这些命令底层分别使用：

```text
configs/sft_qlora_8gb.json
configs/sft_qlora_16gb.json
configs/sft_qlora_24gb.json
```

显存越大，可以承受的 batch、序列长度和模型规模通常越大。

但即使你有 GPU，也建议先跑一次：

```bash
make pipeline-local
```

因为它能验证数据、脚本、目录和评测链路是否完整。

### 2.7.3 部署路线

适合：

- 已经有微调或合并后的模型
- 有 Linux GPU 环境
- 想把模型作为服务启动

后续第 11 章会使用：

```bash
make serve-vllm MODEL=outputs/qwen25_cs_merged
```

当前阶段不需要急着跑它。

如果 `env-check` 里显示 `vllm` 缺失，也不会影响第二章到第十章的大部分学习。

## 2.8 第七步：看懂项目目录

本课程使用固定目录组织所有实验。

```text
.
├── configs/        # 配置文件：路径、模型名、训练参数、评测参数
├── data/           # 数据文件：原始数据、清洗数据、SFT 数据、评测数据
├── docs/course/    # 课程正文
├── outputs/        # 运行产物：模型、tokenizer、报告、中间结果
├── scripts/        # 可执行脚本：清洗、训练、推理、评测、部署
├── Makefile        # 常用命令入口
└── requirements.txt
```

这套结构服务于一个原则：

```text
配置决定实验，脚本执行逻辑，数据提供输入，outputs 保存结果。
```

### 2.8.1 `configs/`：实验从配置开始

`configs/` 保存所有实验参数。

例如：

```text
configs/prepare_sft_data.json
configs/train_tokenizer_chat_demo.json
configs/pretrain_chat_demo.json
configs/sft_minimal_cpu_local.json
configs/sft_qlora_8gb.json
configs/eval_business.json
```

同一个脚本可以配不同配置。

例如训练 tokenizer：

```bash
python scripts/train_tokenizer.py --config configs/train_tokenizer_chat_demo.json
```

如果以后你要换语料或输出目录，应该优先复制一份配置文件修改，而不是直接改脚本。

这样可以保留实验记录。

### 2.8.2 `data/`：只放输入数据和整理后的数据

`data/` 负责保存训练和评测用的数据。

常见子目录包括：

```text
data/raw/       # 原始数据
data/cleaned/   # 清洗后的普通文本
data/sft/       # SFT messages 格式数据
data/eval/      # 评测集
data/distill/   # 蒸馏相关数据
```

本课程第三章会重点处理：

```text
data/raw/customer_support_raw.jsonl
  -> data/sft/customer_support_prepared.jsonl
```

也就是把原始客服问答数据清洗成 SFT 格式。

### 2.8.3 `scripts/`：只写可复用逻辑

`scripts/` 保存所有可执行脚本。

例如：

```text
scripts/env_check.py
scripts/prepare_sft_data.py
scripts/train_tokenizer.py
scripts/pretrain.py
scripts/sft_train.py
scripts/sft_train_minimal.py
scripts/infer_minimal.py
scripts/generate_eval_report.py
```

脚本应该尽量做到：

- 通过 `--config` 接收配置
- 不把输入输出路径写死
- 输出清晰日志
- 保存必要产物
- 能被 `Makefile` 调用

这样后续你才能把一次实验变成可重复运行的流程。

### 2.8.4 `outputs/`：保存运行结果

`outputs/` 是脚本运行后的产物目录。

例如：

```text
outputs/tokenizer_chat_demo/
outputs/pretrain_chat_demo/
outputs/sft_minimal_cpu_local/
outputs/eval/customer_report.sample.md
```

它和 `data/` 的区别是：

```text
data/ 是输入和整理后的数据。
outputs/ 是脚本运行产生的结果。
```

不要把模型输出、评测报告、临时日志都塞进 `data/`。

后续排查问题时，你需要能快速判断一个文件到底是“输入数据”还是“运行结果”。

### 2.8.5 `Makefile`：把长命令变成短命令

`Makefile` 是课程的命令入口。

例如你可以运行：

```bash
make env-check
```

而不用每次手写：

```bash
python3 scripts/env_check.py
```

你也可以运行：

```bash
make prepare-sft
```

它对应：

```bash
python3 scripts/prepare_sft_data.py --config configs/prepare_sft_data.json
```

这种设计有两个好处：

- 新手不用记很长的命令
- 高级用户仍然可以打开 `Makefile` 查看真实执行内容

## 2.9 第八步：理解环境检查脚本做了什么

本章使用的脚本是：

```text
scripts/env_check.py
```

它主要做四件事。

第一，检查 Python 包能否导入：

```python
def import_version(module_name: str) -> str:
    try:
        module = importlib.import_module(module_name)
    except Exception as exc:
        return f"missing ({exc.__class__.__name__})"
    return getattr(module, "__version__", "unknown")
```

这段代码不会因为某个依赖缺失就直接崩掉，而是返回可读状态。

例如：

```text
missing (ModuleNotFoundError)
```

这对环境排查很有用。

第二，检查 PyTorch 和 CUDA：

```python
def check_torch() -> dict:
    info = {
        "torch_version": "missing",
        "cuda_available": False,
        "cuda_device_count": 0,
        "devices": [],
    }
    try:
        import torch

        info["torch_version"] = torch.__version__
        info["cuda_available"] = torch.cuda.is_available()
        if torch.cuda.is_available():
            info["cuda_device_count"] = torch.cuda.device_count()
            for idx in range(torch.cuda.device_count()):
                props = torch.cuda.get_device_properties(idx)
                info["devices"].append(
                    {
                        "index": idx,
                        "name": props.name,
                        "total_memory_gb": round(props.total_memory / 1024**3, 2),
                    }
                )
    except Exception as exc:
        info["torch_version"] = f"error ({exc.__class__.__name__})"
    return info
```

你不需要一开始就理解所有 PyTorch API。

先记住一个判断：

```python
torch.cuda.is_available()
```

它是决定能不能跑 CUDA 路线的关键。

第三，尝试调用 `nvidia-smi`：

```python
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
```

`nvidia-smi` 是 NVIDIA 驱动提供的命令行工具。

如果机器没有 NVIDIA GPU，或者驱动没装好，通常会显示：

```text
nvidia-smi not found
```

这在 macOS 上很正常。

第四，根据显存推荐配置：

```python
def recommended_sft_config(torch_info: dict) -> str:
    if not torch_info["cuda_available"] or not torch_info["devices"]:
        return "configs/sft_qlora_cpu_debug.json"

    max_memory = max(device["total_memory_gb"] for device in torch_info["devices"])
    if max_memory < 12:
        return "configs/sft_qlora_8gb.json"
    if max_memory < 24:
        return "configs/sft_qlora_16gb.json"
    return "configs/sft_qlora_24gb.json"
```

这段逻辑体现了本课程的环境策略：

```text
没有 CUDA：先走 CPU debug 路线
小显存 GPU：用更保守的 QLoRA 配置
大显存 GPU：可以使用更完整的配置
```

## 2.10 第九步：跑一条本地流水线

环境检查通过后，建议第一次运行：

```bash
make pipeline-local
```

这条命令会串起本地教学流程。

它的重点不是性能，而是验证下面这些东西是否打通：

- 原始数据能否被读取
- SFT 数据能否被生成
- tokenizer 能否训练
- tiny 模型能否预训练
- 最小 SFT 能否运行
- 推理脚本能否生成回答
- 相似样本检索能否工作
- 评测报告能否写入 `outputs/`

如果它成功运行，你应该能看到一些新文件或目录：

```text
data/sft/customer_support_prepared.jsonl
outputs/data_prep/prepare_sft_summary.json
outputs/tokenizer_chat_demo/
outputs/pretrain_chat_demo/
outputs/sft_minimal_cpu_local/
outputs/eval/customer_report.sample.md
```

这些产物会在后续章节继续使用。

### 2.10.1 如果 `pipeline-local` 运行很慢

CPU 训练一定会比 GPU 慢。

本课程里的本地路线已经尽量压小模型规模和数据规模，但不同机器仍然会有明显差异。

如果你只是想快速确认脚本是否能启动，可以先跑：

```bash
make smoke
```

`smoke` 只跑 tokenizer 和 tiny pretrain 的最小路径。

如果你想只验证数据清洗，可以跑：

```bash
make prepare-sft
```

学大模型工程时，不必每次都从头跑完整流水线。

你可以按阶段验证：

```text
数据阶段有问题：只跑 prepare-sft
tokenizer 有问题：只跑 tokenizer-chat-demo
预训练有问题：只跑 pretrain-chat-demo
SFT 有问题：只跑 sft-minimal
推理有问题：只跑 infer-minimal
```

## 2.11 常见环境场景

### 2.11.1 macOS 本地

常见现象：

```text
cuda_available: false
nvidia-smi not found
bitsandbytes: missing
vllm: missing
```

推荐路线：

```bash
make pipeline-local
```

不要在 macOS 本地纠结 CUDA QLoRA。

macOS 可以很好地完成：

- 数据清洗
- tokenizer 教学训练
- tiny 预训练
- 最小 SFT
- 本地推理
- 相似样本检索
- 评测报告生成

真正需要 CUDA 的 LoRA / QLoRA，可以后续放到 Linux GPU 机器上跑。

### 2.11.2 Linux CPU 服务器

常见现象：

```text
cuda_available: false
platform: Linux-...
```

推荐路线：

```bash
make pipeline-local
```

如果只是 CPU 服务器，不建议直接跑生产规模微调。

你可以把它当成数据处理和流程验证环境。

### 2.11.3 Linux NVIDIA GPU 服务器

常见现象：

```text
cuda_available: true
cuda_device_count: 1
devices: [...]
```

推荐先跑：

```bash
make env-check
make pipeline-local
```

确认基础流程没问题后，再根据推荐配置跑：

```bash
make sft-8gb
```

或：

```bash
make sft-16gb
```

或：

```bash
make sft-24gb
```

如果 `bitsandbytes` 缺失，先不要急着改训练脚本。

优先确认：

- 是否在 Linux 环境
- 是否安装了匹配 CUDA 的 PyTorch
- 当前虚拟环境是否就是运行 `make env-check` 的环境
- `pip install -r requirements.txt` 是否成功完成

## 2.12 常见错误与排查方式

### 2.12.1 没激活虚拟环境

现象：

```text
ModuleNotFoundError: No module named 'transformers'
```

排查：

```bash
which python
which pip
```

如果没有指向项目里的 `.venv`，先激活：

```bash
source .venv/bin/activate
```

再安装：

```bash
make install
```

### 2.12.2 在错误目录运行命令

现象：

```text
No such file or directory: configs/prepare_sft_data.json
```

排查：

```bash
pwd
ls
```

确认当前目录能看到：

```text
configs
scripts
Makefile
```

### 2.12.3 把 CUDA 和 GPU 混为一谈

有独立显卡不等于 PyTorch 能用 CUDA。

课程中真正关心的是：

```json
{
  "cuda_available": true
}
```

如果这里是 `false`，那当前 Python 环境就不适合跑 CUDA 训练。

### 2.12.4 在 CPU 环境强行跑 QLoRA

现象可能包括：

- 训练极慢
- `bitsandbytes` 报错
- CUDA 相关错误
- 显存或内存不足

如果 `env-check` 推荐：

```text
configs/sft_qlora_cpu_debug.json
```

就先跑：

```bash
make pipeline-local
```

或者：

```bash
make sft-minimal
```

不要把第 7 章的 QLoRA 当成第二章必须完成的事情。

### 2.12.5 只看报错，不看输出产物

大模型脚本通常会产生多个中间文件。

例如数据清洗不只产生 SFT 文件，还会产生：

```text
outputs/data_prep/customer_support_rejected.jsonl
outputs/data_prep/prepare_sft_summary.json
```

如果命令运行后结果不符合预期，不要只看控制台最后一行。

还要检查：

- 输出目录是否生成
- JSONL 行数是否合理
- summary 统计是否符合预期
- rejected 文件里是否有大量本该保留的样本

这些排查习惯会在第三章继续使用。

## 2.13 本章验收

完成本章后，请确认你能做到下面几件事。

第一，能运行：

```bash
make env-check
```

第二，能从输出中找到：

```text
python_version
packages
torch.cuda_available
torch.devices
recommended_sft_config
notes
```

第三，能判断当前机器适合哪条路线：

```text
CPU / macOS：make pipeline-local
8GB 左右 NVIDIA GPU：make sft-8gb
16GB 左右 NVIDIA GPU：make sft-16gb
24GB 及以上 NVIDIA GPU：make sft-24gb
```

第四，能解释这些目录的职责：

```text
configs/：实验配置
data/：输入数据和整理后的数据
scripts/：可执行逻辑
outputs/：运行产物
docs/course/：课程文档
```

第五，能说明为什么本课程不建议一开始就在 CPU 或 macOS 上强行跑 QLoRA。

## 2.14 下一章衔接

环境和目录确认后，下一章会进入数据工程。

我们会从：

```text
data/raw/customer_support_raw.jsonl
```

开始，把原始客服问答清洗成：

```text
data/sft/customer_support_prepared.jsonl
```

也就是模型可以学习的 `messages` 格式。

如果说第二章解决的是：

```text
这台机器适合怎么跑？
```

那么第三章解决的是：

```text
什么样的数据值得让模型学习？
```
