# 00 序章：搭好你的大模型开发学习工作台

学习时长：45 分钟

本章类型：动手搭建 + 代码入门

本章产物：一个可以支撑后续章节的最小工程骨架

## 0.0 本章要完成什么

这一章不再只讲学习路线，而是先带你把后续课程要用到的工程骨架理解清楚。

你会逐步完成：

- 认识本课程的项目目录
- 理解为什么大模型项目要拆成 `configs/`、`data/`、`scripts/`、`outputs/`
- 实现一个最小公共工具模块 `scripts/common.py`
- 实现一个最小环境检查脚本 `scripts/env_check.py`
- 理解 `Makefile` 如何把脚本组织成可复用命令
- 建立后续章节统一使用的“配置驱动”开发方式

完成本章后，你应该能看懂后续章节中每个案例为什么都按下面这种结构组织：

```text
配置文件
  -> Python 脚本
  -> 输入数据
  -> 输出产物
  -> 验收检查
```

## 0.1 先理解课程项目的目录设计

本课程不是把所有代码都塞进一个 Python 文件，而是按真实项目习惯拆分目录。

你需要先认识这几个核心目录：

```text
.
├── configs/        # 保存配置文件，例如输入路径、输出路径、训练参数
├── data/           # 保存原始数据、清洗数据、SFT 数据、评测数据
├── docs/course/    # 保存逐章教程，也就是你正在看的内容
├── outputs/        # 保存脚本运行后的产物，例如模型、报告、中间结果
├── scripts/        # 保存可执行 Python 脚本
├── Makefile        # 保存常用命令入口
└── requirements.txt
```

为什么要这么拆？

因为大模型开发不是一次性脚本，而是一条会反复迭代的流水线。

如果不拆目录，新手很容易遇到这些问题：

- 数据、模型、日志混在一起，后面找不到文件
- 路径写死在代码里，换一个实验就要改很多地方
- 脚本之间无法复用，越写越乱
- 训练结果无法追踪，不知道哪个模型来自哪个配置

所以从第一章开始，本课程就统一采用这种工程结构：

```text
configs/ 控制实验
scripts/ 执行逻辑
data/ 提供输入
outputs/ 保存结果
docs/course/ 解释每一步怎么实现
```

## 0.2 第一步：确认项目目录存在

如果你是从零创建项目，可以先建立目录：

```bash
mkdir -p configs data/raw data/cleaned data/sft data/eval data/distill
mkdir -p scripts docs/course outputs
```

如果你已经在本课程仓库中，可以检查目录：

```bash
ls
```

你应该至少能看到：

```text
configs
data
docs
scripts
Makefile
requirements.txt
```

这一小步很基础，但很重要。后续所有章节都会默认这些目录存在。

## 0.3 第二步：实现公共工具模块 `scripts/common.py`

后续章节会频繁做几类重复操作：

- 读取 JSON 配置
- 创建输出目录
- 读取 JSONL 数据
- 写入 JSONL 数据
- 清洗文本空格
- 计算简单文本相似度

这些逻辑不应该在每个脚本里复制一遍。我们先把它们放进公共模块：

`scripts/common.py`

