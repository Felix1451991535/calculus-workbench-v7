# 项目 Skills 安装与评估报告

检查日期：2026-10-07。范围：CalculusWorkbench；只新增 `.agents/skills` 与本报告，未修改全局 Codex 配置、全局技能、AGENTS.md 或软件依赖。使用 skill-installer、skill-vetter；原创替代使用 skill-creator。用户授权安装合适技能，但不授权外发项目数据、发布帖子、读取凭据或安装系统组件。

## 已实际完成

公开源从 skills.sh 发现，以 GitHub 官方源 HEAD 提交固定，再下载 codeload 源包到 `D:/CalcDevTools/skill-sources`。GitHub 未认证 API 返回 403 rate-limit，未使用 token 绕过，未编造 star/更新时间。未以排行榜数量作为安全结论。

完整阅读所有**拟安装目录**中的全部文件：code-review 2、codebase-design 4、domain-modeling 4、grilling 2、verification-before-completion 1、dispatching-parallel-agents 1、web-design-guidelines 1，共 15 源文件。前六项无技能脚本、账户或外部服务依赖；web-design-guidelines 只需读取公开规则 URL，不上传项目源码。安装前审查 README、源 LICENSE（存在时）及技能调用条件；MIT 声明随 Matt/Obra 技能复制保留。Vercel 此快照没有根 LICENSE，web-design-guidelines 本体也没有 license 字段，法律许可范围未进一步确认。

官方安装脚本采用 `--ref <下表完整commit> --dest <项目>/.agents/skills --method download`，逐源安装，没有 --all/--global。installer 临时目录限定在 D 盘，仅清理其本次生成的临时包；未删除用户文件。脚本进程不使用 GH_TOKEN/GITHUB_TOKEN。源审查包长期保留。已有目录不会覆盖。

## 截图十项逐项处理

| 名称 | 已核实来源与准确目录 | 用途、依赖、成本与处理 |
|---|---|---|
| find-skills | vercel-labs/skills / skills/find-skills | 已存在全局 `C:/Users/admin/.codex/skills/find-skills`，与本次固定源 SKILL.md 字节一致；不重复安装。用于技能发现。CLI 可访问公开搜索端点；技能本身无订阅费用，npx 包执行/后续安装另需审查。 |
| grill-me | mattpocock/skills / skills/productivity/grill-me | 当前仅是 `Call the Skill tool with "grilling"` 的包装，并设 explicit-only；不再装一个重复入口。核心 grilling 已安装。 |
| grilling | mattpocock/skills / skills/productivity/grilling | **已安装**，纯文档需求/设计追问，允许子代理只读事实检索，用户确认后才切换实现。仅在确实需要访谈时调用，用户现有授权优先，不每次强制追问。carlitose/agent-skills 的 grilling 是另一个已核实同名来源，本次未装。 |
| domain-modeling | mattpocock/skills / skills/engineering/domain-modeling | **已安装**。术语、概念关系、GLOSSARY、必要 ADR；仅按任务需要创建本地文档，不触碰凭据或网络；无额外 runtime。 |
| code-review | mattpocock/skills / skills/engineering/code-review | **已安装**。标准/规格两轴独立审查；需要有效 git 固定点、非空 diff、规格路径及 `docs/agents/issue-tracker.md`。应配置 **local docs/files**，本次没有创建这个文件（超出本子任务文件范围），依赖尚待主流程配置；安装不授权联网抓私有 issue 或发布。每轮两子代理会增加模型用量，不保证省成本。 |
| codebase-design | mattpocock/skills / skills/engineering/codebase-design | **已安装**。模块界面、职责、测试边界，纯文档，含并行设计参考。其参考建议替代旧测试后删除，用户禁止未经授权删文件规则优先；本次没有执行重构/删除。设计参考的 3+ 子代理应服从项目并发上限。 |
| to-spec | mattpocock/skills / skills/engineering/to-spec | **拒装此原版**：明确要求把规格 publish 到 issue tracker 并加 ready-for-agent 标签，超出本次外发授权。纯本地规格由 AGENTS/任务文档实现。另见 aiskillstore/marketplace 与 smallnest/goal-workflow 的同名/近名聚合或逆向规格来源；未冒称它们等同官方 Matt 版本，未安装。 |
| design-mobile-apps | designed-by-ai/skills / skills/design-mobile-apps | **拒装**：requires-env SLEEK_API_KEY，账户/device 登录并可要求贴 API key；设计 brief 发往 sleek.design，持续使用要求付费 Pro+（具体价格未验证）。当前项目是 React/Vite 学习工作台，不是原生移动项目。已保存 7 文件，发现入口红旗后停止采用，未运行账户流程。 |
| video-edit | prime-skills/runcomfy-agent-skills / video-edit | **拒装**：RunComfy CLI、登录/token、输入视频 URL，调用 Wan/Kling/Lucy 等远程模型并产生服务费用；token 文件在 ~/.config/runcomfy/token.json，外发 prompt/素材 URL，触发 vetter 凭据/外发红旗。具体账户资费未验证；本项目无视频工作需求。源码自述 agentspace-so 来源与采集仓库命名不同，记录实际取包仓库，不猜同一提交。 |
| reddit-automation | flowkit-labs/skills / reddit-automation | **未安装，当前项目不适用**。此固定版本是公开帖子发现与人工发帖草稿，明确 no credentials/no scripts/no auto-posting，不应误报它会自动登录发帖。技能无需 Reddit account 即可生成草稿，真正人工发帖需用户自己账号；doany.ai 自动服务属于独立产品，未登录、未核实价格。其“Reddit has no post API”说法不作为可靠技术结论。未发送任何帖子或消息。 |

