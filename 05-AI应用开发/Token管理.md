<!--
  创建时间: 2026-06-03
  文件名: Token管理.md
  文件描述: Token管理与计算详解，补充企业级预算治理、监控告警与验收清单
  作者: Felix(LQX5731@163.com)
  版本号: v1.1.0
  最后更新时间: 2026-06-05
-->

# Token管理与计算

> Token是大语言模型处理文本的最小单位，理解Token机制对成本控制、性能优化和上下文管理至关重要

---

## 零、前置知识

阅读本节前，建议先了解以下内容：

| 前置章节 | 关联点 |
|---------|-------|
| [Token机制](../02-AI基础知识/Token机制.md) | Token 的分词原理和编码方式（本节的前置理论基础） |
| [LLM工作原理](../02-AI基础知识/LLM工作原理.md) | 理解上下文窗口的技术原理——Transformer 的注意力机制 |
| [Prompt基础](../03-Prompt工程/Prompt基础.md) | Prompt 长度直接影响 Token 消耗和 API 成本 |
| [Prompt优化技巧](../03-Prompt工程/Prompt优化技巧.md) | 减少 Token 消耗的 Prompt 优化策略 |
| [OpenAI_API](./OpenAI_API.md) | OpenAI API 的 usage 字段返回 Token 消耗数据 |
| [成本优化](./成本优化.md) | Token 管理是成本优化的基础，两者紧密关联 |

---

## 本章学习目标

完成本节后，你应该能够：

- 理解 Token 与字符、单词、上下文长度和计费的关系
- 完成主流平台的 Token 估算、预算拆分和成本预警设计
- 设计上下文裁剪、摘要压缩、分层模型和缓存等 Token 优化策略
- 建立 Token 使用监控、告警和运营看板
- 输出一份适用于企业系统的 Token 管理方案

## 一、Token基础概念

### 1.1 什么是Token

```
Token 定义与特征：

├── 本质：模型处理文本的最小单位
├── 与字符的关系：
│   ├── 英文：1 token ≈ 4个字符 或 0.75个单词
│   ├── 中文：1 token ≈ 1-2个汉字
│   └── 代码：1 token ≈ 1-4个字符（取决于语言）
└── 为什么不用字符：
    ├── 效率：token压缩了常见词组
    ├── 语义：保持词义完整性
    └── 泛化：处理未登录词

分词示例：
英文："Hello world" → ["Hello", " world"] (2 tokens)
中文："你好世界" → ["你好", "世界"] 或 ["你", "好", "世界"] (2-3 tokens)
代码："function()" → ["function", "()"] (2 tokens)
数字："1234567890" → ["1234567890"] 或 ["12", "34", "56", "78", "90"] (1-5 tokens)
```

### 1.2 主流分词器对比

```
分词器体系：

OpenAI (tiktoken)
├── 编码：cl100k_base (GPT-4), o200k_base (GPT-4o)
├── 特点：BPE算法，中英文混合优化
├── 工具：tiktoken库
└── 特点：空格前缀敏感（"hello"和" hello"不同）

Claude (Claude tokenizer)
├── 基于：类BPE算法
├── 特点：对代码和XML友好
├── 工具：官方未开源，社区实现
└── 特点：与OpenAI token数通常差异10-20%

Google (SentencePiece)
├── 编码：适用于Gemini系列
├── 特点：Unigram语言模型
├── 工具：sentencepiece库
└── 特点：多语言支持好

DeepSeek
├── 兼容：与OpenAI tiktoken基本一致
├── 特点：针对中文优化
└── 工具：可用tiktoken估算

通用规则（估算）：
├── 英文文本：1 token ≈ 4字符
├── 中文文本：1 token ≈ 1.5汉字
├── 代码：1 token ≈ 3-4字符
└── 混合内容：按实际分词器计算
```

---

## 二、Token计算实战

### 2.1 Python计算

