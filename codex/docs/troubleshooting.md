# 大模型开发入门排障手册

这份手册按“症状 -> 常见原因 -> 处理方式”组织。遇到问题时，优先复制报错关键词在本文件里搜索。

配套入口：

- 主教程：[llm_development_beginner_tutorial.md](/Users/luoqingxiang/Documents/codex/llm_development_beginner_tutorial.md)
- 工程说明：[README.md](/Users/luoqingxiang/Documents/codex/README.md)
- 教学讲义：[training_handout.md](/Users/luoqingxiang/Documents/codex/docs/training_handout.md)

---

## 1. 环境类问题

### 1.1 `No CUDA GPUs are available`

常见原因：

- 当前机器没有 NVIDIA GPU
- PyTorch 没装 CUDA 版本
- 驱动或 CUDA 环境不可用

处理方式：

```bash
make env-check
```

如果 `cuda_available=false`，先走 CPU 教学链路：

```bash
make pipeline-local
```

等切到 GPU 机器后再跑：

```bash
make sft-8gb
make sft-16gb
```

### 1.2 `ModuleNotFoundError: trl`

常见原因：

- 没安装 `trl`
- 当前 Python 环境不是你安装依赖的环境

处理方式：

```bash
pip install trl
make env-check
```

如果只是先学习流程，可以绕开 TRL：

```bash
make sft-minimal
```

### 1.3 `ModuleNotFoundError: bitsandbytes`

常见原因：

- 没安装 `bitsandbytes`
- 当前平台不支持
- macOS 本地环境无法正常跑 CUDA 版 bitsandbytes

处理方式：

```bash
pip install bitsandbytes
make env-check
```

如果仍然不可用，先用 CPU 教学链路。QLoRA 建议在 Linux + NVIDIA GPU 环境中运行。

### 1.4 `vllm: command not found`

常见原因：

- 没安装 vLLM
- 当前环境 PATH 没指向安装位置

处理方式：

```bash
pip install vllm
make env-check
```

如果只是本地学习训练和评测，可以暂时跳过 vLLM 部署。

---

## 2. 下载与缓存问题

### 2.1 无法连接 Hugging Face

常见报错：

```text
We couldn't connect to 'https://huggingface.co'
```

常见原因：

- 当前环境不能访问外网
- 模型还没有下载到本地缓存
- Hugging Face 镜像或代理未配置

处理方式：

- 先跑本地教学模型，不依赖远端模型下载
- 使用已经缓存好的模型路径
- 在可联网环境提前下载模型

本文配套工程默认把 Hugging Face 缓存放在：

```text
.cache/huggingface/
```

### 2.2 `PermissionError: .cache/huggingface`

常见原因：

- 默认缓存目录不可写
- 运行环境限制写用户主目录

处理方式：

- 使用工程内的 `cache_dir`
- 确认配置里有：

```json
"cache_dir": ".cache/huggingface"
```

---

## 3. 数据问题

### 3.1 SFT 数据读不进去

常见原因：

- JSONL 每行不是合法 JSON
- 字段名不匹配
- 缺少 `messages`
- `messages` 里没有 `assistant`

处理方式：

先用样例数据跑通：

```bash
make prepare-sft
make sft-minimal
```

SFT 推荐格式：

```json
{"messages":[{"role":"system","content":"你是客服助手。"},{"role":"user","content":"可以开发票吗？"},{"role":"assistant","content":"可以，请提供订单号、抬头和税号。"}]}
```

### 3.2 清洗后样本太少

常见原因：

- `min_question_chars` 太大
- `min_answer_chars` 太大
- `allowed_quality` 过滤太严
- 原始数据重复太多

处理方式：

查看清洗摘要：

```text
outputs/data_prep/prepare_sft_summary.json
```

查看被拒绝样本：

```text
outputs/data_prep/customer_support_rejected.jsonl
```

然后再调整：

```text
configs/prepare_sft_data.json
```

### 3.3 模型输出像在背训练集

常见原因：

- 数据太少
- 问题和训练样本高度相似
- 训练轮数太多
- 模型太小，只能记局部模式

处理方式：

```bash
make retrieve-similar
make retrieve-semantic
```

或者推理时一起看相似样本：

```bash
python scripts/infer_minimal.py \
  --config configs/infer_minimal_cpu_local.json \
  --prompt "订单显示已签收但我没有收到，该怎么办？" \
  --show-similar
```

