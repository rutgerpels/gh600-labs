# Lab 03 — Separate planning from execution with custom instructions and custom agents

| | |
| --- | --- |
| **Read first** | M2 — units 3 (decomposing work), 4 (plan, reason, execute), 7 (operations controls) |
| **Exam skills** | Separate planning from execution (D1) · configure agent behavior with instructions and custom agents (D2) · least-privilege tool access (D2) · tune based on evaluation results (D4) |
| **You will** | Fix Lab 02's Plan Gate failure with repository instructions, create a read-mostly **planner** agent and an **implementer** agent, and enforce the plan/implementation split in CI |

## About this lab

### What we'll discuss

Module 2 units 3–4 separate an agent's work into **planning** (decide what to do), **reasoning** (justify it), and **execution** (change things). When one agent does all three in a single pass, a bad plan is only discovered after the code exists. Splitting them gives a cheap human checkpoint *before* any code is written.

We'll put that into practice with GitHub's two customization mechanisms:

- **Custom instructions** shape *how* every agent session behaves in this repo (PR format, scope rules, when to stop and escalate).
- **Custom agents** create specialized roles with their **own tool allowlists**: a planner that can't run code, and an implementer that can.

Then we close the loop with **enforcement**: a CI check proves the planner stayed in its lane. Along the way we run the Domain 4 cycle of **evaluate → find root cause → tune**: Lab 02's Plan Gate failure becomes an instruction fix rather than a manual correction.

### What you'll learn

- When to use repository instructions, path-specific instructions, and custom agents
- How the `tools` list implements least privilege for an agent role
- How to run a plan-first workflow: plan PR → human review → implementation PR
- Why a prompt saying "only edit `plans/`" isn't a control, and how to make it one
- How to tune agent behavior from evaluation results instead of patching outputs by hand

### Where this lands in the exam

| Domain (weight) | Study guide objective | Skill bullet |
| --- | --- | --- |
| Prepare agent architecture and SDLC processes (15–20%) | Define boundaries between planning, reasoning, and action | *Configure agent planning to be distinct from agent execution* · *Configure an agent to output a structured plan* · *Validate agent plans* · *Prevent agent action until the agent checked and approved* |
| Implement tool use and environment interaction (20–25%) | Select and configure agent tools | *Identify required tools* · *Configure agent tools* · *Configure agent tool permissions* |
| Implement tool use and environment interaction (20–25%) | Operate agents with safe execution paths and robust error handling | *Implement escalation paths* |
| Perform evaluation, error analysis, and tuning (15–20%) | Analyze agent failures and identify root causes | *Classify root causes, including reasoning errors, tool misuse, and context or environment issues* |
| Perform evaluation, error analysis, and tuning (15–20%) | Tune agent behavior based on evaluation results | *Revise instructions, workflows, or constraints* · *Refine tool usage and tool access* |
| Manage memory, state, and execution (10–15%) | Persist agent state and manage context drift | *Capture task progress and decisions as durable artifacts* (the plan file) · *Resume agent work without repeating steps or diverging from prior decisions* |

