# Lab 00 — Setup & preflight

**Goal:** confirm that Copilot cloud agent can work in this repository before you start the real labs.

## About this lab

### What we'll discuss

GH-600 is about running AI agents *inside* a real software delivery process, with GitHub as the **system of record and control plane**. Before an agent can do anything, three things need to be true: the agent is **enabled** for you (policy), it can **reach** the repository (scope), and the repository has a **baseline** (working CI) to measure agent changes against. This lab checks all three and gives you a tour of where agent controls live in the repository settings.

### What you'll learn

- Who decides whether Copilot cloud agent is available to you: enterprise/org policy first, then the repository
- Where the repository-level agent controls live (*Settings → Copilot*), which you'll configure in later labs
- Why a green CI baseline matters: it's your first **evaluation signal** for agent output

### Where this lands in the exam

| Domain (weight) | Study guide objective | Skill bullet |
| --- | --- | --- |
| Implement tool use and environment interaction (20–25%) | Integrate agents within development environments | *Evaluate the execution context for an agent* · *Configure an agent's scope to a specific repository* |
| Perform evaluation, error analysis, and tuning (15–20%) | Define success criteria and evaluation signals for agent tasks | *Identify qualitative and quantitative evaluation signals to evaluate agents* |

📘 Source: [GH-600 study guide — Skills measured](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600#skills-measured)

## 1. Enable Actions and check the baseline

1. Open the repository's **Actions** tab. If prompted, click **I understand my workflows, go ahead and enable them**.
2. Confirm the **CI** workflow ran on `main` and is green (it runs `npm test`).

## 2. Confirm Copilot cloud agent is available

Your Copilot Business seat is managed by an organization, so its admins decide whether cloud agent is enabled for you.

1. Go to **https://github.com/copilot/agents** (the **Agents** page).
2. In the prompt box, open the repository picker and check that `gh600-labs` is listed.
3. Open **Issues → New issue**, then look at the **Assignees** sidebar: **Copilot** should be listed.

> **If Copilot is not offered:** the managing organization's *Copilot cloud agent* policy is likely disabled for your seat. Labs 01, 03, 05, and 06 rely on it. Labs 02 and 04 still work without it.

## 3. Look at the repository's Copilot settings

1. Go to **Settings**. In the sidebar under **Code, planning, and automation**, open **Copilot**.
2. Browse the sub-pages without changing anything yet:
   - **Cloud agent**: validation tools (CodeQL, secret scanning, Copilot code review), workflow-approval behavior
   - **MCP servers**: the repository MCP configuration (Lab 05)
   - **Internet access**: the cloud-agent firewall (Lab 06)
3. Note what you see in your lab notebook. Some labels can differ slightly as the UI changes.

## 4. Create the labels used later

Go to **Issues → Labels → New label** and create:

| Label | Purpose |
| --- | --- |
| `agent-task` | Work intended for an agent |
| `escalation` | Agent or pipeline escalated to a human (Lab 04) |
| `risk:high` | Touches `infra/`, `src/auth/`, or `.github/` |

✅ **Done when:** CI is green, Copilot is assignable, and the labels exist.
