# 章节测试题

这份测试题用于检查你是否真的理解了每章内容。建议每学完一章，先不看答案，独立写下回答；如果回答不出来，再回到对应章节复习。

题型分三类：

- 概念题：检查你是否理解核心概念
- 操作题：检查你是否知道该运行什么命令、看什么产物
- 判断题：检查你能否识别常见误区

## 使用方式

每章建议达到这个标准再继续：

```text
概念题能用自己的话解释
操作题知道命令和输出位置
判断题能说出理由
```

如果你只是看完正文但做不出题，说明这一章还没有真正吸收。

## 附录：基础知识测试

### 题目

1. 机器学习和传统规则编程最大的区别是什么？
2. loss 下降是否一定代表业务效果变好？为什么？
3. 梯度、反向传播、优化器分别负责什么？
4. tokenizer 和 embedding 有什么区别？
5. 为什么 decoder-only 模型可以逐 token 生成文本？
6. PyTorch 和 TensorFlow 属于哪一层工具？

### 参考答案

1. 传统规则编程主要由人写规则；机器学习是从数据中学习输入和输出之间的规律。
2. 不一定。loss 只衡量训练目标下的 token 预测误差，模型可能背题、漏业务关键词或在真实业务分布上表现差。
3. 梯度指出参数调整方向；反向传播计算梯度；优化器根据梯度更新参数。
4. tokenizer 把文本转成 token id；embedding 把 token id 映射成连续向量。
5. decoder-only 模型训练目标是根据前文预测下一个 token，推理时不断把新 token 接回上下文继续预测。
6. 它们都是深度学习框架，负责张量计算、自动求导、神经网络层和训练流程。

## 00 序章测试

### 题目

1. 为什么本课程要拆成 `configs/`、`data/`、`scripts/`、`outputs/`？
2. `scripts/common.py` 主要解决什么问题？
3. `make env-check` 背后实际运行哪个脚本？
4. 为什么后续章节强调“配置驱动”？
5. 判断：没有 GPU 就不能继续学习本课程。对还是错？

### 参考答案

1. 为了把配置、输入、执行逻辑和输出产物分开，便于复现、调试和迭代。
2. 提供读取 JSON/JSONL、写 JSONL、创建目录、文本归一化、相似度等通用能力。
3. `scripts/env_check.py`。
4. 因为实验参数、路径和模型选择经常变化，放在配置里能减少改代码带来的错误。
5. 错。没有 GPU 仍然可以走 CPU 教学路线，学习完整工程链路。

## 01 全景图测试

### 题目

1. `make pipeline-local` 串起了哪些主要阶段？
2. 数据清洗、tokenizer、预训练、SFT、推理、评测之间是什么关系？
3. 为什么第一章不先讲复杂 Transformer 公式？
4. 本地教学模型效果差，是否一定说明流程失败？
5. 操作题：说出 `make pipeline-local` 至少会产生三个什么产物。

### 参考答案

1. 数据清洗、聊天 demo tokenizer、教学型预训练、最小 SFT、本地推理、相似样本检索、样例评测报告。
2. 数据清洗提供训练样本；tokenizer 把文本变成 token id；预训练得到 tiny 基座；SFT 让模型学会按客服样例回答；推理和评测检查结果。
3. 因为新手更容易先卡在工程流程和文件流上，先理解全链路更利于上手。
4. 不一定。tiny 模型和小样本主要用于教学，目标是跑通链路。
5. 例如 `data/sft/customer_support_prepared.jsonl`、`outputs/tokenizer_chat_demo/`、`outputs/pretrain_chat_demo/`、`outputs/sft_minimal_cpu_local/`、`outputs/eval/customer_report.sample.md`。

## 02 环境与工程目录测试

### 题目

1. 为什么大模型开发要先检查 Python、PyTorch、CUDA 和可选依赖？
2. `trl`、`bitsandbytes`、`vllm` 分别大致用于什么？
3. macOS 没有 CUDA 时，推荐先走哪条路线？
4. 判断：有独立显卡就一定能跑 CUDA 训练。对还是错？
5. 操作题：运行环境检查后，应重点看哪些字段？

### 参考答案

1. 因为不同依赖决定能否运行 CPU 教学、QLoRA 微调和 vLLM 部署。
2. `trl` 常用于 SFTTrainer；`bitsandbytes` 常用于 4bit/8bit 量化；`vllm` 用于高吞吐推理服务。
3. CPU 教学路线，如 `make pipeline-local`。
4. 错。还需要 NVIDIA GPU、驱动、CUDA 版 PyTorch 和正确环境。
5. `python_version`、`packages`、`torch.cuda_available`、`cuda_device_count`、`recommended_sft_config`、`notes`。

## 03 数据工程测试

### 题目

1. 为什么数据工程是模型质量的地基？
2. SFT `messages` 里 `system`、`user`、`assistant` 分别表示什么？
3. 为什么 rejected 样本也要保存？
4. 去重主要防止什么问题？
5. 操作题：严格清洗配置会输出到哪些文件？

