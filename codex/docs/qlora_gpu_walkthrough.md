# QLoRA GPU 实战指南

适用场景：你已经看过主教程和当前模板工程，准备第一次在 GPU 环境下真正跑通一个可用的 QLoRA 微调任务。

本文目标：

1. 帮你确认 GPU 环境是否准备正确
2. 帮你选择合适的 QLoRA 配置
3. 帮你跑通一次完整的微调、合并、部署、评测流程
4. 帮你理解常见报错该怎么排查

## 1. 推荐硬件门槛

最低建议：

- NVIDIA GPU
- CUDA 可用
- 至少 8GB 显存

更舒服的选择：

- 16GB 到 24GB 显存

建议先跑：

```bash
make env-check
```

重点看这几项：

- `torch.cuda.is_available()`
- GPU 张数和显存
- `trl` 是否已安装
- `bitsandbytes` 是否已安装

如果 `trl` 或 `bitsandbytes` 缺失，先补：

```bash
pip install trl
pip install bitsandbytes
```

## 2. 选择哪份配置

当前工程里已经给了 4 档配置：

- [sft_qlora_cpu_debug.json](/Users/luoqingxiang/Documents/codex/configs/sft_qlora_cpu_debug.json)
- [sft_qlora_8gb.json](/Users/luoqingxiang/Documents/codex/configs/sft_qlora_8gb.json)
- [sft_qlora_16gb.json](/Users/luoqingxiang/Documents/codex/configs/sft_qlora_16gb.json)
- [sft_qlora_24gb.json](/Users/luoqingxiang/Documents/codex/configs/sft_qlora_24gb.json)

推荐规则：

- 8GB 到 12GB：先用 `sft_qlora_8gb.json`
- 16GB 到 24GB：先用 `sft_qlora_16gb.json`
- 24GB 以上：先用 `sft_qlora_24gb.json`

## 3. 最短实战命令

以 16GB 档为例：

```bash
make sft-16gb
```

如果你更喜欢显式命令：

```bash
python scripts/sft_train.py --config configs/sft_qlora_16gb.json
```

完成后合并权重：

```bash
python scripts/merge_lora.py --config configs/merge_lora.json
```

启动服务：

```bash
bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

做业务评测：

```bash
python scripts/eval_business.py --config configs/eval_business.json
python scripts/generate_eval_report.py \
  --predictions outputs/eval/customer_predictions.jsonl \
  --metrics outputs/eval/customer_metrics.json \
  --output outputs/eval/customer_report.md
```

## 4. 推荐执行顺序

1. `make env-check`
2. `make prepare-sft`
3. `make sft-8gb` 或 `make sft-16gb`
4. `python scripts/merge_lora.py --config configs/merge_lora.json`
5. `bash scripts/serve_vllm.sh outputs/qwen25_cs_merged`
6. `make analyze-preds`

## 5. 常见报错与处理

### 5.1 `ModuleNotFoundError: trl`

处理：

```bash
pip install trl
```

### 5.2 `No CUDA GPUs are available`

处理：

- 先用 CPU demo 链路学习流程
- 在真正的 GPU 机器上重跑 QLoRA

### 5.3 `bitsandbytes` 安装失败

处理：

- 确认 Python、PyTorch、CUDA 版本组合
- 优先在 Linux + NVIDIA 环境中运行

### 5.4 显存爆掉

处理顺序建议：

1. 把 `per_device_train_batch_size` 调小
2. 把 `max_seq_length` 调小
3. 提高 `gradient_accumulation_steps`
4. 保持 `load_in_4bit=true`

## 6. 如何判断这次 QLoRA 算跑通了

至少满足：

- 训练脚本正常结束
- `output_dir` 下生成 adapter 权重
- 合并脚本正常输出 merged model
- 本地服务能起来
- 至少一组业务评测能生成预测结果和报告

## 7. 新手最容易忽略的事

- 训练数据质量通常比 LoRA 参数更重要
- 评测必须包含业务集
- 合并权重后再部署，通常更稳定
- 跑完评测后最好用 `make analyze-preds` 看最近训练样本
