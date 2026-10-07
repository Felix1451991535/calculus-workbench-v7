# 设计品质与可访问性验收

2026-10-07：本轮在既有知微界面上做针对性修复，保留学习工具的阅读与操作效率，不做全面重设计。用户九条品质标准与项目 V7.1 范围是验收依据；奖项只作参考，不宣称获奖水准。

## 已修改

- `app/client/styles.css`：浅色 muted 改为 #59665c，导航复用该颜色；深色 muted 提亮为 #aabaae。教材原文卡片与转换状态使用既有 paper/soft/ink 主题变量，修正暗色下硬白/浅色背景。复习正文桌面16px、手机15px，辅助文字13px，导航14px；summary/表单/目录搜索可见焦点。平板目录改为纵向以留出正文阅读宽度。
- `app/client/StudyWorkbench.tsx`：转换进度与当前阶段礼貌播报，后台进度读取异常有明确本地错误及重试按钮，目录当前项带 aria-current、空搜索有提示、暂停按钮遵守busy禁用。移除包裹整页的busy标志，避免后台工作长期压住进度播报。
- `automation/design-acceptance.ts`：现有Chrome/Playwright运行真实编译后的界面，本地自编教材/教学节点fixture测试UI，独立D盘存储，不安装新依赖、不读用户教材或密钥。

## 九条标准结果

| 标准 | 本轮证据与边界 |
|---|---|
| 视觉 | 复用既有纸色、绿色、字体和卡片；修正亮暗主题对比。实际检查桌面/平板/手机截图，正文与公式可读。未全面审查全部页面。 |
| 布局 | 390、768、1440px × 亮/暗主题6组合：document及content-area/review-workbench/review-lesson/textbook-block均无横向溢出。平板纵向章节目录避免窄正文。 |
| 交互 | 搜索空结果、章节切换、模型发送同意前禁用/勾选后启用、后台错误重试、Tab焦点均真实通过。 |
| 状态 | 初始加载、空搜索、已审核教学示例、待整理章节、禁用按钮、503后台错误与成功重试有真实UI验证；aria-live/status/alert属性已检查。屏幕阅读器语音未实听，不宣称完整AT认证。 |
| 内容 | 原文与AI讲解分区、来源核对、模型费用同意保留。截图只含自编UI示例，明确不当作真实模型或教材一致性验收。 |
| 动效 | emulateMedia reducedMotion=reduce实测spin animation=none、content scroll=auto、导航transition=0s。 |
| 可访问性 | muted对paper/side/soft实测亮色5.98/5.31/5.12:1，暗色6.76/7.84/5.61:1；目标≥4.5:1。新增keyboard focus可见。只针对上述前景/背景组合，不代表全站每种颜色均审计。 |
| 性能 | 本机生产构建+localhost、新浏览器上下文、1440px，页面进入已含教学节点的可用状态1079.5ms（包含450ms测试加载延迟）；搜索空结果9.4ms。目标分别<3000ms与<500ms，通过。属于单次本地交互测量，不是移动网络/真实模型延迟或Core Web Vitals p75。 |
| 功能 | Chrome真实UI流程通过，0 pageerror；构建、TypeScript检查通过。外部模型请求和服务器完整业务由主流程独立验收，本轮不以route fixture替代。 |

## 实际验证与证据

命令：`npm run typecheck`、`npm run build`、`npx --no-install tsx automation/design-acceptance.ts` 均exit0。首轮发现muted对soft仅4.47:1，调深后重新构建并复跑所有受影响组合。

最终运行目录：`D:/CalcDevTools/design-evidence/run-HDC7Ht`。包括 `results.json`、6份顶部截图与6份正文阅读截图；build日志在 `D:/CalcDevTools/design-evidence/build-latest.log`。人工视觉读取了light-1440-reading、dark-390-reading、light-768-reading等代表截图，未见白色暗主题卡片、横向遮挡或公式断裂。截图因内部content-area独立滚动，顶部/正文分别记录。

生产JS主包约1177.67KB、gzip358.75KB，Vite仍有>500KB chunk警告。此次实测本地首屏达到目标；后续若弱设备实测未达标，再在明确范围内按功能拆分加载，不为消除警告引入无关架构改动。

## 参考来源实际读取情况

- [Awwwards Minimal](https://www.awwwards.com/websites/minimal/)：本次抓取超时，未声称已看具体作品。
- [Webby Education](https://winners.webbyawards.com/winners/websites-and-mobile-sites/general-desktop-mobile-sites/education)：实际读到2026教育网站分类与作品名单；用于教育内容清晰度这一参照方向，没有读取各作品内部交互，未据名单推断其实现。
- [FWA](https://thefwa.com)：抓取返回0行，不声称已读作品。

## 剩余限制

本轮是复习核心页面及指定风险的针对性检查；全站屏幕阅读器、真实触屏、弱设备/网络、多次性能分位数与真实AI吞吐仍待专项验收。保留用户隐私和真实业务验收边界，不将本地示例或分数包装为产品质量证明。
