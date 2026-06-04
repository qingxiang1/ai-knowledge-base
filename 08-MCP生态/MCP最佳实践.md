<!--
  文件描述: MCP最佳实践指南，涵盖工具设计、安全、性能、测试、部署等全方位最佳实践
  作者: AI-PM-Knowledge
  创建日期: 2026-06-03
  最后修改日期: 2026-06-03
-->

# MCP 最佳实践

> MCP 开发中的设计模式、安全策略、性能优化、测试方法等全方位最佳实践指南。

---

## 一、MCP 最佳实践概述

### 1.1 什么是 MCP 最佳实践

```
MCP 最佳实践定义：

MCP 最佳实践
├── 本质：MCP 开发中的推荐方法和规范
├── 范围：
│   ├── 工具设计：如何设计易用、安全、高效的工具
│   ├── 安全策略：如何保护系统和数据安全
│   ├── 性能优化：如何提升响应速度和吞吐量
│   ├── 错误处理：如何优雅处理异常情况
│   ├── 测试策略：如何保证代码质量
│   └── 部署运维：如何稳定运行 MCP 服务
├── 价值：
│   ├── 提高代码质量和可维护性
│   ├── 降低安全风险
│   ├── 提升系统性能和稳定性
│   └── 加快开发和迭代速度
└── 原则：
    ├── 简单性：优先使用简单的解决方案
    ├── 一致性：保持代码和接口的一致性
    ├── 可测试性：设计易于测试的代码
    └── 可观测性：确保系统状态可观察
```

### 1.2 为什么要遵循最佳实践

```python
"""
MCP 最佳实践价值分析

从 AI 产品经理视角理解最佳实践的价值
"""

from typing import Dict, List
from dataclasses import dataclass

@dataclass
class PracticeBenefit:
    """最佳实践收益"""
    practice_area: str
    without_bp_risk: str  # 不遵循最佳实践的风险
    with_bp_benefit: str  # 遵循最佳实践的收益
    roi: float  # 投资回报率

class MCPBestPracticeValue:
    """MCP 最佳实践价值分析"""
    
    def __init__(self):
        """初始化价值分析"""
        self.benefits = [
            PracticeBenefit(
                practice_area="安全策略",
                without_bp_risk="数据泄露、系统被攻击",
                with_bp_benefit="保护敏感数据，防止未授权访问",
                roi=5.0
            ),
            PracticeBenefit(
                practice_area="性能优化",
                without_bp_risk="响应缓慢、用户体验差",
                with_bp_benefit="提升响应速度，改善用户体验",
                roi=3.0
            ),
            PracticeBenefit(
                practice_area="测试策略",
                without_bp_risk="线上故障频发、难以定位问题",
                with_bp_benefit="提前发现问题，提高系统稳定性",
                roi=4.0
            ),
            PracticeBenefit(
                practice_area="代码规范",
                without_bp_risk="代码难以维护、知识传递困难",
                with_bp_benefit="提高代码可读性和可维护性",
                roi=2.5
            )
        ]
    
    def analyze(self) -> List[Dict]:
        """
        分析最佳实践收益
        
        Returns:
            收益分析结果
        """
        return [
            {
                "领域": benefit.practice_area,
                "不遵循风险": benefit.without_bp_risk,
                "遵循收益": benefit.with_bp_benefit,
                "投资回报率": f"{benefit.roi}x"
            }
            for benefit in self.benefits
        ]

# 使用示例
"""
value = MCPBestPracticeValue()
for item in value.analyze():
    print(f"\n领域: {item['领域']}")
    print(f"  不遵循风险: {item['不遵循风险']}")
    print(f"  遵循收益: {item['遵循收益']}")
    print(f"  投资回报率: {item['投资回报率']}")
"""
```

---

## 二、工具设计最佳实践

### 2.1 工具命名规范

```python
"""
MCP 工具命名规范

遵循一致且有意义的命名规范，提高工具的可发现性和易用性
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List

mcp = FastMCP("naming-conventions-example")

# ============================================
# 命名规范原则
# ============================================
"""
命名规范核心原则：

1. 清晰性
   ├── 使用动词或动词短语命名操作
   ├── 使用名词或名词短语命名数据
   └── 避免使用缩写和模糊词汇

2. 一致性
   ├── 同一类型的操作使用相同的动词
   │   ├── 获取数据：get_, list_, search_
   │   ├── 创建数据：create_, add_, new_
   │   ├── 更新数据：update_, modify_, edit_
   │   └── 删除数据：delete_, remove_, destroy_
   └── 保持相同的命名风格（snake_case）

3. 层次性
   ├── 使用前缀表示工具所属领域
   │   ├── user_*：用户相关
   │   ├── file_*：文件相关
   │   ├── db_*：数据库相关
   │   └── api_*：API 相关
   └── 使用后缀表示操作类型
       ├── *_list：获取列表
       ├── *_detail：获取详情
       └── *_stats：获取统计

4. 粒度
   ├── 每个工具执行单一操作
   ├── 避免过于笼统的工具名
   └── 也不要过度拆分
"""


# 好的命名示例
@mcp.tool()
def get_user_profile(user_id: str) -> str:
    """
    获取用户资料
    
    命名规范遵循：
    - get_：表示获取操作
    - user_：表示操作对象
    - profile：表示具体内容
    """
    return f"User profile for {user_id}"


@mcp.tool()
def list_project_files(project_id: str, file_type: str = None) -> str:
    """
    列出项目文件
    
    命名规范遵循：
    - list_：表示列表操作
    - project_：表示所属项目
    - files：表示操作对象
    """
    return f"Files in project {project_id}"


@mcp.tool()
def create_notification(recipient_id: str, message: str) -> str:
    """
    创建通知
    
    命名规范遵循：
    - create_：表示创建操作
    - notification：表示操作对象
    """
    return f"Notification created for {recipient_id}"


# 不好的命名示例及改进
# ============================================
# 不推荐：使用缩写
# @mcp.tool()
# def get_usr_prof(uid: str) -> str:  # 不好
#     return ""

# 推荐：使用完整单词
# @mcp.tool()
# def get_user_profile(user_id: str) -> str:  # 好
#     return ""


# 不推荐：命名过于笼统
# @mcp.tool()
# def handle_request(request_type: str, data: Dict) -> str:  # 不好
#     return ""

# 推荐：明确具体的操作
# @mcp.tool()
# def create_resource(resource_type: str, data: Dict) -> str:  # 好
#     return ""


# 不推荐：命名不一致
# @mcp.tool()
# def fetch_user_data(user_id: str) -> str:  # 使用 fetch
#     return ""

# @mcp.tool()
# def get_user_settings(user_id: str) -> str:  # 使用 get
#     return ""

# 推荐：保持一致
# @mcp.tool()
# def get_user_data(user_id: str) -> str:  # 统一使用 get
#     return ""

# @mcp.tool()
# def get_user_settings(user_id: str) -> str:  # 统一使用 get
#     return ""


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 2.2 参数设计规范

```python
"""
MCP 工具参数设计规范

设计清晰、安全、易用的工具参数
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, validator

mcp = FastMCP("parameter-design-example")

# ============================================
# 参数设计核心原则
# ============================================
"""
参数设计核心原则：

