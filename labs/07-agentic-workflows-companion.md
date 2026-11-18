# Lab 07 — Companion: GitHub Agentic Workflows exercise

| | |
| --- | --- |
| **Do first** | M3 exercise *Agentic Workflows* (the official, guided Learn exercise) |
| **Exam skills** | Agentic automation in Actions (D2) · least-privilege tokens and safe outputs (D2, D6) · network restriction and sandboxing (D6) |
| **Why a companion?** | The official exercise already walks you through `gh aw` with Codespaces or the CLI. This page tells you **what to watch for** so the exercise sticks for the exam. |

> GitHub Agentic Workflows (`gh aw`) is evolving quickly. The syntax below is illustrative; follow the official exercise and the [gh-aw repository](https://github.com/github/gh-aw) for exact syntax.

## About this lab

### What we'll discuss

Labs 01–06 used an agent that *you* start (by assigning an issue or writing a prompt). **GitHub Agentic Workflows** turn that around: the agent runs **inside a CI workflow**, triggered by repository events or a schedule, with no human starting it. That's a big jump in autonomy, so the security model is stricter by design. The agent runs **read-only**, holds **no secrets**, sits behind a **network allowlist**, and can only change things through validated **safe outputs** that separate jobs perform.

This companion helps you see the official exercise through the exam's lens. Each design choice maps to a guardrail principle you've already practiced, now applied to unattended automation.

### What you'll learn

- How an agent is invoked from a CI workflow (Markdown intent, compiled `.lock.yml`)
- Why separating "agent decides" from "job writes" (safe outputs) reduces prompt-injection risk
- How least privilege, network restriction and threat detection apply to unattended agents
- How this model compares to Copilot cloud agent's controls

### Where this lands in the exam

| Domain (weight) | Study guide objective | Skill bullet |
| --- | --- | --- |
| Implement tool use and environment interaction (20–25%) | Integrate agents within development environments | *Configure an agent to be invoked in a CI workflow* · *Configure an agent to handle environment-specific constraints* |
| Implement tool use and environment interaction (20–25%) | Select and configure agent tools | *Configure agent tools* · *Configure agent tool permissions* |
| Implement guardrails and accountability (10–15%) | Implement guardrails and human-in-the-loop workflows | *Block actions that violate defined security, compliance, or Responsible AI policies* · *Scope permissions and execution contexts to enforce least-privilege access* |
| Implement guardrails and accountability (10–15%) | Define autonomy levels | *Assign autonomy levels to maximize delivery speed while remaining compliant…* |

📘 Source: [GH-600 study guide — Skills measured](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600#skills-measured)

## While you do the exercise, find each concept

| ✅ | Concept | Where you'll see it | Why the exam cares |
| --- | --- | --- | --- |
| ☐ | **Markdown workflow + YAML front matter** | `.github/workflows/<name>.md` | Intent in natural language; config in front matter (`on`, `permissions`, `tools`, `safe-outputs`, `network`) |
| ☐ | **Compilation to `.lock.yml`** | `gh aw compile` → `<name>.lock.yml` | The lock file is what Actions actually runs. Commit both, and re-compile after editing the `.md`. |
| ☐ | **Read-only by default** | `permissions:` (e.g. `contents: read`) | The agent job doesn't get write tokens |
| ☐ | **Safe outputs** | `safe-outputs:` (e.g. `create-issue`, `add-comment`, `create-pull-request`) | The agent *requests* writes; a separate, permission-scoped job performs them after validation |
| ☐ | **No secrets in the agent step** | Write tokens live in the safe-output jobs | Limits blast radius of prompt injection |
| ☐ | **Network allowlist** | `network:` (defaults or allowed domains) | Egress control for the agent sandbox |
| ☐ | **Tool allowlist** | `tools:` (e.g. specific GitHub toolsets, bash commands) | Least privilege at the tool level |
| ☐ | **Threat detection** | Runs on agent output before safe outputs apply | Catches malicious or injected output |
| ☐ | **Triggers** | `on:` schedule / issues / `workflow_dispatch` / slash commands | Same triggers as Actions |

## Illustrative shape

```markdown
---
on:
  issues:
    types: [opened]
permissions:
  contents: read
  issues: read
safe-outputs:
  add-comment:
  add-labels:
    allowed: [bug, enhancement, question]
---

# Issue triage

Read the new issue, pick one label from the allowed list, and post a short comment explaining why.
```

## Compare with what you built in Labs 01–06

| Concern | Copilot cloud agent (Labs 01–06) | Agentic Workflows (this exercise) |
| --- | --- | --- |
| Trigger | Assign an issue, the Agents page, `@copilot` in a PR | Actions events (`on:`) |
| Write path | Pushes to its own `copilot/…` branch and opens a draft PR | **Safe outputs** performed by separate jobs |
| Tool scoping | Custom agent `tools:` and the MCP `tools` allowlist | `tools:` in front matter |
| Network | Cloud agent firewall | `network:` allowlist and sandbox |
| Pre-action guardrail | `preToolUse` hooks | Safe-output validation and threat detection |
| Human gate | Draft PR, workflow approval, rulesets | Safe output creates an issue or PR for a human; rulesets still apply |

## Exam lens — self-check

<details><summary>1. In an agentic workflow, how does the agent create an issue if its job has only read permissions?</summary>

Through a **safe output**. The agent emits a structured request, and a separate job with `issues: write` validates and performs it.
</details>

<details><summary>2. You edited the workflow's Markdown but behavior didn't change. Why?</summary>

You didn't re-compile and commit the `.lock.yml`. Actions runs the lock file.
</details>

<details><summary>3. Why keep secrets and write tokens out of the agent step?</summary>

The agent processes untrusted input (issues, PRs, web content). If a prompt injection succeeds, there's nothing powerful for it to use. Writes go through validated safe outputs.
</details>