```python
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List


def load_json(path: str | Path) -> Dict[str, Any]:
    # 统一读取 JSON 配置文件。
    # 后续训练、评测、推理脚本都会通过 --config 传入 JSON 配置。
    with Path(path).open("r", encoding="utf-8") as fh:
        return json.load(fh)


def ensure_dir(path: str | Path) -> Path:
    # 确保目录存在。
    # parents=True 表示父目录不存在时也一起创建。
    # exist_ok=True 表示目录已存在时不报错。
    output = Path(path)
    output.mkdir(parents=True, exist_ok=True)
    return output


def ensure_parent(path: str | Path) -> Path:
    # 确保目标文件的父目录存在。
    # 例如 outputs/eval/report.md 的父目录是 outputs/eval。
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def default_hf_cache_dir() -> Path:
    # Hugging Face 模型和数据集默认会下载到缓存目录。
    # 这里把缓存放在项目内，方便新手定位和清理。
    return ensure_dir(Path(".cache") / "huggingface")


def read_jsonl(path: str | Path) -> List[Dict[str, Any]]:
    # 读取 JSONL 文件。
    # JSONL 是“一行一条 JSON”，非常适合训练样本和评测样本。
    rows: List[Dict[str, Any]] = []
    with Path(path).open("r", encoding="utf-8") as fh:
        for line in fh:
            # 去掉每行首尾空白，避免空行或换行符影响解析。
            line = line.strip()
            if not line:
                # 空行直接跳过，增强数据文件的容错性。
                continue
            rows.append(json.loads(line))
    return rows


def write_jsonl(path: str | Path, rows: Iterable[Dict[str, Any]]) -> None:
    # 写入 JSONL 文件。
    # 写入前先创建父目录，避免目录不存在导致脚本失败。
    target = ensure_parent(path)
    with target.open("w", encoding="utf-8") as fh:
        for row in rows:
            # ensure_ascii=False 可以保留中文原文，方便人工检查数据。
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")


def normalize_text(text: str) -> str:
    # 做最基础的文本归一化：
    # 1. 去掉首尾空白
    # 2. 转小写
    # 3. 把连续空白压成一个空格
    return " ".join(text.strip().lower().split())


def iter_text_lines(files: Iterable[str | Path]) -> Iterator[str]:
    # 逐行读取多个文本文件。
    # 使用 yield 可以边读边返回，适合 tokenizer 训练这类流式读取场景。
    for file_path in files:
        with Path(file_path).open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    yield line


def char_ngrams(text: str, n: int = 2) -> set[str]:
    # 把文本拆成字符 ngram 集合。
    # 例如 “订单签收” 的 2-gram 是：订单、单签、签收。
    normalized = normalize_text(text).replace(" ", "")
    if not normalized:
        return set()
    if len(normalized) < n:
        # 文本长度小于 n 时，直接把整个文本作为一个片段。
        return {normalized}
    return {normalized[i : i + n] for i in range(len(normalized) - n + 1)}


def jaccard_similarity(left: str, right: str, n: int = 2) -> float:
    # 使用 Jaccard 相似度比较两个问题是否相近。
    # 公式：交集大小 / 并集大小。
    left_ngrams = char_ngrams(left, n=n)
    right_ngrams = char_ngrams(right, n=n)
    if not left_ngrams and not right_ngrams:
        # 两边都为空时，可以认为完全相同。
        return 1.0
    if not left_ngrams or not right_ngrams:
        # 只有一边为空时，说明没有可比较内容。
        return 0.0
    return len(left_ngrams & right_ngrams) / len(left_ngrams | right_ngrams)
```

### 0.3.1 为什么先写 `load_json`

后续所有训练、评测、推理脚本都会使用配置文件。

例如：

```bash
python scripts/prepare_sft_data.py --config configs/prepare_sft_data.json
```

脚本里通常会这样读取配置：

```python
config = load_json(args.config)
```

这样做的好处是：同一个脚本可以配不同实验。

你不需要为了换模型或换数据改 Python 代码，只需要换一个 JSON 配置。

### 0.3.2 为什么需要 `ensure_dir` 和 `ensure_parent`

模型训练、数据清洗、评测报告都会产生输出文件。

如果输出目录不存在，直接写文件会报错。

所以我们在写入前先创建目录：

```python
def ensure_parent(path: str | Path) -> Path:
    # 先把字符串路径转成 Path 对象，后续处理更方便。
    target = Path(path)
    # 创建目标文件的父目录。
    # parents=True 允许递归创建多级目录。
    # exist_ok=True 允许目录已经存在。
    target.parent.mkdir(parents=True, exist_ok=True)
    # 返回目标文件路径，方便调用方继续写入。
    return target
```

后续写报告时可以这样用：

```python
output_path = ensure_parent("outputs/eval/customer_report.md")
output_path.write_text(report_text, encoding="utf-8")
```

这能避免新手反复遇到 `No such file or directory`。

### 0.3.3 为什么使用 JSONL

本课程很多数据使用 JSONL，而不是普通 JSON。

JSONL 的特点是：一行一条 JSON。

例如：