---

## 4. 训练问题

### 4.1 `num_samples should be a positive integer value`

常见原因：

- 数据太短
- `block_size` 太大
- 分块后没有任何训练样本

处理方式：

把预训练配置里的 `block_size` 调小，例如：

```json
"block_size": 32
```

也可以增加训练语料。

### 4.2 `IndexError: index out of range in self`

常见原因：

- 输入长度超过模型最大上下文长度
- SFT 的 `max_seq_length` 大于模型 `n_positions`

处理方式：

- 调小 `max_seq_length`
- 调小推理时的 `max_new_tokens`
- 使用已经带自动截断的 `scripts/infer_minimal.py`

### 4.3 训练 loss 下降，但模型回答仍然很差

常见原因：

- 教学模型太小
- 数据太少
- 训练目标只是学局部模式
- 评测问题和训练分布不一致

处理方式：

- 不要只看 loss
- 先看业务评测
- 再看最近训练样本
- 提升数据质量后再训练

推荐命令：

```bash
make infer-minimal
make retrieve-similar
make report-eval-sample
```

### 4.4 QLoRA 显存爆掉

处理顺序：

1. 降低 `per_device_train_batch_size`
2. 降低 `max_seq_length`
3. 提高 `gradient_accumulation_steps`
4. 确认 `load_in_4bit=true`
5. 换更小模型

先从保守配置开始：

```bash
make sft-8gb
```

---

## 5. 推理问题

### 5.1 推理结果为空

常见原因：

- 模型很小，学不到稳定输出
- prompt 太长
- 生成参数过于保守
- 很快生成 EOS

处理方式：

- 尝试 `do_sample=true`
- 设置较小但非零的 `min_new_tokens`
- 减少 prompt 长度
- 换更强基座模型

本工程的最小推理脚本已经做了基本截断：

```bash
make infer-minimal
```

### 5.2 推理输出重复、混乱、串样本

常见原因：

- 模型太小
- 数据太少
- 过拟合
- 训练语料风格重复

处理方式：

- 增加高质量样本
- 减少重复模板
- 降低训练轮数
- 用相似样本检索判断是否背题

---

## 6. 评测问题

### 6.1 `make analyze-preds` 找不到预测文件

常见原因：

- 还没跑 `eval_business.py`
- `outputs/eval/customer_predictions.jsonl` 不存在

处理方式：

如果只是想看报告格式，先用样例：

```bash
make report-eval-sample
```

真实评测流程：

```bash
python scripts/eval_business.py --config configs/eval_business.json
make analyze-preds
make report-eval
```

### 6.2 `eval_business.py` 连不上服务

常见原因：

- vLLM 服务没启动
- `base_url` 不对
- `api_key` 不对
- 模型名不对

处理方式：

检查：

```text
configs/eval_business.json
```

确认服务启动：

```bash
bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

### 6.3 评测分数高但人工看很差

常见原因：

- 评测指标太粗
- 样本太少
- keyword coverage 被关键词碰巧命中
- 问题和训练样本太像

处理方式：

- 增加人工复核
- 增加错误类型标注
- 查看最近训练样本
- 增加更难的业务样本

---

## 7. 部署问题

### 7.1 LoRA adapter 不能直接按预期部署

常见原因：

- 推理服务没有正确加载 adapter
- base model 和 adapter 不匹配
- tokenizer 路径不一致

处理方式：

部署前先合并：

```bash
python scripts/merge_lora.py --config configs/merge_lora.json
```

然后部署合并后的目录。

### 7.2 vLLM 多卡部署不符合预期

常见原因：

- `TP_SIZE` 设置不对
- GPU 数量不足
- 模型大小和显存不匹配

处理方式：

```bash
TP_SIZE=2 bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

先单卡跑通，再调多卡。

---

## 8. 最推荐的排障顺序

遇到问题时，按这个顺序排查：

1. `make env-check`
2. 看配置文件路径是否存在
3. 用样例数据跑最小链路
4. 看中间输出文件是否生成
5. 看最近训练样本
6. 看业务评测报告
7. 再考虑改模型或训练参数

这套顺序很朴素，但很管用。大多数新手问题不是模型玄学，而是环境、数据、配置或评测链路里某一环没对上。
