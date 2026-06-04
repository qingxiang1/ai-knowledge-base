<!--
  文件描述: Coze平台使用指南，涵盖核心概念、Bot创建、插件开发、知识库管理及发布部署
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Coze

> Coze（扣子）是字节跳动推出的 AI Bot 开发平台，支持快速创建和发布基于大模型的对话机器人。

---

## 一、Coze 概述

### 1.1 什么是 Coze

```
Coze 定义：

Coze 平台
├── 本质：AI Bot 开发平台
├── 发起方：字节跳动（ByteDance）
├── 核心定位：让每个人都能创建 AI 机器人
├── 产品形态：
│   ├── Coze（国际版）
│   └── 扣子（国内版）
└── 核心能力：
    ├── 可视化 Bot 构建
    ├── 插件生态系统
    ├── 知识库管理
    ├── 工作流编排
    └── 多平台发布

产品架构
├── Bot 开发
│   ├── 人设与回复逻辑
│   ├── 插件扩展
│   ├── 知识库
│   └── 工作流
├── 插件市场
│   ├── 官方插件
│   └── 自定义插件
├── 模板市场
│   └── 预置 Bot 模板
└── 发布渠道
    ├── 豆包
    ├── 飞书
    ├── 微信
    └── API

与 Dify 的对比
├── Coze
│   ├── 更侧重 C 端和社交场景
│   ├── 插件生态丰富
│   ├── 与字节生态深度整合
│   └── 国内访问友好
└── Dify
    ├── 更侧重 B 端和企业场景
    ├── 开源可私有化部署
    ├── 工作流能力更强
    └── 国际化支持更好
```

### 1.2 核心价值

```python
"""
Coze 核心价值分析

从 AI 产品经理视角理解 Coze 的价值
"""

from typing import Dict, List
from dataclasses import dataclass

@dataclass
class CozeValue:
    """Coze 价值点"""
    capability: str
    description: str
    target_user: str

class CozeValueAnalysis:
    """Coze 价值分析器"""
    
    def __init__(self):
        """初始化价值分析"""
        self.values = [
            CozeValue(
                capability="零代码 Bot 开发",
                description="通过对话式配置快速创建 Bot，无需编程",
                target_user="非技术用户、运营人员"
            ),
            CozeValue(
                capability="丰富插件生态",
                description="内置搜索、绘图、代码执行等上百个插件",
                target_user="需要扩展能力的开发者"
            ),
            CozeValue(
                capability="多平台一键发布",
                description="一次开发，发布到豆包、飞书、微信等多个平台",
                target_user="需要多渠道部署的企业"
            ),
            CozeValue(
                capability="知识库快速搭建",
                description="上传文档即可构建领域知识问答 Bot",
                target_user="客服、教育、企业内部"
            ),
            CozeValue(
                capability="工作流可视化编排",
                description="拖拽式节点编排复杂业务流程",
                target_user="需要复杂逻辑的场景"
            )
        ]
    
    def analyze(self) -> List[Dict]:
        """
        分析价值
        
        Returns:
            价值分析结果
        """
        return [
            {
                "能力": v.capability,
                "说明": v.description,
                "目标用户": v.target_user
            }
            for v in self.values
        ]

# 使用示例
"""
analysis = CozeValueAnalysis()
for item in analysis.analyze():
    print(f"\n{item['能力']}:")
    print(f"  说明: {item['说明']}")
    print(f"  目标用户: {item['目标用户']}")
"""
```

---

## 二、环境搭建

### 2.1 注册与登录

```
Coze 使用流程：

1. 访问平台
   ├── 国际版：https://www.coze.com
   └── 国内版：https://www.coze.cn

2. 注册账号
   ├── 支持手机号注册
   ├── 支持邮箱注册
   └── 支持抖音/飞书账号登录

3. 创建团队（可选）
   ├── 个人开发
   └── 团队协作

4. 开始创建 Bot
```

### 2.2 界面导览

```
Coze 界面布局：

左侧导航
├── 创建 Bot
│   └── 新建空白 Bot / 从模板创建
├── Bot 列表
│   └── 我创建的 / 团队共享的
├── 插件
│   ├── 我的插件
│   └── 插件商店
├── 工作流
│   └── 我的工作流
├── 知识库
│   └── 我的知识库
└── 设置
    └── 账号 / 团队 / 偏好

中间编辑区
├── 人设与回复逻辑
├── 技能（插件/工作流/知识库）
├── 记忆（变量/长期记忆）
└── 对话体验（开场白/建议/语音）

右侧预览区
├── 实时对话测试
├── 调试信息
└── 发布预览
```

