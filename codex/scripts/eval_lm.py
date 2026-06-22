from __future__ import annotations

import argparse
import shlex
import subprocess

from common import load_json


def parse_args():
    parser = argparse.ArgumentParser(description="Thin wrapper around lm-evaluation-harness.")
    parser.add_argument("--config", required=True, help="Path to JSON config.")
    return parser.parse_args()


def main():
    args = parse_args()
    config = load_json(args.config)

    command = [
        "lm_eval",
        "--model",
        config["model_backend"],
        "--model_args",
        config["model_args"],
        "--tasks",
        ",".join(config["tasks"]),
        "--device",
        config.get("device", "cuda:0"),
        "--batch_size",
        str(config.get("batch_size", "auto")),
        "--output_path",
        config["output_path"],
    ]

    print("Running:", shlex.join(command))
    subprocess.run(command, check=True)


if __name__ == "__main__":
    main()