```json
{"question":"可以开发票吗？","answer":"可以，请提供订单号、发票抬头和税号。"}
{"question":"订单显示已签收但没收到怎么办？","answer":"请先核实签收人、快递柜和门卫代收情况。"}
```

它适合训练数据，因为：

- 可以逐行读取，适合大文件
- 单条样本坏了，容易定位
- 很多数据处理工具都支持
- 追加样本很方便

所以我们实现了：

```python
def read_jsonl(path: str | Path) -> List[Dict[str, Any]]:
    # 用列表保存读取到的所有样本。
    rows: List[Dict[str, Any]] = []
    with Path(path).open("r", encoding="utf-8") as fh:
        for line in fh:
            # 清理每行尾部换行符和多余空格。
            line = line.strip()
            if not line:
                # 跳过空行，避免 json.loads 报错。
                continue
            # 把一行 JSON 字符串解析成 Python 字典。
            rows.append(json.loads(line))
    return rows
```

以及：

```python
def write_jsonl(path: str | Path, rows: Iterable[Dict[str, Any]]) -> None:
    # 写文件前先确保父目录存在。
    target = ensure_parent(path)
    with target.open("w", encoding="utf-8") as fh:
        for row in rows:
            # 每个样本写成一行 JSON。
            # ensure_ascii=False 保留中文，末尾追加换行形成 JSONL。
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
```

请注意 `ensure_ascii=False`。

如果不加它，中文会被保存成 `\u8ba2\u5355` 这种转义形式，不利于人工检查。

### 0.3.4 为什么需要文本相似度函数

后续评测章节会判断模型是不是“背题”。

我们会把用户问题和训练集问题做相似度比较。

最小版本可以使用字符 ngram Jaccard：

```python
def jaccard_similarity(left: str, right: str, n: int = 2) -> float:
    # 分别把两个问题拆成字符 ngram 集合。
    left_ngrams = char_ngrams(left, n=n)
    right_ngrams = char_ngrams(right, n=n)
    if not left_ngrams and not right_ngrams:
        return 1.0
    if not left_ngrams or not right_ngrams:
        return 0.0
    # & 表示集合交集，| 表示集合并集。
    # 交集越大，说明两个问题共享的字符片段越多。
    return len(left_ngrams & right_ngrams) / len(left_ngrams | right_ngrams)
```

例如：

```python
score = jaccard_similarity(
    "订单显示已签收但我没收到怎么办",
    "订单已签收但没有收到货怎么办",
)
print(score)
```

相似度越高，说明两个问题共享的字符片段越多。

这个方法不如 embedding 检索聪明，但优点是：

- 不需要下载模型
- CPU 可跑
- 适合教学和快速排查

## 0.4 第三步：实现环境检查脚本 `scripts/env_check.py`

大模型项目很容易被环境问题卡住。

所以正式训练前，我们先写一个环境检查脚本。

目标是检查：

- Python 版本
- PyTorch 是否安装
- CUDA 是否可用
- `transformers` 是否安装
- `datasets` 是否安装
- `trl`、`bitsandbytes`、`vllm` 等可选依赖是否安装

`scripts/env_check.py`