```python
"""
Token计算工具
"""

import tiktoken

def count_tokens(text: str, model: str = "gpt-4o") -> int:
    """
    计算文本的token数量
    
    Args:
        text: 待计算文本
        model: 模型名称（决定编码器）
    
    Returns:
        token数量
    """
    # 获取对应编码器
    encoding = tiktoken.encoding_for_model(model)
    
    # 编码并计数
    tokens = encoding.encode(text)
    return len(tokens)

# 示例
print(count_tokens("Hello world", "gpt-4o"))  # 2
print(count_tokens("你好世界", "gpt-4o"))     # 4-6（取决于编码）

# 查看token分解
def show_tokens(text: str, model: str = "gpt-4o"):
    """显示文本的token分解"""
    encoding = tiktoken.encoding_for_model(model)
    tokens = encoding.encode(text)
    
    print(f"文本: {text}")
    print(f"Token数: {len(tokens)}")
    print("分解:")
    
    for i, token_id in enumerate(tokens):
        token_bytes = encoding.decode_single_token_bytes(token_id)
        print(f"  [{i}] id={token_id}, bytes={token_bytes}, text={token_bytes.decode('utf-8', errors='replace')}")

show_tokens("Hello world")
# 输出：
# 文本: Hello world
# Token数: 2
# 分解:
#   [0] id=9906, bytes=b'Hello', text=Hello
#   [1] id=4438, bytes=b' world', text= world

# 消息列表token计算（含开销）
def count_message_tokens(messages: list, model: str = "gpt-4o") -> int:
    """
    计算消息列表的总token数（含格式开销）
    
    OpenAI消息格式开销：
    - 每条消息：4 tokens（格式开销）
    - 系统消息：额外开销
    - 角色名：按实际token计算
    """
    encoding = tiktoken.encoding_for_model(model)
    
    total_tokens = 0
    
    for message in messages:
        # 每条消息基础开销
        total_tokens += 4
        
        # 角色名
        total_tokens += len(encoding.encode(message["role"]))
        
        # 内容
        total_tokens += len(encoding.encode(message.get("content", "")))
        
        # 工具调用（如果有）
        if "tool_calls" in message:
            for tool_call in message["tool_calls"]:
                total_tokens += len(encoding.encode(tool_call["function"]["name"]))
                total_tokens += len(encoding.encode(tool_call["function"]["arguments"]))
        
        # 工具结果
        if "tool_call_id" in message:
            total_tokens += len(encoding.encode(message["tool_call_id"]))
            total_tokens += len(encoding.encode(message.get("content", "")))
    
    # 助手回复预留
    total_tokens += 3
    
    return total_tokens

# 计算示例
messages = [
    {"role": "system", "content": "你是一个 helpful 助手"},
    {"role": "user", "content": "你好，请介绍一下自己"}
]
print(f"消息token数: {count_message_tokens(messages)}")
```

### 2.2 各平台Token计算

```python
"""
多平台Token计算
"""

import tiktoken

class TokenCounter:
    """多平台Token计数器"""
    
    def __init__(self):
        self.encoders = {}
    
    def _get_encoder(self, model: str):
        """获取编码器（带缓存）"""
        if model not in self.encoders:
            try:
                self.encoders[model] = tiktoken.encoding_for_model(model)
            except KeyError:
                # 未知模型使用cl100k_base
                self.encoders[model] = tiktoken.get_encoding("cl100k_base")
        return self.encoders[model]
    
    def count(self, text: str, model: str = "gpt-4o") -> int:
        """计算单条文本token"""
        encoder = self._get_encoder(model)
        return len(encoder.encode(text))
    
    def count_messages(self, messages: list, model: str = "gpt-4o") -> dict:
        """
        计算消息列表token详情
        
        Returns:
            {
                "total": 总token数,
                "breakdown": [
                    {"role": "user", "content_tokens": 10, "overhead": 4},
                    ...
                ]
            }
        """
        encoder = self._get_encoder(model)
        breakdown = []
        total = 0
        
        for msg in messages:
            content_tokens = len(encoder.encode(msg.get("content", "")))
            role_tokens = len(encoder.encode(msg["role"]))
            overhead = 4  # 格式开销
            
            msg_total = content_tokens + role_tokens + overhead
            total += msg_total
            
            breakdown.append({
                "role": msg["role"],
                "content_tokens": content_tokens,
                "role_tokens": role_tokens,
                "overhead": overhead,
                "total": msg_total
            })
        
        # 助手回复预留
        total += 3
        
        return {
            "total": total,
            "breakdown": breakdown
        }

# 使用示例
counter = TokenCounter()

# 单条计算
print(f"GPT-4o: {counter.count('你好世界', 'gpt-4o')} tokens")

# 消息列表
messages = [
    {"role": "system", "content": "你是一个专业助手"},
    {"role": "user", "content": "解释量子计算"},
    {"role": "assistant", "content": "量子计算是一种利用量子力学原理进行计算的技术..."}
]
result = counter.count_messages(messages, "gpt-4o")
print(f"总token: {result['total']}")
for item in result['breakdown']:
    print(f"  {item['role']}: 内容={item['content_tokens']}, 开销={item['overhead']}, 小计={item['total']}")
```

