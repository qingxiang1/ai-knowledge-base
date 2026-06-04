<!--
  文件描述: MAU（月活跃用户）指标详解，涵盖定义、计算、分析与优化
  作者: AI-PM-Knowledge
  创建日期: 2026-06-04
  最后修改日期: 2026-06-04
-->

# MAU（月活跃用户）

> 月活跃用户指标详解，覆盖定义标准、计算方法、分析维度及提升策略。

---

## 一、MAU 基础概念

### 1.1 定义与标准

```
MAU 定义体系：

核心定义
├── 基本定义
│   ├── MAU = 本月内至少完成一次核心操作的去重用户数
│   ├── 时间范围：自然月（1 日 00:00 - 月末 23:59）或滑动窗口（近 30 日）
│   └── 去重维度：按用户唯一标识（user_id）去重
│
├── 活跃标准（需明确定义）
│   ├── 强活跃：完成核心业务操作
│   │   └── 示例：AI 产品 = 成功发起一次 AI 对话
│   ├── 中活跃：完成任意交互操作
│   │   └── 示例：点击按钮、浏览页面、输入内容
│   └── 弱活跃：仅打开应用/访问页面
│       └── 示例：启动 App、刷新页面
│
└── 口径选择
    ├── 严格口径（推荐）
    │   ├── 定义：完成核心价值操作
    │   ├── 优势：反映真实产品价值
    │   └── 适用：产品成熟期、追求质量
    └── 宽松口径
        ├── 定义：任意页面访问
        ├── 优势：数字好看，增长感强
        └── 适用：产品早期、融资阶段

相关概念
├── MNU（月新增用户）
│   └── 本月首次注册/激活的用户数
├── MOU（月老用户）
│   └── 本月活跃的非新增用户数 = MAU - MNU
└── 活跃渗透率
    └── MAU / 总注册用户数
```

### 1.2 计算方式

```python
"""
MAU 计算方法

不同场景下的 MAU 计算
"""

class MAUCalculation:
    """MAU 计算"""
    
    @staticmethod
    def get_calculation_methods() -> dict:
        """
        获取计算方法
        
        Returns:
            方法定义
        """
        return {
            "基础计算": {
                "公式": "MAU = COUNT(DISTINCT user_id) WHERE date BETWEEN '本月1日' AND '本月末日' AND is_active = True",
                "说明": "统计本月完成活跃操作的去重用户数",
                "SQL 示例": """
                SELECT 
                    DATE_TRUNC('month', event_time) as month,
                    COUNT(DISTINCT user_id) as mau
                FROM user_events
                WHERE event_name IN ('ai_chat', 'ai_generate', 'ai_search')
                GROUP BY DATE_TRUNC('month', event_time)
                """
            },
            "滑动窗口计算": {
                "公式": "MAU = COUNT(DISTINCT user_id) WHERE date BETWEEN '今日-29日' AND '今日' AND is_active = True",
                "说明": "统计近 30 日完成活跃操作的去重用户数",
                "SQL 示例": """
                SELECT 
                    DATE(event_time) as dt,
                    COUNT(DISTINCT user_id) as mau
                FROM user_events
                WHERE event_name IN ('ai_chat', 'ai_generate', 'ai_search')
                AND event_time BETWEEN CURRENT_DATE - INTERVAL '29 days' AND CURRENT_DATE
                GROUP BY DATE(event_time)
                """
            },
            "分层计算": {
                "核心 MAU": "完成核心业务的用户",
                "功能 MAU": "使用特定功能的用户",
                "总 MAU": "任意活跃的用户",
                "SQL 示例": """
                SELECT 
                    DATE_TRUNC('month', event_time) as month,
                    COUNT(DISTINCT CASE WHEN event_name = 'ai_chat' THEN user_id END) as core_mau,
                    COUNT(DISTINCT CASE WHEN event_name = 'ai_generate' THEN user_id END) as gen_mau,
                    COUNT(DISTINCT user_id) as total_mau
                FROM user_events
                GROUP BY DATE_TRUNC('month', event_time)
                """
            },
            "实时计算": {
                "方式": "流式计算，近实时更新",
                "技术": "Flink / Kafka Streams / Redis HyperLogLog",
                "适用": "实时看板、实时监控"
            }
        }
    
    @staticmethod
    def get_mau_variants() -> dict:
        """
        获取 MAU 衍生指标
        
        Returns:
            衍生指标
        """
        return {
            "MAU 增长率": {
                "定义": "MAU 的环比增长",
                "公式": "(本月 MAU - 上月 MAU) / 上月 MAU",
                "意义": "反映短期增长趋势"
            },
            "人均使用次数": {
                "定义": "MAU 用户平均每月使用次数",
                "公式": "总操作次数 / MAU",
                "意义": "反映使用深度"
            }
        }
```