```python
from __future__ import annotations

import importlib.util
import json
import platform
import sys


def has_package(name: str) -> bool:
    # 只检查包是否能被 Python 找到，不真正导入包。
    # 这样即使包不存在，也不会让脚本直接崩溃。
    return importlib.util.find_spec(name) is not None


def package_status(name: str) -> dict:
    # 把单个依赖包的检查结果组织成统一字典。
    # 统一结构方便最后输出 JSON，也方便后续扩展更多字段。
    return {
        "name": name,
        "installed": has_package(name),
    }


def detect_torch() -> dict:
    # PyTorch 是训练和推理的核心依赖，所以单独检查。
    if not has_package("torch"):
        # 没有安装 torch 时，不继续 import torch，避免 ImportError。
        return {
            "installed": False,
            "cuda_available": False,
            "cuda_device_count": 0,
        }

    # 只有确认 torch 存在后才导入。
    import torch

    return {
        "installed": True,
        "version": torch.__version__,
        # CUDA 可用代表可以尝试 GPU 训练路线。
        "cuda_available": torch.cuda.is_available(),
        # 多卡机器会返回大于 1；普通 CPU 或 Mac 通常是 0。
        "cuda_device_count": torch.cuda.device_count(),
        # 某些 CPU 版本 PyTorch 没有 CUDA 版本号，所以用 getattr 防御。
        "cuda_version": getattr(torch.version, "cuda", None),
    }


def recommend_route(torch_info: dict) -> str:
    # 根据环境检查结果给新手一个明确下一步。
    if not torch_info.get("installed"):
        return "请先安装 PyTorch；当前只能阅读文档，不能运行训练脚本。"
    if torch_info.get("cuda_available"):
        return "可以走 GPU QLoRA 路线；先从 sft-8gb 或 sft-16gb 配置开始。"
    return "建议先走 CPU 教学路线；重点学习数据、SFT、评测和推理流程。"


def main() -> None:
    # 先检查 torch，因为学习路线主要取决于 CUDA 是否可用。
    torch_info = detect_torch()

    # 把所有环境信息组织成一个 JSON 友好的字典。
    result = {
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "torch": torch_info,
        "packages": [
            # 基础训练和推理常用依赖。
            package_status("transformers"),
            package_status("datasets"),
            package_status("tokenizers"),
            # LoRA / QLoRA / 高性能部署相关依赖。
            package_status("peft"),
            package_status("trl"),
            package_status("bitsandbytes"),
            package_status("vllm"),
        ],
        "recommendation": recommend_route(torch_info),
    }

    # 输出格式化 JSON，方便人读，也方便脚本后续解析。
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    # 只有直接运行 python scripts/env_check.py 时才执行 main。
    # 如果别的脚本 import 这个文件，不会自动执行环境检查。
    main()
```

### 0.4.1 逐行理解环境检查脚本

这段代码先用 `importlib.util.find_spec` 判断包是否存在：

```python
def has_package(name: str) -> bool:
    # find_spec 找得到模块时返回模块信息，找不到时返回 None。
    return importlib.util.find_spec(name) is not None
```

为什么不用直接 `import transformers`？

因为直接 import 缺失包会抛异常，而我们只是想检查“有没有安装”。

然后检查 PyTorch：

```python
def detect_torch() -> dict:
    # 先判断 torch 是否存在，避免直接 import 失败。
    if not has_package("torch"):
        return {
            "installed": False,
            "cuda_available": False,
            "cuda_device_count": 0,
        }
```

如果 PyTorch 不存在，直接返回一个结构化结果。

如果存在，再继续读取 CUDA 状态：

```python
import torch

return {
    "installed": True,
    # 当前 PyTorch 版本。
    "version": torch.__version__,
    # 是否能使用 NVIDIA CUDA。
    "cuda_available": torch.cuda.is_available(),
    # 可见 GPU 数量。
    "cuda_device_count": torch.cuda.device_count(),
    # PyTorch 对应的 CUDA 版本；CPU 版本通常是 None。
    "cuda_version": getattr(torch.version, "cuda", None),
}
```

最后根据 CUDA 是否可用给学习建议：

```python
def recommend_route(torch_info: dict) -> str:
    # 没有 torch 时，先解决基础依赖。
    if not torch_info.get("installed"):
        return "请先安装 PyTorch；当前只能阅读文档，不能运行训练脚本。"
    # 有 CUDA 时，可以进入真实 QLoRA 微调路线。
    if torch_info.get("cuda_available"):
        return "可以走 GPU QLoRA 路线；先从 sft-8gb 或 sft-16gb 配置开始。"
    # 没有 CUDA 时，优先走 CPU 教学路线，先学流程。
    return "建议先走 CPU 教学路线；重点学习数据、SFT、评测和推理流程。"
```

这个脚本很小，但它体现了课程后续脚本的共同风格：

```text
检测输入
  -> 组织结构化结果
  -> 输出 JSON
  -> 让用户知道下一步怎么做
```

## 0.5 第四步：运行环境检查脚本

直接运行：

```bash
python3 scripts/env_check.py
```

你会看到类似输出：