---

## 三、上下文窗口管理

### 3.1 上下文窗口限制

```
主流模型上下文窗口：

OpenAI
├── GPT-4o: 128K tokens
├── GPT-4 Turbo: 128K tokens
├── GPT-4: 8K / 32K tokens
└── GPT-3.5 Turbo: 16K tokens

Claude
├── Claude 3.5 Sonnet: 200K tokens
├── Claude 3 Opus: 200K tokens
├── Claude 3 Haiku: 200K tokens
└── 支持超长文档（整本书）

Gemini
├── Gemini 1.5 Pro: 1M tokens（公测）
├── Gemini 1.5 Flash: 1M tokens
└── Gemini 1.0 Pro: 32K tokens

DeepSeek
├── DeepSeek-V3: 64K tokens
├── DeepSeek-R1: 64K tokens
└── 支持128K（部分场景）

上下文窗口 = 输入 + 输出
├── 输入：系统提示 + 历史消息 + 当前输入
├── 输出：模型生成的回复
└── 超过限制：报错或截断
```

### 3.2 上下文管理策略

```python
"""
上下文窗口管理策略
"""

from typing import List, Dict
import tiktoken

class ContextManager:
    """上下文管理器"""
    
    def __init__(self, model: str = "gpt-4o", max_tokens: int = 128000):
        self.encoding = tiktoken.encoding_for_model(model)
        self.max_tokens = max_tokens
        self.reserve_tokens = 4096  # 为输出预留
    
    def count_tokens(self, text: str) -> int:
        """计算token数"""
        return len(self.encoding.encode(text))
    
    def truncate_by_tokens(self, text: str, max_tokens: int) -> str:
        """按token数截断文本"""
        tokens = self.encoding.encode(text)
        if len(tokens) <= max_tokens:
            return text
        return self.encoding.decode(tokens[:max_tokens])
    
    def sliding_window(
        self,
        messages: List[Dict],
        max_history: int = 10
    ) -> List[Dict]:
        """
        滑动窗口：保留最近N条消息
        
        策略：保留系统消息 + 最近N轮对话
        """
        if len(messages) <= max_history + 1:
            return messages
        
        # 保留系统消息
        system_msgs = [m for m in messages if m["role"] == "system"]
        
        # 保留最近N条非系统消息
        other_msgs = [m for m in messages if m["role"] != "system"]
        recent_msgs = other_msgs[-max_history:]
        
        return system_msgs + recent_msgs
    
    def summarize_older_messages(
        self,
        messages: List[Dict],
        threshold: int = 10000
    ) -> List[Dict]:
        """
        摘要策略：旧消息压缩为摘要
        
        当消息总token超过阈值时，将早期消息替换为摘要
        """
        total = sum(
            4 + len(self.encoding.encode(m["role"])) + len(self.encoding.encode(m.get("content", "")))
            for m in messages
        )
        
        if total <= threshold:
            return messages
        
        # 找到需要摘要的分界点
        system_msgs = [m for m in messages if m["role"] == "system"]
        other_msgs = [m for m in messages if m["role"] != "system"]
        
        # 保留最近50%的消息，摘要前面的
        split_idx = len(other_msgs) // 2
        old_msgs = other_msgs[:split_idx]
        new_msgs = other_msgs[split_idx:]
        
        # 生成摘要（实际应用中调用模型生成）
        summary = f"[之前对话摘要] 共{len(old_msgs)}条消息，讨论了..."
        
        return system_msgs + [{"role": "system", "content": summary}] + new_msgs
    
    def trim_to_fit(
        self,
        messages: List[Dict],
        current_input: str = ""
    ) -> List[Dict]:
        """
        智能截断：确保总token在限制内
        
        策略优先级：
        1. 保留系统消息
        2. 保留当前输入
        3. 从旧到新截断历史消息
        """
        input_tokens = self.count_tokens(current_input) + 4  # 角色开销
        available = self.max_tokens - self.reserve_tokens - input_tokens
        
        # 分离系统消息和其他消息
        system_msgs = [m for m in messages if m["role"] == "system"]
        history_msgs = [m for m in messages if m["role"] != "system"]
        
        # 计算系统消息token
        system_tokens = sum(
            4 + len(self.encoding.encode(m["role"])) + len(self.encoding.encode(m.get("content", "")))
            for m in system_msgs
        )
        
        available_for_history = available - system_tokens
        
        # 从后往前保留历史消息
        trimmed_history = []
        current_count = 0
        
        for msg in reversed(history_msgs):
            msg_tokens = (
                4 + 
                len(self.encoding.encode(msg["role"])) + 
                len(self.encoding.encode(msg.get("content", "")))
            )
            
            if current_count + msg_tokens <= available_for_history:
                trimmed_history.insert(0, msg)
                current_count += msg_tokens
            else:
                break
        
        result = system_msgs + trimmed_history
        
        # 添加当前输入
        if current_input:
            result.append({"role": "user", "content": current_input})
        
        return result

# 使用示例
manager = ContextManager(model="gpt-4o", max_tokens=128000)

# 长历史消息
long_history = [
    {"role": "system", "content": "你是助手"},
] + [
    {"role": "user", "content": f"问题{i}"},
    {"role": "assistant", "content": f"回答{i}" * 100}
    for i in range(50)
]

# 滑动窗口
windowed = manager.sliding_window(long_history, max_history=6)
print(f"滑动窗口后: {len(windowed)}条消息")

# 智能截断
fitted = manager.trim_to_fit(long_history, current_input="新问题")
print(f"截断后: {len(fitted)}条消息")
```

