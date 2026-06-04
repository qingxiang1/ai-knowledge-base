<!--
  文件描述: Notion MCP集成案例，涵盖页面管理、数据库操作、内容同步及工作流自动化
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# Notion MCP

> 通过 MCP 协议与 Notion 集成，实现知识库管理、数据库操作、内容同步等功能的 AI 化操作。

---

## 一、Notion MCP 概述

### 1.1 什么是 Notion MCP

```
Notion MCP 定义：

Notion MCP Server
├── 本质：MCP 协议封装的 Notion API 服务
├── 功能：将 Notion 能力暴露为 MCP 工具
├── 价值：让 AI 直接操作 Notion
└── 场景：
    ├── 知识库自动构建
    ├── 数据库智能管理
    ├── 内容自动同步
    └── 工作流自动化

核心能力映射
├── 页面管理
│   ├── 创建/更新页面
│   ├── 页面内容编辑
│   └── 页面属性管理
├── 数据库操作
│   ├── 创建/查询数据库
│   ├── 增删改查记录
│   └── 数据库视图管理
├── 内容同步
│   ├── 双向同步
│   ├── 增量更新
│   └── 冲突解决
└── 工作流自动化
    ├── 触发器设置
    ├── 自动化规则
    └── 通知推送
```

### 1.2 核心价值

```python
"""
Notion MCP 核心价值分析

从 AI 产品经理视角理解 Notion MCP 的价值
"""

from typing import Dict, List
from dataclasses import dataclass

@dataclass
class EfficiencyGain:
    """效率提升"""
    task: str
    manual_time: int  # 分钟
    automated_time: int  # 分钟
    accuracy_improvement: float  # 准确率提升百分比

class NotionMCPValue:
    """Notion MCP 价值分析"""
    
    def __init__(self):
        """初始化价值分析"""
        self.gains = [
            EfficiencyGain(
                task="知识库构建",
                manual_time=120,
                automated_time=10,
                accuracy_improvement=0.30
            ),
            EfficiencyGain(
                task="数据库管理",
                manual_time=60,
                automated_time=5,
                accuracy_improvement=0.25
            ),
            EfficiencyGain(
                task="内容同步",
                manual_time=90,
                automated_time=3,
                accuracy_improvement=0.20
            ),
            EfficiencyGain(
                task="工作流自动化",
                manual_time=180,
                automated_time=15,
                accuracy_improvement=0.35
            )
        ]
    
    def analyze(self) -> Dict:
        """
        分析效率提升
        
        Returns:
            分析结果
        """
        return {
            gain.task: {
                "手动耗时": f"{gain.manual_time} 分钟",
                "自动化耗时": f"{gain.automated_time} 分钟",
                "效率提升": f"{gain.manual_time / gain.automated_time:.1f}x",
                "准确率提升": f"{gain.accuracy_improvement:.0%}"
            }
            for gain in self.gains
        }

# 使用示例
"""
value = NotionMCPValue()
result = value.analyze()

for task, metrics in result.items():
    print(f"\n{task}:")
    for key, value in metrics.items():
        print(f"  {key}: {value}")
"""
```

---

## 二、环境配置

### 2.1 获取 Notion Token

```bash
# 1. 登录 Notion，进入 Settings & members -> Integrations
# 2. 点击 Develop your own integrations
# 3. 创建新的 Integration
# 4. 复制 Internal Integration Token

# 5. 设置环境变量
export NOTION_TOKEN="secret_xxxxxxxxxxxxxxxxxxxx"

# 6. 验证 Token
curl -H "Authorization: Bearer $NOTION_TOKEN" \
     -H "Notion-Version: 2022-06-28" \
     https://api.notion.com/v1/users/me
```

### 2.2 安装 Notion MCP Server

```bash
# 方式一：使用 npx（推荐）
npx -y @anthropic-ai/mcp-notion-server

# 方式二：使用 Docker
docker pull mcp/notion-server

# 方式三：源码安装
git clone https://github.com/anthropics/mcp-notion-server.git
cd mcp-notion-server
npm install
npm run build
```

---

## 三、核心功能实现

### 3.1 页面管理