1. 最小化参数
   ├── 只暴露必要的参数
   ├── 使用对象封装相关参数
   └── 提供合理的默认值

2. 类型安全
   ├── 使用明确的类型注解
   ├── 提供类型验证
   └── 避免使用 any 类型

3. 文档完善
   ├── 每个参数都有清晰的文档
   ├── 说明参数的意义和约束
   └── 提供使用示例

4. 安全优先
   ├── 敏感参数使用 Optional
   ├── 提供参数验证
   └── 防止注入攻击
"""


# 使用 Pydantic 模型进行参数验证
class CreateUserParams(BaseModel):
    """创建用户参数模型"""
    
    username: str = Field(..., description="用户名")
    email: str = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=8, description="密码")
    role: str = Field(default="user", description="用户角色")
    
    @validator("email")
    def validate_email(cls, v):
        """验证邮箱格式"""
        if "@" not in v:
            raise ValueError("无效的邮箱格式")
        return v
    
    @validator("password")
    def validate_password(cls, v):
        """验证密码强度"""
        if len(v) < 8:
            raise ValueError("密码长度至少8位")
        return v


class SearchParams(BaseModel):
    """搜索参数模型"""
    
    query: str = Field(..., min_length=1, max_length=200, description="搜索关键词")
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="筛选条件")
    sort_by: Optional[str] = Field(default="relevance", description="排序字段")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$", description="排序方向")


@mcp.tool()
def create_user(params: CreateUserParams) -> str:
    """
    创建用户
    
    参数设计要点：
    - 使用 Pydantic 模型进行验证
    - 提供清晰的错误信息
    - 设置合理的默认值
    """
    try:
        # 参数验证通过后的处理逻辑
        return f"用户 {params.username} 创建成功"
    except Exception as e:
        return f"创建失败: {str(e)}"


@mcp.tool()
def search_content(params: SearchParams) -> str:
    """
    搜索内容
    
    参数设计要点：
    - 使用模型封装多个相关参数
    - 提供分页和筛选能力
    - 限制参数取值范围
    """
    try:
        offset = (params.page - 1) * params.page_size
        return f"搜索 '{params.query}'，第 {params.page} 页，每页 {params.page_size} 条"
    except Exception as e:
        return f"搜索失败: {str(e)}"


# 避免的设计模式
# ============================================
"""
不推荐的参数设计：

1. 参数过多（超过5个）
   @mcp.tool()
   def create_user(name, email, password, role, phone, address, department, manager):
       # 参数过多，难以维护
       pass

   推荐：将相关参数封装为对象
   @mcp.tool()
   def create_user(user_data: UserData):
       pass

2. 使用 any 类型
   @mcp.tool()
   def process(data: Any):
       # 缺少类型安全
       pass

   推荐：使用明确的类型
   @mcp.tool()
   def process(data: ProcessData):
       pass

3. 缺少参数验证
   @mcp.tool()
   def delete_record(id: str):
       # 没有任何验证
       pass

   推荐：添加参数验证
   @mcp.tool()
   def delete_record(id: str = Field(..., pattern="^[a-zA-Z0-9-]+$")):
       pass
"""


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 2.3 返回值设计规范

```python
"""
MCP 工具返回值设计规范

设计一致、可预测、有意义的返回值
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json

mcp = FastMCP("return-value-design-example")

# ============================================
# 返回值设计核心原则
# ============================================
"""
返回值设计核心原则：

1. 一致性
   ├── 使用相同的返回格式
   ├── 保持成功和失败的处理一致
   └── 遵循统一的错误格式

2. 信息完整性
   ├── 包含操作状态
   ├── 提供足够的上下文信息
   └── 返回相关的数据

3. 可解析性
   ├── 结构化返回数据
   ├── 提供清晰的字段命名
   └── 便于程序解析

4. 用户友好
   ├── 返回人类可读的消息
   ├── 提供有意义的错误信息
   └── 包含操作建议
"""


# 标准化响应格式
@dataclass
class APIResponse:
    """标准 API 响应格式"""
    success: bool  # 操作是否成功
    message: str  # 响应消息
    data: Optional[Any] = None  # 响应数据
    error_code: Optional[str] = None  # 错误码
    metadata: Optional[Dict] = None  # 元数据


def format_success_response(message: str, data: Any = None, metadata: Dict = None) -> str:
    """
    格式化成功响应
    
    Args:
        message: 成功消息
        data: 响应数据
        metadata: 元数据
    
    Returns:
        格式化的响应字符串
    """
    response = APIResponse(
        success=True,
        message=message,
        data=data,
        metadata=metadata
    )
    return json.dumps(response.__dict__, ensure_ascii=False, indent=2)


def format_error_response(error: Exception, error_code: str = "UNKNOWN_ERROR") -> str:
    """
    格式化错误响应
    
    Args:
        error: 异常对象
        error_code: 错误码
    
    Returns:
        格式化的错误响应字符串
    """
    response = APIResponse(
        success=False,
        message=str(error),
        error_code=error_code
    )
    return json.dumps(response.__dict__, ensure_ascii=False, indent=2)


@mcp.tool()
def get_user_info(user_id: str) -> str:
    """
    获取用户信息
    
    返回值设计要点：
    - 使用统一的响应格式
    - 成功和失败使用相同的结构
    - 提供足够的上下文信息
    """
    try:
        # 模拟获取用户
        if not user_id:
            return format_error_response(
                ValueError("用户ID不能为空"),
                "INVALID_USER_ID"
            )
        
        user_data = {
            "id": user_id,
            "name": "张三",
            "email": "zhangsan@example.com"
        }
        
        return format_success_response(
            message=f"成功获取用户 {user_id} 的信息",
            data=user_data,
            metadata={"timestamp": "2026-06-03T10:00:00Z"}
        )
    
    except Exception as e:
        return format_error_response(e, "GET_USER_ERROR")


@mcp.tool()
def list_resources(resource_type: str, page: int = 1, page_size: int = 20) -> str:
    """
    列出资源
    
    返回值设计要点：
    - 提供分页信息
    - 包含总数和当前页
    - 返回资源列表
    """
    try:
        resources = [
            {"id": f"{resource_type}-{i}", "name": f"{resource_type} {i}"}
            for i in range(1, page_size + 1)
        ]
        
        return format_success_response(
            message=f"成功获取 {resource_type} 列表",
            data=resources,
            metadata={
                "page": page,
                "page_size": page_size,
                "total": 100,
                "total_pages": 5
            }
        )
    
    except Exception as e:
        return format_error_response(e, "LIST_RESOURCES_ERROR")