---

## 四、Token使用监控

```python
"""
Token使用监控与告警
"""

import time
from dataclasses import dataclass
from typing import Dict, List
from collections import deque

@dataclass
class TokenUsage:
    """单次调用的Token使用记录"""
    timestamp: float
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: float

class TokenMonitor:
    """Token使用监控器"""
    
    # 模型定价（每1K tokens，美元）
    PRICING = {
        "gpt-4o": {"input": 0.0025, "output": 0.01},
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
        "gpt-4-turbo": {"input": 0.01, "output": 0.03},
        "claude-3-5-sonnet": {"input": 0.003, "output": 0.015},
        "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
        "gemini-1.5-pro": {"input": 0.00125, "output": 0.005},
        "deepseek-chat": {"input": 0.00014, "output": 0.00028},
        "deepseek-reasoner": {"input": 0.00055, "output": 0.00219},
    }
    
    def __init__(self, window_size: int = 1000):
        self.usage_history: deque = deque(maxlen=window_size)
        self.daily_stats: Dict[str, Dict] = {}
    
    def record(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int
    ) -> TokenUsage:
        """记录一次API调用的token使用"""
        
        pricing = self.PRICING.get(model, {"input": 0.0, "output": 0.0})
        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (output_tokens / 1000) * pricing["output"]
        total_cost = input_cost + output_cost
        
        usage = TokenUsage(
            timestamp=time.time(),
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            cost_usd=total_cost
        )
        
        self.usage_history.append(usage)
        self._update_daily_stats(usage)
        
        return usage
    
    def _update_daily_stats(self, usage: TokenUsage):
        """更新每日统计"""
        day_key = time.strftime("%Y-%m-%d", time.localtime(usage.timestamp))
        
        if day_key not in self.daily_stats:
            self.daily_stats[day_key] = {
                "total_calls": 0,
                "total_input_tokens": 0,
                "total_output_tokens": 0,
                "total_cost": 0.0,
                "models": set()
            }
        
        stats = self.daily_stats[day_key]
        stats["total_calls"] += 1
        stats["total_input_tokens"] += usage.input_tokens
        stats["total_output_tokens"] += usage.output_tokens
        stats["total_cost"] += usage.cost_usd
        stats["models"].add(usage.model)
    
    def get_stats(self, days: int = 7) -> Dict:
        """获取最近N天统计"""
        recent_days = sorted(self.daily_stats.keys())[-days:]
        
        total_cost = sum(self.daily_stats[d]["total_cost"] for d in recent_days)
        total_input = sum(self.daily_stats[d]["total_input_tokens"] for d in recent_days)
        total_output = sum(self.daily_stats[d]["total_output_tokens"] for d in recent_days)
        total_calls = sum(self.daily_stats[d]["total_calls"] for d in recent_days)
        
        return {
            "period_days": days,
            "total_calls": total_calls,
            "total_input_tokens": total_input,
            "total_output_tokens": total_output,
            "total_tokens": total_input + total_output,
            "total_cost_usd": round(total_cost, 4),
            "avg_cost_per_call": round(total_cost / total_calls, 6) if total_calls > 0 else 0,
            "daily_breakdown": {
                d: {
                    "calls": self.daily_stats[d]["total_calls"],
                    "cost_usd": round(self.daily_stats[d]["total_cost"], 4),
                    "tokens": self.daily_stats[d]["total_input_tokens"] + self.daily_stats[d]["total_output_tokens"]
                }
                for d in recent_days
            }
        }
    
    def check_budget_alert(self, daily_budget_usd: float = 100.0) -> bool:
        """检查是否超出日预算"""
        today = time.strftime("%Y-%m-%d")
        
        if today not in self.daily_stats:
            return False
        
        today_cost = self.daily_stats[today]["total_cost"]
        return today_cost >= daily_budget_usd
    
    def estimate_cost(
        self,
        model: str,
        input_tokens: int,
        expected_output_tokens: int
    ) -> float:
        """预估调用成本"""
        pricing = self.PRICING.get(model, {"input": 0.0, "output": 0.0})
        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (expected_output_tokens / 1000) * pricing["output"]
        return input_cost + output_cost

# 使用示例
monitor = TokenMonitor()

# 记录使用
usage = monitor.record("gpt-4o", input_tokens=1500, output_tokens=800)
print(f"本次调用: {usage.total_tokens} tokens, ${usage.cost_usd:.6f}")

# 查看统计
stats = monitor.get_stats(days=7)
print(f"7天统计: {stats['total_calls']}次调用, ${stats['total_cost_usd']}")

# 预算检查
if monitor.check_budget_alert(daily_budget_usd=50.0):
    print("警告：今日预算已超支！")

# 成本预估
estimated = monitor.estimate_cost("gpt-4o", 2000, 1000)
print(f"预估成本: ${estimated:.6f}")
```

