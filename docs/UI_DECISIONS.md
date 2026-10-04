# UI 基础调研与决定

检查日期：2026-10-04。

比较 shadcn/ui（https://ui.shadcn.com/docs）、Radix Primitives（https://www.radix-ui.com/primitives/docs/overview/introduction）、Mantine（https://mantine.dev/getting-started/）。三者均提供活跃的 React 组件生态；本项目安装时检查 package 元数据与许可证。

采用 Radix Dialog 的键盘、焦点与无障碍交互基础，使用自有 CSS 形成阅读型界面。shadcn 的可编辑组件思想作为结构参考，不复制无关模板；没有安装 Mantine，避免引入第二套主题系统。

界面方向：暖白纸面、低饱和深绿、正文清晰、宋体标题、统一8px基础间距。学习三栏、更新信箱、亮暗模式与窄屏Tutor分别验收。无远程字体请求、无渐变卡片墙。首屏曲线为装饰，不冒充教材函数图。
