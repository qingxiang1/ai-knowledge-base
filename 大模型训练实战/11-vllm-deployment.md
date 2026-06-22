# 11 第十一章：vLLM 部署成 API 服务

学习时长：90 分钟

本章类型：模型服务部署 + OpenAI 兼容接口

本章产物：一个可被评测脚本调用的 OpenAI 兼容模型服务

## 11.0 本章要完成什么

上一章我们完成了本地推理和 REPL 调试。

本地推理适合开发者自己观察模型行为。

但真实业务系统通常不会直接运行 Python 推理脚本，而是调用一个服务：

```text
业务系统 / 评测脚本 / 前端应用
  -> HTTP API
  -> 模型服务
  -> 模型回答
```

本章使用 vLLM 作为部署示例，把模型启动成 OpenAI 兼容 API 服务。

你会逐步完成：

- 理解为什么要部署成 API
- 理解 vLLM 适合什么场景
- 理解 base model、adapter、merged model 的区别
- 使用 `merge_lora.py` 合并 LoRA adapter
- 阅读 `serve_vllm.sh`
- 启动 vLLM 服务
- 理解 `HOST`、`PORT`、`API_KEY`、`TP_SIZE`、`DTYPE`
- 用评测脚本调用服务
- 排查 model 名称、base URL、API key 常见问题

完成本章后，你应该能回答：

```text
为什么部署通常用 merged model？
为什么服务启动后还要跑业务评测？
评测配置里的 model、base_url、api_key 如何和服务端对应？
```

## 11.1 本章运行前提

本章不是 CPU 教学路线的必跑章节。

推荐环境：

```text
Linux
NVIDIA GPU
CUDA 可用
已安装 vLLM
有可部署模型目录
```

如果你当前是在 macOS 或 CPU 环境上学习，可以先读懂流程，不必强行运行。

检查环境：

```bash
make env-check
```

重点看：

```text
torch.cuda_available
packages.vllm
nvidia_smi
```

如果 `vllm` 缺失，在合适环境中安装：

```bash
pip install vllm
```

## 11.2 为什么要部署成 API

本地推理脚本适合开发调试。

API 服务适合多人、多程序共享调用。

部署成 API 后：

- 评测脚本可以统一调用模型
- 前端应用可以调用模型
- 后端业务系统可以调用模型
- 可以加鉴权、限流、日志、监控
- 可以独立升级模型服务

本课程使用 OpenAI 兼容接口，是为了让：

```text
eval_business.py
distill_generate.py
业务应用
```

都能用同一种调用方式。

## 11.3 vLLM 是什么

vLLM 是常用的大模型推理服务框架。

它适合：

- 高吞吐推理
- 多请求并发
- OpenAI 兼容服务
- GPU 部署
- 服务化评测和应用调用

本课程不深入讲 vLLM 内部调度算法。

你先需要理解的是：

```text
vLLM 可以把一个模型目录启动成 HTTP API。
```

## 11.4 base model、adapter、merged model

第 7 章讲过：

```text
base model + LoRA adapter = 微调后的行为
```

adapter 目录通常不是完整模型。

部署时有两种方式：

```text
方式一：服务端加载 base model + adapter
方式二：先 merge 成 merged model，再部署 merged model
```

本课程推荐教学路线：

```text
先 merge，再部署
```

因为 merged model 对新手更直观：

```text
一个目录就是一个可部署模型
```

缺点是 merged model 体积更大。

优点是部署和评测配置更简单。

## 11.5 第一步：合并 LoRA adapter

合并脚本：

```text
scripts/merge_lora.py
```

配置文件：

```text
configs/merge_lora.json
```

配置内容：

```json
{
  "base_model": "Qwen/Qwen2.5-0.5B-Instruct",
  "adapter_path": "outputs/sft_qwen25_cs",
  "output_dir": "outputs/qwen25_cs_merged",
  "cache_dir": ".cache/huggingface",
  "torch_dtype": "bfloat16"
}
```

运行：

```bash
make merge-lora
```

或：

```bash
python3 scripts/merge_lora.py --config configs/merge_lora.json
```

如果你训练时用的是：

```text
outputs/sft_qwen25_16gb
```

就要把 `adapter_path` 改成：

```json
"adapter_path": "outputs/sft_qwen25_16gb"
```

否则合并会找错 adapter。

## 11.6 merge_lora.py 做了什么

脚本读取配置：

```python
config = load_json(args.config)
ensure_dir(config["output_dir"])
```

加载 tokenizer：

```python
tokenizer = AutoTokenizer.from_pretrained(config["base_model"])
```

加载 base model：

```python
model = AutoModelForCausalLM.from_pretrained(
    config["base_model"],
    torch_dtype=dtype,
    device_map="auto",
)
```

加载 adapter：

```python
model = PeftModel.from_pretrained(model, config["adapter_path"])
```

合并：

```python
merged = model.merge_and_unload()
```

保存：

```python
merged.save_pretrained(config["output_dir"], safe_serialization=True)
tokenizer.save_pretrained(config["output_dir"])
```

输出目录：

```text
outputs/qwen25_cs_merged/
```

## 11.7 第二步：阅读服务脚本

服务脚本：

```text
scripts/serve_vllm.sh
```

内容核心是：

