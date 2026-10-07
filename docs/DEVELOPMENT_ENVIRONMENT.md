# 开发环境与恢复说明

2026-10-07。软件、工具与运行证据在D盘；现有Codex用户配置及软件源码保留原位置。

## 实际配置与启动

- OMX 0.21.8：D:/AI/Hermes/node；psmux 3.3.8：D:/CalcDevTools/psmux。
- 原生运行时：D:/CalcDevTools/native；OMX状态：D:/CalcDevTools/calculus-state。
- 项目配置：.codex/config.toml、.codex/hooks.json、.codex/.omx-config.json。正常使用原Codex用户home，不把project .codex当成拥有登录信息的用户home。
- 启动：PowerShell运行 D:/CalcDevTools/Start-Calculus-Codex.ps1。它只在当前进程加入psmux及D缓存目录，并处理继承的旧session标识；没有修改系统PATH、全局权限或现有桌面登录。
- 已实测CLI模型：主代理gpt-5.6-sol、轻量gpt-5.6-luna、复核gpt-5.6-terra；原生桌面代理是另外的模型目录。CLI账户拒绝gpt-6.1-sol，所以项目配置使用验证过的模型。初始最多3子代理，由主代理整合，不叠加两套调度。

## 工作流实测

本次实际运行了独立环境审计、技能安装审核、软件Reviewer/Architect三个原生子代理，主代理整合复核结果；不是仅创建角色文件。软件发现与修复页面状态遗漏、个人内容误准入、旧问答ID兼容、缓存规则失效、历史视觉冲突、截断重试、非推理漏审和界面对比问题。fresh测试与构建日志存D:/CalcDevTools/product-validation-20261007。

OMX实际模型请求、选定技能读取调用、会话恢复、Spark原生命令、hooks启动结束事件通过。doctor 19通过/1预期技能数量警告/0失败。psmux不支持OMX所需show-option及pane自定义选项，Team/live HUD阻塞，未伪造两个worker任务完成。全局旧legacy_notify路径仍有错误；项目启动器用本地通知适配器覆盖，不覆盖桌面全局通知配置。自动化任务/完整team恢复未验收。

技能来源、固定提交、逐项处理及安全隔离见ENV_SKILLS_REPORT.md；实际调用证据和命令见ENV_RUNTIME_VALIDATION.md。20项OMX技能保留，4项危险/重复技能移入隔离备份；8项经评估项目技能在.agents/skills。原版systematic-debugging未安装，使用原创安全替代，不冒称上游版本。

## 备份与恢复

D:/CalcDevTools/backups/before-environment-20261007-112156 保存原config.toml、AGENTS.md、project-AGENTS.md及原全局skills（78文件）；D:/CalcDevTools/backups/omx-skill-quarantine-20261007-113450 保留隔离技能。新技能源包及指纹在D:/CalcDevTools/skill-sources。未删除原件或用户数据。

恢复时先关闭相关CLI进程，对照备份文件名：config.toml/AGENTS.md对应C:/Users/admin/.codex原文件，project-AGENTS.md对应本仓库AGENTS.md。恢复前另存当前配置；只复制需要恢复的文件，不递归清空用户home或skills，不覆盖auth文件。项目新增配置及技能可先移入另一个备份目录再恢复原项目规则。旧配置可能包含CLI不支持的模型或过期通知路径，恢复后仍需做实际请求及doctor检查。

## 后续准确边界

当前原生Codex+项目技能工作流可用。OMX Team需兼容的tmux pane实现，不能以“已安装”当作通过；WSL未安装Linux发行版，未自动改系统组件。全站无障碍、弱设备性能和全书AI数学质量仍以软件实际验收为准。本轮没有外发邮件、聊天消息或社交帖子。
