SHELL := /bin/zsh
PYTHON ?= python3
PIP ?= pip

TOKENIZER_CONFIG ?= configs/train_tokenizer.json
PRETRAIN_CONFIG ?= configs/pretrain_tiny.json
CHAT_DEMO_TOKENIZER_CONFIG ?= configs/train_tokenizer_chat_demo.json
CHAT_DEMO_PRETRAIN_CONFIG ?= configs/pretrain_chat_demo.json
SFT_CONFIG ?= configs/sft_qlora.json
DISTILL_GENERATE_CONFIG ?= configs/distill_generate.json
DISTILL_TRAIN_CONFIG ?= configs/distill_train.json
EVAL_BUSINESS_CONFIG ?= configs/eval_business.json
EVAL_LM_CONFIG ?= configs/eval_lm.json
MERGE_LORA_CONFIG ?= configs/merge_lora.json
MODEL ?= outputs/qwen25_cs_merged

.PHONY: help install env-check prepare-sft tokenizer tokenizer-chat-demo pretrain pretrain-chat-demo infer-minimal infer-repl retrieve-similar retrieve-semantic analyze-preds report-eval report-eval-sample pipeline-local sft sft-cpu sft-8gb sft-16gb sft-24gb sft-minimal demo-local distill-generate distill-train eval-business eval-lm merge-lora serve-vllm smoke

help:
	@echo "Available targets:"
	@echo "  make install            Install Python dependencies from requirements.txt"
	@echo "  make env-check          Inspect Python, PyTorch, CUDA, bitsandbytes and vLLM"
	@echo "  make prepare-sft        Clean raw JSONL into chat-format SFT JSONL"
	@echo "  make tokenizer          Train tokenizer with $(TOKENIZER_CONFIG)"
	@echo "  make tokenizer-chat-demo Train the tokenizer for the local chat demo"
	@echo "  make pretrain           Run the tiny pretraining example"
	@echo "  make pretrain-chat-demo Run the local chat-oriented pretraining example"
	@echo "  make infer-minimal      Run local inference on the minimal CPU SFT model"
	@echo "  make infer-repl         Start an interactive local chat REPL"
	@echo "  make retrieve-similar   Show the nearest SFT training examples for a query"
	@echo "  make retrieve-semantic  Show nearest SFT examples with embedding fallback"
	@echo "  make analyze-preds      Summarize evaluation predictions with nearest training examples"
	@echo "  make report-eval        Generate a Markdown business evaluation report"
	@echo "  make report-eval-sample Generate a Markdown report from sample predictions"
	@echo "  make pipeline-local     Run the complete local teaching pipeline"
	@echo "  make sft                Run LoRA / QLoRA supervised fine-tuning"
	@echo "  make sft-cpu            Run the CPU debug SFT preset"
	@echo "  make sft-8gb            Run the 8GB VRAM SFT preset"
	@echo "  make sft-16gb           Run the 16GB VRAM SFT preset"
	@echo "  make sft-24gb           Run the 24GB+ VRAM SFT preset"
	@echo "  make sft-minimal        Run the minimal CPU SFT script without TRL"
	@echo "  make distill-generate   Generate teacher answers for distillation"
	@echo "  make distill-train      Train a student model on distilled data"
	@echo "  make eval-business      Run lightweight business evaluation"
	@echo "  make eval-lm            Run lm-evaluation-harness wrapper"
	@echo "  make merge-lora         Merge LoRA adapter into the base model"
	@echo "  make serve-vllm         Serve MODEL with vLLM"
	@echo "  make smoke              Run tokenizer + tiny pretrain smoke path"
	@echo "  make demo-local         Run tokenizer + chat pretrain + minimal SFT + local inference"
	@echo ""
	@echo "Override configs like this:"
	@echo "  make sft SFT_CONFIG=configs/my_sft.json"
	@echo "  make serve-vllm MODEL=outputs/my_merged_model"

install:
	$(PIP) install -r requirements.txt

env-check:
	$(PYTHON) scripts/env_check.py

prepare-sft:
	$(PYTHON) scripts/prepare_sft_data.py --config configs/prepare_sft_data.json

tokenizer:
	$(PYTHON) scripts/train_tokenizer.py --config $(TOKENIZER_CONFIG)

tokenizer-chat-demo:
	$(PYTHON) scripts/train_tokenizer.py --config $(CHAT_DEMO_TOKENIZER_CONFIG)