---

## 三、Bot 创建

### 3.1 基础配置

```python
"""
Coze Bot 基础配置

人设与回复逻辑的核心配置
"""

class CozeBotConfig:
    """Coze Bot 配置说明"""
    
    def __init__(self):
        """初始化配置"""
        self.config = {
            "name": "AI 助手",
            "description": "一个 helpful 的 AI 助手",
            "icon": "🤖",
            "mode": "单 Agent 模式"  # 或 多 Agent 模式
        }
    
    def set_persona(self, persona: str) -> dict:
        """
        设置人设
        
        Args:
            persona: 人设描述
        
        Returns:
            配置结果
        """
        return {
            "persona": persona,
            "example": """# 角色
你是一个专业的产品经理助手，擅长需求分析和文档撰写。

## 技能
- 需求分析
- PRD 撰写
- 竞品分析
- 用户调研

## 限制
- 只回答与产品相关的问题
- 使用中文回复
- 保持专业、简洁"""
        }
    
    def set_reply_logic(self) -> dict:
        """
        设置回复逻辑
        
        Returns:
            回复逻辑配置
        """
        return {
            "opening_statement": "你好！我是你的产品经理助手，有什么可以帮你的？",
            "suggested_questions": [
                "如何写一份好的 PRD？",
                "怎么做竞品分析？",
                "用户调研有哪些方法？"
            ],
            "auto_suggestion": True,
            "reply_style": "专业简洁"
        }
    
    def set_model_config(self) -> dict:
        """
        设置模型配置
        
        Returns:
            模型配置
        """
        return {
            "model": "豆包大模型",  # 或 GPT-4 / Claude 等
            "temperature": 0.7,
            "max_tokens": 2000,
            "context_length": 4096
        }

# Bot 配置最佳实践
"""
人设编写技巧：

1. 角色定义
   ├── 明确角色身份
   ├── 说明专业领域
   └── 定义行为边界

2. 技能描述
   ├── 列出核心能力
   ├── 说明使用场景
   └── 给出示例

3. 限制条件
   ├── 回答范围限制
   ├── 语言风格要求
   └── 安全合规要求

4. 示例对话
   ├── 提供标准问答示例
   ├── 展示边界情况处理
   └── 体现角色特色
"""
```

### 3.2 技能配置

```python
"""
Coze Bot 技能配置

插件、工作流、知识库的配置
"""

class CozeSkills:
    """Coze 技能配置"""
    
    @staticmethod
    def configure_plugins() -> list:
        """
        配置插件
        
        Returns:
            插件列表
        """
        return [
            {
                "name": "必应搜索",
                "description": "实时搜索网络信息",
                "trigger_mode": "自动",  # 自动 / 手动
                "use_case": "需要最新信息时自动调用"
            },
            {
                "name": "DALL-E 3",
                "description": "AI 图像生成",
                "trigger_mode": "手动",
                "use_case": "用户明确要求生成图片时"
            },
            {
                "name": "代码执行器",
                "description": "执行 Python 代码",
                "trigger_mode": "自动",
                "use_case": "需要计算或数据处理时"
            },
            {
                "name": "网页解析",
                "description": "解析网页内容",
                "trigger_mode": "手动",
                "use_case": "用户提供链接需要解析时"
            }
        ]
    
    @staticmethod
    def configure_knowledge_base() -> dict:
        """
        配置知识库
        
        Returns:
            知识库配置
        """
        return {
            "name": "产品知识库",
            "description": "公司产品文档和资料",
            "sources": [
                {
                    "type": "文档",
                    "format": ["pdf", "docx", "txt", "md"],
                    "max_size": "20MB"
                },
                {
                    "type": "网页",
                    "format": ["url"],
                    "auto_sync": True
                },
                {
                    "type": "表格",
                    "format": ["xlsx", "csv"],
                    "max_size": "10MB"
                }
            ],
            "retrieval_settings": {
                "search_mode": "混合搜索",  # 语义 / 关键词 / 混合
                "top_k": 3,
                "score_threshold": 0.5
            }
        }
    
    @staticmethod
    def configure_workflow() -> dict:
        """
        配置工作流
        
        Returns:
            工作流配置
        """
        return {
            "name": "需求分析工作流",
            "description": "自动化需求分析流程",
            "nodes": [
                {"type": "开始", "name": "接收需求"},
                {"type": "大模型", "name": "需求解析"},
                {"type": "知识库", "name": "检索历史案例"},
                {"type": "大模型", "name": "生成分析报告"},
                {"type": "结束", "name": "输出结果"}
            ],
            "trigger": "用户输入包含'需求分析'时自动触发"
        }

# 常用插件推荐
"""
推荐插件：

信息获取
├── 必应搜索 - 实时网络搜索
├── Google 搜索 - 国际搜索
├── 新闻搜索 - 最新新闻
└── arxiv - 学术论文

内容生成
├── DALL-E 3 - 图像生成
├── 图像理解 - 分析图片内容
├── 视频生成 - 生成短视频
└── 语音合成 - 文字转语音

数据处理
├── 代码执行器 - Python/JS 执行
├── 网页解析 - URL 内容提取
├── 文档解析 - PDF/Word 解析
└── 表格处理 - Excel/CSV 处理

生活服务
├── 天气查询 - 实时天气
├── 翻译 - 多语言翻译
├── 汇率转换 - 货币换算
└── 时间转换 - 时区转换
"""
```