# 返回值格式化示例
# ============================================
"""
不同场景的返回值格式：

1. 列表查询
   {
     "success": true,
     "message": "查询成功",
     "data": [
       {"id": "1", "name": "Item 1"},
       {"id": "2", "name": "Item 2"}
     ],
     "metadata": {
       "total": 100,
       "page": 1,
       "page_size": 20
     }
   }

2. 单个对象查询
   {
     "success": true,
     "message": "获取成功",
     "data": {
       "id": "1",
       "name": "Example",
       "created_at": "2026-06-03T10:00:00Z"
     }
   }

3. 操作结果
   {
     "success": true,
     "message": "操作成功",
     "metadata": {
       "affected_rows": 1,
       "operation": "update"
     }
   }

4. 错误响应
   {
     "success": false,
     "message": "用户不存在",
     "error_code": "USER_NOT_FOUND"
   }
"""


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 三、安全最佳实践

### 3.1 认证与授权

```python
"""
MCP 安全最佳实践 - 认证与授权

实现安全的认证和授权机制
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, Optional, Callable
from functools import wraps
import os
import hashlib
import hmac
import time

mcp = FastMCP("security-auth-example")

# ============================================
# 认证机制
# ============================================

class AuthManager:
    """认证管理器"""
    
    def __init__(self):
        """初始化认证管理器"""
        self.api_keys: Dict[str, Dict] = {}  # API Key 存储
        self.tokens: Dict[str, Dict] = {}  # Token 存储
        self._load_keys()
    
    def _load_keys(self):
        """从环境变量加载 API Keys"""
        # 实际应用中从安全的存储加载
        pass
    
    def validate_api_key(self, api_key: str) -> bool:
        """
        验证 API Key
        
        Args:
            api_key: API Key
        
        Returns:
            是否有效
        """
        # 实际应用中应查询数据库或缓存
        return api_key.startswith("sk-")
    
    def generate_token(self, user_id: str, expires_in: int = 3600) -> str:
        """
        生成访问令牌
        
        Args:
            user_id: 用户 ID
            expires_in: 有效期（秒）
        
        Returns:
            访问令牌
        """
        token = hashlib.sha256(
            f"{user_id}:{time.time()}:{os.urandom(16)}".encode()
        ).hexdigest()
        
        self.tokens[token] = {
            "user_id": user_id,
            "expires_at": time.time() + expires_in
        }
        
        return token
    
    def validate_token(self, token: str) -> Optional[str]:
        """
        验证访问令牌
        
        Args:
            token: 访问令牌
        
        Returns:
            用户 ID 或 None
        """
        if token not in self.tokens:
            return None
        
        token_data = self.tokens[token]
        
        # 检查是否过期
        if time.time() > token_data["expires_at"]:
            del self.tokens[token]
            return None
        
        return token_data["user_id"]
    
    def verify_signature(self, payload: str, signature: str, secret: str) -> bool:
        """
        验证请求签名
        
        Args:
            payload: 请求数据
            signature: 签名
            secret: 密钥
        
        Returns:
            是否验证通过
        """
        expected = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected, signature)


# 全局认证管理器
auth_manager = AuthManager()


def require_auth(func: Callable) -> Callable:
    """
    认证装饰器
    
    使用方式：
    @require_auth
    def protected_tool(param: str) -> str:
        # 只有通过认证的请求才能执行
        pass
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # 从上下文获取认证信息
        # 实际应用中从请求头或参数中获取
        token = kwargs.get("_token")
        
        if not token:
            return "错误: 缺少认证令牌"
        
        user_id = auth_manager.validate_token(token)
        if not user_id:
            return "错误: 无效或已过期的认证令牌"
        
        # 将用户 ID 注入到参数中
        kwargs["_user_id"] = user_id
        return await func(*args, **kwargs)
    
    return wrapper


# ============================================
# 授权机制
# ============================================

class Permission:
    """权限定义"""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    ADMIN = "admin"


class Role:
    """角色定义"""
    GUEST = "guest"
    USER = "user"
    EDITOR = "editor"
    ADMIN = "admin"


# 角色权限映射
ROLE_PERMISSIONS: Dict[str, set] = {
    Role.GUEST: {Permission.READ},
    Role.USER: {Permission.READ, Permission.WRITE},
    Role.EDITOR: {Permission.READ, Permission.WRITE, Permission.DELETE},
    Role.ADMIN: {Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN}
}


class AuthorizationManager:
    """授权管理器"""
    
    def __init__(self):
        """初始化授权管理器"""
        self.user_roles: Dict[str, str] = {}
    
    def check_permission(self, user_id: str, permission: str) -> bool:
        """
        检查用户权限
        
        Args:
            user_id: 用户 ID
            permission: 权限标识
        
        Returns:
            是否有权限
        """
        role = self.user_roles.get(user_id, Role.GUEST)
        permissions = ROLE_PERMISSIONS.get(role, set())
        return permission in permissions
    
    def require_permission(self, permission: str) -> Callable:
        """
        权限检查装饰器
        
        Args:
            permission: 需要的权限
        
        Returns:
            装饰器函数
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                user_id = kwargs.get("_user_id")
                
                if not user_id:
                    return "错误: 未认证"
                
                if not self.check_permission(user_id, permission):
                    return f"错误: 权限不足，需要 {permission} 权限"
                
                return await func(*args, **kwargs)
            
            return wrapper
        return decorator


# 全局授权管理器
authz_manager = AuthorizationManager()


@mcp.tool()
@require_auth
@authz_manager.require_permission(Permission.READ)
def get_sensitive_data(data_id: str, _user_id: str = None) -> str:
    """
    获取敏感数据
    
    安全要点：
    - 需要认证
    - 需要读取权限
    - 记录访问日志
    """
    # 记录访问日志
    print(f"[SECURITY] User {_user_id} accessed data {data_id}")
    
    return f"数据 {data_id} 的内容"


@mcp.tool()
@require_auth
@authz_manager.require_permission(Permission.WRITE)
def update_sensitive_data(data_id: str, content: str, _user_id: str = None) -> str:
    """
    更新敏感数据
    
    安全要点：
    - 需要认证
    - 需要写入权限
    - 记录操作日志
    """
    # 记录操作日志
    print(f"[SECURITY] User {_user_id} updated data {data_id}")
    
    return f"数据 {data_id} 更新成功"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 3.2 输入验证

```python
"""
MCP 安全最佳实践 - 输入验证

防止注入攻击和数据验证
"""

from mcp.server.fastmcp import FastMCP
from typing import Any, List
import re
import html

mcp = FastMCP("security-validation-example")

# ============================================
# 输入验证函数
# ============================================

def validate_string(value: str, pattern: str = None, max_length: int = 1000) -> str:
    """
    验证字符串输入
    
    Args:
        value: 输入值
        pattern: 正则表达式模式
        max_length: 最大长度
    
    Returns:
        验证后的值
    
    Raises:
        ValueError: 验证失败
    """
    if not isinstance(value, str):
        raise ValueError("输入必须是字符串")
    
    if len(value) > max_length:
        raise ValueError(f"输入长度不能超过 {max_length}")
    
    if pattern and not re.match(pattern, value):
        raise ValueError(f"输入格式不正确")
    
    return value


def validate_sql_input(value: str) -> str:
    """
    验证 SQL 输入，防止 SQL 注入
    
    Args:
        value: SQL 输入值
    
    Returns:
        验证后的值
    
    Raises:
        ValueError: 包含危险字符
    """
    dangerous_patterns = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)",
        r"(--|#|/\*|\*/)",
        r"(\bOR\b|\bAND\b).*=.*",
        r"('|;|\\)"
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, value, re.IGNORECASE):
            raise ValueError("输入包含危险的 SQL 模式")
    
    return value