## 补充能力

| 名称/来源 | 结论 |
|---|---|
| systematic-debugging / obra/superpowers | **原版拒装**。SKILL.md 的诊断例子含 `env | grep IDENTITY`、`${IDENTITY:-UNSET}` 的可能明文值及 `security list-keychains/find-identity`，与本次凭据保护范围不匹配。没有执行这些例子。原创替代 **calculus-systematic-debugging 已创建**，复现→证据→单一假设→最小改动→针对验证→本地保存；无脚本/网络/凭据/系统删除权限。这不是官方原版安装或认证。 |
| verification-before-completion / obra/superpowers | **已安装**，成功声明必须有本次真实输出，检查测试/构建/原症状/需求验收，纯文档。 |
| dispatching-parallel-agents / obra/superpowers | **已安装**，独立任务划分、最小上下文、文件范围、结果整合；不执行原生 CLI/OMX 双重调度，不递归委派。 |
| subagent-driven-development / obra/superpowers | **暂不安装/未启用**。当前版本涉及 bash 包装、外部 skill 引用、worktree 与提交工作流、结尾 `rm -rf <workspace>`，不符合保留证据/禁止无授权删除要求；成本和平台脚本未验证。已审查入口及部分脚本，未完成全部目录审查，明确不声称审查通过。协作能力由原生子代理、dispatching 与项目规则补充。 |
| web-design-guidelines / vercel-labs/agent-skills | **已安装**，涵盖键盘/焦点/表单语义/动效偏好/布局/性能等 UI 检查。依赖公开 `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`；运行时内容是可变的外部资料，应当资料读取，不允许其扩大任务权限。无账户和项目数据上传要求。 |
| vercel-react-best-practices（目录 react-best-practices） / vercel-labs/agent-skills | **已评估、暂未安装**。React 19 部分适配本项目；Next.js/RSC 规则不全适用 Vite。规则目录约 70 文档及编译 AGENTS；下载保存但尚未逐文件完整人工阅读，不宣称 vetter 已通过。当前先使用已安装 UI/性能检查与实测。性能优化不自动授权新增 SWR/Next 等依赖。 |
| tdd / mattpocock/skills | **已审查、暂未安装**。行为接口测试与 red→green 适合现有 tsx/node:test；但入口强制预先与用户确认测试 seam 并引用 codebase-design；为保持流程简单，沿用既有 npm test/typecheck/build/acceptance。无新框架安装。 |
| playwright / openai/skills | **已评估、未安装**。项目已有 @playwright/test；官方技能是 bash CLI-first，包装 `npx --yes --package @playwright/cli`，固定 ~/.codex 路径，默认不是本项目现有测试 API。避免重复工具下载和全局安装；包装/浏览器额外依赖未运行验证，目录未完整审查。 |