---

## 二、MAU 分析维度

### 2.1 多维度拆解

```python
"""
MAU 分析维度

从不同角度分析 MAU 构成和变化
"""

class MAUAnalysis:
    """MAU 分析"""
    
    @staticmethod
    def get_analysis_dimensions() -> dict:
        """
        获取分析维度
        
        Returns:
            维度定义
        """
        return {
            "用户维度": {
                "新老用户": [
                    "新增用户 MAU",
                    "回流用户 MAU",
                    "持续活跃用户 MAU"
                ],
                "用户分层": [
                    "免费用户 MAU",
                    "付费用户 MAU",
                    "VIP 用户 MAU"
                ],
                "用户属性": [
                    "按地域分布",
                    "按设备类型",
                    "按渠道来源"
                ]
            },
            "行为维度": {
                "功能维度": [
                    "对话功能 MAU",
                    "生成功能 MAU",
                    "搜索功能 MAU"
                ],
                "深度维度": [
                    "轻度使用用户",
                    "中度使用用户",
                    "重度使用用户"
                ],
                "时段维度": [
                    "工作日 MAU",
                    "周末 MAU"
                ]
            },
            "时间维度": {
                "周期对比": [
                    "月环比（vs 上月）",
                    "年同比（vs 去年同月）"
                ],
                "趋势分析": [
                    "3 月移动平均",
                    "12 月移动平均",
                    "趋势线拟合"
                ]
            }
        }
    
    @staticmethod
    def get_mau_fluctuation_analysis() -> dict:
        """
        获取 MAU 波动分析
        
        Returns:
            波动分析
        """
        return {
            "正常波动": {
                "季节性效应": "节假日期间 MAU 可能下降",
                "活动效应": "活动期间 MAU 可能上升",
                "版本效应": "新版本发布后 MAU 可能变化"
            },
            "异常波动": {
                "异常上涨": [
                    "营销活动效果",
                    "病毒传播事件",
                    "竞品动态影响",
                    "媒体报道效应"
                ],
                "异常下跌": [
                    "产品故障",
                    "竞品发布",
                    "负面事件",
                    "季节性因素"
                ]
            },
            "分析方法": {
                "同比环比": "排除周期性因素",
                "维度下钻": "定位波动来源",
                "事件关联": "关联产品/运营事件",
                "外部因素": "考虑节假日、竞品等"
            }
        }
```

### 2.2 MAU 质量分析

```python
"""
MAU 质量分析

不仅看数量，更要看质量
"""

class MAUQuality:
    """MAU 质量"""
    
    @staticmethod
    def get_quality_metrics() -> dict:
        """
        获取质量指标
        
        Returns:
            指标定义
        """
        return {
            "活跃深度": {
                "人均使用时长": "总时长 / MAU",
                "人均操作次数": "总操作 / MAU",
                "人均访问页面数": "总页面 / MAU",
                "核心功能使用率": "使用核心功能的用户 / MAU"
            },
            "活跃频次": {
                "月活跃天数": "30 日内活跃天数分布",
                "月使用次数分布": "每月使用 1 次/2 次/3 次+ 的用户占比"
            },
            "活跃价值": {
                "付费转化率": "MAU 中付费用户占比",
                "ARPU": "月收入 / MAU",
                "内容贡献率": "产生 UGC 的用户占比"
            }
        }
    
    @staticmethod
    def get_mau_health_check() -> dict:
        """
        获取 MAU 健康度检查
        
        Returns:
            检查项
        """
        return {
            "健康信号": [
                "MAU 稳定增长或平稳",
                "新增用户占比合理（< 30%）",
                "核心功能使用率提升"
            ],
            "风险信号": [
                "MAU 连续 3 月下滑",
                "MAU 增长但质量下降",
                "新增用户占比过高（> 50%）",
                "老用户流失加速"
            ],
            "诊断方法": {
                "留存分析": "看用户是否持续活跃",
                "同期群分析": "看不同批次用户质量",
                "功能分析": "看哪些功能驱动活跃"
            }
        }
```

