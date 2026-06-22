新手建议按“先跑通，再理解，再优化”的顺序入手。别一开始就盯着 QLoRA、FSDP、vLLM 这些词猛啃，容易被术语糊一脸。你现在这套材料已经分得比较清楚了，可以这样走。

第一步

先读这两份：

README.md

training_handout.md

README 告诉你怎么跑工程，讲义告诉你学习顺序。先不用完整读完主教程，先建立“我要跑哪些命令”的感觉。

第二步

在项目目录里先跑：

bash

make env-check
make pipeline-local

这一步最重要。它会带你跑完一条本地教学链路：数据清洗、tokenizer、预训练、最小 SFT、推理、相似训练样本分析、样例评测报告。就算模型回答不聪明也没关系，这一步的目标是看见完整流程动起来。

第三步

跑完后重点看这些产物：

customer_support_prepared.jsonl

customer_support_rejected.jsonl

sft_minimal_cpu_local

customer_report.sample.md

这一步是在理解：数据怎么被清洗，模型怎么训练，评测报告怎么看。

第四步

再回头系统读主教程：

llm_development_beginner_tutorial.md

建议按章节读：

第 1-5 章：建立全流程认知
第 6 章：理解预训练
第 7 章：重点读微调和数据清洗
第 9 章：重点读评测和过拟合分析
第 10-11 章：了解部署和端到端路线

第五步

开始交互调试：

bash

make infer-repl
make retrieve-similar
make retrieve-semantic
make report-eval-sample

这一步练的是“模型不好时怎么查原因”。新手真正拉开差距的地方，不是能不能跑训练，而是能不能判断：是数据问题、训练问题、评测问题，还是部署问题。

第六步

如果你有 NVIDIA GPU，再进入 QLoRA：

qlora_gpu_walkthrough.md

按显存选择：

bash

make sft-8gb
make sft-16gb
make sft-24gb

如果没有 GPU，就先别硬上 QLoRA，把 CPU 教学链路、数据清洗、评测报告吃透，价值也很高。

推荐 7 天学习节奏：

第 1 天：读 README 和讲义，跑 make env-check
第 2 天：跑 make prepare-sft，理解数据清洗
第 3 天：跑 make pipeline-local
第 4 天：用 make infer-repl 连续提问
第 5 天：用 make retrieve-similar 分析模型是否背训练集
第 6 天：看评测报告，理解指标和错误样本
第 7 天：读主教程对应章节，整理自己的模型开发流程图

遇到报错时先看 troubleshooting.md。这份手册就是给“第一次卡住不知道从哪查”的阶段准备的。