```python
"""
Notion MCP 页面管理

通过 MCP 协议管理 Notion 页面
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List, Optional
import requests
import os

mcp = FastMCP("notion-page-manager")

# Notion API 配置
NOTION_API = "https://api.notion.com/v1"
NOTION_TOKEN = os.getenv("NOTION_TOKEN")
HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}


@mcp.tool()
def create_page(parent_id: str, title: str, content: str = "") -> str:
    """
    创建 Notion 页面
    
    Args:
        parent_id: 父页面 ID
        title: 页面标题
        content: 页面内容
    
    Returns:
        创建结果
    """
    try:
        payload = {
            "parent": {"page_id": parent_id},
            "properties": {
                "title": {
                    "title": [{"text": {"content": title}}]
                }
            }
        }
        
        if content:
            payload["children"] = [
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": content}}]
                    }
                }
            ]
        
        response = requests.post(
            f"{NOTION_API}/pages",
            headers=HEADERS,
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            return f"页面创建成功: {data['url']}"
        else:
            return f"创建失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def get_page(page_id: str) -> str:
    """
    获取页面信息
    
    Args:
        page_id: 页面 ID
    
    Returns:
        页面信息
    """
    try:
        response = requests.get(
            f"{NOTION_API}/pages/{page_id}",
            headers=HEADERS
        )
        
        if response.status_code == 200:
            data = response.json()
            title = data.get("properties", {}).get("title", {}).get("title", [{}])[0].get("text", {}).get("content", "")
            return f"""页面信息:
ID: {data['id']}
标题: {title}
创建时间: {data['created_time']}
最后编辑: {data['last_edited_time']}
URL: {data['url']}
"""
        else:
            return f"获取失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def update_page(page_id: str, title: str = "", content: str = "") -> str:
    """
    更新页面
    
    Args:
        page_id: 页面 ID
        title: 新标题
        content: 新内容
    
    Returns:
        更新结果
    """
    try:
        payload = {}
        
        if title:
            payload["properties"] = {
                "title": {
                    "title": [{"text": {"content": title}}]
                }
            }
        
        response = requests.patch(
            f"{NOTION_API}/pages/{page_id}",
            headers=HEADERS,
            json=payload
        )
        
        if response.status_code == 200:
            return f"页面 {page_id} 更新成功"
        else:
            return f"更新失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def list_page_children(page_id: str) -> str:
    """
    列出页面子项
    
    Args:
        page_id: 页面 ID
    
    Returns:
        子项列表
    """
    try:
        response = requests.get(
            f"{NOTION_API}/blocks/{page_id}/children",
            headers=HEADERS
        )
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            
            output = f"找到 {len(results)} 个子项:\n\n"
            
            for item in results:
                item_type = item.get("type", "unknown")
                output += f"- 类型: {item_type}\n"
                
                if item_type == "paragraph":
                    text = item.get("paragraph", {}).get("rich_text", [{}])[0].get("text", {}).get("content", "")
                    output += f"  内容: {text}\n"
                
                output += "\n"
            
            return output
        else:
            return f"获取失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 3.2 数据库操作

```python
"""
Notion MCP 数据库操作

通过 MCP 协议管理 Notion 数据库
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List, Optional
import requests
import os

mcp = FastMCP("notion-database-manager")

NOTION_API = "https://api.notion.com/v1"
NOTION_TOKEN = os.getenv("NOTION_TOKEN")
HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}


@mcp.tool()
def create_database(parent_id: str, title: str, properties: Dict) -> str:
    """
    创建数据库
    
    Args:
        parent_id: 父页面 ID
        title: 数据库标题
        properties: 数据库属性定义
    
    Returns:
        创建结果
    """
    try:
        payload = {
            "parent": {"page_id": parent_id},
            "title": [{"type": "text", "text": {"content": title}}],
            "properties": properties
        }
        
        response = requests.post(
            f"{NOTION_API}/databases",
            headers=HEADERS,
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            return f"数据库创建成功: {data['url']}"
        else:
            return f"创建失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def query_database(database_id: str, filter_params: Dict = None) -> str:
    """
    查询数据库
    
    Args:
        database_id: 数据库 ID
        filter_params: 过滤条件
    
    Returns:
        查询结果
    """
    try:
        payload = {}
        if filter_params:
            payload["filter"] = filter_params
        
        response = requests.post(
            f"{NOTION_API}/databases/{database_id}/query",
            headers=HEADERS,
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            
            output = f"找到 {len(results)} 条记录:\n\n"
            
            for item in results:
                properties = item.get("properties", {})
                output += f"记录 ID: {item['id']}\n"
                
                for prop_name, prop_value in properties.items():
                    if prop_value.get("type") == "title":
                        title = prop_value.get("title", [{}])[0].get("text", {}).get("content", "")
                        output += f"  {prop_name}: {title}\n"
                    elif prop_value.get("type") == "rich_text":
                        text = prop_value.get("rich_text", [{}])[0].get("text", {}).get("content", "")
                        output += f"  {prop_name}: {text}\n"
                    elif prop_value.get("type") == "select":
                        select = prop_value.get("select", {}).get("name", "")
                        output += f"  {prop_name}: {select}\n"
                
                output += "\n"
            
            return output
        else:
            return f"查询失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def add_database_item(database_id: str, properties: Dict) -> str:
    """
    添加数据库记录
    
    Args:
        database_id: 数据库 ID
        properties: 记录属性
    
    Returns:
        添加结果
    """
    try:
        payload = {
            "parent": {"database_id": database_id},
            "properties": properties
        }
        
        response = requests.post(
            f"{NOTION_API}/pages",
            headers=HEADERS,
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            return f"记录添加成功: {data['url']}"
        else:
            return f"添加失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def update_database_item(page_id: str, properties: Dict) -> str:
    """
    更新数据库记录
    
    Args:
        page_id: 记录页面 ID
        properties: 更新的属性
    
    Returns:
        更新结果
    """
    try:
        response = requests.patch(
            f"{NOTION_API}/pages/{page_id}",
            headers=HEADERS,
            json={"properties": properties}
        )
        
        if response.status_code == 200:
            return f"记录 {page_id} 更新成功"
        else:
            return f"更新失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 四、高级功能

### 4.1 内容同步

```python
"""
Notion MCP 内容同步

