# GH-600 exam cheat sheet (Part 1 topics)

## Files and locations

| What | Path / location |
| --- | --- |
| Repository-wide instructions | `.github/copilot-instructions.md` |
| Path-specific instructions | `.github/instructions/*.instructions.md` with `applyTo: "glob"` |
| Agent instructions (cross-tool) | `AGENTS.md` |
| Custom agents | `.github/agents/*.agent.md` (org/enterprise: `.github-private` repo) |
| Hooks | `.github/hooks/*.json` (default branch) |
| Agent environment setup | `.github/workflows/copilot-setup-steps.yml`, job `copilot-setup-steps` |
| Repository MCP config | Settings → Copilot → Cloud agent → MCP servers (JSON `mcpServers`) |
| Agent firewall | Settings → Copilot → Cloud agent → Internet access |
| Agent secrets | Settings → Secrets and variables → **Agents** (MCP: prefix `COPILOT_MCP_`) |
| PR template | `.github/pull_request_template.md` |
| Code owners | `.github/CODEOWNERS` (or root / `docs/`) |
| Agentic workflow | `.github/workflows/<name>.md` + compiled `<name>.lock.yml` |

## Custom agent front matter

`name`, `description` (required), `tools`, `model`, `target` (`vscode` / `github-copilot`), `mcp-servers`, `disable-model-invocation`, `user-invocable`, `metadata`. Prompt body up to 30,000 characters.

- Tool aliases: `read`, `edit`, `search`, `execute`, `agent`, plus MCP `server/tool`.
- Omit `tools` or use `["*"]` → all tools. `[]` → none.
- Same name at several levels: repo overrides org, which overrides enterprise.

## Copilot cloud agent — built-in safeguards

- Only users with **write access** can assign tasks or trigger it via comments, and it only responds to them.
- Pushes only to its own **`copilot/…` branch**; can't push to `main` or other branches.
- Opens **draft PRs**; can't mark ready, approve, or merge.
- The **requester can't approve** its PR. Unattributed Copilot PRs need **one extra** approval.
- Actions **don't run until "Approve and run workflows"** (configurable).
- Commits are **signed**, list the requester as **co-author**, and link to the **session log**.
- Hidden characters and HTML comments in issues are filtered (prompt-injection mitigation).
- Built-in `github` MCP server: **read-only**, scoped to the repository. Built-in `playwright` is localhost only.
- Firewall: covers **Bash tool processes + Playwright**; not other MCP servers or setup steps.
- Validation in session: CodeQL, secret scanning, Advisory DB, Copilot code review.

## Control strength (weak → strong)

```
prompt wording → custom instructions → custom agent tool allowlist → MCP tool allowlist
→ hooks (deny) → required checks / rulesets / CODEOWNERS → environment required reviewers
```

Rule of thumb: **instructions guide, enforcement guarantees.** Pick enforcement when the scenario says "must", "guarantee", "prevent", or "regardless of".

## Reliable workflow patterns

| Need | Pattern |
| --- | --- |
| Pass data between jobs | `$GITHUB_OUTPUT` → `jobs.x.outputs` → `needs.x.outputs.y` |
| Gate on success | `needs:` (default `success()`); `if: failure()` for escalation |
| Keep evidence | `actions/upload-artifact` with `if: always()` |
| Human sign-off | `environment:` with required reviewers |
| Flaky step | **Bounded** retry → escalate (issue or label) with evidence |
| Rollback | Deploy an explicit SHA; rollback = re-run with the last good SHA |
| Least privilege | Top-level `permissions: contents: read`; elevate per job |
| Untrusted input in scripts | Pass via `env:`, never inline `${{ }}` in `run:` |

## Anti-patterns to recognize

- Vague tasks with no success criteria ("make it better")
- Unbounded scope, or no boundaries on paths
- Granting all tools or write tokens "just in case"
- Unbounded retries; silent failures; no evidence kept
- Relying on instructions alone for security requirements
- Auto-merging high-risk paths; self-approval
- Treating agent output as more (or less) trustworthy than a human contributor's. Apply the **contributor model**.

## Learn vs. docs differences spotted while building these labs

- Learn shows `applyTo` in a custom agent file. In the docs, `applyTo` belongs to `.instructions.md` files.
- Learn shows an illustrative hook format (`trigger: pre-tool-use`). The real format is `{"version":1,"hooks":{"preToolUse":[...]}}`.

When a question is about concepts, both agree. When it's about exact syntax, trust the docs.
