<!--
  文件描述: GitHub MCP集成案例，涵盖仓库管理、Issue追踪、PR审查、Actions触发及Webhook处理
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# GitHub MCP

> 通过 MCP 协议与 GitHub 集成，实现代码仓库管理、Issue 追踪、PR 审查等功能的 AI 化操作。

---

## 一、GitHub MCP 概述

### 1.1 什么是 GitHub MCP

```
GitHub MCP 定义：

GitHub MCP Server
├── 本质：MCP 协议封装的 GitHub API 服务
├── 功能：将 GitHub 能力暴露为 MCP 工具
├── 价值：让 AI 直接操作 GitHub
└── 场景：
    ├── 代码审查自动化
    ├── Issue 智能分类
    ├── PR 自动合并
    └── 仓库数据分析

核心能力映射
├── 仓库管理
│   ├── 创建/删除仓库
│   ├── 分支管理
│   └── 标签管理
├── Issue 管理
│   ├── 创建/关闭 Issue
│   ├── 添加标签/评论
│   └── 分配给成员
├── PR 管理
│   ├── 创建/合并 PR
│   ├── 审查代码
│   └── 解决冲突
└── 数据分析
    ├── 提交统计
    ├── 贡献者分析
    └── 代码质量报告
```

### 1.2 核心价值

```python
"""
GitHub MCP 核心价值分析

从 AI 产品经理视角理解 GitHub MCP 的价值
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

class GitHubMCPValue:
    """GitHub MCP 价值分析"""
    
    def __init__(self):
        """初始化价值分析"""
        self.gains = [
            EfficiencyGain(
                task="Issue 分类",
                manual_time=30,
                automated_time=2,
                accuracy_improvement=0.25
            ),
            EfficiencyGain(
                task="PR 审查",
                manual_time=60,
                automated_time=10,
                accuracy_improvement=0.15
            ),
            EfficiencyGain(
                task="代码分析",
                manual_time=120,
                automated_time=15,
                accuracy_improvement=0.20
            ),
            EfficiencyGain(
                task="文档生成",
                manual_time=90,
                automated_time=5,
                accuracy_improvement=0.10
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
value = GitHubMCPValue()
result = value.analyze()

for task, metrics in result.items():
    print(f"\n{task}:")
    for key, value in metrics.items():
        print(f"  {key}: {value}")
"""
```

---

## 二、环境配置

### 2.1 获取 GitHub Token

```bash
# 1. 登录 GitHub，进入 Settings -> Developer settings -> Personal access tokens
# 2. 点击 Generate new token (classic)
# 3. 选择以下权限：
#    - repo: 完整仓库访问
#    - workflow: Actions 工作流管理
#    - read:org: 组织信息读取
#    - read:discussion: 讨论区读取

# 4. 复制生成的 Token

# 5. 设置环境变量
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"

# 6. 验证 Token
curl -H "Authorization: token $GITHUB_TOKEN" \
     https://api.github.com/user
```

### 2.2 安装 GitHub MCP Server

```bash
# 方式一：使用 npx（推荐）
npx -y @anthropic-ai/mcp-github-server

# 方式二：使用 Docker
docker pull mcp/github-server

# 方式三：源码安装
git clone https://github.com/anthropics/mcp-github-server.git
cd mcp-github-server
npm install
npm run build
```

---

## 三、核心功能实现

### 3.1 仓库管理