def validate_html_input(value: str) -> str:
    """
    验证 HTML 输入，防止 XSS 攻击
    
    Args:
        value: HTML 输入值
    
    Returns:
        转义后的值
    """
    return html.escape(value)


def validate_file_path(path: str, allowed_dirs: List[str]) -> str:
    """
    验证文件路径，防止路径遍历攻击
    
    Args:
        path: 文件路径
        allowed_dirs: 允许的目录列表
    
    Returns:
        验证后的路径
    
    Raises:
        ValueError: 路径不在允许范围内
    """
    import os
    
    # 规范化路径
    normalized = os.path.normpath(path)
    
    # 检查是否在允许的目录内
    for allowed_dir in allowed_dirs:
        if normalized.startswith(os.path.abspath(allowed_dir)):
            return normalized
    
    raise ValueError("文件路径不在允许范围内")


def validate_email(email: str) -> str:
    """
    验证邮箱格式
    
    Args:
        email: 邮箱地址
    
    Returns:
        验证后的邮箱
    
    Raises:
        ValueError: 格式不正确
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValueError("邮箱格式不正确")
    return email


# ============================================
# 使用验证的示例工具
# ============================================

@mcp.tool()
def search_database(query: str) -> str:
    """
    搜索数据库
    
    安全要点：
    - 验证搜索关键词
    - 防止 SQL 注入
    - 限制返回数量
    """
    try:
        # 验证输入
        safe_query = validate_sql_input(query)
        safe_query = validate_string(safe_query, max_length=200)
        
        # 执行搜索
        return f"搜索 '{safe_query}' 的结果"
    
    except ValueError as e:
        return f"输入验证失败: {str(e)}"
    except Exception as e:
        return f"搜索失败: {str(e)}"


@mcp.tool()
def display_content(content: str) -> str:
    """
    显示内容
    
    安全要点：
    - 转义 HTML 内容
    - 防止 XSS 攻击
    """
    try:
        # 转义 HTML
        safe_content = validate_html_input(content)
        
        return f"显示内容: {safe_content}"
    
    except Exception as e:
        return f"处理失败: {str(e)}"


@mcp.tool()
def read_file(file_path: str, base_dir: str = "/data") -> str:
    """
    读取文件
    
    安全要点：
    - 验证文件路径
    - 防止路径遍历攻击
    - 限制访问范围
    """
    try:
        # 验证路径
        safe_path = validate_file_path(file_path, [base_dir])
        
        return f"读取文件: {safe_path}"
    
    except ValueError as e:
        return f"路径验证失败: {str(e)}"
    except Exception as e:
        return f"读取失败: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 3.3 敏感信息保护

```python
"""
MCP 安全最佳实践 - 敏感信息保护

保护敏感数据的最佳实践
"""

from mcp.server.fastmcp import FastMCP
from typing import Any, Dict, Optional
import os
import re

mcp = FastMCP("security-sensitive-data-example")

# ============================================
# 敏感信息识别
# ============================================

# 敏感字段模式
SENSITIVE_FIELDS = {
    "password", "passwd", "pwd",
    "secret", "token", "apikey", "api_key",
    "access_key", "access_token",
    "private_key", "privatekey",
    "credit_card", "card_number", "cvv", "cvc",
    "ssn", "social_security",
    "phone", "mobile",
    "address", "location"
}

# 敏感信息正则模式
SENSITIVE_PATTERNS = [
    (r'\b\d{3}-\d{2}-\d{4}\b', 'SSN'),
    (r'\b\d{16}\b', '信用卡号'),
    (r'Bearer\s+[a-zA-Z0-9\-._~+/]+', 'Bearer Token'),
    (r'sk-[a-zA-Z0-9]{32,}', 'API Key'),
]


def identify_sensitive_data(data: Dict) -> set:
    """
    识别字典中的敏感字段
    
    Args:
        data: 输入数据
    
    Returns:
        敏感字段列表
    """
    sensitive = set()
    
    for key in data.keys():
        key_lower = key.lower()
        for sensitive_field in SENSITIVE_FIELDS:
            if sensitive_field in key_lower:
                sensitive.add(key)
                break
    
    return sensitive


def mask_sensitive_value(value: str, field_name: str = None) -> str:
    """
    遮蔽敏感值
    
    Args:
        value: 原始值
        field_name: 字段名
    
    Returns:
        遮蔽后的值
    """
    if not value:
        return "***"
    
    value_str = str(value)
    length = len(value_str)
    
    if length <= 4:
        return "****"
    
    # 根据长度保留前后各2个字符
    return value_str[:2] + "*" * (length - 4) + value_str[-2:]


def mask_dict(data: Dict, sensitive_fields: set = None) -> Dict:
    """
    遮蔽字典中的敏感数据
    
    Args:
        data: 输入字典
        sensitive_fields: 已知的敏感字段
    
    Returns:
        遮蔽后的字典
    """
    if sensitive_fields is None:
        sensitive_fields = identify_sensitive_data(data)
    
    masked = {}
    
    for key, value in data.items():
        if key in sensitive_fields:
            masked[key] = mask_sensitive_value(str(value), key)
        elif isinstance(value, dict):
            masked[key] = mask_dict(value, sensitive_fields)
        else:
            masked[key] = value
    
    return masked


def scan_sensitive_patterns(text: str) -> list:
    """
    扫描文本中的敏感信息模式
    
    Args:
        text: 输入文本
    
    Returns:
        发现的信息列表
    """
    findings = []
    
    for pattern, info_type in SENSITIVE_PATTERNS:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            findings.append({
                "type": info_type,
                "value": mask_sensitive_value(match.group()),
                "position": match.span()
            })
    
    return findings


def sanitize_log_data(data: Any, depth: int = 0, max_depth: int = 10) -> Any:
    """
    清理日志数据，移除敏感信息
    
    Args:
        data: 输入数据
        depth: 当前深度
        max_depth: 最大递归深度
    
    Returns:
        清理后的数据
    """
    if depth >= max_depth:
        return "***"
    
    if isinstance(data, dict):
        sensitive = identify_sensitive_data(data)
        return {
            k: sanitize_log_data(v, depth + 1, max_depth) 
            if k not in sensitive 
            else "***"
            for k, v in data.items()
        }
    elif isinstance(data, list):
        return [sanitize_log_data(item, depth + 1, max_depth) for item in data]
    else:
        # 检查是否包含敏感模式
        text = str(data)
        findings = scan_sensitive_patterns(text)
        if findings:
            return "***[SENSITIVE]***"
        return data


# ============================================
# 安全工具示例
# ============================================

@mcp.tool()
def log_operation(operation: str, user_id: str, data: Dict) -> str:
    """
    记录操作日志
    
    安全要点：
    - 自动识别敏感字段
    - 遮蔽敏感信息
    - 记录审计信息
    """
    # 清理敏感数据
    safe_data = sanitize_log_data(data)
    
    # 扫描敏感模式
    findings = scan_sensitive_patterns(str(data))
    if findings:
        return f"警告: 检测到敏感信息 {findings}"
    
    print(f"[LOG] Operation: {operation}, User: {user_id}, Data: {safe_data}")
    return "操作日志已记录"


@mcp.tool()
def process_user_data(user_data: Dict) -> str:
    """
    处理用户数据
    
    安全要点：
    - 验证和清理输入
    - 遮蔽敏感响应
    """
    try:
        # 识别敏感字段
        sensitive = identify_sensitive_data(user_data)
        
        # 处理数据（这里只是示例）
        result = {"status": "success"}
        
        # 返回处理结果，遮蔽敏感信息
        if sensitive:
            result["processed_data"] = mask_dict(user_data, sensitive)
        else:
            result["processed_data"] = user_data
        
        return f"处理成功: {result}"
    
    except Exception as e:
        return f"处理失败: {str(e)}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 四、性能最佳实践

### 4.1 连接管理

```python
"""
MCP 性能最佳实践 - 连接管理