实现 Notion 与其他系统的双向同步
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List
import requests
import os
import json

mcp = FastMCP("notion-sync-manager")

NOTION_API = "https://api.notion.com/v1"
NOTION_TOKEN = os.getenv("NOTION_TOKEN")
HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}


@mcp.tool()
def sync_from_notion(page_id: str) -> str:
    """
    从 Notion 同步内容
    
    Args:
        page_id: 页面 ID
    
    Returns:
        同步结果
    """
    try:
        # 获取页面内容
        response = requests.get(
            f"{NOTION_API}/blocks/{page_id}/children",
            headers=HEADERS
        )
        
        if response.status_code == 200:
            data = response.json()
            blocks = data.get("results", [])
            
            content = []
            for block in blocks:
                block_type = block.get("type")
                
                if block_type == "paragraph":
                    text = block.get("paragraph", {}).get("rich_text", [{}])[0].get("text", {}).get("content", "")
                    content.append({"type": "text", "content": text})
                
                elif block_type == "heading_1":
                    text = block.get("heading_1", {}).get("rich_text", [{}])[0].get("text", {}).get("content", "")
                    content.append({"type": "h1", "content": text})
                
                elif block_type == "heading_2":
                    text = block.get("heading_2", {}).get("rich_text", [{}])[0].get("text", {}).get("content", "")
                    content.append({"type": "h2", "content": text})
                
                elif block_type == "bulleted_list_item":
                    text = block.get("bulleted_list_item", {}).get("rich_text", [{}])[0].get("text", {}).get("content", "")
                    content.append({"type": "bullet", "content": text})
            
            return json.dumps(content, ensure_ascii=False, indent=2)
        else:
            return f"同步失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def sync_to_notion(page_id: str, content: str) -> str:
    """
    同步内容到 Notion
    
    Args:
        page_id: 页面 ID
        content: 要同步的内容（JSON 格式）
    
    Returns:
        同步结果
    """
    try:
        blocks = json.loads(content)
        
        children = []
        for block in blocks:
            block_type = block.get("type")
            text = block.get("content", "")
            
            if block_type == "text":
                children.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": text}}]
                    }
                })
            
            elif block_type == "h1":
                children.append({
                    "object": "block",
                    "type": "heading_1",
                    "heading_1": {
                        "rich_text": [{"type": "text", "text": {"content": text}}]
                    }
                })
            
            elif block_type == "h2":
                children.append({
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{"type": "text", "text": {"content": text}}]
                    }
                })
            
            elif block_type == "bullet":
                children.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [{"type": "text", "text": {"content": text}}]
                    }
                })
        
        response = requests.patch(
            f"{NOTION_API}/blocks/{page_id}/children",
            headers=HEADERS,
            json={"children": children}
        )
        
        if response.status_code == 200:
            return f"内容同步到 Notion 成功"
        else:
            return f"同步失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def compare_and_sync(page_id: str, external_content: str) -> str:
    """
    比较并同步内容
    
    Args:
        page_id: Notion 页面 ID
        external_content: 外部系统内容
    
    Returns:
        同步结果
    """
    try:
        # 获取 Notion 当前内容
        notion_content = sync_from_notion(page_id)
        
        # 简单比较（实际应用中需要更复杂的 diff 算法）
        if notion_content == external_content:
            return "内容一致，无需同步"
        
        # 同步外部内容到 Notion
        result = sync_to_notion(page_id, external_content)
        return f"内容已更新: {result}"
    
    except Exception as e:
        return f"同步错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 4.2 工作流自动化