```python
"""
GitHub MCP 仓库管理

通过 MCP 协议管理 GitHub 仓库
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List, Optional
import requests
import os

mcp = FastMCP("github-repo-manager")

# GitHub API 配置
GITHUB_API = "https://api.github.com"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}


@mcp.tool()
def create_repository(name: str, description: str = "", private: bool = False) -> str:
    """
    创建 GitHub 仓库
    
    Args:
        name: 仓库名称
        description: 仓库描述
        private: 是否私有仓库
    
    Returns:
        创建结果
    """
    try:
        response = requests.post(
            f"{GITHUB_API}/user/repos",
            headers=HEADERS,
            json={
                "name": name,
                "description": description,
                "private": private,
                "auto_init": True
            }
        )
        
        if response.status_code == 201:
            data = response.json()
            return f"仓库创建成功: {data['html_url']}"
        else:
            return f"创建失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def list_repositories(org: str = "", per_page: int = 30) -> str:
    """
    列出仓库
    
    Args:
        org: 组织名称（为空则列出个人仓库）
        per_page: 每页数量
    
    Returns:
        仓库列表
    """
    try:
        if org:
            url = f"{GITHUB_API}/orgs/{org}/repos"
        else:
            url = f"{GITHUB_API}/user/repos"
        
        response = requests.get(
            url,
            headers=HEADERS,
            params={"per_page": per_page}
        )
        
        if response.status_code == 200:
            repos = response.json()
            result = f"找到 {len(repos)} 个仓库:\n\n"
            
            for repo in repos:
                visibility = "私有" if repo["private"] else "公开"
                result += f"- {repo['name']} ({visibility})\n"
                result += f"  {repo['description'] or '无描述'}\n"
                result += f"  Stars: {repo['stargazers_count']}\n\n"
            
            return result
        else:
            return f"获取失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def get_repository_info(owner: str, repo: str) -> str:
    """
    获取仓库信息
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
    
    Returns:
        仓库详细信息
    """
    try:
        response = requests.get(
            f"{GITHUB_API}/repos/{owner}/{repo}",
            headers=HEADERS
        )
        
        if response.status_code == 200:
            data = response.json()
            return f"""仓库信息:
名称: {data['full_name']}
描述: {data['description'] or '无'}
语言: {data['language'] or '未指定'}
Stars: {data['stargazers_count']}
Forks: {data['forks_count']}
Issues: {data['open_issues_count']}
创建时间: {data['created_at']}
最后更新: {data['updated_at']}
"""
        else:
            return f"获取失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 3.2 Issue 管理

```python
"""
GitHub MCP Issue 管理

通过 MCP 协议管理 GitHub Issue
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List, Optional
import requests
import os

mcp = FastMCP("github-issue-manager")

GITHUB_API = "https://api.github.com"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}


@mcp.tool()
def create_issue(owner: str, repo: str, title: str, body: str = "", 
                 labels: List[str] = None, assignees: List[str] = None) -> str:
    """
    创建 Issue
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
        title: Issue 标题
        body: Issue 内容
        labels: 标签列表
        assignees: 指派给的用户
    
    Returns:
        创建结果
    """
    try:
        payload = {
            "title": title,
            "body": body
        }
        
        if labels:
            payload["labels"] = labels
        if assignees:
            payload["assignees"] = assignees
        
        response = requests.post(
            f"{GITHUB_API}/repos/{owner}/{repo}/issues",
            headers=HEADERS,
            json=payload
        )
        
        if response.status_code == 201:
            data = response.json()
            return f"Issue 创建成功: {data['html_url']}"
        else:
            return f"创建失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def list_issues(owner: str, repo: str, state: str = "open", 
                labels: str = "", per_page: int = 30) -> str:
    """
    列出 Issue
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
        state: 状态（open/closed/all）
        labels: 标签过滤
        per_page: 每页数量
    
    Returns:
        Issue 列表
    """
    try:
        params = {
            "state": state,
            "per_page": per_page
        }
        
        if labels:
            params["labels"] = labels
        
        response = requests.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/issues",
            headers=HEADERS,
            params=params
        )
        
        if response.status_code == 200:
            issues = response.json()
            result = f"找到 {len(issues)} 个 Issue:\n\n"
            
            for issue in issues:
                result += f"#{issue['number']}: {issue['title']}\n"
                result += f"  状态: {issue['state']}\n"
                result += f"  创建者: {issue['user']['login']}\n"
                result += f"  标签: {', '.join([l['name'] for l in issue.get('labels', [])])}\n\n"
            
            return result
        else:
            return f"获取失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def close_issue(owner: str, repo: str, issue_number: int, comment: str = "") -> str:
    """
    关闭 Issue
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
        issue_number: Issue 编号
        comment: 关闭前的评论
    
    Returns:
        操作结果
    """
    try:
        # 先添加评论（如果有）
        if comment:
            requests.post(
                f"{GITHUB_API}/repos/{owner}/{repo}/issues/{issue_number}/comments",
                headers=HEADERS,
                json={"body": comment}
            )
        
        # 关闭 Issue
        response = requests.patch(
            f"{GITHUB_API}/repos/{owner}/{repo}/issues/{issue_number}",
            headers=HEADERS,
            json={"state": "closed"}
        )
        
        if response.status_code == 200:
            return f"Issue #{issue_number} 已关闭"
        else:
            return f"关闭失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def add_issue_comment(owner: str, repo: str, issue_number: int, body: str) -> str:
    """
    添加 Issue 评论
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
        issue_number: Issue 编号
        body: 评论内容
    
    Returns:
        操作结果
    """
    try:
        response = requests.post(
            f"{GITHUB_API}/repos/{owner}/{repo}/issues/{issue_number}/comments",
            headers=HEADERS,
            json={"body": body}
        )
        
        if response.status_code == 201:
            data = response.json()
            return f"评论添加成功: {data['html_url']}"
        else:
            return f"添加失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 3.3 PR 管理

```python
"""
GitHub MCP PR 管理