### 参考答案

1. 模型会学习数据中的表达、规则和错误；低质量数据会直接影响模型行为。
2. `system` 定义助手角色和约束；`user` 是用户问题；`assistant` 是期望模型学习的回答。
3. 方便复查过滤规则、发现误杀样本和改进数据处理。
4. 防止重复样本放大某些答案，增加背题和分布偏差。
5. `data/sft/customer_support_prepared.strict.jsonl` 和 `outputs/data_prep/customer_support_rejected.strict.jsonl`。

## 04 Tokenizer 测试

### 题目

1. 为什么模型不能直接处理字符串？
2. token、token id、词表之间是什么关系？
3. `[PAD]`、`[UNK]`、`[BOS]`、`[EOS]` 分别有什么作用？
4. 什么时候应该复用已有 tokenizer，而不是重新训练？
5. 操作题：训练聊天 demo tokenizer 的命令是什么？

### 参考答案

1. 神经网络处理数字张量，文本必须先转成 token id。
2. token 是文本片段；token id 是该 token 在词表中的编号；词表保存 token 到 id 的映射。
3. `[PAD]` 用于补齐；`[UNK]` 表示未知 token；`[BOS]` 表示开始；`[EOS]` 表示结束。
4. 微调或蒸馏已有开源模型时通常复用基座模型 tokenizer。
5. `make tokenizer-chat-demo`。

## 05 教学型预训练测试

### 题目

1. causal language modeling 的训练目标是什么？
2. `block_size` 影响什么？
3. 为什么教学型预训练不能代表真实生产级预训练？
4. `outputs/pretrain_chat_demo/` 为什么要同时保存模型和 tokenizer？
5. 操作题：如何运行快速预训练配置？

### 参考答案

1. 根据前面的 token 预测下一个 token。
2. 每个训练样本的 token 序列长度、上下文窗口和训练样本切块方式。
3. 真实预训练需要大规模数据、模型和算力；本章只是教学型 tiny 实验。
4. 后续 SFT 和推理可以直接从同一目录加载模型和 tokenizer，减少路径错误。
5. `python3 scripts/pretrain.py --config configs/pretrain_chat_demo_fast.json`。

## 06 最小 SFT 测试

### 题目

1. SFT 和预训练最大的区别是什么？
2. 为什么只对 assistant 回复部分计算 loss？
3. `-100` 在 labels 里表示什么？
4. 为什么本章走 CPU 友好的最小 SFT？
5. 操作题：5 epoch 的练习配置如何运行？

### 参考答案

1. 预训练学习通用 next-token prediction；SFT 学习在给定指令和上下文下输出期望回答。
2. system 和 user 是条件，不是要模型模仿生成的目标；assistant 回复才是训练目标。
3. ignore index，表示该位置不参与 loss 计算。
4. 为了让没有 GPU 或缺少 `trl`、`bitsandbytes` 的环境也能跑通 SFT 思想。
5. `python3 scripts/sft_train_minimal.py --config configs/sft_minimal_cpu_local_epoch5.json`。

## 07 LoRA / QLoRA 测试

### 题目

1. LoRA 为什么比全量微调更省资源？
2. QLoRA 在 LoRA 基础上又做了什么？
3. adapter 和 merged model 有什么区别？
4. 为什么 QLoRA 通常依赖 NVIDIA CUDA 和 `bitsandbytes`？
5. 判断：没有 GPU 时应该在 macOS 本机强行调通 QLoRA。对还是错？

### 参考答案

1. LoRA 冻结基座模型，只训练少量低秩 adapter 参数。
2. QLoRA 用 4bit 量化加载基座模型，同时训练 LoRA adapter，进一步节省显存。
3. adapter 是微调得到的小权重；merged model 是把 adapter 合并进基座模型后的完整目录。
4. 4bit 量化和高效训练通常依赖 CUDA 环境与 `bitsandbytes` 支持。
5. 错。没有 GPU 时先读懂配置和流程，实际训练放到合适的 Linux NVIDIA GPU 机器。

## 08 蒸馏测试

### 题目

1. teacher model 和 student model 分别是什么？
2. response distillation 和 logit distillation 有什么区别？
3. 为什么 teacher 回答需要人工抽检？
4. `distill_generate` 为什么需要模型服务？
5. 判断：teacher 生成的数据一定比人工数据更可靠。对还是错？

### 参考答案

1. teacher 是能力更强、用于生成答案或信号的模型；student 是学习 teacher 输出的模型。
2. response distillation 学 teacher 文本回答；logit distillation 学 teacher 的概率分布。
3. teacher 也可能幻觉、遗漏业务规则或生成不适合训练的回答。
4. 它要调用 OpenAI 兼容接口，让 teacher 对问题生成答案。
5. 错。teacher 数据仍需规则检查、模型辅助打分或人工抽检。

## 09 评测测试

### 题目

1. 为什么不能只看训练 loss？
2. exact match 和 keyword coverage 分别衡量什么？
3. 为什么要做相似训练样本分析？
4. 真实业务评测和样例报告有什么区别？
5. 操作题：生成样例评测报告的命令是什么？