---

## 四、插件开发

### 4.1 自定义插件

```python
"""
Coze 自定义插件开发

扩展 Bot 能力的自定义插件
"""

class CozePluginDev:
    """Coze 插件开发指南"""
    
    @staticmethod
    def plugin_manifest() -> dict:
        """
        插件清单配置
        
        Returns:
            插件清单
        """
        return {
            "schema_version": "v1",
            "name_for_human": "天气查询",
            "name_for_model": "weather_query",
            "description_for_human": "查询全球城市的实时天气",
            "description_for_model": "当用户询问天气时使用此插件查询实时天气信息",
            "auth": {
                "type": "none"  # none / api_key / oauth
            },
            "api": {
                "type": "openapi",
                "url": "https://api.weather.com/openapi.json"
            },
            "logo_url": "https://example.com/weather-icon.png",
            "contact_email": "developer@example.com",
            "legal_info_url": "https://example.com/legal"
        }
    
    @staticmethod
    def api_definition() -> dict:
        """
        API 接口定义
        
        Returns:
            API 定义
        """
        return {
            "openapi": "3.0.0",
            "info": {
                "title": "Weather API",
                "version": "1.0.0"
            },
            "paths": {
                "/weather": {
                    "get": {
                        "operationId": "getWeather",
                        "summary": "获取城市天气",
                        "parameters": [
                            {
                                "name": "city",
                                "in": "query",
                                "required": True,
                                "schema": {"type": "string"},
                                "description": "城市名称，如'北京'"
                            }
                        ],
                        "responses": {
                            "200": {
                                "description": "成功",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "city": {"type": "string"},
                                                "temperature": {"type": "number"},
                                                "condition": {"type": "string"},
                                                "humidity": {"type": "number"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    
    @staticmethod
    def plugin_code_example():
        """
        插件代码示例
        
        实际开发时使用 Python/Node.js 实现
        """
        code = """
# 插件服务端示例（Python Flask）
from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

@app.route('/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')
    
    # 调用第三方天气 API
    response = requests.get(
        'https://api.weather.com/v1/current',
        params={'city': city, 'appid': 'YOUR_API_KEY'}
    )
    
    data = response.json()
    
    return jsonify({
        'city': city,
        'temperature': data['temp'],
        'condition': data['weather'],
        'humidity': data['humidity']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
"""
        return code

# 插件开发流程
"""
开发流程：

1. 创建插件
   ├── 填写插件基本信息
   ├── 配置认证方式
   └── 定义 API 接口

2. 实现服务端
   ├── 开发 API 接口
   ├── 处理请求参数
   └── 返回标准格式

3. 测试调试
   ├── 本地测试
   ├── 联调测试
   └── 边界 case 测试

4. 发布审核
   ├── 提交审核
   ├── 等待审核通过
   └── 发布上线

注意事项：
├── 接口响应时间 < 5s
├── 返回结果 < 10KB
├── 支持并发请求
└── 错误处理完善
"""
```

---

## 五、工作流编排

### 5.1 工作流设计