pretrain:
	$(PYTHON) scripts/pretrain.py --config $(PRETRAIN_CONFIG)

pretrain-chat-demo:
	$(PYTHON) scripts/pretrain.py --config $(CHAT_DEMO_PRETRAIN_CONFIG)

infer-minimal:
	$(PYTHON) scripts/infer_minimal.py --config configs/infer_minimal_cpu_local.json

infer-repl:
	$(PYTHON) scripts/infer_repl.py --config configs/infer_repl_cpu_local.json

retrieve-similar:
	$(PYTHON) scripts/retrieve_similar_examples.py --config configs/retrieve_similar_examples.json --query "订单显示已签收但我没有收到，该怎么办？"

retrieve-semantic:
	$(PYTHON) scripts/retrieve_similar_semantic.py --config configs/retrieve_similar_semantic.json --query "订单显示已签收但我没有收到，该怎么办？"

analyze-preds:
	$(PYTHON) scripts/analyze_predictions.py --predictions outputs/eval/customer_predictions.jsonl

report-eval:
	$(PYTHON) scripts/generate_eval_report.py --predictions outputs/eval/customer_predictions.jsonl --metrics outputs/eval/customer_metrics.json --output outputs/eval/customer_report.md

report-eval-sample:
	$(PYTHON) scripts/generate_eval_report.py --predictions outputs/eval/customer_predictions.sample.jsonl --output outputs/eval/customer_report.sample.md

sft:
	$(PYTHON) scripts/sft_train.py --config $(SFT_CONFIG)

sft-cpu:
	$(PYTHON) scripts/sft_train.py --config configs/sft_qlora_cpu_debug.json

sft-8gb:
	$(PYTHON) scripts/sft_train.py --config configs/sft_qlora_8gb.json

sft-16gb:
	$(PYTHON) scripts/sft_train.py --config configs/sft_qlora_16gb.json

sft-24gb:
	$(PYTHON) scripts/sft_train.py --config configs/sft_qlora_24gb.json

sft-minimal:
	$(PYTHON) scripts/sft_train_minimal.py --config configs/sft_minimal_cpu_local.json

demo-local:
	$(PYTHON) scripts/train_tokenizer.py --config $(CHAT_DEMO_TOKENIZER_CONFIG)
	$(PYTHON) scripts/pretrain.py --config $(CHAT_DEMO_PRETRAIN_CONFIG)
	$(PYTHON) scripts/sft_train_minimal.py --config configs/sft_minimal_cpu_local.json
	$(PYTHON) scripts/infer_minimal.py --config configs/infer_minimal_cpu_local.json

pipeline-local:
	$(PYTHON) scripts/prepare_sft_data.py --config configs/prepare_sft_data.json
	$(PYTHON) scripts/train_tokenizer.py --config $(CHAT_DEMO_TOKENIZER_CONFIG)
	$(PYTHON) scripts/pretrain.py --config $(CHAT_DEMO_PRETRAIN_CONFIG)
	$(PYTHON) scripts/sft_train_minimal.py --config configs/sft_minimal_cpu_local.json
	$(PYTHON) scripts/infer_minimal.py --config configs/infer_minimal_cpu_local.json --show-similar
	$(PYTHON) scripts/retrieve_similar_examples.py --config configs/retrieve_similar_examples.json --query "订单显示已签收但我没有收到，该怎么办？"
	$(PYTHON) scripts/generate_eval_report.py --predictions outputs/eval/customer_predictions.sample.jsonl --output outputs/eval/customer_report.sample.md

distill-generate:
	$(PYTHON) scripts/distill_generate.py --config $(DISTILL_GENERATE_CONFIG)

distill-train:
	$(PYTHON) scripts/distill_train.py --config $(DISTILL_TRAIN_CONFIG)

eval-business:
	$(PYTHON) scripts/eval_business.py --config $(EVAL_BUSINESS_CONFIG)

eval-lm:
	$(PYTHON) scripts/eval_lm.py --config $(EVAL_LM_CONFIG)

merge-lora:
	$(PYTHON) scripts/merge_lora.py --config $(MERGE_LORA_CONFIG)

serve-vllm:
	bash scripts/serve_vllm.sh $(MODEL)

smoke:
	$(PYTHON) scripts/train_tokenizer.py --config $(TOKENIZER_CONFIG)
	$(PYTHON) scripts/pretrain.py --config $(PRETRAIN_CONFIG)