📘 Source: [GH-600 study guide — Skills measured](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600#skills-measured)

> The memory/state row is a Part 2 domain; this lab gives you a first taste because the approved plan file is exactly the kind of durable artifact that domain is about.

## Part A — Repository custom instructions (the *tune* step)

Lab 02's agent PR probably failed **Plan Gate**. Evaluate → tune: instead of fixing each PR by hand, change the agent's standing instructions.

1. Create a branch-and-PR (rules are active now): **Add file → Create new file** → `.github/copilot-instructions.md` → **Commit changes… → Create a new branch** `lab03-instructions`:

   ```markdown
   # Copilot instructions for gh600-labs

   ## Pull request descriptions
   Always use the structure in `.github/pull_request_template.md`. The description MUST contain
   `## Plan` with `**Goal:**`, `**Approach:**`, `**Success criteria:**` and `**Rollback:**` lines.
   A required check (Plan Gate) fails otherwise.

   ## Scope
   - Do not modify `infra/`, `src/auth/` or `.github/workflows/` unless the issue explicitly asks for it.
   - Do not add dependencies.
   - Keep changes to the smallest set of files that meets the success criteria.

   ## Validation
   - Run `npm test` before finishing. Add or update tests in `test/` for behavior changes.

   ## Escalation
   - If the same check fails twice after your fixes, stop. Summarize what you tried and what failed
     in the PR description under `## Needs human input`, and do not attempt further changes.
   ```

2. Create the PR, fill in the template, and merge it (bypass, as in Lab 02).
3. Back on the **Lab 02 agent PR**, comment: `@copilot Update the PR description to follow the repository instructions.` Plan Gate should go green after the description changes (the `edited` trigger re-runs it).

> **Exam lens:** `.github/copilot-instructions.md` applies repository-wide. Path-specific instructions go in `.github/instructions/<name>.instructions.md` with an `applyTo:` glob in front matter. Instructions are *guidance*: the agent usually follows them, but only checks and rules *guarantee* the outcome.

## Part B — Custom agents: planner and implementer

Custom agents are Markdown files in `.github/agents/` with YAML front matter. The **`tools`** list is a least-privilege allowlist.

1. Branch `lab03-agents`, file `.github/agents/planner.agent.md`:

   ```markdown
   ---
   name: planner
   description: Produces an implementation plan for an issue. Never changes source code.
   tools: ["read", "search", "edit"]
   ---

   You are a planning agent. Your only output is a plan file.

   1. Read the issue and the relevant code. Do not run commands.
   2. Write exactly one file: `plans/<issue-number>-<short-slug>.md` containing:
      - Goal, Inputs, Expected outputs
      - Numbered implementation steps, each naming the files it touches
      - Success criteria (verifiable, mapped to tests)
      - Risks, and which steps touch high-risk paths (`infra/`, `src/auth/`, `.github/`)
      - Rollback approach
   3. Do NOT create or edit any other file. If you think code changes are needed, describe them in the plan.
   4. In the PR description, follow the repository PR template.
   ```

2. Same branch, file `.github/agents/implementer.agent.md`:

   ```markdown
   ---
   name: implementer
   description: Implements an approved plan from the plans/ directory, with tests.
   tools: ["read", "search", "edit", "execute"]
   ---

   You are an implementation agent.

   1. Find the approved plan in `plans/` referenced by the issue. If there is none, stop and say so in the PR description.
   2. Implement only the steps in the plan. Do not expand scope. If the plan is wrong, stop and explain under `## Needs human input`.
   3. Run `npm test`. Add tests that prove each success criterion.
   4. In the PR description, follow the repository PR template and link the plan file.
   ```

3. Create the PR and merge it. Agents are read from the **default branch**.

| Agent | `read` | `search` | `edit` | `execute` | Why |
| --- | --- | --- | --- | --- | --- |
| planner | ✅ | ✅ | ✅ (to write the plan file) | ❌ | Can't run code or tests; writes only a plan |
| implementer | ✅ | ✅ | ✅ | ✅ | Needs to run `npm test` |

> **Tool list semantics:** omit `tools` or use `["*"]` = all tools. `tools: []` = no tools. MCP tools are referenced as `server-name/tool-name` (Lab 05).

## Part C — Enforce "a plan PR contains only a plan"

The planner prompt *says* "only `plans/`", but a prompt is not a control. Add a check.

1. Branch `lab03-plan-scope`, file `.github/workflows/plan-scope.yml`:

   ```yaml
   name: Plan Scope

   on:
     pull_request:
       types: [opened, synchronize, reopened]

   permissions:
     contents: read
     pull-requests: read

   jobs:
     plan-scope:
       runs-on: ubuntu-latest
       steps:
         - name: Plan PRs may only touch plans/
           env:
             GH_TOKEN: ${{ github.token }}
             PR: ${{ github.event.pull_request.number }}
           run: |
             files=$(gh pr view "$PR" --repo "$GITHUB_REPOSITORY" --json files --jq '.files[].path')
             echo "$files"
             if grep -q '^plans/' <<< "$files"; then
               outside=$(grep -v '^plans/' <<< "$files" || true)
               if [ -n "$outside" ]; then
                 echo "::error::A PR that adds a plan must not change other files:"
                 echo "$outside"
                 exit 1
               fi
             fi
   ```

2. Create the PR and merge it. Then **Settings → Rules → Rulesets → main-protection** → add `plan-scope` to required status checks.

## Part D — Plan first, then execute

1. Create an issue: `Add PATCH /tasks/:id to update a task's status`. Use the Lab 01 structure (context, inputs, expected output: 200 with the updated task, 400 for invalid status, 404 for unknown id; success criteria with tests; boundaries).
2. **Assign to Copilot**. In the assignment dialog, choose the custom agent **planner** (agents can also be selected from the prompt box at https://github.com/copilot/agents).
3. Review the plan PR:
   - Only `plans/…md` changed? **Plan Scope** passes.
   - Are the steps, success criteria, and risks good? This is the human checkpoint *before* any code is written. Request changes with `@copilot …` if not.
4. Merge the plan PR.
5. Comment on the issue, or start a new task from the Agents page, choosing the **implementer** agent: `Implement plans/<file>.md for this issue.`
6. Review the implementation PR against the plan. Merge.

| | Option A — plan first (what you did) | Option B — plan inside the implementation PR |
| --- | --- | --- |
| Human checkpoint | Before any code | After code exists |
| Cost of a bad plan | One cheap plan PR | Whole implementation thrown away |
| Best for | High-risk or ambiguous work | Small, well-specified, low-risk work |

## Part E — Reflect (Domain 4: evaluate → tune)

Answer in your notebook:

1. Which failure from Lab 02 did you fix with **instructions**, and which with **enforcement**?
2. If the planner had edited `src/`, which control would have caught it? (Plan Scope, which is a required check.)
3. What evidence did you use to evaluate the agents: session log, check results, diff?

## Exam lens — self-check

<details><summary>1. You want an agent that analyzes the codebase and proposes changes but can never run commands. How?</summary>

A custom agent with a restricted `tools` list (e.g. `["read", "search"]`, plus `edit` only if it must write a plan file), without `execute`. Back it with CI checks if file-scope matters.
</details>

<details><summary>2. Where do repository-wide vs. path-specific instructions live?</summary>

Repository-wide: `.github/copilot-instructions.md`. Path-specific: `.github/instructions/*.instructions.md` with an `applyTo` glob.
</details>

<details><summary>3. Where do custom agent profiles live, and which version is used?</summary>

`.github/agents/*.agent.md` (repository level; org/enterprise agents live in a `.github-private` repo). Repo-level definitions win over org, which wins over enterprise, for the same name. The version on the branch the agent runs from is used and is identified by commit SHA.
</details>

<details><summary>4. What does <code>tools: []</code> mean in a custom agent profile? What about omitting <code>tools</code>?</summary>

`[]` disables all tools. Omitting it (or `["*"]`) enables all available tools.
</details>

<details><summary>5. A Learn example shows <code>applyTo:</code> in a custom agent file. Is that valid?</summary>

Not per GitHub's custom-agent configuration reference. `applyTo` belongs to path-specific `.instructions.md` files. Know both; the docs reference is the source of truth.
</details>