优化连接池和资源管理
"""

from mcp.server.fastmcp import FastMCP
from typing import Dict, Optional, Any
import asyncio
import time
from contextlib import asynccontextmanager

mcp = FastMCP("performance-connection-example")

# ============================================
# 连接池实现
# ============================================

class ConnectionPool:
    """通用连接池"""
    
    def __init__(
        self,
        max_size: int = 10,
        min_size: int = 2,
        timeout: float = 30.0
    ):
        """
        初始化连接池
        
        Args:
            max_size: 最大连接数
            min_size: 最小连接数
            timeout: 连接超时时间（秒）
        """
        self.max_size = max_size
        self.min_size = min_size
        self.timeout = timeout
        
        self._pool: asyncio.Queue = asyncio.Queue(maxsize=max_size)
        self._size = 0
        self._lock = asyncio.Lock()
    
    async def initialize(self):
        """初始化连接池，创建最小连接数"""
        async with self._lock:
            for _ in range(self.min_size):
                conn = await self._create_connection()
                await self._pool.put(conn)
                self._size += 1
    
    async def _create_connection(self) -> Dict:
        """
        创建新连接
        
        Returns:
            连接对象
        """
        # 模拟创建连接
        return {
            "id": time.time(),
            "created_at": time.time(),
            "in_use": False
        }
    
    async def acquire(self) -> Dict:
        """
        获取连接
        
        Returns:
            连接对象
        """
        try:
            # 带超时获取
            conn = await asyncio.wait_for(
                self._pool.get(),
                timeout=self.timeout
            )
            conn["in_use"] = True
            return conn
        except asyncio.TimeoutError:
            raise TimeoutError("获取连接超时")
    
    async def release(self, conn: Dict):
        """
        释放连接
        
        Args:
            conn: 连接对象
        """
        conn["in_use"] = False
        conn["last_used"] = time.time()
        await self._pool.put(conn)
    
    async def close(self):
        """关闭连接池"""
        async with self._lock:
            while not self._pool.empty():
                conn = await self._pool.get()
                await self._close_connection(conn)
            self._size = 0
    
    async def _close_connection(self, conn: Dict):
        """关闭单个连接"""
        # 模拟关闭连接
        pass


@asynccontextmanager
async def managed_connection(pool: ConnectionPool):
    """
    连接上下文管理器
    
    使用方式：
    async with managed_connection(pool) as conn:
        # 使用连接
        pass
    # 连接自动归还到池中
    """
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        await pool.release(conn)


# 全局连接池
_global_pool: Optional[ConnectionPool] = None


async def get_connection_pool() -> ConnectionPool:
    """
    获取全局连接池
    
    Returns:
        连接池实例
    """
    global _global_pool
    if _global_pool is None:
        _global_pool = ConnectionPool()
        await _global_pool.initialize()
    return _global_pool


# ============================================
# 使用连接池的工具示例
# ============================================

@mcp.tool()
async def query_database(sql: str) -> str:
    """
    查询数据库
    
    性能要点：
    - 使用连接池管理连接
    - 确保连接正确释放
    - 设置超时保护
    """
    try:
        pool = await get_connection_pool()
        
        async with managed_connection(pool) as conn:
            # 模拟执行查询
            await asyncio.sleep(0.1)  # 模拟延迟
            
            return f"查询成功，连接ID: {conn['id']}"
    
    except TimeoutError as e:
        return f"查询超时: {str(e)}"
    except Exception as e:
        return f"查询失败: {str(e)}"


@mcp.tool()
async def batch_query(queries: list) -> str:
    """
    批量查询
    
    性能要点：
    - 限制并发数
    - 使用信号量控制
    """
    semaphore = asyncio.Semaphore(5)  # 最多5个并发
    
    async def query_with_limit(query: str):
        async with semaphore:
            pool = await get_connection_pool()
            async with managed_connection(pool) as conn:
                await asyncio.sleep(0.05)
                return f"查询 '{query}' 完成"
    
    results = await asyncio.gather(*[
        query_with_limit(q) for q in queries
    ])
    
    return f"批量查询完成: {len(results)} 条"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

### 4.2 缓存策略

```python
"""
MCP 性能最佳实践 - 缓存策略

实现高效的缓存机制
"""

from mcp.server.fastmcp import FastMCP
from typing import Any, Dict, Optional, Callable
import time
import hashlib
import json
from functools import wraps
import asyncio

mcp = FastMCP("performance-cache-example")

# ============================================
# 缓存实现
# ============================================

class Cache:
    """简单内存缓存"""
    
    def __init__(self, default_ttl: int = 300):
        """
        初始化缓存
        
        Args:
            default_ttl: 默认过期时间（秒）
        """
        self.default_ttl = default_ttl
        self._cache: Dict[str, Dict] = {}
        self._lock = asyncio.Lock()
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """
        生成缓存键
        
        Args:
            prefix: 键前缀
            *args: 位置参数
            **kwargs: 关键字参数
        
        Returns:
            缓存键
        """
        key_data = {
            "args": args,
            "kwargs": kwargs
        }
        key_str = json.dumps(key_data, sort_keys=True)
        key_hash = hashlib.md5(key_str.encode()).hexdigest()
        return f"{prefix}:{key_hash}"
    
    async def get(self, key: str) -> Optional[Any]:
        """
        获取缓存
        
        Args:
            key: 缓存键
        
        Returns:
            缓存值或 None
        """
        async with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            
            # 检查是否过期
            if time.time() > entry["expires_at"]:
                del self._cache[key]
                return None
            
            entry["last_accessed"] = time.time()
            entry["hit_count"] += 1
            
            return entry["value"]
    
    async def set(self, key: str, value: Any, ttl: int = None):
        """
        设置缓存
        
        Args:
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒）
        """
        async with self._lock:
            self._cache[key] = {
                "value": value,
                "created_at": time.time(),
                "expires_at": time.time() + (ttl or self.default_ttl),
                "last_accessed": time.time(),
                "hit_count": 0
            }
    
    async def delete(self, key: str):
        """
        删除缓存
        
        Args:
            key: 缓存键
        """
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    async def clear(self):
        """清空缓存"""
        async with self._lock:
            self._cache.clear()
    
    def get_stats(self) -> Dict:
        """
        获取缓存统计
        
        Returns:
            统计信息
        """
        total_hits = sum(entry["hit_count"] for entry in self._cache.values())
        return {
            "size": len(self._cache),
            "total_hits": total_hits,
            "items": [
                {
                    "key": key,
                    "age": time.time() - entry["created_at"],
                    "hits": entry["hit_count"]
                }
                for key, entry in self._cache.items()
            ]
        }


# 全局缓存实例
_global_cache: Optional[Cache] = None


def get_cache() -> Cache:
    """
    获取全局缓存实例
    
    Returns:
        缓存实例
    """
    global _global_cache
    if _global_cache is None:
        _global_cache = Cache(default_ttl=300)
    return _global_cache


def cached(prefix: str, ttl: int = None):
    """
    缓存装饰器
    
    使用方式：
    @cached(prefix="user", ttl=600)
    async def get_user(user_id: str) -> str:
        # 结果会被缓存
        pass
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache = get_cache()
            key = cache._generate_key(prefix, *args, **kwargs)
            
            # 尝试获取缓存
            cached_value = await cache.get(key)
            if cached_value is not None:
                return f"[缓存命中] {cached_value}"
            
            # 执行函数
            result = await func(*args, **kwargs)
            
            # 存入缓存
            await cache.set(key, result, ttl)
            
            return result
        
        return wrapper
    return decorator