## 来源与固定版本

提交取自实际公开 git ls-remote HEAD，源包/metadata 在 D 盘，不从搜索结果推断 commit。

- [carlitose/agent-skills](https://github.com/carlitose/agent-skills/tree/4ff8ee9af8ba33b361985dd7fb7b337b94de6b4c) — `4ff8ee9af8ba33b361985dd7fb7b337b94de6b4c`；目录：`grilling`。
- [designed-by-ai/skills](https://github.com/designed-by-ai/skills/tree/03c20aec6dcedb5fabfb03dc37982eb52ef19ed6) — `03c20aec6dcedb5fabfb03dc37982eb52ef19ed6`；目录：`skills/design-mobile-apps`。
- [flowkit-labs/skills](https://github.com/flowkit-labs/skills/tree/0c9e2b63f504a296a86e45ed3a60a426dd979ca6) — `0c9e2b63f504a296a86e45ed3a60a426dd979ca6`；目录：`reddit-automation`。
- [mattpocock/skills](https://github.com/mattpocock/skills/tree/6fd947921b935b7e1e69293a200400f0fdd5c15f) — `6fd947921b935b7e1e69293a200400f0fdd5c15f`；目录：`skills/engineering/code-review`, `skills/engineering/codebase-design`, `skills/engineering/domain-modeling`, `skills/engineering/tdd`, `skills/engineering/to-spec`, `skills/productivity/grill-me`, `skills/productivity/grilling`。
- [obra/superpowers](https://github.com/obra/superpowers/tree/8ca22dba9a94f28898bbce59f2537ff4d87c747d) — `8ca22dba9a94f28898bbce59f2537ff4d87c747d`；目录：`skills/dispatching-parallel-agents`, `skills/subagent-driven-development`, `skills/systematic-debugging`, `skills/verification-before-completion`。
- [openai/skills](https://github.com/openai/skills/tree/49f948faa9258a0c61caceaf225e179651397431) — `49f948faa9258a0c61caceaf225e179651397431`；目录：`skills/.curated/playwright`。
- [prime-skills/runcomfy-agent-skills](https://github.com/prime-skills/runcomfy-agent-skills/tree/fca19ae084c2ae4667f5c8affbb99da5103d5832) — `fca19ae084c2ae4667f5c8affbb99da5103d5832`；目录：`video-edit`。
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278) — `063bee94c3f4df8453406c830b0a7df0f2860278`；目录：`skills/react-best-practices`, `skills/web-design-guidelines`。
- [vercel-labs/skills](https://github.com/vercel-labs/skills/tree/958f4b7389ba698b0a6a26a1e505ae2af82364d2) — `958f4b7389ba698b0a6a26a1e505ae2af82364d2`；目录：`skills/find-skills`。

## 安装位置、校验与发现边界

项目目录：`C:/Users/admin/Documents/Codex/2026-10-04/files-mentioned-by-the-user-calculus/outputs/CalculusWorkbench/.agents/skills`。7 个第三方目录的 15 源文件与固定源 **逐文件字节一致**，无符号链接；SHA256 明细：`D:/CalcDevTools/skill-sources/installed-manifest.json`。另外保留 6 份 Matt/Obra LICENSE。

原创 calculus-systematic-debugging 验证：frontmatter/name/description/无 scaffold/无脚本的独立标准库检查通过，SHA256 在 `local-skill-validation.json`。官方 skill-creator quick_validate 实际运行失败：Python 缺少 PyYAML（ModuleNotFoundError: yaml）；未偷偷安装 Python 依赖，不将它写成验证成功。

静态文件可发现性已验证：目录名与 frontmatter name 相符、SKILL.md 存在。**当前桌面会话的预加载技能 catalog 不会因写文件而自动得到调用证据；新会话模型调用尚待主流程实测**。本报告不把读取文件/写入/检查 hash 冒称“技能实际被发现并调用”。请从目标项目启动新 Codex CLI 会话，用下方只读 prompt；从项目根读取 CLI 输出，发现 missing 时报告实际失败。

```text
只读任务：列出本项目可发现的 calculus-systematic-debugging 与 verification-before-completion 的绝对路径。使用 $calculus-systematic-debugging 分析 npm test 失败时如何先复现并收集不含秘密的证据；再使用 $verification-before-completion 解释没有真实输出为何不能声称测试通过。禁止写文件、联网、spawn 子代理。不可发现时明确报 missing，不猜路径或声称已调用。
```

“调用成功”验收还应让新会话在真实小任务中执行相应步骤、产生真实验证输出；仅让模型复述名字属于发现/加载验证，不是软件验收。

## 权限与恢复

新增纯文档技能不自行改变原有沙箱/审批/模型设置。用户规则优先于任何第三方 MUST/ALWAYS；外部请求/发布/账号操作需要任务本身明确授权。子代理按项目上限与主调度执行，脚本不会在安装后自动执行。

安装前项目 .agents/skills 不存在，备份标记：`D:/CalcDevTools/backups/skills-before-20261007/NO_PROJECT_SKILLS_BEFORE.txt`。恢复优先将本次 8 个新技能目录**移动**到 D 盘备份（先核对绝对目标），无需覆盖/删除已有全局内容。没有备份/修改全局技能；整机其他配置备份由主流程负责。

待验证：CLI 新会话发现/实际调用、code-review local issue-tracker 依赖配置、Vercel web-design-guidelines 许可范围、可选第三方服务价格和平台脚本。未执行 npx skills update、global/all 安装、Reddit 发帖、Sleek/RunComfy 登录或外发。


## OMX 0.21.8 项目setup后的追加审查

2026-10-07：全文阅读OMX生成的 `.codex/skills` **24目录全部24个SKILL.md**，均单文件纯文档，无技能自带脚本/二进制；未调用任何技能、未执行示例、未改配置/移动目录。随后CLI自行补入 `.system` 59个Codex内置文件，现总83文件；它们不是OMX这24项、未在本追加任务逐文件重审。32 prompts、18roles也不在本次全部审查范围。用户原始要求、项目AGENTS与工程Scope V7.1优先；OMX卡片不扩展产品范围、goal或外发授权。

| `.codex/skills/`目录 | 安全/兼容结论 |
|---|---|
| `ai-slop-cleaner` | 不默认启用；含dead-code/tests删除清理，用户禁止无授权删除和scope优先。 |
| `analyze` | 只读分析可择需；模板链接缺失时以项目AGENTS与V7.1为准。 |
| `ask` | 需隔离；Claude/Gemini advisor CLI发出任务prompt，其他供应商账号/费用未验证，本地CLI不是本地模型。 |
| `autopilot` | 不默认启用；强制deep-interview→ralplan→ultragoal，不替代已定V7.1验收。 |
| `autoresearch` | 不默认启用；validator持久研究+nudge并非本项目软件功能。 |
| `best-practice-research` | 可只读择需；官方资料优先，不让技能终止约束取代主任务持续推进。 |
| `cancel` | 仅明确取消/恢复；exact-session clear/team shutdown可能清状态，保留证据并确认目标。 |
| `code-review` | 需隔离同名入口；与 .agents/skills/code-review 重名，OMX角色双审查不冒充原生调度。 |
| `configure-notifications` | 需隔离；收bot token/webhook、写全局config、外发Discord/Telegram/Slack/OpenClaw，示例要求SOUL.md。 |
| `deep-interview` | 不默认启用；完整读571行；含糊任务才访谈，不能重新追问已清晰用户要求。 |
| `design` | 择需本地使用；DESIGN.md格式不提升为高于V7.1的新范围权威。 |
| `doctor` | 需隔离技能修复入口；含全局rm -rf skills/agents/cache、下载覆盖AGENTS。只读doctor CLI不等于修复脚本授权。 |
| `hud` | 只读 omx hud --json 可用；无active为正常，不为了演示启动goal/workflow。配置另需scope。 |
| `omx-setup` | 不默认再次运行；user默认/force覆盖/插件迁移清理，仅明确scope project、dry-run与保留merge策略。 |
| `performance-goal` | 不默认启用；只有用户明确goal请求才create_goal，性能检查不自动创建goal。 |
| `plan` | 择需规划；直接执行要求不自动路由ultragoal；本地计划足够时保持简单。 |
| `ralplan` | 不默认启用；严格Planner→Architect→Critic身份/goal handoff依赖，角色routing能力未验证。 |
| `skill` | 仅list/info/validate可选；add/edit/remove/sync涉及global/目录删除，仍逐项审查与明确scope。 |
| `team` | 不默认启用；要求tmux和TMUX leader；Windows native非tmux不可冒称启动成功，cleanup含kill/remove stale root。 |
| `ultragoal` | 不默认启用；goal/cleaner/review循环仅用户明确选择，不能扩大范围或删除证据。 |
| `ultraqa` | 受限择需验证；max5/3次失败停止不同用户最多3轮改进，重要未通过不冒称完成；清理不删学习数据或证据。 |
| `visual-ralph` | 不默认启用；批准图片基准/90分/pixel-verdict+ultragoal；实测界面优先，不以分数冒称奖项质量。 |
| `wiki` | 本地知识读写择需；wiki_delete明确授权，autoCapture不得写入敏感transcript。 |
| `worker` | 不默认启用；仅真实OMX Team worker，原生Codex子代理不等同tmux worker。 |

### Windows native hook入口副作用

全文阅读 `.codex/hooks/omx-native-hook-windows-shim.ps1`：固定node路径和native脚本，无shell插值，stdin/stdout/stderr透传，等结束并返回退出码；本体无网络/凭据/删除代码，继承父环境，下游不是纯日志。

`D:/AI/Hermes/node/node_modules/oh-my-codex/dist/scripts/codex-native-hook.js` 约22000行：本次检查入口/调用链/副作用相关段，**未逐行审完整包**。有限长度stdin JSON→dispatch，可能mkdir本地.omx状态、写日志/会话/skill-active/role-tracker/workflow状态、探测git/进程/tmux/HUD；取消事务unlink锁/journal等OMX临时状态。Stop在active workflow/错误时可block/nudge，所以不能称原版是只记录hook。

入口读取CODEX_HOME中的 `.omx-config.json` 与通知环境token作子代理事件显隐；未发现入口直接HTTP通知，不能冒称已经外发。实际notify是另外配置链，主流程拟覆盖纯本地记录；本次不认证所有notify传输。

深入跟踪 runtime.js、dispatcher.js、loader.js：native/derived事件**强制enabled**，`OMX_HOOK_PLUGINS=0` 不保证禁掉native派发。会发现项目 `.omx/hooks/*.mjs` 并spawn plugin-runner，继承process.env、传入事件context/stateRoot；检查时该目录mjs为0。可选 `HERDR_ENV=1` 会走外部Herdr生命周期桥，未授权/不默认开启，未审其全部实现。

多卡片 `../../templates/AGENTS.md` 指向 `.codex/templates/AGENTS.md`，检查时不存在；不能声称已加载模板。以项目用户规则和V7.1为准。建议主流程备份隔离 ask/configure-notifications/doctor 及同名code-review；本代理未执行隔离，最终状态由主流程复查。

### 已读取快照指纹

实际安装package.json版本0.21.8。指纹是本次读取快照，后续主流程替换/隔离以更新后的复查为准。

- `omx-native-hook-windows-shim.ps1` SHA256：`e6785f8a84cb9e48a571f76d707968c047e962613df87061baca0a66ba8c3bf7`。
- `codex-native-hook.js` SHA256：`e1cf6ddead0984b0ad2a773607546eaeca821c25b817562970e3effb665e0019`。

| OMX技能 | SKILL.md SHA256 |
|---|---|
| `ai-slop-cleaner` | `8010c48cf1358917a0a13475cf9a8dd36a2d2e9ff5bfcfbea5b4703127eb756c` |
| `analyze` | `cd8486739b57d575d880d2802d0bf8e08981c9d3500fc3f2fb085906c91da53c` |
| `ask` | `cd7dbdd14611aa1d88039572b2611bf87df69dfe04e632f538e225854a6d85e4` |
| `autopilot` | `c26fc9f4742f6e9656df9f939d71d1cba20b2c26e3dc3057663403d41e47c583` |
| `autoresearch` | `ad0cde58ed71696cb4ab7e90bc88a09d98b554b11dc13f1d728799f4e57c4e26` |
| `best-practice-research` | `6f0525b364f03ea4ec991ceb1b77a5bf0674efc605bed5db5cb98ebfc09e7c5e` |
| `cancel` | `66be01511ce4370be39658f36231e181f14f1c90d3d64c73aac46ebc1cab690e` |
| `code-review` | `c22826bc3ba70fa855bc75841dc17dec56c19f020b7936f0043d8c00f695e0fd` |
| `configure-notifications` | `5052147ccc65dcf0d443cefab98b4ced881231629017569bc6f6b66aafe6e8ee` |
| `deep-interview` | `4e5fcb1d89cdd8d00a863c81d28b77c917c0d171de810107282cf81b128b8eb7` |
| `design` | `ce13aa84fa0f640eec2ebe818e6fffb22f89e4cab680ec55d02ed1d3db7389dc` |
| `doctor` | `18ebba0911fb8ca0863388d8d312a15ffd07ec394f7686d517b06d0ae3bca641` |
| `hud` | `8b545bc9c5b58901bab3bc998b71e2f20341d281798c053f813096a5e1bac916` |
| `omx-setup` | `a8f83fc21446db703449073c6d4068eccbe675ea515baf1d390a953cadceb97a` |
| `performance-goal` | `0f1076342c5f1b8a52bd2179c194a26f43a8f3f962d92b2feea1b079da6fe293` |
| `plan` | `522e2613cadfbaf50ea58c045c517a24cc8c7b15cd6dac9939f218c6e00af772` |
| `ralplan` | `27e9ae0e3898ddd6b2216cafee9a0a4a066429fe8ce7ce148d7e8ca0662bd966` |
| `skill` | `875d24e1bf86939d931a5a8b01a32482f3b51cf20f74ed1870cb74e69916e753` |
| `team` | `ff8452505757910380b457a2bf2e2f19db6d55d14caf8938c9c593ed527046c4` |
| `ultragoal` | `1778555ec9831e6d51f8e9adb0ef0f03f59e3c905d78ba8950d00090cc3fc6d4` |
| `ultraqa` | `77ac2225df4418dee21988433a3199323edcae6445957e160eaf78ac42b9270e` |
| `visual-ralph` | `b1d15488496bb3ae035d0fc63c0b6ccef7697cb225b7da4cbca1a56e8ee28fc5` |
| `wiki` | `e2dc6f9da428b1afffeb855544a46b5f50168bb4bc43372a964a988c587e7f72` |
| `worker` | `88fcc9a6cc80da64ce9126268d63e9213a29ab935225c9887aee411de9a6e771` |