---

## 三、MAU 提升策略

### 3.1 增长策略

```python
"""
MAU 提升策略

提升月活跃用户的系统化方法
"""

class MAUGrowth:
    """MAU 增长"""
    
    @staticmethod
    def get_growth_strategies() -> dict:
        """
        获取增长策略
        
        Returns:
            策略定义
        """
        return {
            "新用户获取": {
                "渠道优化": [
                    "优化高转化渠道投入",
                    "测试新渠道",
                    "提升渠道 ROI"
                ],
                "裂变增长": [
                    "邀请奖励机制",
                    "分享传播激励",
                    "病毒式功能设计"
                ]
            },
            "老用户召回": {
                "Push 策略": [
                    "个性化推送内容",
                    "推送时机优化",
                    "避免过度打扰"
                ],
                "邮件/短信": [
                    "新功能通知",
                    "使用报告",
                    "专属优惠"
                ],
                "产品内召回": [
                    "未完成任务提醒",
                    "好友动态",
                    "内容更新提示"
                ]
            },
            "活跃度提升": {
                "功能优化": [
                    "提升核心功能体验",
                    "增加使用场景",
                    "简化操作流程"
                ],
                "激励机制": [
                    "签到奖励",
                    "连续使用奖励",
                    "成就系统"
                ],
                "内容运营": [
                    "每月推荐",
                    "热点话题",
                    "个性化内容"
                ]
            }
        }
    
    @staticmethod
    def get_ai_product_tactics() -> dict:
        """
        获取 AI 产品特有策略
        
        Returns:
            策略定义
        """
        return {
            "模型效果优化": {
                "准确性提升": [
                    "减少错误回答",
                    "提升理解能力",
                    "优化输出质量"
                ],
                "响应速度优化": [
                    "降低首 Token 延迟",
                    "流式输出",
                    "进度提示"
                ]
            },
            "使用场景拓展": {
                "模板市场": [
                    "提供常用 Prompt 模板",
                    "场景化引导",
                    "最佳实践分享"
                ],
                "工作流集成": [
                    "接入常用工具",
                    "自动化流程",
                    "批量处理能力"
                ]
            },
            "个性化体验": {
                "历史记忆": [
                    "记住用户偏好",
                    "上下文连贯",
                    "个性化推荐"
                ],
                "智能提醒": [
                    "基于使用习惯提醒",
                    "任务到期提醒",
                    "内容更新提醒"
                ]
            }
        }
```

---

## 四、MAU 监控与预警

### 4.1 监控体系

```python
"""
MAU 监控体系

建立 MAU 监控和预警机制
"""

class MAUMonitoring:
    """MAU 监控"""
    
    @staticmethod
    def get_monitoring_framework() -> dict:
        """
        获取监控框架
        
        Returns:
            框架定义
        """
        return {
            "实时监控": {
                "监控项": [
                    "本月实时 MAU",
                    "月级 MAU 趋势",
                    "与上月同时段对比"
                ],
                "更新频率": "每小时",
                "展示方式": "实时数据看板"
            },
            "月报": {
                "内容": [
                    "本月 MAU",
                    "月环比/年同比",
                    "新老用户占比",
                    "关键维度拆解"
                ],
                "发送时间": "每月 1 日上午 9:00",
                "接收人": "产品、运营、管理层"
            },
            "季报": {
                "内容": [
                    "季度 MAU 趋势",
                    "3 月移动平均",
                    "季度环比分析",
                    "异常波动说明"
                ]
            }
        }
    
    @staticmethod
    def get_alert_rules() -> dict:
        """
        获取预警规则
        
        Returns:
            规则定义
        """
        return {
            "规则类型": {
                "绝对值预警": [
                    "MAU < 阈值（如低于历史最低）",
                    "MAU 连续 N 天为 0"
                ],
                "相对值预警": [
                    "月环比下降 > 20%",
                    "年同比下降 > 30%",
                    "与 3 月平均偏差 > 2 个标准差"
                ],
                "结构预警": [
                    "新增用户占比 > 60%",
                    "核心功能使用率 < 50%"
                ]
            },
            "预警级别": {
                "P0（紧急）": "MAU 暴跌 50%+，立即响应",
                "P1（重要）": "MAU 下降 20-50%，2 小时内响应",
                "P2（一般）": "MAU 波动 10-20%，当日关注"
            }
        }
```