```python
"""
Coze 工作流编排

可视化节点编排复杂流程
"""

class CozeWorkflow:
    """Coze 工作流说明"""
    
    @staticmethod
    def node_types() -> dict:
        """
        节点类型说明
        
        Returns:
            节点类型
        """
        return {
            "开始": {
                "description": "工作流入口",
                "config": ["输入变量定义"]
            },
            "大模型": {
                "description": "调用大模型处理",
                "config": ["模型选择", "Prompt 模板", "输出格式"]
            },
            "知识库": {
                "description": "从知识库检索",
                "config": ["选择知识库", "检索参数", "输出格式"]
            },
            "插件": {
                "description": "调用插件",
                "config": ["选择插件", "参数映射"]
            },
            "代码执行": {
                "description": "执行代码",
                "config": ["代码语言", "代码内容", "输入输出"]
            },
            "选择器": {
                "description": "条件分支",
                "config": ["条件表达式", "分支映射"]
            },
            "变量聚合": {
                "description": "合并多个分支",
                "config": ["聚合方式", "变量映射"]
            },
            "循环": {
                "description": "循环执行",
                "config": ["循环条件", "最大次数"]
            },
            "结束": {
                "description": "工作流出口",
                "config": ["输出变量定义"]
            }
        }
    
    @staticmethod
    def example_workflow() -> dict:
        """
        工作流示例
        
        Returns:
            示例工作流
        """
        return {
            "name": "智能客服工作流",
            "description": "自动处理客户咨询",
            "nodes": [
                {
                    "id": "start",
                    "type": "开始",
                    "config": {
                        "inputs": ["user_question", "user_id"]
                    }
                },
                {
                    "id": "classify",
                    "type": "大模型",
                    "config": {
                        "prompt": "分类用户问题：{user_question}\n类别：产品咨询/售后/投诉/其他",
                        "output": "category"
                    }
                },
                {
                    "id": "selector",
                    "type": "选择器",
                    "config": {
                        "condition": "category",
                        "branches": {
                            "产品咨询": "product_kb",
                            "售后": "service_kb",
                            "投诉": "complaint_handler",
                            "其他": "general_chat"
                        }
                    }
                },
                {
                    "id": "product_kb",
                    "type": "知识库",
                    "config": {
                        "knowledge_base": "产品知识库",
                        "query": "{user_question}"
                    }
                },
                {
                    "id": "service_kb",
                    "type": "知识库",
                    "config": {
                        "knowledge_base": "售后知识库",
                        "query": "{user_question}"
                    }
                },
                {
                    "id": "complaint_handler",
                    "type": "大模型",
                    "config": {
                        "prompt": "用户投诉：{user_question}\n请生成安抚回复并记录工单。"
                    }
                },
                {
                    "id": "general_chat",
                    "type": "大模型",
                    "config": {
                        "prompt": "用户问题：{user_question}\n请友好回答。"
                    }
                },
                {
                    "id": "aggregate",
                    "type": "变量聚合",
                    "config": {
                        "inputs": ["product_kb", "service_kb", "complaint_handler", "general_chat"]
                    }
                },
                {
                    "id": "end",
                    "type": "结束",
                    "config": {
                        "outputs": ["response", "category"]
                    }
                }
            ],
            "edges": [
                {"from": "start", "to": "classify"},
                {"from": "classify", "to": "selector"},
                {"from": "selector", "to": "product_kb"},
                {"from": "selector", "to": "service_kb"},
                {"from": "selector", "to": "complaint_handler"},
                {"from": "selector", "to": "general_chat"},
                {"from": "product_kb", "to": "aggregate"},
                {"from": "service_kb", "to": "aggregate"},
                {"from": "complaint_handler", "to": "aggregate"},
                {"from": "general_chat", "to": "aggregate"},
                {"from": "aggregate", "to": "end"}
            ]
        }

# 工作流设计原则
"""
设计原则：

1. 单一职责
   ├── 每个节点只做一件事
   ├── 节点之间解耦
   └── 便于维护和复用

2. 清晰的数据流
   ├── 明确输入输出
   ├── 变量命名规范
   └── 避免数据污染

3. 异常处理
   ├── 设置超时机制
   ├── 提供降级方案
   └── 记录错误日志

4. 性能优化
   ├── 减少不必要的节点
   ├── 合理使用缓存
   └── 并行执行独立节点
"""
```

---

## 六、发布与部署

### 6.1 发布渠道

