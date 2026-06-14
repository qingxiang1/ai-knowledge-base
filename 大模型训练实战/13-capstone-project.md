# 13 第十三章：毕业项目，训练一个客服助手

学习时长：120 分钟

本章类型：综合项目 + 复盘报告

本章产物：一份完整的“电商客服助手”项目记录

## 13.0 本章要完成什么

前面 12 章已经把大模型开发链路拆开讲完。

现在你要把它重新串起来，完成一个毕业项目：

```text
训练并评测一个电商客服助手
```

这个项目不要求你训练出生产级模型。

它要求你能完整说明：

```text
数据从哪里来
如何清洗
如何训练
如何推理
如何评测
模型有什么问题
下一轮怎么改
```

本章会给你两条路线。

第一条是 CPU 教学路线：

```text
适合本地完整跑通流程
```

第二条是 GPU QLoRA 路线：

```text
适合有 NVIDIA GPU 和部署环境的同学做更接近真实项目的版本
```

完成本章后，你应该拥有一份能交付、能复盘、能继续迭代的项目记录。

## 13.1 项目目标

项目名称：

```text
电商客服助手
```

它应该能处理：

- 发票问题
- 订单签收问题
- 待揽收问题
- 退款问题
- 退货问题
- 地址修改问题
- 物流不更新问题

回答风格：

```text
准确
简洁
可执行
不随意承诺
必要时要求用户提供订单号等信息
```

system prompt：

```text
你是一个电商客服助手，回答准确、简洁、可执行。
```

## 13.2 你需要提交什么

毕业项目至少提交这些内容。

数据产物：

```text
data/raw/customer_support_raw.jsonl
data/sft/customer_support_prepared.jsonl
outputs/data_prep/customer_support_rejected.jsonl
outputs/data_prep/prepare_sft_summary.json
```

模型产物：

```text
outputs/tokenizer_chat_demo/
outputs/pretrain_chat_demo/
outputs/sft_minimal_cpu_local/
```

如果走 GPU 路线，还包括：

```text
outputs/sft_qwen25_16gb/ 或其他 adapter 目录
outputs/qwen25_cs_merged/ 可选
```

评测产物：

```text
outputs/eval/customer_report.sample.md
outputs/eval/customer_report.md 可选
```

分析产物：

```text
至少 5 条推理样例
至少 3 条失败或风险样例分析
至少 3 条相似训练样本分析
下一轮改进计划
```

最终你应该写一份项目记录，可以放在：

```text
outputs/capstone/customer_support_project_report.md
```

本课程不强制提供生成脚本，你可以手写这份报告。

## 13.3 CPU 教学路线

如果你没有 NVIDIA GPU，走这条路线。

先检查环境：

```bash
make env-check
```

完整本地流水线：

```bash
make pipeline-local
```

单次推理：

```bash
make infer-minimal
```

交互式调试：

```bash
make infer-repl
```

相似样本检查：

```bash
make retrieve-similar
```

样例评测报告：

```bash
make report-eval-sample
```

CPU 路线的目标是：

```text
完整理解流程
证明代码链路可跑
能解释每个产物
能分析模型输出问题
```

不要把 tiny 模型输出质量当成生产目标。

## 13.4 GPU QLoRA 路线

如果你有合适的 NVIDIA GPU，可以走这条路线。

检查环境：

```bash
make env-check
```

准备数据：

```bash
make prepare-sft
```

选择一份配置：

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

合并 LoRA：

```bash
python3 scripts/merge_lora.py --config configs/merge_lora.json
```

启动服务：

```bash
bash scripts/serve_vllm.sh outputs/qwen25_cs_merged
```

业务评测：

```bash
python3 scripts/eval_business.py --config configs/eval_business.json
make report-eval
```

分析预测：

```bash
make analyze-preds
```

GPU 路线的目标是：

```text
在开源模型上做参数高效微调
部署成服务
用业务评测报告判断效果
```

## 13.5 第一步：记录业务目标

在项目报告里先写清楚：

```text
我要做一个电商客服助手。
```

然后写：

```text
目标用户是谁？
它回答哪些问题？
它不应该回答哪些问题？
什么回答算合格？
```

示例：

```text
本项目面向电商售后客服场景，目标是回答发票、物流、退款、退货相关问题。
合格回答需要准确、简洁、可执行，并在需要时要求用户提供订单号。
模型不应承诺一定退款、一定赔偿，也不应编造物流状态。
```

没有业务目标，后面的评测没有依据。

## 13.6 第二步：记录数据处理

运行：

```bash
make prepare-sft
```

在报告里记录：

```text
原始数据路径
清洗配置路径
清洗后数据路径
rejected 文件路径
summary 文件路径
```

打开 summary：

```bash
cat outputs/data_prep/prepare_sft_summary.json
```

写清楚：

```text
输入样本数
接受样本数
拒绝样本数
主要拒绝原因
```

还要抽样看 rejected：

```bash
sed -n '1,10p' outputs/data_prep/customer_support_rejected.jsonl
```

回答：

```text
有没有误删？
有没有明显噪声？
清洗规则是否合理？
```

## 13.7 第三步：记录训练路线

如果走 CPU 路线，记录：

```text
tokenizer 配置：configs/train_tokenizer_chat_demo.json
预训练配置：configs/pretrain_chat_demo.json
SFT 配置：configs/sft_minimal_cpu_local.json
```

并记录输出：

```text
outputs/tokenizer_chat_demo/
outputs/pretrain_chat_demo/
outputs/sft_minimal_cpu_local/
```