通过 MCP 协议管理 GitHub Pull Request
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List, Optional
import requests
import os

mcp = FastMCP("github-pr-manager")

GITHUB_API = "https://api.github.com"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}


@mcp.tool()
def create_pull_request(owner: str, repo: str, title: str, head: str, 
                        base: str, body: str = "") -> str:
    """
    创建 Pull Request
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
        title: PR 标题
        head: 源分支
        base: 目标分支
        body: PR 描述
    
    Returns:
        创建结果
    """
    try:
        response = requests.post(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls",
            headers=HEADERS,
            json={
                "title": title,
                "head": head,
                "base": base,
                "body": body
            }
        )
        
        if response.status_code == 201:
            data = response.json()
            return f"PR 创建成功: {data['html_url']}"
        else:
            return f"创建失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def list_pull_requests(owner: str, repo: str, state: str = "open") -> str:
    """
    列出 Pull Request
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
        state: 状态（open/closed/all）
    
    Returns:
        PR 列表
    """
    try:
        response = requests.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls",
            headers=HEADERS,
            params={"state": state}
        )
        
        if response.status_code == 200:
            prs = response.json()
            result = f"找到 {len(prs)} 个 PR:\n\n"
            
            for pr in prs:
                result += f"#{pr['number']}: {pr['title']}\n"
                result += f"  作者: {pr['user']['login']}\n"
                result += f"  分支: {pr['head']['ref']} -> {pr['base']['ref']}\n"
                result += f"  状态: {pr['state']}\n\n"
            
            return result
        else:
            return f"获取失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def review_pull_request(owner: str, repo: str, pr_number: int, 
                        event: str = "COMMENT", body: str = "") -> str:
    """
    审查 Pull Request
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
        pr_number: PR 编号
        event: 审查类型（APPROVE/REQUEST_CHANGES/COMMENT）
        body: 审查评论
    
    Returns:
        审查结果
    """
    try:
        response = requests.post(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}/reviews",
            headers=HEADERS,
            json={
                "event": event,
                "body": body
            }
        )
        
        if response.status_code == 200:
            return f"PR #{pr_number} 审查完成: {event}"
        else:
            return f"审查失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def merge_pull_request(owner: str, repo: str, pr_number: int, 
                       commit_title: str = "", commit_message: str = "") -> str:
    """
    合并 Pull Request
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
        pr_number: PR 编号
        commit_title: 提交标题
        commit_message: 提交信息
    
    Returns:
        合并结果
    """
    try:
        payload = {}
        if commit_title:
            payload["commit_title"] = commit_title
        if commit_message:
            payload["commit_message"] = commit_message
        
        response = requests.put(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}/merge",
            headers=HEADERS,
            json=payload
        )
        
        if response.status_code == 200:
            return f"PR #{pr_number} 合并成功"
        else:
            return f"合并失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 四、高级功能

