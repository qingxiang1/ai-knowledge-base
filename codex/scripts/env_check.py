from __future__ import annotations

import importlib
import json
import platform
import shutil
import subprocess
import sys
from pathlib import Path


def import_version(module_name: str) -> str:
    # Try importing a dependency and report a readable status instead of crashing.
    try:
        module = importlib.import_module(module_name)
    except Exception as exc:
        return f"missing ({exc.__class__.__name__})"
    return getattr(module, "__version__", "unknown")


def run_command(command: list[str]) -> tuple[bool, str]:
    # Run optional system commands such as nvidia-smi and capture their output.
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        return True, result.stdout.strip()
    except Exception as exc:
        return False, str(exc)


def check_torch() -> dict:
    # Keep a stable output shape even when torch is missing or broken.
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
                # Record GPU name and memory so we can recommend a fitting SFT preset.
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


def recommended_sft_config(torch_info: dict) -> str:
    # CPU-only machines should use the debug preset rather than QLoRA presets.
    if not torch_info["cuda_available"] or not torch_info["devices"]:
        return "configs/sft_qlora_cpu_debug.json"

    # Pick the largest safe preset based on the biggest visible GPU.
    max_memory = max(device["total_memory_gb"] for device in torch_info["devices"])
    if max_memory < 12:
        return "configs/sft_qlora_8gb.json"
    if max_memory < 24:
        return "configs/sft_qlora_16gb.json"
    return "configs/sft_qlora_24gb.json"


def main():
    # Torch/CUDA status drives the learning route recommendation.
    torch_info = check_torch()

    # nvidia-smi is optional; it usually exists only on NVIDIA GPU machines.
    nvidia_smi_found = shutil.which("nvidia-smi") is not None
    nvidia_smi_ok, nvidia_smi_output = (
        run_command(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"])
        if nvidia_smi_found
        else (False, "nvidia-smi not found")
    )

    # Collect everything into one JSON object so humans and scripts can both read it.
    summary = {
        "python_version": sys.version.split()[0],
        "platform": platform.platform(),
        "cwd": str(Path.cwd()),
        "packages": {
            "transformers": import_version("transformers"),
            "datasets": import_version("datasets"),
            "tokenizers": import_version("tokenizers"),
            "accelerate": import_version("accelerate"),
            "peft": import_version("peft"),
            "trl": import_version("trl"),
            "openai": import_version("openai"),
            "bitsandbytes": import_version("bitsandbytes"),
            "vllm": import_version("vllm"),
        },
        "torch": torch_info,
        "nvidia_smi": nvidia_smi_output if nvidia_smi_ok else nvidia_smi_output,
        "recommended_sft_config": recommended_sft_config(torch_info),
        "notes": [],
    }

    if not torch_info["cuda_available"]:
        # No CUDA is fine for the CPU teaching path, but QLoRA will not be practical.
        summary["notes"].append("当前未检测到可用 CUDA GPU，建议先用 configs/sft_qlora_cpu_debug.json 或仅跑 smoke test。")
    else:
        summary["notes"].append(
            f"检测到 {torch_info['cuda_device_count']} 张 CUDA GPU，可优先使用 {summary['recommended_sft_config']}。"
        )

    if "missing" in summary["packages"]["bitsandbytes"]:
        # bitsandbytes is required for the common 4bit QLoRA path.
        summary["notes"].append("未检测到 bitsandbytes，QLoRA 4bit 微调可能无法运行。")

    if "missing" in summary["packages"]["trl"]:
        # The full SFTTrainer path depends on TRL; the minimal CPU SFT path avoids it.
        summary["notes"].append("未检测到 trl，SFTTrainer 脚本无法运行，请先安装 trl。")

    if "missing" in summary["packages"]["vllm"]:
        # vLLM is only needed when serving a model as an API.
        summary["notes"].append("未检测到 vLLM，部署阶段请先安装 vllm。")

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
