# CalculusWorkbench Codex/OMX Runtime Validation

Date: 2026-10-07 (Asia/Shanghai)
Scope: read-only operational verification, plus this report and already-authorized reversible project-scoped launcher/config adjustments. No installs or system-component changes during this validation. No credentials, tokens, auth files, or environment dumps are included.

## Runtime and paths observed

- OS: native Windows 11 environment (PowerShell; no WSL dependency was used in the successful Codex CLI calls).
- Codex CLI: 0.148.0. OMX: 0.21.8. Git: 2.54.0. Node/npm versions observed in the earlier environment audit: Node 22.23.2 via the Hermes OMX wrapper; direct D runtime Node 26.7.0; npm 11.19.0. This distinction matters: `omx doctor` may report the wrapper's Node rather than the independently selected runtime.
- OMX wrapper: `D:\AI\Hermes\node\omx.ps1`; Codex wrapper: same D node directory. psmux 3.3.8 is under `D:\CalcDevTools\psmux`.
- Native cache: `D:\CalcDevTools\native\0.21.8\win32-x64\omx-runtime\omx-runtime.exe`; its recorded checksum matches the adjacent `.sha256`. OMX root: `D:\CalcDevTools\calculus-state`.
- Project config `.codex/config.toml` selects `gpt-5.6-sol`, medium reasoning, and project agent defaults `gpt-5.6-luna` at low effort. Existing role TOMLs use supported 5.6 model names. The project-scoped `.codex/.omx-config.json` maps Spark to `gpt-5.6-luna`, avoiding the unsupported/inappropriate default `gpt-6-astra` for that OMX route without touching global desktop configuration.
- Launcher: `D:\CalcDevTools\Start-Calculus-Codex.ps1`; its before-validation copy is `D:\CalcDevTools\calculus-state\validation-backups\2026-10-07\Start-Calculus-Codex.ps1.before-validation`. It sets D: OMX paths and temporarily removes an inherited `CODEX_SESSION_ID` while invoking OMX, then restores it.

## Executed checks

- `omx doctor` through the D: launcher: **19 passed, 1 warning, 0 failed**. The warning is 21 discovered project skills versus the generic threshold of 22; the deliberately isolated skill set is intentional. Do not run `omx setup --force`: that would restore excluded unsafe skills and could overwrite project model settings. Doctor is a diagnostic only and is not runtime proof.
- `omx sparkshell --json node --version`: completed read-only execution, exit 0, Node `v26.7.0`.
- `omx exec --skip-git-repo-check -C <source-project> ...` with a minimal marker request: actual OpenAI model request returned the requested marker, exit 0, using `gpt-5.6-sol`, approval `never`, sandbox `read-only`. Its attempted child shell commands were blocked by the Codex shell policy, so this does **not** prove arbitrary child-process execution.
- Actual `$analyze` skill route returned its requested structured analysis contract without file edits.
- Actual project skill call for `verification-before-completion`: direct `codex exec --skip-git-repo-check --model gpt-5.6-sol --sandbox read-only -- '<prompt>'` read `.agents/skills/verification-before-completion/SKILL.md` and emitted `SKILL-CHECK-VERIFICATION-OK`; it stated fresh command output is required before a completion claim. Exit 0. This is a skill invocation check, not a product test.
- Actual combined invocation `$verification-before-completion $calculus-systematic-debugging`: direct `codex exec --skip-git-repo-check --model gpt-5.6-luna --sandbox read-only -- '<prompt>'` read both skill files, inspected the required docs and existing evidence, and exited 0. It found test source files and acceptance artifacts but no saved regression run transcript/exit code or red-green record. The evidence is dated before the current dirty worktree; no specific regression was supplied, so root-cause reproduction remains unverified. The first broad scan was sandbox-denied; the subsequent bounded inspection succeeded. No files were changed.
- Native Codex session resume: a fresh read-only CLI session was resumed by its concrete session ID with `codex exec resume --skip-git-repo-check --model gpt-5.6-luna <session-id> '<prompt>'`. It recalled the prior verification rule and returned `RESUME-CONTEXT-OK`. This verifies basic Codex conversation context recovery; model changed from 5.6-sol to 5.6-luna and Codex emitted the expected model-mismatch warning. It does not verify OMX mission/team state recovery.
- `$analyze` and CLI requests generated native SessionStart/UserPromptSubmit hook activity in the run output. OMX D: logs show three SessionStart and three SessionEnd records. `omx hooks status` reports hook/plugin configuration present (plugin discovery count 0). A direct Codex invocation logged `after_agent` hook `legacy_notify` failure because its configured path was unavailable; execution continued. Therefore hook registration/start/stop dispatch is observed, but the legacy notification hook is **not** healthy in this shell context. No global notification setting was changed.
- `omx hud --json` returned valid JSON at v0.21.8, including team/session/runtimeSnapshot fields; these fields were empty in the no-active-team state. A live interactive HUD pane was not verified.
- Actual `omx team 2:explore ...` attempted a read-only task in isolated psmux session `omx-validation`. Both workers resolved to configured `gpt-5.6-luna`, low effort, but team startup failed at `failed to capture tmux pane owner: psmux: unknown command: show-option`. Direct psmux probing confirmed only `show-options` exists and pane-scoped custom options required for OMX team ownership are unsupported. No team state was fabricated and no unsupported psmux patch was applied. **Team/HUD pane interoperation is blocked on this psmux version.**
- OMX native process identity initially appeared unavailable without `OMX_NATIVE_CACHE_DIR`; the D: launcher supplies it. OMX doctor/runtime uses its bundled `omx-runtime.exe`; the Codex CLI itself is run by the Hermes Node wrapper. Keep these runtime identities distinct when diagnosing native hooks.
- A first CLI invocation with `CODEX_HOME` pointed at the project `.codex` directory failed with HTTP 401 due to absent credentials there; it was stopped. Subsequent successful checks used the normal user Codex home and did not inspect or print credential material.

