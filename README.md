# GH-600 Hands-on Labs — Part 1

Hands-on companion labs for **[Developing in Agentic AI Systems Part 1 of 2](https://learn.microsoft.com/en-us/training/paths/gh-developing-agentic-systems-1)**, preparing for **[Exam GH-600: Developing in Agentic AI Systems](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600)**.

Read the Learn unit first, then do the matching lab. Every lab is done **in the GitHub web portal** (github.com) unless noted.

## The lab subject: `task-api`

A tiny, zero-dependency Node.js API (`node --test`) with deliberately risk-tiered paths:

| Path | Risk tier (Learn M2 · Unit 6 autonomy model) |
| --- | --- |
| `docs/` | Low — candidate for auto-merge after checks |
| `src/`, `test/` | Medium — PR + checks + 1 review |
| `src/auth/`, `infra/`, `.github/` | High — CODEOWNERS + stricter rules + hooks |
| `production` environment | Critical — agent prepares, human approves |

## Lab index

| # | Lab | Learn module · units | Exam domain(s) | Time |
| --- | --- | --- | --- | --- |
| 00 | [Setup & preflight](labs/00-setup.md) | — | — | 10 min |
| 01 | [Plan → Act → Evaluate and the contributor model](labs/01-plan-act-evaluate.md) | M1 · 3, 4, 5, 6 | D1, D2, D4 | 40 min |
| 02 | [PR governance: template, Plan Gate, CODEOWNERS, rulesets](labs/02-pr-governance.md) | M2 · 5 · M1 · 4 | D1, D6 | 45 min |
| 03 | [Separate planning from execution with custom instructions & custom agents](labs/03-plan-vs-execute-custom-agents.md) | M2 · 3, 4, 7 | D1, D2, D4 | 50 min |
| 04 | [Reliable workflows: outputs, gating, artifacts, approvals, retry/escalate/rollback](labs/04-reliable-workflows.md) | M2 · 6, 7 | D1, D2, D6 | 45 min |
| 05 | [MCP servers and tool scoping](labs/05-mcp-servers.md) | M3 · 3 · M2 · 7 | D2 | 40 min |
| 06 | [Execution context & guardrails: scope, setup steps, firewall, hooks, secrets](labs/06-execution-context-guardrails.md) | M3 · 4, 5 · M2 · 7 | D2, D6 | 50 min |
| 07 | [Companion: GitHub Agentic Workflows exercise](labs/07-agentic-workflows-companion.md) | M3 · Exercise | D2, D6 | 45 min |

Also see the **[exam cheat sheet](labs/exam-cheatsheet.md)** — file paths, settings locations, and "gotcha" facts that show up in scenario questions.

## Suggested study rhythm

```
Read M1 (all units) ─► Lab 00 ─► Lab 01
Read M2 units 1-5   ─► Lab 02 ─► Lab 03
Read M2 units 6-9   ─► Lab 04
Read M3 units 1-3   ─► Lab 05
Read M3 units 4-5   ─► Lab 06
M3 Exercise         ─► Lab 07 (companion) ─► M3 knowledge check
```

## Cost note

Each Copilot cloud agent session consumes premium requests and GitHub Actions minutes. The labs need roughly 8–10 agent sessions in total. This repository is public, so Actions minutes on standard runners are free.

## Not covered here (Part 2)

Memory/state (D3), multi-agent orchestration (D5), and the deeper guardrails material (D6) come in Part 2 of the learning path.
