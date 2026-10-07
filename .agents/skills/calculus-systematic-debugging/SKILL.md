---
name: calculus-systematic-debugging
description: Investigate reproducible CalculusWorkbench failures and regressions using local evidence, one hypothesis, and focused verification. Use for failed tests, build errors, or incorrect learning-workbench behavior.
---

# CalculusWorkbench debugging

Original project skill, created for this repository. This is not an installation or fork of obra/superpowers systematic-debugging.

1. Reproduce the reported behavior with the smallest relevant existing test or user flow. Record the input, expected result, observed result, and command exit code. If reproduction fails, record that uncertainty and collect relevant local evidence before editing.
2. Inspect the affected source, recent diff, and narrow error output. Distinguish observations from assumptions. Do not dump environment variables, tokens, account files, credential stores, or signing keychains. Redact secrets from logs before sharing any excerpt.
3. State one root-cause hypothesis and the evidence supporting it. Choose the smallest check that can disprove it; test one variable at a time.
4. Make the smallest change in the authorized project scope. If the hypothesis fails, revisit the evidence instead of stacking speculative patches. Repeated equivalent failures warrant checking architectural assumptions and reporting the specific unresolved decision.
5. Verify the original reproduction and affected behavior. Use existing project commands as appropriate: npm test, npm run typecheck, npm run build. For UI regressions, check the actual interaction and relevant screen size. A command not run is unverified; an agent report is evidence to inspect, not acceptance by itself.
6. Save the root cause, changed files, exact verification commands, results, and remaining uncertainty in the task's existing local report or status file. Preserve useful evidence for continuation.

This skill grants no external publishing, messaging, package installation, system configuration, or deletion permission. Keep debugging within the user's authorized scope and protect learning data.