```python
"""
Coze 发布渠道

支持多平台一键发布
"""

class CozePublish:
    """Coze 发布配置"""
    
    @staticmethod
    def publish_channels() -> dict:
        """
        发布渠道说明
        
        Returns:
            渠道配置
        """
        return {
            "豆包": {
                "description": "字节跳动 AI 对话应用",
                "type": "应用内",
                "audience": "C 端用户",
                "features": ["语音对话", "多模态"],
                "setup": "一键发布，无需配置"
            },
            "飞书": {
                "description": "企业协作平台",
                "type": "企业应用",
                "audience": "B 端企业",
                "features": ["群聊机器人", "单聊", "卡片消息"],
                "setup": "需要飞书管理员配置"
            },
            "微信": {
                "description": "微信公众号/小程序",
                "type": "社交应用",
                "audience": "微信用户",
                "features": ["公众号客服", "小程序"],
                "setup": "需要微信开发者账号"
            },
            "API": {
                "description": "编程接口",
                "type": "开发者",
                "audience": "开发者",
                "features": ["REST API", "流式输出", "鉴权"],
                "setup": "获取 API Key 即可调用"
            },
            "Web SDK": {
                "description": "网页嵌入",
                "type": "网站",
                "audience": "网站访客",
                "features": ["悬浮窗", "全屏", "自定义样式"],
                "setup": "复制 SDK 代码到网页"
            }
        }
    
    @staticmethod
    def api_integration() -> dict:
        """
        API 集成示例
        
        Returns:
            API 配置
        """
        return {
            "endpoint": "https://api.coze.cn/open_api/v2/chat",
            "method": "POST",
            "headers": {
                "Authorization": "Bearer {access_token}",
                "Content-Type": "application/json"
            },
            "request_body": {
                "bot_id": "{bot_id}",
                "user": "{user_id}",
                "query": "用户输入",
                "stream": False
            },
            "response_format": {
                "messages": [
                    {
                        "role": "assistant",
                        "type": "answer",
                        "content": "回复内容"
                    }
                ]
            }
        }

# 发布流程
"""
发布流程：

1. 预览测试
   ├── 对话测试
   ├── 边界 case 测试
   └── 性能测试

2. 配置发布
   ├── 选择发布渠道
   ├── 配置渠道参数
   └── 设置访问权限

3. 提交审核（部分渠道）
   ├── 填写审核信息
   ├── 等待审核
   └── 处理审核反馈

4. 正式上线
   ├── 监控运行状态
   ├── 收集用户反馈
   └── 持续优化
"""
```

---

## 七、AI 产品经理关注点

```
Coze 产品化要点：

场景选择
├── 适合场景
│   ├── 快速搭建客服 Bot
│   ├── 内部知识库问答
│   ├── 社交媒体机器人
│   ├── 内容创作助手
│   └── 教育辅导 Bot
├── 不适合场景
│   ├── 复杂业务系统
│   ├── 高度定制化 UI
│   ├── 数据隐私要求极高
│   └── 需要私有化部署

成本分析
├── 免费额度
│   ├── 基础功能免费
│   ├── 一定量 API 调用
│   └── 基础模型免费
├── 付费升级
│   ├── 高级模型（GPT-4/Claude）
│   ├── 增加调用额度
│   ├── 优先技术支持
│   └── 自定义域名

关键指标
├── 技术指标
│   ├── 响应时间 < 3s
│   ├── 可用性 > 99%
│   └── 并发支持数
├── 业务指标
│   ├── 对话轮次
│   ├── 任务完成率
│   ├── 用户满意度
│   └── 留存率
└── 成本指标
    ├── 单次对话成本
    ├── 模型调用费用
    └── 插件调用费用

运营建议
├── 冷启动
│   ├── 准备高质量知识库
│   ├── 设计引导式开场白
│   └── 预设常见问题
├── 持续优化
│   ├── 分析对话日志
│   ├── 收集 bad case
│   ├── 优化人设和 Prompt
│   └── 补充知识库
├── 用户运营
│   ├── 设置用户反馈入口
│   ├── 定期更新内容
│   └── 举办活动促活

竞品对比
├── Coze vs 文心智能体
│   ├── Coze：插件丰富，国际化
│   └── 文心：中文理解强，百度生态
├── Coze vs Dify
│   ├── Coze：C 端友好，快速上线
│   └── Dify：B 端专业，可私有化
└── Coze vs GPTs
    ├── Coze：国内访问，多平台发布
    └── GPTs：GPT-4 能力强，国际用户

落地建议
├── 阶段一：验证
│   ├── 使用模板快速创建
│   ├── 小范围测试
│   └── 收集反馈
├── 阶段二：优化
│   ├── 完善知识库
│   ├── 优化对话体验
│   └── 扩展技能
└── 阶段三：规模化
    ├── 多渠道发布
    ├── 数据分析驱动
    └── 商业化探索
```

---

## 八、参考资源

- [Coze 官方文档](https://www.coze.cn/docs) - Coze 官方文档
- [Coze 插件开发指南](https://www.coze.cn/docs/developer_guides/preparation) - 插件开发
- [Coze 工作流文档](https://www.coze.cn/docs/workflow/intro) - 工作流编排
- [Coze 模板市场](https://www.coze.cn/store/agent) - Bot 模板
- [扣子国内版](https://www.coze.cn) - 国内访问