## Evidence-only project review

Existing artifacts include `docs/evidence/*.json`, test sources under `tests/`, and `ACCEPTANCE_REPORT.md`. For example `FULL_TEXT_BROWSER_CHECK.json` marks full-text display and narrow viewport checks passing with zero page errors; `FULL_TEXT_CONVERSION.json` explicitly scopes its result to structural conversion, not whole-book AI review; `LIVE_STUDY_ACCEPTANCE.json` and `FULL_LIVE_STUDY_ACCEPTANCE.json` are limited to one real section and retain candidate/revision states. The acceptance report itself retains `UNVERIFIED`/`BLOCKED` limitations. These are existing recorded claims, not rerun results for this environment audit.

## Remaining limits

- No current product test suite was run as part of this environment-focused check; test source existence and old acceptance artifacts do not establish current pass status.
- OMX team execution, live HUD pane, and interactive pane-state restoration were not verified because psmux lacks the specific command/option surfaces OMX uses.
- The actual resumed Codex conversation passed, but a resumed OMX mission ledger was not exercised.
- A `legacy_notify` hook failure remains observable; do not infer all hooks are healthy from doctor or event dispatch.
- Do not infer Linux/WSL-only behavior is required: the tested Codex CLI request, skill invocation, and resume ran natively on Windows. Team pane support is the specific native-runtime limitation observed here.

## Reproduction commands (read-only intent)

```powershell
# Runtime identity
omx sparkshell --json node --version

# Doctor through the project launcher; diagnostic evidence only
D:\CalcDevTools\Start-Calculus-Codex.ps1 doctor

# Skills are invoked from the project cwd so project .agents/skills are discoverable.
# Use the user's normal Codex home; do not point CODEX_HOME at project .codex when it lacks auth.
codex exec --skip-git-repo-check --model gpt-5.6-sol --sandbox read-only -- '<read-only skill check prompt>'

# Resume a specific recorded session, rather than assuming --last has relevant context.
codex exec resume --skip-git-repo-check --model gpt-5.6-sol '<recorded-session-id>' '<small context-recovery prompt>'

# OMX team command syntax; on the installed psmux 3.3.8 this stops at unknown `show-option`.
omx team 2:explore "Read README.md and report project codename and release status; keep read-only"
```

Official CLI references: [Codex CLI](https://developers.openai.com/codex/cli/), [Codex skills](https://developers.openai.com/codex/skills/). OMX upstream repository: [Yeachan-Heo/oh-my-codex](https://github.com/Yeachan-Heo/oh-my-codex).