# ============================================
# 使用缓存的工具示例
# ============================================

@mcp.tool()
@cached(prefix="user_profile", ttl=600)
async def get_user_profile(user_id: str) -> str:
    """
    获取用户资料
    
    性能要点：
    - 使用缓存装饰器
    - 设置合理的过期时间
    - 缓存用户常见查询
    """
    # 模拟数据库查询
    await asyncio.sleep(0.5)
    
    return f"用户 {user_id} 的资料"


@mcp.tool()
async def invalidate_user_cache(user_id: str) -> str:
    """
    使用户缓存失效
    
    性能要点：
    - 允许主动清除缓存
    - 确保数据一致性
    """
    cache = get_cache()
    # 注意：这里需要更好的键生成逻辑来精确清除
    await cache.clear()
    
    return f"用户 {user_id} 的缓存已清除"


@mcp.tool()
def get_cache_stats() -> str:
    """
    获取缓存统计
    
    性能要点：
    - 提供缓存监控能力
    - 帮助调优缓存策略
    """
    cache = get_cache()
    stats = cache.get_stats()
    
    output = "缓存统计:\n\n"
    output += f"缓存条目数: {stats['size']}\n"
    output += f"总命中次数: {stats['total_hits']}\n"
    
    if stats['items']:
        output += "\n缓存详情:\n"
        for item in stats['items'][:5]:  # 只显示前5条
            output += f"  - {item['key']}: {item['hits']} 次命中\n"
    
    return output


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 五、错误处理最佳实践

### 5.1 错误分类

```python
"""
MCP 错误处理最佳实践 - 错误分类

定义清晰的错误分类体系
"""

from mcp.server.fastmcp import FastMCP
from enum import Enum
from typing import Optional, Any
from dataclasses import dataclass

mcp = FastMCP("error-handling-example")


# ============================================
# 错误分类定义
# ============================================

class ErrorCategory(Enum):
    """错误分类"""
    VALIDATION = "validation"  # 输入验证错误
    AUTHENTICATION = "authentication"  # 认证错误
    AUTHORIZATION = "authorization"  # 授权错误
    NOT_FOUND = "not_found"  # 资源不存在
    CONFLICT = "conflict"  # 资源冲突
    RATE_LIMIT = "rate_limit"  # 限流错误
    TIMEOUT = "timeout"  # 超时错误
    INTERNAL = "internal"  # 内部错误


class ErrorSeverity(Enum):
    """错误严重级别"""
    LOW = "low"  # 低：不影响核心功能
    MEDIUM = "medium"  # 中：部分功能受影响
    HIGH = "high"  # 高：核心功能不可用
    CRITICAL = "critical"  # 严重：系统不可用


@dataclass
class MCPErrors:
    """MCP 错误码定义"""
    
    # 通用错误码 (1000-1999)
    UNKNOWN_ERROR = (1000, ErrorCategory.INTERNAL, ErrorSeverity.HIGH, "未知错误")
    INVALID_INPUT = (1001, ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM, "无效的输入参数")
    
    # 认证错误码 (2000-2999)
    AUTH_REQUIRED = (2000, ErrorCategory.AUTHENTICATION, ErrorSeverity.HIGH, "需要认证")
    AUTH_INVALID_TOKEN = (2001, ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, "无效的认证令牌")
    AUTH_EXPIRED_TOKEN = (2002, ErrorCategory.AUTHENTICATION, ErrorSeverity.MEDIUM, "认证令牌已过期")
    
    # 授权错误码 (3000-3999)
    PERMISSION_DENIED = (3000, ErrorCategory.AUTHORIZATION, ErrorSeverity.HIGH, "权限不足")
    
    # 资源错误码 (4000-4999)
    RESOURCE_NOT_FOUND = (4000, ErrorCategory.NOT_FOUND, ErrorSeverity.LOW, "资源不存在")
    RESOURCE_CONFLICT = (4001, ErrorCategory.CONFLICT, ErrorSeverity.MEDIUM, "资源冲突")
    
    # 性能错误码 (5000-5999)
    RATE_LIMIT_EXCEEDED = (5000, ErrorCategory.RATE_LIMIT, ErrorSeverity.MEDIUM, "请求过于频繁")
    OPERATION_TIMEOUT = (5001, ErrorCategory.TIMEOUT, ErrorSeverity.MEDIUM, "操作超时")
    
    # 业务错误码 (6000-6999)
    USER_NOT_FOUND = (6000, ErrorCategory.NOT_FOUND, ErrorSeverity.LOW, "用户不存在")
    INVALID_PASSWORD = (6001, ErrorCategory.VALIDATION, ErrorSeverity.MEDIUM, "密码错误")
    
    @classmethod
    def get_error_info(cls, error_code: int):
        """
        获取错误信息
        
        Args:
            error_code: 错误码
        
        Returns:
            错误信息元组
        """
        for attr_name in dir(cls):
            if not attr_name.startswith('_'):
                attr_value = getattr(cls, attr_name)
                if isinstance(attr_value, tuple) and attr_value[0] == error_code:
                    return attr_value
        return cls.UNKNOWN_ERROR


class MCPException(Exception):
    """MCP 异常基类"""
    
    def __init__(
        self,
        error_code: int,
        message: str = None,
        details: Any = None
    ):
        """
        初始化异常
        
        Args:
            error_code: 错误码
            message: 错误消息
            details: 错误详情
        """
        self.error_code = error_code
        self.message = message or self._get_default_message()
        self.details = details
        
        # 获取错误分类和严重级别
        error_info = MCPErrors.get_error_info(error_code)
        self.category = error_info[1]
        self.severity = error_info[2]
        
        super().__init__(self.message)
    
    def _get_default_message(self) -> str:
        """获取默认错误消息"""
        error_info = MCPErrors.get_error_info(self.error_code)
        return error_info[3]
    
    def to_dict(self) -> dict:
        """
        转换为字典
        
        Returns:
            错误信息字典
        """
        return {
            "error_code": self.error_code,
            "message": self.message,
            "category": self.category.value,
            "severity": self.severity.value,
            "details": self.details
        }


# 便捷异常类
class ValidationError(MCPException):
    """验证错误"""
    def __init__(self, message: str, details: Any = None):
        super().__init__(
            error_code=MCPErrors.INVALID_INPUT[0],
            message=message,
            details=details
        )


class AuthenticationError(MCPException):
    """认证错误"""
    def __init__(self, message: str = None):
        super().__init__(
            error_code=MCPErrors.AUTH_INVALID_TOKEN[0],
            message=message
        )


class AuthorizationError(MCPException):
    """授权错误"""
    def __init__(self, message: str = None):
        super().__init__(
            error_code=MCPErrors.PERMISSION_DENIED[0],
            message=message
        )


class NotFoundError(MCPException):
    """资源不存在错误"""
    def __init__(self, resource: str, resource_id: str = None):
        message = f"{resource} 不存在"
        if resource_id:
            message += f": {resource_id}"
        super().__init__(
            error_code=MCPErrors.RESOURCE_NOT_FOUND[0],
            message=message
        )


class RateLimitError(MCPException):
    """限流错误"""
    def __init__(self, retry_after: int = None):
        super().__init__(
            error_code=MCPErrors.RATE_LIMIT_EXCEEDED[0],
            details={"retry_after": retry_after}
        )


# ============================================
# 使用示例
# ============================================

@mcp.tool()
def get_user_safe(user_id: str) -> str:
    """
    获取用户（安全的错误处理）
    
    错误处理要点：
    - 定义清晰的错误码
    - 区分错误严重级别
    - 提供有意义的错误信息
    """
    try:
        if not user_id:
            raise ValidationError("用户ID不能为空")
        
        if len(user_id) < 3:
            raise ValidationError("用户ID长度至少3个字符")
        
        # 模拟获取用户
        return f"用户 {user_id} 的信息"
    
    except MCPException as e:
        error_dict = e.to_dict()
        return f"错误 {error_dict['error_code']}: {error_dict['message']}"
    
    except Exception as e:
        # 未预期的错误
        error = MCPException(
            error_code=MCPErrors.UNKNOWN_ERROR[0],
            message=str(e)
        )
        return f"错误 {error.error_code}: {error.message}"


if __name__ == "__main__":
    mcp.run(transport='stdio')
```

