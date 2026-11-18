# Lab 02 — PR governance: template, Plan Gate, CODEOWNERS, rulesets

| | |
| --- | --- |
| **Read first** | M2 *Planning and Managing Agentic Workflows* — unit 5 (governing agent changes through PRs) · M1 unit 4 |
| **Exam skills** | Enforce agent behavior through repository controls (D1) · require human review and approvals (D6) · map risk to required controls (D6) |
| **You will** | Turn the repository into a *governed* system where every change, human or agent, must show a plan, pass checks, and get the right owner's review |

> **Why it matters:** instructions *ask* an agent to behave. Rulesets, required checks, and CODEOWNERS *enforce* behavior. Exam scenarios often hinge on that distinction.

## About this lab

### What we'll discuss

Lab 01 showed that an agent behaves like a contributor. This lab makes the repository **treat** it like one. Module 2 unit 5 argues that the pull request is the natural control point for agent work: it's where intent (the plan), evidence (checks) and ownership (reviewers) come together. So we'll build that control point in layers:

1. A **PR template** that defines what a "complete" change description looks like.
2. A **Plan Gate** check that *verifies* the description instead of hoping for it.
3. **CODEOWNERS** to route high-risk paths to the right reviewer.
4. A **ruleset** that turns all of the above from suggestions into requirements.

The central idea, and a recurring exam theme, is **guidance vs. enforcement**: an instruction asks an agent to do something; a required check or ruleset guarantees it. We'll also feel the cost of controls (a solo maintainer can't approve their own agent's PR) and discuss how to keep governance from slowing delivery.

### What you'll learn

- How to make a structured plan a *verifiable* part of every PR
- How to write a workflow that safely reads untrusted PR text (script-injection mitigation)
- The difference between CODEOWNERS *requesting* review and a ruleset *requiring* it
- How rulesets, required checks and audited bypasses combine into a governance layer for humans and agents alike
- Why an agent PR failing a check is a useful **evaluation signal** (fixed in Lab 03)

### Where this lands in the exam

| Domain (weight) | Study guide objective | Skill bullet |
| --- | --- | --- |
| Prepare agent architecture and SDLC processes (15–20%) | Define boundaries between planning, reasoning, and action | *Configure an agent to output a structured plan* · *Validate agent plans* · *Prevent agent action until the agent checked and approved* |
| Prepare agent architecture and SDLC processes (15–20%) | Configure observability and control for autonomous agents | *Plan and implement the degree of agent autonomy, including guardrails* · *Configure human intervention for autonomous agents without slowing delivery* |
| Implement guardrails and accountability (10–15%) | Implement guardrails and human-in-the-loop workflows | *Identify the subset of actions that require human judgment* · *Require explicit authorization or controlled paths for irreversible or compliance-sensitive changes* · *Preserve execution velocity by minimizing approvals that do not materially reduce risk* |
| Implement guardrails and accountability (10–15%) | Define autonomy levels | *Classify agent actions by operational, security, and compliance risk to right-size human interventions* |