---

## 五、AI产品经理关注点

```
Token管理产品化要点：

成本控制：
├── 预算规划
│   ├── 日/月预算上限设置
│   ├── 实时成本监控面板
│   └── 超预算自动告警
├── 用量优化
│   ├── 提示词压缩（去除冗余）
│   ├── 模型选择（简单任务用便宜模型）
│   └── 缓存策略（重复查询复用）
└── 计费透明
    ├── 单次调用成本展示
    ├── 历史用量报表
    └── 成本归因分析

用户体验：
├── 上下文管理
│   ├── 自动清理旧消息
│   ├── 对话摘要提示
│   └── 长文档分段处理
├── 性能平衡
│   ├── 输入长度限制提示
│   ├── 文件上传大小限制
│   └── 处理进度展示
└── 异常处理
    ├── 上下文超限友好提示
    ├── 自动截断说明
    └── 升级方案推荐

技术决策：
├── 模型选择矩阵
│   ├── 短文本 + 低成本 → GPT-4o-mini / Haiku
│   ├── 长文本 + 高质量 → Claude / Gemini
│   └── 推理任务 → DeepSeek-R1 / o1
├── 上下文策略
│   ├── 客服场景：滑动窗口（保留最近10轮）
│   ├── 文档分析：RAG（检索增强）
│   └── 代码助手：摘要 + 最近上下文
└── 监控指标
    ├── 平均token/请求
    ├── token利用率
    └── 成本/活跃用户
```