---

## 六、测试最佳实践

### 6.1 测试框架与结构

```python
"""
MCP 测试最佳实践 - 测试框架

使用 pytest 进行 MCP 工具测试
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.server.fastmcp import FastMCP

# ============================================
# 测试夹具 (Fixtures)
# ============================================

@pytest.fixture
def mcp_server():
    """创建 MCP 服务器实例"""
    return FastMCP("test-server")


@pytest.fixture
def mock_database():
    """模拟数据库"""
    mock_db = AsyncMock()
    mock_db.query = AsyncMock(return_value=[
        {"id": "1", "name": "Test User"}
    ])
    return mock_db


@pytest.fixture
def sample_user_data():
    """示例用户数据"""
    return {
        "user_id": "123",
        "name": "张三",
        "email": "zhangsan@example.com",
        "role": "admin"
    }


# ============================================
# 单元测试示例
# ============================================

class TestMCPTools:
    """MCP 工具测试类"""
    
    def test_tool_registration(self, mcp_server):
        """测试工具注册"""
        
        @mcp_server.tool()
        def test_tool(param: str) -> str:
            return f"Result: {param}"
        
        # 验证工具已注册
        assert "test_tool" in [tool.name for tool in mcp_server._tool_manager._tools.values()]
    
    def test_tool_execution(self, mcp_server):
        """测试工具执行"""
        
        @mcp_server.tool()
        def add_numbers(a: int, b: int) -> int:
            return a + b
        
        # 执行工具
        result = add_numbers(a=1, b=2)
        assert result == 3
    
    def test_tool_with_mock(self, mcp_server, mock_database):
        """测试使用 Mock"""
        
        @mcp_server.tool()
        async def get_user(user_id: str) -> str:
            result = await mock_database.query(user_id)
            return str(result)
        
        # 异步测试
        result = asyncio.run(get_user("123"))
        assert "Test User" in result


class TestInputValidation:
    """输入验证测试类"""
    
    def test_valid_email(self):
        """测试有效邮箱"""
        import re
        email = "test@example.com"
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        assert re.match(pattern, email) is not None
    
    def test_invalid_email(self):
        """测试无效邮箱"""
        import re
        email = "invalid-email"
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        assert re.match(pattern, email) is None
    
    def test_string_length_limit(self):
        """测试字符串长度限制"""
        max_length = 100
        test_string = "a" * 150
        assert len(test_string) > max_length


class TestErrorHandling:
    """错误处理测试类"""
    
    def test_validation_error(self):
        """测试验证错误"""
        with pytest.raises(ValueError) as exc_info:
            raise ValueError("输入无效")
        assert "输入无效" in str(exc_info.value)
    
    def test_exception_handling(self):
        """测试异常处理"""
        
        def risky_operation():
            try:
                raise RuntimeError("操作失败")
            except RuntimeError as e:
                return f"捕获错误: {str(e)}"
        
        result = risky_operation()
        assert "操作失败" in result


# ============================================
# 集成测试示例
# ============================================

class TestIntegration:
    """集成测试类"""
    
    @pytest.mark.asyncio
    async def test_full_workflow(self, mcp_server):
        """测试完整工作流"""
        
        results = []
        
        @mcp_server.tool()
        async def step1(data: str) -> str:
            await asyncio.sleep(0.01)
            return f"Step1: {data}"
        
        @mcp_server.tool()
        async def step2(data: str) -> str:
            await asyncio.sleep(0.01)
            return f"Step2: {data}"
        
        # 执行工作流
        result1 = await step1("input")
        results.append(result1)
        
        result2 = await step2(result1)
        results.append(result2)
        
        assert len(results) == 2
        assert "Step1" in results[0]
        assert "Step2" in results[1]


# ============================================
# 运行测试
# ============================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
```

---

## 七、部署与运维最佳实践

### 7.1 配置管理

