# V7 需求对应与正式路线

唯一规格：docs/V7_SPEC.md。实现为全新代码；旧尝试未复用。

| V7 章节 | 实现/验收位置 | 当前范围 |
|---|---|---|
| 1 产品目标 | 学习页、Tutor、教辅Reviewer | 已接入；真实样本教学已验收，整本教材质量待长期验证 |
| 2 技术架构 | app/server、app/client、runtime | 指定技术栈、本机服务、同源令牌、相对路径 |
| 3 Workspace | store.ts、pdf.ts | 独立教材、哈希去重、分层记录、同书多份原件对照 |
| 4 文本+视觉 | pdf.ts、ai.ts、PDF原页窗口 | 双通道与按来源批量视觉识别/续做；视觉真实服务样本已验收 |
| 5 可选OCR | 后续Minor路线 | 未加入本地/第三方OCR，视觉候选已接入 |
| 6 Ground Truth | facts接口与核验UI | 候选/已核验分离、稳定KP、版本历史与锚点 |
| 7 教学大脑 | ai.ts | 可信检索、章/节/主题框架、独立Reviewer、引用及公式闸门、内存密钥 |
| 8 深度教辅 | generateKnowledge、review | 提示与检查覆盖要求；真实零基础样本已通过，整本教材质量UNVERIFIED |
| 9 Tutor | tutor、选中追问 | 历史卡点与改变策略；真实两轮样本已通过 |
| 10 个人闭环 | records、learning.ts | 原始转写/错题/对话、独立整理派生内容 |
| 11 诊断 | diagnosis、证据与复测 | 九维证据展示，证据不足待评估；高级诊断后续完善 |
| 12 出题验题 | makeQuestion、针对练习 | Generator→独立Solver→Critic；真实基础题已通过三方验题 |
| 13 联网研究 | research表、后续Minor路线 | Sandbox数据底座；联网检索与研究界面尚未实现 |
| 14 数学公式 | KaTeX、mathErrors、压力测试 | 统一渲染与发布闸门；多个表达式离线通过 |
| 15 UI | styles.css、UI截图、浏览器验收 | 全新阅读界面、三栏、亮暗与窄屏 |
| 16 期末输出 | 后续Minor路线 | 明确保留；Word/PDF与自动复习产品尚未实现 |
| 17 分发 | Package-Windows.ps1 | 内置runtime、生产依赖、隐私扫描与ZIP |
| 18 更新信箱 | inbox、updates UI | 版本信息、风险、测试摘要、安装与稍后提醒 |
| 19 更新回滚 | updater.mjs、更新事务与签名清单 | Candidate隔离、备份、启动测试、指针切换与回滚；schema1暂不需要迁移 |
| 20 Maintenance Agent | maintenance.mjs、maintenance.ts、计划任务 | 每日/每周检查、Candidate修复工具与持久三轮熔断；真实隔离回归修复样本已通过，长期效果待验证 |
| 21 长期版本 | GitHub候选发布与补丁 | 语义版本、Candidate预览、Stable闸门；后续功能不删除 |
| 22 发布红线 | 各闸门、ACCEPTANCE_REPORT | 阻止不合格内容；候选发行不宣称正式验收通过 |
| 23 最终验收 | tests、acceptance.ts、报告 | 如实输出PASS/FAIL/BLOCKED/UNVERIFIED |
| 24 交付结构 | 根目录各子目录 | 遵循建议结构 |
| 25 最高规则 | AGENTS、验收与发布闸门 | 准确性、数据、Stable与教学深度优先 |

完整 V7 最终验收仍需整本真实教材验收、联网研究/期末输出等后续实现，以及长期运行证据。真实DeepSeek教学与Candidate修复已通过隔离样本验收。此表不把结构表存在等同于能力完成。