```bash
MODEL_PATH="$1"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
API_KEY="${API_KEY:-dev-token}"
TP_SIZE="${TP_SIZE:-1}"
DTYPE="${DTYPE:-auto}"

vllm serve "$MODEL_PATH" \
  --host "$HOST" \
  --port "$PORT" \
  --api-key "$API_KEY" \
  --tensor-parallel-size "$TP_SIZE" \
  --dtype "$DTYPE"
```

这些环境变量含义：

```text
HOST：监听地址
PORT：服务端口
API_KEY：调用服务时使用的 key
TP_SIZE：tensor parallel 并行数
DTYPE：模型推理 dtype
```

默认服务地址是：

```text
http://localhost:8000/v1
```

默认 API key 是：

```text
dev-token
```

这和 `configs/eval_business.json` 中的配置一致。

## 11.8 第三步：启动 vLLM 服务

启动：

```bash
bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

也可以使用 Makefile：

```bash
make serve-vllm MODEL=outputs/qwen25_cs_merged
```

多卡时：

```bash
TP_SIZE=2 bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

指定端口：

```bash
PORT=8001 bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

指定 API key：

```bash
API_KEY=my-secret bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

如果改了 `PORT` 或 `API_KEY`，评测配置也要同步修改。

## 11.9 第四步：确认评测配置能连上服务

打开：

```text
configs/eval_business.json
```

关键字段：

```json
{
  "model": "outputs/qwen25_cs_merged",
  "base_url": "http://localhost:8000/v1",
  "api_key": "dev-token"
}
```

这三个字段要和服务端对应。

如果服务用的是：

```bash
PORT=8001 API_KEY=my-secret bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

那么评测配置要改成：

```json
{
  "base_url": "http://localhost:8001/v1",
  "api_key": "my-secret"
}
```

`model` 字段也要和服务端支持的模型名一致。

本课程教学配置使用模型路径作为 model 名称。

## 11.10 第五步：调用服务做业务评测

服务启动后，运行：

```bash
python3 scripts/eval_business.py --config configs/eval_business.json --limit 1
```

先用 `--limit 1` 检查服务是否能通。

如果成功，再运行完整评测：

```bash
python3 scripts/eval_business.py --config configs/eval_business.json
```

生成报告：

```bash
make report-eval
```

输出：

```text
outputs/eval/customer_predictions.jsonl
outputs/eval/customer_metrics.json
outputs/eval/customer_report.md
```

部署后必须做业务评测。

服务能启动，只说明：

```text
模型能被加载并响应请求。
```

它不说明：

```text
模型回答符合业务要求。
```

## 11.11 常见部署问题

### 11.11.1 adapter_path 不对

现象：

```text
merge_lora.py 找不到 adapter 文件
```

检查：

```text
configs/merge_lora.json
```

确认 `adapter_path` 对应你真实训练输出目录。

### 11.11.2 vllm 命令不存在

现象：

```text
vllm: command not found
```

处理：

```bash
pip install vllm
make env-check
```

也要确认当前 shell 使用的是安装 vLLM 的 Python 环境。

### 11.11.3 服务启动但评测连不上

检查：

- 服务是否还在运行
- `base_url` 是否带 `/v1`
- 端口是否一致
- API key 是否一致
- 防火墙或容器端口是否开放

### 11.11.4 model 名称不匹配

如果服务端模型名和评测配置里的 `model` 不一致，可能报 model not found。

处理方式：

```text
把 eval_business.json 中的 model 改成服务端实际模型名
```

### 11.11.5 显存不够

部署也会占显存。

如果模型加载 OOM：

- 使用更小模型
- 降低并发
- 使用合适 dtype
- 使用 tensor parallel
- 换更大显存 GPU

## 11.12 本章练习

### 11.12.1 练习一：检查 merge 配置

打开：

```text
configs/merge_lora.json
```

回答：

```text
base_model 是谁？
adapter_path 是哪里？
output_dir 是哪里？
如果你跑的是 sft-16gb，adapter_path 应该改成什么？
```

### 11.12.2 练习二：阅读服务脚本

打开：

```text
scripts/serve_vllm.sh
```

回答：

```text
默认端口是多少？
默认 API key 是什么？
如何设置 TP_SIZE=2？
如何改成 8001 端口？
```

### 11.12.3 练习三：对齐评测配置

打开：

```text
configs/eval_business.json
```

检查：

```text
base_url
api_key
model
```

是否和你的服务启动参数一致。

### 11.12.4 练习四：GPU 环境运行

如果你有合适 GPU 和 merged model，运行：

```bash
bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

另开终端运行：

```bash
python3 scripts/eval_business.py --config configs/eval_business.json --limit 1
```

如果当前没有 GPU，本练习只需要读懂命令和配置关系。

## 11.13 本章验收标准

完成本章后，你应该能做到：

- 解释为什么要部署成 API
- 解释 vLLM 在本课程中的作用
- 说明 base model、adapter、merged model 的区别
- 读懂 `configs/merge_lora.json`
- 读懂 `scripts/serve_vllm.sh`
- 说明 `HOST`、`PORT`、`API_KEY`、`TP_SIZE` 的作用
- 说明评测配置如何连接模型服务
- 说明为什么部署后还要做业务评测

## 11.14 下一章衔接

本章把模型服务化。

但生产系统不是“服务能启动”就结束。

下一章会进入生产检查清单。

我们会系统检查：

```text
数据
训练
评测
部署
监控
限流
安全
回滚
```

这一步会把课程从“能跑通”推进到“能负责”。