```python
"""
MCP 部署最佳实践 - 配置管理

使用环境变量和配置文件管理配置
"""

import os
from typing import Optional, Dict, Any
from dataclasses import dataclass
import json

# ============================================
# 配置模型定义
# ============================================

@dataclass
class ServerConfig:
    """服务器配置"""
    host: str = "0.0.0.0"
    port: int = 8080
    workers: int = 4
    debug: bool = False
    log_level: str = "INFO"


@dataclass
class DatabaseConfig:
    """数据库配置"""
    host: str = "localhost"
    port: int = 5432
    name: str = "mcp_db"
    user: str
    password: str
    pool_size: int = 10
    max_overflow: int = 20


@dataclass
class SecurityConfig:
    """安全配置"""
    api_key: Optional[str] = None
    jwt_secret: Optional[str] = None
    jwt_expiry: int = 3600
    allowed_origins: list = None
    
    def __post_init__(self):
        if self.allowed_origins is None:
            self.allowed_origins = ["*"]


class ConfigManager:
    """配置管理器"""
    
    def __init__(self):
        """初始化配置管理器"""
        self._config: Dict[str, Any] = {}
        self._load_config()
    
    def _load_config(self):
        """从环境变量加载配置"""
        # 服务器配置
        self._config["server"] = ServerConfig(
            host=os.getenv("SERVER_HOST", "0.0.0.0"),
            port=int(os.getenv("SERVER_PORT", "8080")),
            workers=int(os.getenv("SERVER_WORKERS", "4")),
            debug=os.getenv("DEBUG", "false").lower() == "true",
            log_level=os.getenv("LOG_LEVEL", "INFO")
        )
        
        # 数据库配置
        self._config["database"] = DatabaseConfig(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "5432")),
            name=os.getenv("DB_NAME", "mcp_db"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "")
        )
        
        # 安全配置
        self._config["security"] = SecurityConfig(
            api_key=os.getenv("API_KEY"),
            jwt_secret=os.getenv("JWT_SECRET"),
            jwt_expiry=int(os.getenv("JWT_EXPIRY", "3600"))
        )
    
    def get(self, key: str) -> Any:
        """
        获取配置
        
        Args:
            key: 配置键（如 "server.host"）
        
        Returns:
            配置值
        """
        keys = key.split(".")
        value = self._config
        
        for k in keys:
            if isinstance(value, dict):
                value = value.get(k)
            else:
                value = getattr(value, k, None)
        
        return value
    
    def validate(self) -> bool:
        """
        验证配置
        
        Returns:
            配置是否有效
        """
        errors = []
        
        # 验证必需配置
        if not self._config["database"].password:
            errors.append("数据库密码未设置")
        
        if not self._config["security"].api_key:
            errors.append("API Key 未设置")
        
        # 验证配置值范围
        if self._config["server"].port < 1 or self._config["server"].port > 65535:
            errors.append("服务器端口无效")
        
        if errors:
            print("配置验证失败:")
            for error in errors:
                print(f"  - {error}")
            return False
        
        return True


# 全局配置实例
_config: Optional[ConfigManager] = None


def get_config() -> ConfigManager:
    """
    获取全局配置实例
    
    Returns:
        配置管理器
    """
    global _config
    if _config is None:
        _config = ConfigManager()
    return _config


# ============================================
# 配置使用示例
# ============================================

def initialize_server():
    """初始化服务器"""
    config = get_config()
    
    # 验证配置
    if not config.validate():
        raise RuntimeError("配置验证失败")
    
    # 使用配置启动服务器
    server_config = config.get("server")
    print(f"启动服务器: {server_config.host}:{server_config.port}")
    print(f"工作进程数: {server_config.workers}")
    print(f"调试模式: {server_config.debug}")


def get_database_url() -> str:
    """
    获取数据库连接 URL
    
    Returns:
        数据库连接字符串
    """
    config = get_config()
    db = config.get("database")
    
    return f"postgresql://{db.user}:{db.password}@{db.host}:{db.port}/{db.name}"


if __name__ == "__main__":
    # 使用环境变量设置配置
    os.environ["DB_PASSWORD"] = "secret"
    os.environ["API_KEY"] = "sk-test-key"
    
    initialize_server()
    print(f"\n数据库连接: {get_database_url()}")
```

---

## 八、AI 产品经理关注点

```
MCP 最佳实践产品化要点：

工具设计
├── 易用性
│   ├── 清晰的命名和文档
│   ├── 直观的参数设计
│   ├── 一致的返回格式
│   └── 丰富的使用示例
├── 可发现性
│   ├── 合理的工具分类
│   ├── 完整的元数据
│   ├── 搜索和筛选能力
│   └── 热门工具推荐
└── 稳定性
    ├── 参数验证
    ├── 错误处理
    ├── 超时保护
    └── 熔断机制

安全策略
├── 认证授权
│   ├── 多因素认证
│   ├── 细粒度权限控制
│   ├── API Key 管理
│   └── OAuth 支持
├── 数据保护
│   ├── 敏感信息加密
│   ├── 数据脱敏
│   ├── 审计日志
│   └── 隐私合规
└── 网络安全
    ├── HTTPS 强制
    ├── 请求签名
    ├── IP 白名单
    └── 流量限制

性能优化
├── 响应速度
│   ├── 缓存策略
│   ├── 连接池
│   ├── 异步处理
│   └── CDN 加速
├── 资源利用
│   ├── 限流保护
│   ├── 队列管理
│   ├── 资源隔离
│   └── 自动扩缩容
└── 稳定性
    ├── 熔断机制
    ├── 重试策略
    ├── 降级处理
    └── 健康检查

监控告警
├── 性能监控
│   ├── 响应时间
│   ├── 吞吐量
│   ├── 错误率
│   └── 资源使用
├── 业务监控
│   ├── 工具使用统计
│   ├── 用户活跃度
│   ├── 成功率
│   └── 业务指标
└── 告警机制
    ├── 阈值告警
    ├── 趋势告警
    ├── 智能告警
    └── 告警收敛

关键指标
├── 开发效率
│   ├── 新工具开发时间
│   ├── 代码复用率
│   ├── 测试覆盖率
│   └── 代码审查通过率
├── 运行效率
│   ├── 平均响应时间 < 200ms
│   ├── P99 响应时间 < 1s
│   ├── 系统可用性 > 99.9%
│   └── 工具成功率 > 99%
├── 安全指标
│   ├── 安全事件数
│   ├── 漏洞修复时间
│   ├── 合规检查通过率
│   └── 认证通过率
└── 用户指标
    ├── 用户满意度
    ├── 工具使用率
    ├── 问题解决率
    └── 反馈响应时间

落地建议
├── 阶段一：基础规范
│   ├── 建立工具设计规范
│   ├── 实现安全基线
│   ├── 建立监控体系
│   └── 制定测试标准
├── 阶段二：优化提升
│   ├── 性能优化
│   ├── 安全加固
│   ├── 自动化运维
│   └── 用户反馈优化
└── 阶段三：生态建设
    ├── 工具市场
    ├── 最佳实践库
    ├── 开发者社区
    └── 持续迭代
```

---

## 九、参考资源

- [MCP 官方文档](https://spec.modelcontextprotocol.io/) - MCP 协议规范
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk) - Python SDK 文档
- [OWASP 安全指南](https://owasp.org/www-project-web-security-testing-guide/) - Web 安全测试指南
- [Python 安全最佳实践](https://docs.python.org/3/tutorial/stdlib.html#cryptography) - Python 安全标准库
- [RESTful API 设计规范](https://restfulapi.net/) - REST API 设计最佳实践
- [JSON-RPC 2.0 规范](https://www.jsonrpc.org/specification) - JSON-RPC 协议规范