```json
{
  "python": "3.11.8",
  "platform": "macOS-...",
  "torch": {
    "installed": true,
    "version": "2.x.x",
    "cuda_available": false,
    "cuda_device_count": 0,
    "cuda_version": null
  },
  "packages": [
    {
      "name": "transformers",
      "installed": true
    },
    {
      "name": "datasets",
      "installed": true
    }
  ],
  "recommendation": "建议先走 CPU 教学路线；重点学习数据、SFT、评测和推理流程。"
}
```

如果你是 Mac 或普通 CPU 机器，看到 `cuda_available: false` 很正常。

这不影响你学习本课程的 CPU 教学路线。

如果你有 NVIDIA GPU，并且 CUDA 环境可用，可能会看到：

```json
{
  "cuda_available": true,
  "cuda_device_count": 1
}
```

这表示后续可以尝试 QLoRA 路线。

## 0.6 第五步：把脚本接入 `Makefile`

每次输入完整 Python 命令比较长。

所以本课程使用 `Makefile` 提供统一入口。

`Makefile`

```makefile
# 使用 zsh 执行 Makefile 中的命令。
SHELL := /bin/zsh

# ?= 表示如果外部没有传 PYTHON，就默认使用 python3。
# 这样用户也可以用 make env-check PYTHON=python 覆盖。
PYTHON ?= python3
PIP ?= pip

# 声明这些名字是命令目标，不是同名文件。
.PHONY: help install env-check

help:
	@echo "Available targets:"
	@echo "  make install            Install Python dependencies from requirements.txt"
	@echo "  make env-check          Inspect Python, PyTorch, CUDA, bitsandbytes and vLLM"

install:
	# 从 requirements.txt 安装课程所需依赖。
	$(PIP) install -r requirements.txt

env-check:
	# 调用环境检查脚本。
	$(PYTHON) scripts/env_check.py
```

现在你可以运行：

```bash
make env-check
```

它等价于：

```bash
python3 scripts/env_check.py
```

### 0.6.1 为什么使用 `Makefile`

`Makefile` 在本课程里不是为了炫技，而是为了让命令稳定、简短、可复用。

例如后续章节会出现：

```bash
make prepare-sft
make tokenizer-chat-demo
make pretrain-chat-demo
make sft-minimal
make infer-minimal
make report-eval-sample
```

这些命令背后都是 Python 脚本。

你需要形成一个习惯：看到 `make xxx` 时，主动去 `Makefile` 找它对应的真实命令。

例如：

```makefile
prepare-sft:
	# 清洗原始客服数据，并转换成 SFT 训练格式。
	$(PYTHON) scripts/prepare_sft_data.py --config configs/prepare_sft_data.json
```

这表示：

```text
make 只是入口
真正逻辑在 scripts/prepare_sft_data.py
参数在 configs/prepare_sft_data.json
```

## 0.7 第六步：建立后续章节统一的脚本模板

后续章节的脚本基本都会遵循同一个模板。

你可以先记住这个骨架：

```python
from __future__ import annotations

import argparse

from common import load_json


def parse_args():
    # argparse 用来解析命令行参数。
    # 例如：python scripts/xxx.py --config configs/xxx.json
    parser = argparse.ArgumentParser(description="Describe what this script does.")
    # required=True 表示 --config 是必填参数。
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()


def main():
    # 读取命令行参数。
    args = parse_args()

    # 根据 --config 指定的路径读取 JSON 配置。
    config = load_json(args.config)

    # 1. Read input files from config.
    # 2. Process data or run training.
    # 3. Save outputs to config["output_dir"] or config["output_file"].
    # 4. Print a short summary.


if __name__ == "__main__":
    # 直接运行脚本时进入 main。
    main()
```

### 0.7.1 为什么每个脚本都要有 `parse_args`

因为我们希望脚本通过命令行接收配置：

```bash
python3 scripts/xxx.py --config configs/xxx.json
```

这样同一个脚本可以跑不同实验。

例如：

```bash
python3 scripts/sft_train.py --config configs/sft_qlora_8gb.json
python3 scripts/sft_train.py --config configs/sft_qlora_16gb.json
python3 scripts/sft_train.py --config configs/sft_qlora_24gb.json
```