如果走 GPU 路线，记录：

```text
QLoRA 配置
base model
adapter 输出目录
是否 merge
merged model 输出目录
```

例如：

```text
base_model: Qwen/Qwen2.5-0.5B-Instruct
config: configs/sft_qlora_16gb.json
adapter: outputs/sft_qwen25_16gb
merged: outputs/qwen25_cs_merged
```

## 13.8 第四步：收集推理样例

至少测试 5 个问题：

```text
可以开发票吗？
发票抬头可以改成公司吗？
订单显示已签收但我没收到怎么办？
订单待揽收超过 48 小时怎么办？
商品买错了怎么申请退款？
```

CPU 路线可以用：

```bash
python3 scripts/infer_minimal.py \
  --config configs/infer_minimal_cpu_local.json \
  --prompt "可以开发票吗？"
```

每条样例记录：

```text
问题
模型回答
是否可接受
原因
是否和训练样本相似
```

不要只记录成功样例。

至少保留 1 到 3 条失败样例。

## 13.9 第五步：做相似训练样本分析

运行：

```bash
make retrieve-similar
```

或对指定问题运行：

```bash
python3 scripts/retrieve_similar_examples.py \
  --config configs/retrieve_similar_examples.json \
  --query "物流显示签收了，但我没拿到包裹怎么办？"
```

在报告里分析：

```text
最高相似度是多少？
最近训练样本是什么？
模型回答是否像复述训练答案？
如果换一种问法，回答是否仍然合理？
```

这一步帮助你区分：

```text
泛化
模板执行
背训练集
```

## 13.10 第六步：生成评测报告

CPU 教学路线：

```bash
make report-eval-sample
```

查看：

```text
outputs/eval/customer_report.sample.md
```

GPU / 服务路线：

```bash
python3 scripts/eval_business.py --config configs/eval_business.json
make report-eval
```

查看：

```text
outputs/eval/customer_report.md
```

在毕业项目报告里总结：

```text
Exact Match 情况
Keyword Coverage 情况
需要复核的样本
最近训练样本分析
失败样本原因
```

## 13.11 第七步：分析失败样例

失败样例比成功样例更有价值。

对每条失败样例，判断原因：

```text
训练数据缺失
训练数据错误
模型太小
训练轮数不足
训练过拟合
prompt 格式不稳定
解码参数不合适
业务规则本身不清楚
```

示例：

```text
问题：发票已经开过，还能改抬头吗？
模型回答：可以修改，请提供抬头和税号。
分析：回答缺少“已开票通常不能直接修改”的条件判断。训练集中类似样本不足，下一轮需要补充已开票场景。
```

## 13.12 第八步：写下一轮改进计划

改进计划要具体。

不要只写：

```text
继续优化模型。
```

应该写：

```text
新增 30 条发票变更边界样本
新增 20 条签收异常不同问法
把评测集扩展到 50 条
对 rejected 样本做人工复查
在 GPU 上改用 sft_qlora_16gb 配置训练
降低推理 temperature 做稳定性对比
```

下一轮计划应该能直接指导下一次实验。

## 13.13 项目报告模板

你可以按下面结构写报告。

```text
# 电商客服助手毕业项目报告

## 1. 项目目标

## 2. 环境与路线
- CPU 教学路线 / GPU QLoRA 路线
- env-check 摘要

## 3. 数据处理
- 原始数据
- 清洗配置
- accepted / rejected / summary

## 4. 训练过程
- tokenizer
- pretraining
- SFT / QLoRA
- 输出目录

## 5. 推理样例
- 至少 5 条
- 成功与失败都要有

## 6. 评测报告
- 指标
- 重点样本
- 最近训练样本

## 7. 问题分析
- 背题风险
- 失败场景
- 数据缺口

## 8. 下一轮计划
```

## 13.14 常见误区

### 13.14.1 只提交模型目录

模型目录不能说明项目质量。

必须同时提交：

```text
数据
配置
评测
推理样例
失败分析
```

### 13.14.2 只展示成功样例

只展示成功样例是 demo，不是项目复盘。

毕业项目必须分析失败样例。

### 13.14.3 没有相似样本分析

如果不看最近训练样本，很难判断模型是不是在背题。

### 13.14.4 没有下一轮计划

大模型项目通常是迭代式的。

一次训练很少直接完成。

没有下一轮计划，就不知道如何继续提高。

## 13.15 本章验收标准

完成毕业项目后，你应该能完整讲清楚：

- 数据从哪里来
- 数据如何清洗
- 为什么有些样本被拒绝
- 使用了哪条训练路线
- 每个模型输出目录是什么
- 模型如何推理
- 评测报告怎么看
- 哪些输出像背训练集
- 哪些问题模型答不好
- 下一轮应该补数据、改训练参数，还是换模型

## 13.16 课程收束

到这里，你已经走完了一条完整的大模型开发入门路线。

你不只是运行了几个命令，而是理解了：

```text
工程目录如何组织
配置如何驱动实验
数据如何清洗
tokenizer 如何工作
预训练如何构造样本
SFT 如何只训练 assistant 回复
LoRA / QLoRA 如何降低训练成本
蒸馏如何迁移 teacher 能力
评测如何避免只看 loss
推理调试如何定位问题
部署前为什么要检查生产风险
```

下一步不是追求一次性“训练出最强模型”。

更实际的下一步是：

```text
选一个真实业务场景
收集更高质量的数据
建立更可靠的评测集
做一轮可复现训练
分析失败样例
再迭代
```

这就是大模型开发的真实节奏。