---

## 六、企业级设计模板

### 6.1 Token 治理检查表

| 设计项 | 关键问题 | 输出物 |
| ------ | -------- | ------ |
| 预算拆分 | 系统提示词、用户输入、上下文、工具返回各占多少成本？ | Token 预算表 |
| 窗口治理 | 长对话如何裁剪、摘要和归档？ | 上下文策略 |
| 监控指标 | 是否监控 prompt/completion/total tokens 和单用户成本？ | 指标清单 |
| 告警阈值 | 单请求超限、日成本异常、爆量请求如何告警？ | 告警规则 |
| 优化策略 | 缓存、压缩、摘要、分层模型如何落地？ | 优化方案 |

### 6.2 Token 治理字段建议

```json
{
  "max_prompt_tokens": 12000,
  "max_completion_tokens": 2000,
  "warning_threshold": 0.8,
  "truncate_strategy": "recent_messages_plus_summary",
  "cost_alert_rule": "daily_token_cost_increase_over_30_percent",
  "dashboard_metrics": ["prompt_tokens", "completion_tokens", "cost_per_user", "cost_per_request"]
}
```

---

## 七、常见误区补充

| 误区 | 问题 | 正确做法 |
| ---- | ---- | -------- |
| 只看总 token，不拆结构 | 无法定位真正浪费点 | 分开统计 system、history、tool、output |
| 长对话一直累加 | 成本和延迟持续上升 | 使用摘要、裁剪和记忆分层策略 |
| 只做离线估算 | 上线后成本失真 | 在线监控 usage 与异常峰值 |
| 忽略工具返回 token | Tool Calling 场景成本被低估 | 把工具输出单独纳入预算 |
| 没有阈值保护 | 单次请求可能直接爆预算 | 设置单请求和单用户 token 上限 |

---

## 八、阶段验收标准

- [ ] 能解释 Token 消耗与上下文窗口、成本、延迟的关系
- [ ] 能完成单请求与日/月 Token 预算拆分
- [ ] 能设计上下文裁剪、摘要压缩和告警机制
- [ ] 能输出一份 Token 治理和监控方案

---

## 九、版本记录

- **2026-06-05** 补充文件头、学习目标、企业级设计模板、常见误区补充与阶段验收标准
- **2026-06-03** 初版完成，涵盖 Token 基础、计算、上下文管理与使用监控

---

## 十、参考资源

### 相关章节

| 章节 | 关联说明 |
|------|---------|
| [成本优化](./成本优化.md) | Token 管理是成本优化的基础，两者紧密关联 |
| [OpenAI_API](./OpenAI_API.md) | OpenAI API 的 usage 字段和计费方式 |
| [Claude_API](./Claude_API.md) | Claude 的 Prompt Caching 降低 Token 成本 |
| [Gemini_API](./Gemini_API.md) | Gemini 1M+ 上下文窗口的 Token 管理 |
| [DeepSeek_API](./DeepSeek_API.md) | R1 的 reasoning_content 消耗额外 Token |
| [Streaming](./Streaming.md) | 流式输出的首 Token 延迟指标 |
| [FunctionCalling](./FunctionCalling.md) | 工具定义和返回结果的 Token 消耗 |
| [Token机制](../02-AI基础知识/Token机制.md) | Token 分词原理的理论基础 |
| [Prompt优化技巧](../03-Prompt工程/Prompt优化技巧.md) | 减少 Token 消耗的 Prompt 优化策略 |

### 外部资源

- [OpenAI Tokenizer](https://platform.openai.com/tokenizer)
- [Tiktoken Documentation](https://github.com/openai/tiktoken)
- [Claude Token Counting](https://docs.anthropic.com/en/docs/build-with-claude/token-counting)
- [Gemini Token Limits](https://ai.google.dev/gemini-api/docs/tokens)
- [DeepSeek Pricing](https://platform.deepseek.com/api-docs/pricing/)