---

## 五、AI 产品经理实践

### 5.1 MAU 分析清单

```python
"""
MAU 分析实践

产品经理日常 MAU 分析工作
"""

class MAUProductPractice:
    """MAU 产品实践"""
    
    @staticmethod
    def get_daily_routine() -> dict:
        """
        获取日常工作
        
        Returns:
            工作清单
        """
        return {
            "每月必看": [
                "本月 MAU 及环比",
                "实时 MAU 趋势",
                "异常波动识别"
            ],
            "每季度分析": [
                "季度 MAU 趋势分析",
                "新老用户结构变化",
                "功能使用分布变化",
                "与竞品 MAU 对比（如有数据）"
            ],
            "每年复盘": [
                "年度 MAU 目标达成率",
                "MAU 增长驱动因素分析",
                "用户质量变化评估",
                "下年度 MAU 目标制定"
            ]
        }
    
    @staticmethod
    def get_communication_template() -> dict:
        """
        获取沟通模板
        
        Returns:
            模板定义
        """
        return {
            "月报模板": """
            【MAU 月报】YYYY-MM
            
            核心数据：
            - 本月 MAU：XX万（环比 +X%，年同比 +X%）
            - 新增用户：X万（占比 X%）
            - MAU/总注册：XX%
            
            关键变化：
            - [上涨/下跌] 主要原因：XXX
            
            需关注：
            - [如有异常，说明情况和跟进措施]
            """,
            
            "异常分析模板": """
            【MAU 异常分析】
            
            异常描述：
            - 时间：XXXX-XX
            - 现象：MAU 较上月下降 XX%
            - 影响范围：[全量/某渠道/某功能]
            
            根因分析：
            1. 外部因素：[节假日/竞品/舆论]
            2. 产品因素：[版本发布/功能变更/Bug]
            3. 运营因素：[活动结束/推送策略]
            
            验证数据：
            - [支撑结论的数据]
            
            应对措施：
            - [短期应对]
            - [长期优化]
            """
        }

# MAU 常见误区
"""
MAU 常见误区：

1. 唯 MAU 论
   ├── 问题：只关注 MAU 数字，忽视质量
   ├── 后果：用户增长但价值不增长
   └── 解决：结合留存、时长、价值综合评估

2. 口径混乱
   ├── 问题：不同团队 MAU 定义不同
   ├── 后果：数据对不上，争论不休
   └── 解决：统一口径，文档化，定期对齐

3. 刷量造假
   ├── 问题：通过激励刷出虚假 MAU
   ├── 后果：数据好看，实际无价值
   └── 解决：定义严格活跃标准，监控异常行为

4. 忽视结构
   ├── 问题：只看总数，不看构成
   ├── 后果：掩盖老用户流失问题
   └── 解决：拆分新老用户、分层分析

5. 过度反应
   ├── 问题：单月波动就紧张，频繁调整
   ├── 后果：策略摇摆，团队疲惫
   └── 解决：关注趋势而非单月，设置合理阈值
"""
```

---

## 六、参考资源

- [《精益数据分析》](https://book.douban.com/subject/25825278/) - 指标体系建设
- [《增长黑客》](https://book.douban.com/subject/26633878/) - 用户增长方法论
- [Mixpanel](https://mixpanel.com/) - 用户行为分析工具
- [Amplitude](https://amplitude.com/) - 产品分析平台
