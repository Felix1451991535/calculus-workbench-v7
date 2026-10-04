# V7 开发与维护约定

先读 docs/V7_SPEC.md、REQUIREMENTS_V7.md 和 ACCEPTANCE_REPORT.md。用户提供的 V7 是唯一产品需求基准，不复用旧版软件代码或旧 UI。

未经用户确认的教材事实不得成为 VERIFIED；AI 无权直接覆盖已核验事实。保留原始数据及版本历史。测试只使用隔离目录与明确标记的测试夹具。

维护仅在 Candidate 工作，最多三轮失败后熔断；不得直接修改 Stable。发行必须完整性校验、备份、测试、回滚验证，用户资料和私钥不能进入发行包或仓库。

真实模型、教材、视觉或上线验证缺失时记录 BLOCKED/UNVERIFIED，不伪造 PASS。预览版本明确标记 Candidate，不假装完成全部 V7。
