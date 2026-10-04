# 知微 · Calculus Workbench V7

从用户自己的教材出发，建立可核验的高等数学学习空间。全新实现，不复用此前失败尝试。

![学习工作台](UI_亮色.png)

Windows 用户下载 Releases 中的 **Windows-x64.zip**，解压后双击“启动高数学习工作台.bat”。无需自行安装 Node、npm 或数据库。

导入PDF → 核验教材事实 → 配置自己的DeepSeek模型与密钥 → 生成深度教辅／Tutor → 记录转写、错题及复测 → 查看有证据诊断与针对练习。

包含独立签名更新器、增量补丁、备份、事务回滚、软件消息箱，以及 Windows 每日／每周维护脚本。开发工作副本中的维护 Agent 仅在 Candidate 修复、构建和测试，不能直接改 Stable。

**当前为候选预览版本。** 自编数学样本已通过真实 DeepSeek 教学、视觉、Tutor及独立验题测试；这不是整本教材或长期效果的保证。联网研究、可选OCR及期末Word/PDF属于后续正式路线。逐条要求及实际验收见 [REQUIREMENTS_V7.md](REQUIREMENTS_V7.md)、[ACCEPTANCE_REPORT.md](ACCEPTANCE_REPORT.md)。

密钥默认仅驻留服务内存，重启后重新输入；教材片段和页面图像发送前由用户确认。原教材、转写、错题和对话与派生内容分别保存。

开发：`npm ci`、`npm run build`、`npm test`、`npm run acceptance`。发布：`npm run package:windows`。源码维护约定见 [AGENTS.md](AGENTS.md)。