### 4.1 代码分析

```python
"""
GitHub MCP 代码分析

通过 MCP 协议分析 GitHub 代码
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List
import requests
import os
import base64

mcp = FastMCP("github-code-analyzer")

GITHUB_API = "https://api.github.com"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
HEADERS = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}


@mcp.tool()
def get_file_content(owner: str, repo: str, path: str, ref: str = "main") -> str:
    """
    获取文件内容
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
        path: 文件路径
        ref: 分支或提交
    
    Returns:
        文件内容
    """
    try:
        response = requests.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
            headers=HEADERS,
            params={"ref": ref}
        )
        
        if response.status_code == 200:
            data = response.json()
            content = base64.b64decode(data["content"]).decode("utf-8")
            return content
        else:
            return f"获取失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def analyze_code_changes(owner: str, repo: str, pr_number: int) -> str:
    """
    分析代码变更
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
        pr_number: PR 编号
    
    Returns:
        变更分析
    """
    try:
        # 获取 PR 的 files
        response = requests.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/pulls/{pr_number}/files",
            headers=HEADERS
        )
        
        if response.status_code == 200:
            files = response.json()
            
            analysis = f"PR #{pr_number} 代码变更分析:\n\n"
            analysis += f"变更文件数: {len(files)}\n\n"
            
            total_additions = 0
            total_deletions = 0
            
            for file in files:
                analysis += f"文件: {file['filename']}\n"
                analysis += f"  状态: {file['status']}\n"
                analysis += f"  新增: +{file['additions']}\n"
                analysis += f"  删除: -{file['deletions']}\n"
                analysis += f"  变更: {file['changes']}\n\n"
                
                total_additions += file['additions']
                total_deletions += file['deletions']
            
            analysis += f"总计: +{total_additions} -{total_deletions}\n"
            
            return analysis
        else:
            return f"获取失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


@mcp.tool()
def get_commit_history(owner: str, repo: str, per_page: int = 10) -> str:
    """
    获取提交历史
    
    Args:
        owner: 仓库所有者
        repo: 仓库名称
        per_page: 每页数量
    
    Returns:
        提交历史
    """
    try:
        response = requests.get(
            f"{GITHUB_API}/repos/{owner}/{repo}/commits",
            headers=HEADERS,
            params={"per_page": per_page}
        )
        
        if response.status_code == 200:
            commits = response.json()
            result = f"最近 {len(commits)} 次提交:\n\n"
            
            for commit in commits:
                result += f"提交: {commit['sha'][:7]}\n"
                result += f"  作者: {commit['commit']['author']['name']}\n"
                result += f"  时间: {commit['commit']['author']['date']}\n"
                result += f"  信息: {commit['commit']['message']}\n\n"
            
            return result
        else:
            return f"获取失败: {response.json().get('message', '未知错误')}"
    
    except Exception as e:
        return f"错误: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 4.2 Webhook 处理

```python
"""
GitHub MCP Webhook 处理

处理 GitHub Webhook 事件
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, Any
import hashlib
import hmac
import os

mcp = FastMCP("github-webhook-handler")

WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")


@mcp.tool()
def verify_webhook(payload: str, signature: str) -> bool:
    """
    验证 Webhook 签名
    
    Args:
        payload: 请求体
        signature: X-Hub-Signature-256 头
    
    Returns:
        是否验证通过
    """
    if not WEBHOOK_SECRET:
        return True  # 未配置密钥时不验证
    
    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected, signature)


@mcp.tool()
def handle_push_event(event_data: Dict[str, Any]) -> str:
    """
    处理 Push 事件
    
    Args:
        event_data: 事件数据
    
    Returns:
        处理结果
    """
    repo = event_data.get("repository", {}).get("full_name", "unknown")
    ref = event_data.get("ref", "")
    commits = event_data.get("commits", [])
    
    result = f"Push 事件处理:\n"
    result += f"仓库: {repo}\n"
    result += f"分支: {ref}\n"
    result += f"提交数: {len(commits)}\n\n"
    
    for commit in commits:
        result += f"- {commit['id'][:7]}: {commit['message']}\n"
    
    return result


@mcp.tool()
def handle_pull_request_event(event_data: Dict[str, Any]) -> str:
    """
    处理 Pull Request 事件
    
    Args:
        event_data: 事件数据
    
    Returns:
        处理结果
    """
    action = event_data.get("action", "")
    pr = event_data.get("pull_request", {})
    
    result = f"PR 事件处理:\n"
    result += f"动作: {action}\n"
    result += f"PR: #{pr.get('number', 'unknown')}\n"
    result += f"标题: {pr.get('title', '')}\n"
    result += f"作者: {pr.get('user', {}).get('login', '')}\n"
    
    return result


@mcp.tool()
def handle_issue_event(event_data: Dict[str, Any]) -> str:
    """
    处理 Issue 事件
    
    Args:
        event_data: 事件数据
    
    Returns:
        处理结果
    """
    action = event_data.get("action", "")
    issue = event_data.get("issue", {})
    
    result = f"Issue 事件处理:\n"
    result += f"动作: {action}\n"
    result += f"Issue: #{issue.get('number', 'unknown')}\n"
    result += f"标题: {issue.get('title', '')}\n"
    result += f"作者: {issue.get('user', {}).get('login', '')}\n"
    
    return result


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 五、AI 产品经理关注点

```
GitHub MCP 产品化要点：

场景设计
├── 开发流程自动化
│   ├── 自动代码审查
│   ├── 智能 Issue 分类
│   └── PR 自动合并
├── 团队协作增强
│   ├── 智能指派
│   ├── 进度跟踪
│   └── 知识沉淀
├── 质量保障
│   ├── 代码质量分析
│   ├── 安全漏洞检测
│   └── 性能监控
└── 数据分析
    ├── 开发效率分析
    ├── 团队贡献统计
    └── 项目健康度评估

安全考虑
├── 权限控制
│   ├── Token 最小权限原则
│   ├── 操作审计日志
│   └── 敏感操作确认
├── 数据保护
│   ├── 代码脱敏
│   ├── 访问频率限制
│   └── 异常行为检测
└── 合规性
    ├── 企业安全策略
    ├── 数据保留政策
    └── 审计要求

关键指标
├── 效率指标
│   ├── Issue 处理时间缩短
│   ├── PR 合并周期缩短
│   ├── 代码审查覆盖率
│   └── 自动化率
├── 质量指标
│   ├── Bug 逃逸率
│   ├── 代码质量评分
│   ├── 安全漏洞数
│   └── 性能回归率
└── 团队指标
    ├── 开发者满意度
    ├── 协作效率提升
    └── 知识沉淀量

落地建议
├── 阶段一：试点
│   ├── 选择 1-2 个仓库
│   ├── 实现基础功能
│   └── 收集反馈
├── 阶段二：推广
│   ├── 扩展更多仓库
│   ├── 完善功能覆盖
│   └── 建立最佳实践
└── 阶段三：优化
    ├── 性能优化
    ├── 智能化提升
    └── 生态建设
```

---

## 六、参考资源

- [GitHub MCP Server](https://github.com/anthropics/mcp-github-server) - 官方 GitHub MCP Server
- [GitHub API 文档](https://docs.github.com/en/rest) - GitHub REST API 文档
- [GitHub Webhooks](https://docs.github.com/en/webhooks) - GitHub Webhook 文档
- [MCP 协议规范](https://spec.modelcontextprotocol.io/) - MCP 协议文档
