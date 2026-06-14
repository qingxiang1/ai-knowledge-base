# 大模型开发术语表

这份术语表适合在学习 00 到 13 章时随手查。它不替代正文解释，只帮你快速知道一个词大概属于哪一层、在课程里哪里会用到。

## 学习方式

遇到不熟的词时，建议按三步看：

```text
这个词解决什么问题？
它出现在数据、训练、推理、评测还是部署阶段？
本课程哪一章会真正用到它？
```

## 基础概念

| 术语 | 简明解释 | 相关章节 |
| --- | --- | --- |
| AI | 人工智能的总称，机器学习和深度学习都属于 AI 范围 | 附录 |
| 机器学习 | 让系统从数据中学习规律，而不是完全靠人工规则 | 附录 |
| 深度学习 | 使用多层神经网络学习表示和任务规律 | 附录 |
| 神经网络 | 由多层可训练参数组成的函数 | 附录 |
| 参数 / 权重 | 模型中会被训练更新的数值 | 05、06、07 |
| loss | 衡量模型预测和目标之间差距的训练指标 | 05、06、09 |
| 梯度 | 指示参数应该如何调整才能降低 loss 的方向信息 | 附录、05 |
| 反向传播 | 从 loss 往回计算每个参数梯度的算法过程 | 附录 |
| 优化器 | 根据梯度更新参数的算法，如 AdamW | 05、06、07 |
| 过拟合 | 模型太贴合训练集，遇到新问题效果变差 | 09 |
| 泛化 | 模型在没见过的新输入上仍能表现良好 | 03、09 |

## 文本与模型结构

| 术语 | 简明解释 | 相关章节 |
| --- | --- | --- |
| token | 模型处理文本的基本单位，可以是字、子词或符号片段 | 04 |
| tokenizer | 把文本转成 token id，也能把 token id 解码回文本 | 04 |
| token id | token 在词表里的数字编号 | 04、05 |
| vocabulary / vocab | tokenizer 的词表 | 04 |
| embedding | 把 token id 映射成连续向量的表示 | 附录、04 |
| attention | 让模型在处理当前位置时关注上下文其他位置的机制 | 附录 |
| self-attention | 同一段序列内部的 token 互相关注 | 附录 |
| multi-head attention | 多组 attention 并行学习不同关系 | 附录 |
| Transformer | 当前主流大语言模型的核心网络结构 | 附录、05 |
| decoder-only | GPT、Llama、Qwen 等模型常用结构，适合自回归生成 | 附录、05 |
| causal language model | 根据前文预测下一个 token 的语言模型 | 05 |
| context length | 模型一次能处理的最大上下文 token 数 | 10、11 |

## 数据与训练

| 术语 | 简明解释 | 相关章节 |
| --- | --- | --- |
| JSONL | 每行一个 JSON 对象的数据格式，适合流式处理训练数据 | 03 |
| messages | 聊天模型常用数据结构，包含 system/user/assistant 消息 | 03、06 |
| system prompt | 定义助手角色、边界和回答风格的系统提示 | 03、06、10 |
| SFT | 监督微调，让模型学习按指令或业务样例回答 | 06、07 |
| pretraining | 预训练，让模型学习通用语言规律 | 05 |
| distillation | 蒸馏，用 teacher 模型生成数据或信号训练 student 模型 | 08 |
| teacher model | 蒸馏里的强模型，负责生成更高质量答案 | 08 |
| student model | 蒸馏里的被训练模型，学习 teacher 的输出 | 08 |
| train split | 训练集，用于更新模型参数 | 05、06 |
| validation split | 验证集，用于观察模型是否过拟合 | 05、06 |
| batch size | 一次送入模型的样本数量 | 05、06、07 |
| epoch | 完整看完训练集一遍 | 05、06 |
| step | 通常指一次参数更新 | 05、06 |
| gradient accumulation | 多个小 batch 累积梯度，再做一次参数更新 | 05、07 |
| learning rate | 参数更新步幅，太大易不稳定，太小学得慢 | 05、06、07 |
| checkpoint | 训练过程中保存的模型快照 | 05、06 |

## 微调与显存