脚本不变，只换配置。

这就是配置驱动。

### 0.7.2 为什么 `main()` 放在最后

Python 文件最后通常写：

```python
if __name__ == "__main__":
    main()
```

这表示：

- 直接运行这个文件时，执行 `main()`
- 被其他脚本 import 时，不自动执行 `main()`

这让脚本既能独立运行，也能复用其中的函数。

## 0.8 第七步：建立本课程的学习路线

现在工程骨架已经清楚了，你可以选择路线。

### 0.8.1 CPU 教学路线

适合：

- 没有 NVIDIA GPU
- 想先理解完整流程
- 想学习数据、SFT、评测、推理之间的关系

后续建议顺序：

```text
00 工程工作台
01 大模型开发全景图
02 环境与项目结构
03 数据工程
04 Tokenizer
05 Tiny 预训练
06 CPU 最小 SFT
09 评测
10 推理调试
13 毕业项目
```

### 0.8.2 GPU QLoRA 路线

适合：

- 有 NVIDIA GPU
- CUDA 和 PyTorch 环境可用
- 想微调真实开源模型

后续建议顺序：

```text
00 工程工作台
01 大模型开发全景图
02 环境与项目结构
03 数据工程
06 SFT 数据格式
07 LoRA / QLoRA
09 评测
11 vLLM 部署
12 生产检查清单
13 毕业项目
```

## 0.9 本章练习

### 0.9.1 练习一：确认公共工具模块

打开：

```text
scripts/common.py
```

确认里面至少包含：

- `load_json`
- `ensure_dir`
- `ensure_parent`
- `read_jsonl`
- `write_jsonl`
- `normalize_text`
- `jaccard_similarity`

### 0.9.2 练习二：运行环境检查

运行：

```bash
python3 scripts/env_check.py
```

或：

```bash
make env-check
```

记录输出中的三项：

```text
Python 版本：
CUDA 是否可用：
推荐路线：
```

### 0.9.3 练习三：找到 Makefile 中的真实命令

打开：

```text
Makefile
```

找到：

```makefile
env-check:
	$(PYTHON) scripts/env_check.py
```

然后回答：

```text
make env-check 实际执行了哪个 Python 文件？
这个 Python 文件有没有读取配置？
这个 Python 文件输出了什么格式？
```

## 0.10 本章验收标准

完成本章后，你应该能做到：

- 说清楚 `configs/`、`data/`、`scripts/`、`outputs/` 各自负责什么
- 看懂 `scripts/common.py` 中每个工具函数的作用
- 运行 `python3 scripts/env_check.py` 或 `make env-check`
- 知道 `Makefile` 只是命令入口，真实逻辑在 `scripts/`
- 理解后续章节为什么都采用 `python scripts/xxx.py --config configs/xxx.json`

## 0.11 常见问题

### 0.11.1 没有 GPU 是不是不能继续

不是。

本课程专门提供了 CPU 可跑的教学路线。CPU 路线的目标不是训练高质量大模型，而是让你理解完整工程链路。

真正追求模型效果时，再进入 GPU QLoRA 路线。

### 0.11.2 为什么一开始不直接写训练代码

因为训练代码依赖很多基础设施：

- 配置读取
- 数据读取
- 输出目录创建
- 日志和结果保存
- 环境检查

这些基础设施看起来普通，但它们决定后续工程能不能稳定迭代。

### 0.11.3 为什么每章都要写这么细

因为本课程目标不是让你复制命令，而是让你能自己实现。

截图式的逐步教程适合新手建立信心：每一节只做一件小事，每一小步都有代码、解释和验收。

## 0.12 下一章预告

下一章会在这个工程工作台之上，建立完整的大模型开发全景图。

你会看到：

```text
业务目标
  -> 数据清洗
  -> Tokenizer
  -> 预训练
  -> SFT
  -> 蒸馏
  -> 评测
  -> 推理
  -> 部署
  -> 迭代
```

从下一章开始，每个阶段都会继续采用本章这种写法：先说明目标，再一步步写代码，最后运行和验收。