📘 Source: [GH-600 study guide — Skills measured](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600#skills-measured)

## Part A — PR template (the plan contract)

1. **Add file → Create new file** → `.github/pull_request_template.md`:

   ```markdown
   ## Plan
   **Goal:** <!-- one sentence -->
   **Approach:** <!-- steps you will take -->
   **Success criteria:** <!-- how a reviewer verifies it -->
   **Rollback:** <!-- how to undo it -->

   ## Evidence
   - [ ] Tests added or updated
   - [ ] CI green
   - [ ] Session log / run link: <!-- link -->

   ## Review checklist
   - [ ] Scope matches the linked issue
   - [ ] No changes to high-risk paths (`infra/`, `src/auth/`, `.github/`) unless the issue asks for them
   ```

2. Commit **directly to `main`** (rules are not active yet).

## Part B — Plan Gate: a required check that validates the PR description

1. Create `.github/workflows/plan-gate.yml`:

   ```yaml
   name: Plan Gate

   on:
     pull_request:
       types: [opened, edited, synchronize, reopened]

   permissions:
     contents: read

   jobs:
     require-plan:
       if: github.event_name == 'pull_request'
       runs-on: ubuntu-latest
       steps:
         - name: Check PR description contains a plan
           env:
             # Pass untrusted input through env, never inline ${{ }} in run: (script injection).
             PR_BODY: ${{ github.event.pull_request.body }}
           run: |
             missing=0
             for marker in "## Plan" "**Goal:**" "**Success criteria:**" "**Rollback:**"; do
               if ! grep -qF -- "$marker" <<< "$PR_BODY"; then
                 echo "::error::PR description is missing '$marker'"
                 missing=1
               fi
             done
             exit $missing
   ```

2. Commit to `main`.

> **Exam lens:** `PR_BODY` is attacker- or agent-controlled text. Putting `${{ github.event.pull_request.body }}` directly inside `run:` allows shell injection. Passing it through `env:` is the documented mitigation.

## Part C — CODEOWNERS (who must review what)

1. Create `.github/CODEOWNERS`:

   ```text
   # In an org you would use teams, for example @org/security or @org/platform.
   *                @rutgerpels
   /src/auth/       @rutgerpels
   /infra/          @rutgerpels
   /.github/        @rutgerpels
   ```

2. Commit to `main`. Open `src/auth/token.js` and hover the shield icon; it shows the owner.

> CODEOWNERS on its own only *requests* reviews. It becomes **enforced** only when a ruleset or branch protection requires a Code Owner review.

## Part D — Produce check runs so they can be required

A status check can only be selected in a ruleset after it has run at least once.

1. Edit `docs/api.md` (add a blank line) → **Create a new branch** `lab02-seed` → **Propose changes** → **Create pull request**. The template is pre-filled; fill in Goal, Success criteria, and Rollback.
2. Wait for **CI / test** and **Plan Gate / require-plan** to finish. Then edit the PR description to remove the `**Rollback:**` line and watch Plan Gate re-run and **fail** (`edited` trigger). Restore it.
3. Keep the PR open for Part F.

## Part E — Ruleset `main-protection`

**Settings → Rules → Rulesets → New ruleset → New branch ruleset**

| Setting | Value |
| --- | --- |
| Name | `main-protection` |
| Enforcement status | **Active** |
| Bypass list | **Repository admin** → mode **For pull requests only** |
| Target branches | **Include default branch** |
| Restrict deletions | ✅ |
| Block force pushes | ✅ |
| Require a pull request before merging | ✅ Required approvals: **1** · ✅ Dismiss stale approvals when new commits are pushed · ✅ Require review from Code Owners |
| Require status checks to pass | ✅ Add `test` and `require-plan` |

Click **Create**.

> **Why the bypass?** You are the only person in this repo. A rule says the person who requested a Copilot PR **cannot approve it**, and you can't approve your own PR either. "For pull requests only" bypass means you can still merge, **but only through a PR, with a recorded bypass**, never by pushing directly. In a real team you would remove the bypass and rely on a second reviewer.

## Part F — Feel the rules

1. Try **Add file → Create new file** on `main`: the editor forces you to create a branch.
2. On the `lab02-seed` PR, see that merging is **blocked** until requirements are met. Use the **Merge without waiting for requirements to be met (bypass rules)** checkbox → merge.
3. Go to **Settings → Rules → Insights** and find the bypass entry. That is your audit trail.

## Part G — An agent meets the governance

1. Create an issue: `Docs: document the /health endpoint response example in docs/api.md`, with success criteria and boundaries as in Lab 01. Assign it to **Copilot**.
2. When the PR is ready, approve workflows. Observe:
   - Does **Plan Gate** pass? Copilot writes its *own* PR description and may not follow your template. **A failure here is the expected outcome.** Lab 03 fixes it with custom instructions, which is the *tune* step of the evaluate → tune loop.
   - Code Owner review is requested automatically.
3. Leave the PR open. You will reuse it in Lab 03.

## Exam lens — self-check

<details><summary>1. An agent keeps opening PRs that skip tests. Instructions already say "always add tests". What is the most reliable fix?</summary>

Enforce it: add a required status check (e.g. coverage or a test-change check) in a ruleset. Instructions are guidance; rulesets and required checks are enforcement.
</details>

<details><summary>2. You added CODEOWNERS for /infra/, but an agent PR changing infra/ was merged without platform-team review. Why?</summary>

CODEOWNERS only requests reviews. You also need "Require review from Code Owners" in a ruleset or branch protection targeting the branch.
</details>

<details><summary>3. Why can't the developer who assigned the issue to Copilot approve the resulting PR?</summary>

That would let one person both author (by delegation) and approve, which defeats the required-approval control. Another person with write access must approve.
</details>

<details><summary>4. What's wrong with <code>run: echo "${{ github.event.pull_request.body }}"</code>?</summary>

Script injection: the PR body is untrusted input that's expanded into the shell script before execution. Pass it via `env:` and reference `$PR_BODY`.
</details>

<details><summary>5. Which ruleset bypass setting lets an admin merge but still requires a PR?</summary>

Bypass mode **For pull requests only**. The admin can't push directly; bypasses happen on PRs and are recorded in rule insights.
</details>