### 参考答案

1. loss 不直接等于业务正确性，模型可能背题、漏关键词或在新问题上失败。
2. exact match 看预测和参考是否完全一致；keyword coverage 看回答是否覆盖关键业务词。
3. 判断模型是否只是复述训练样本，帮助分析过拟合和数据泄漏。
4. 真实业务评测调用模型服务并生成真实 predictions；样例报告基于已有 sample predictions。
5. `make report-eval-sample`。

## 10 本地推理测试

### 题目

1. 本地推理和批量评测有什么区别？
2. `temperature` 和 `top_p` 分别影响什么？
3. 为什么 REPL 调试要支持 `/clear`？
4. 推理输出很差时，应该只调解码参数吗？
5. 操作题：如何启动本地交互式 REPL？

### 参考答案

1. 本地推理适合单条或多轮调试；批量评测适合系统性统计模型表现。
2. `temperature` 控制随机性；`top_p` 控制采样候选范围。
3. 多轮历史会影响后续回答，`/clear` 可以清空上下文重新测试。
4. 不应该。还要检查数据、训练、prompt、上下文长度和是否过拟合。
5. `make infer-repl`。

## 11 vLLM 部署测试

### 题目

1. 为什么要把模型部署成 API 服务？
2. vLLM 在本课程中负责什么？
3. 为什么部署前通常要合并 LoRA adapter？
4. OpenAI 兼容接口有什么好处？
5. 判断：没有 GPU 时本章必须完整运行。对还是错？

### 参考答案

1. API 服务方便 Web、App、评测脚本和业务系统稳定调用模型。
2. 把模型目录启动成高吞吐 OpenAI 兼容推理服务。
3. merged model 部署更直接，减少运行时加载 base + adapter 的复杂度。
4. 调用格式统一，评测、蒸馏和业务接入可以复用同一套客户端逻辑。
5. 错。没有 GPU 时读懂脚本、配置和接口关系即可。

## 12 生产检查测试

### 题目

1. demo 和生产最大的差距是什么？
2. 上线前为什么必须有评测集？
3. 监控应该关注哪些指标？
4. 为什么需要回滚方案？
5. 判断：只要模型回答看起来不错，就可以上线。对还是错？

### 参考答案

1. 生产需要稳定性、安全、监控、成本、回滚和持续评测，不只是能跑。
2. 没有评测集就无法判断新模型是否比旧模型更好，也难以及时发现回归。
3. 延迟、错误率、吞吐、GPU 显存、回答质量、拒答率、异常问题等。
4. 新模型可能出现质量、安全或性能问题，回滚能降低事故影响。
5. 错。必须经过数据、训练、评测、服务、安全和监控检查。

## 13 毕业项目测试

### 题目

1. 毕业项目为什么要求写报告，而不只是跑命令？
2. CPU 教学路线和 GPU QLoRA 路线的项目目标有什么不同？
3. 项目报告里为什么必须包含失败样例分析？
4. 下一轮改进计划应该具体到什么程度？
5. 判断：如果模型效果差，毕业项目就失败了。对还是错？

### 参考答案

1. 报告能证明你理解了目标、数据、训练、评测、推理和改进计划，而不是只会执行命令。
2. CPU 路线重点是完整理解链路；GPU 路线更接近真实微调、合并、部署和评测。
3. 失败样例能暴露数据、训练、prompt、评测和业务规则的问题，是迭代依据。
4. 应该能指导下一次实验，例如新增哪些样本、改哪个配置、扩展哪类评测。
5. 错。教学项目重在完整复盘和定位问题；效果差也可以形成有价值的改进计划。

## 综合测试

### 题目

1. 画出从原始客服数据到本地推理输出的文件流。
2. 如果 `make infer-minimal` 输出很差，你会按什么顺序排查？
3. 如果 `make sft-8gb` 报 CUDA OOM，你会怎么处理？
4. 如果业务评测分数提高但人工抽检变差，可能是什么原因？
5. 你如何判断一个模型是在泛化，而不是背训练样本？

### 参考答案

1. `data/raw/customer_support_raw.jsonl` -> `scripts/prepare_sft_data.py` -> `data/sft/customer_support_prepared.jsonl` / sample SFT -> tokenizer -> pretraining -> SFT -> `outputs/sft_minimal_cpu_local/` -> inference。
2. 先确认模型目录和 tokenizer；再看 prompt 和生成参数；再查相似训练样本；再检查 SFT 数据和训练日志；最后考虑重新清洗数据或调整训练。
3. 降低 batch size、max sequence length，启用/增加 gradient accumulation，使用更保守配置，确认 `bitsandbytes` 和 CUDA 环境，必要时换更大显存 GPU。
4. 指标可能过窄，评测集不代表真实业务，模型可能迎合关键词但回答不完整，或样本分布发生偏移。
5. 用未见过的问题测试；看相似训练样本分数；人工检查回答是否只是复述；扩展评测集和同义改写样本。