| 术语 | 简明解释 | 相关章节 |
| --- | --- | --- |
| fine-tuning | 在已有模型上继续训练，使其适合特定任务 | 06、07 |
| full fine-tuning | 更新模型全部或大部分参数，显存成本高 | 07 |
| LoRA | 冻结基座模型，只训练低秩 adapter 的参数高效微调方法 | 07 |
| QLoRA | 4bit 量化加载基座模型，同时训练 LoRA adapter 的省显存方法 | 07 |
| adapter | LoRA 训练得到的小参数模块，需要和基座模型一起使用 | 07、11 |
| merged model | 把 adapter 合并进基座模型后的完整模型目录 | 07、11 |
| quantization | 量化，用更低精度表示模型权重以降低显存占用 | 07 |
| 4bit / 8bit | 常见量化精度，bit 数越低越省显存但更依赖工具支持 | 07 |
| bf16 | 常见半精度格式，在现代 GPU 上常用于训练和推理 | 05、07 |
| fp16 | 另一种半精度格式，也常用于 GPU 训练和推理 | 07 |
| CUDA | NVIDIA GPU 的计算平台，QLoRA 和 vLLM 通常依赖它 | 02、07、11 |
| OOM | out of memory，显存或内存不足 | 07、11 |

## 工具生态

| 术语 | 简明解释 | 相关章节 |
| --- | --- | --- |
| PyTorch | 本课程使用的底层深度学习框架 | 附录、05、06 |
| TensorFlow | 另一套深度学习框架，本课程作为了解项 | 附录 |
| Transformers | Hugging Face 模型、tokenizer、Trainer 和生成接口生态 | 04、05、06、10 |
| Datasets | Hugging Face 数据读取和处理工具 | 05、06 |
| PEFT | 参数高效微调工具库，常用于 LoRA / QLoRA | 07、08 |
| TRL | Hugging Face 对齐训练工具库，提供 SFTTrainer 等能力 | 07 |
| bitsandbytes | 支持 4bit / 8bit 量化加载的工具库 | 07 |
| vLLM | 高吞吐大模型推理和服务框架 | 11 |
| Makefile | 把常用脚本封装成 `make xxx` 命令的入口 | 00、README |
| config | 配置文件，用 JSON 保存路径、训练参数和输出位置 | 00、02 |

## 推理、评测与部署

| 术语 | 简明解释 | 相关章节 |
| --- | --- | --- |
| inference | 推理，使用训练好的模型生成回答 | 10 |
| generate | Transformers 里常见的文本生成接口 | 10 |
| temperature | 控制生成随机性的参数，越高越发散 | 10 |
| top_p | nucleus sampling 参数，控制采样候选 token 范围 | 10 |
| greedy decoding | 每一步都选概率最高的 token，稳定但可能呆板 | 10 |
| REPL | 交互式命令行调试环境 | 10 |
| evaluation | 评测，用指标和样例判断模型是否真的可用 | 09 |
| exact match | 预测文本和参考答案完全一致的指标 | 09 |
| keyword coverage | 检查回答是否覆盖业务关键词的指标 | 09 |
| lexical similarity | 基于字面重合度的相似样本检索 | 09 |
| semantic similarity | 基于 embedding 的语义相似度检索 | 09 |
| OpenAI 兼容接口 | 使用类似 OpenAI API 格式访问本地或远端模型服务 | 08、09、11 |
| API service | 把模型封装成可通过 HTTP 调用的服务 | 11 |
| rollback | 回滚，在新模型异常时切回旧版本 | 12 |
| monitoring | 监控模型服务的延迟、错误率、资源和回答质量 | 12 |

## 课程里最容易混淆的几组词

### tokenizer 和 embedding

tokenizer 是规则或模型化的文本切分器，负责把文本变成 token id。

embedding 是神经网络层，负责把 token id 变成向量。

### pretraining 和 SFT

pretraining 学的是通用的 next-token prediction。

SFT 学的是如何按照指令、角色和业务样例回答。

### adapter 和 merged model

adapter 是 LoRA 微调得到的小权重，通常不能单独部署。

merged model 是把 adapter 合并进基座模型后的完整模型目录，更适合部署。

### loss 和业务指标

loss 是训练过程里的 token 预测误差。

业务指标关注回答是否正确、完整、安全、可执行。

### 没有 GPU 和不能学习

没有 NVIDIA GPU 只是不适合本地跑 QLoRA 或 vLLM。

你仍然可以完成 CPU 教学路线，学习数据、tokenizer、预训练、SFT、评测和本地推理的完整链路。

## 推荐查阅顺序

如果一个词在这里仍然看不懂，可以按这个顺序回到课程：

```text
基础概念不懂：读 appendix-foundations.md
工程结构不懂：读 00 / 01 / 02
数据格式不懂：读 03
tokenizer 不懂：读 04
训练不懂：读 05 / 06 / 07
评测不懂：读 09
推理不懂：读 10
部署不懂：读 11 / 12
```