```python
"""
Notion MCP 工作流自动化

实现基于 Notion 的自动化工作流
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List
import requests
import os

mcp = FastMCP("notion-workflow-automation")

NOTION_API = "https://api.notion.com/v1"
NOTION_TOKEN = os.getenv("NOTION_TOKEN")
HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json"
}


@mcp.tool()
def create_task_workflow(database_id: str, task_data: Dict) -> str:
    """
    创建任务工作流
    
    Args:
        database_id: 任务数据库 ID
        task_data: 任务数据
    
    Returns:
        创建结果
    """
    try:
        # 创建任务记录
        properties = {
            "Name": {
                "title": [{"text": {"content": task_data.get("name", "")}}]
            },
            "Status": {
                "select": {"name": task_data.get("status", "待办")}
            },
            "Priority": {
                "select": {"name": task_data.get("priority", "中")}
            },
            "Assignee": {
                "people": [{"id": task_data.get("assignee", "")}]
            } if task_data.get("assignee") else {"people": []}
        }
        
        response = requests.post(
            f"{NOTION_API}/pages",
            headers=HEADERS,
            json={
                "parent": {"database_id": database_id},
                "properties": properties
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            return f"任务创建成功: {data['url']}"
        else:
            return f"创建失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def update_task_status(page_id: str, status: str, comment: str = "") -> str:
    """
    更新任务状态
    
    Args:
        page_id: 任务页面 ID
        status: 新状态
        comment: 状态变更评论
    
    Returns:
        更新结果
    """
    try:
        # 更新状态
        response = requests.patch(
            f"{NOTION_API}/pages/{page_id}",
            headers=HEADERS,
            json={
                "properties": {
                    "Status": {
                        "select": {"name": status}
                    }
                }
            }
        )
        
        if response.status_code == 200:
            # 添加评论
            if comment:
                requests.post(
                    f"{NOTION_API}/blocks/{page_id}/children",
                    headers=HEADERS,
                    json={
                        "children": [
                            {
                                "object": "block",
                                "type": "callout",
                                "callout": {
                                    "rich_text": [{"type": "text", "text": {"content": comment}}]
                                }
                            }
                        ]
                    }
                )
            
            return f"任务状态更新为: {status}"
        else:
            return f"更新失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def generate_weekly_report(database_id: str) -> str:
    """
    生成周报
    
    Args:
        database_id: 任务数据库 ID
    
    Returns:
        周报内容
    """
    try:
        # 查询本周完成的任务
        response = requests.post(
            f"{NOTION_API}/databases/{database_id}/query",
            headers=HEADERS,
            json={
                "filter": {
                    "property": "Status",
                    "select": {
                        "equals": "已完成"
                    }
                }
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            
            report = "# 本周工作周报\n\n"
            report += f"## 已完成任务 ({len(results)} 项)\n\n"
            
            for item in results:
                properties = item.get("properties", {})
                name = properties.get("Name", {}).get("title", [{}])[0].get("text", {}).get("content", "")
                priority = properties.get("Priority", {}).get("select", {}).get("name", "")
                
                report += f"- **{name}** (优先级: {priority})\n"
            
            return report
        else:
            return f"生成失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 五、AI 产品经理关注点

```
Notion MCP 产品化要点：

场景设计
├── 知识管理
│   ├── 自动知识库构建
│   ├── 智能内容分类
│   └── 知识图谱生成
├── 项目管理
│   ├── 任务自动分配
│   ├── 进度智能跟踪
│   └── 风险预警
├── 团队协作
│   ├── 文档协同编辑
│   ├── 评论智能回复
│   └── 通知智能推送
└── 数据分析
    ├── 工作效能分析
    ├── 团队贡献统计
    └── 项目健康度评估

安全考虑
├── 权限控制
│   ├── Token 最小权限原则
│   ├── 页面访问控制
│   └── 敏感数据保护
├── 数据保护
│   ├── 内容加密
│   ├── 访问频率限制
│   └── 异常行为检测
└── 合规性
    ├── 企业安全策略
    ├── 数据保留政策
    └── 审计要求

关键指标
├── 效率指标
│   ├── 知识库构建时间缩短
│   ├── 任务处理效率提升
│   ├── 文档协作效率提升
│   └── 自动化率
├── 质量指标
│   ├── 内容准确率
│   ├── 任务完成率
│   ├── 团队协作满意度
│   └── 知识沉淀量
└── 体验指标
    ├── 用户满意度
    ├── 系统响应时间
    └── 功能易用性

落地建议
├── 阶段一：试点
│   ├── 选择 1-2 个团队
│   ├── 实现基础功能
│   └── 收集反馈
├── 阶段二：推广
│   ├── 扩展更多团队
│   ├── 完善功能覆盖
│   └── 建立最佳实践
└── 阶段三：优化
    ├── 性能优化
    ├── 智能化提升
    └── 生态建设
```

---

## 六、参考资源

- [Notion MCP Server](https://github.com/anthropics/mcp-notion-server) - 官方 Notion MCP Server
- [Notion API 文档](https://developers.notion.com/) - Notion API 官方文档
- [Notion 集成指南](https://developers.notion.com/docs/getting-started) - Notion 集成入门指南
- [MCP 协议规范](https://spec.modelcontextprotocol.io/) - MCP 协议文档
