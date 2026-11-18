# Lab 06 — Execution context and guardrails: scope, setup steps, firewall, hooks, secrets

| | |
| --- | --- |
| **Read first** | M3 — unit 4 (execution context), unit 5 · M2 unit 7 |
| **Exam skills** | Configure the agent's execution environment (D2) · restrict network access (D2, D6) · enforce tool-level guardrails (D6) · scope agents to branches and repositories (D2) · manage secrets (D2) |
| **You will** | Pre-configure the agent's environment, test the firewall, block risky tool calls with a **hook** that runs *before* each tool call, and scope a task to a release branch |

## About this lab

### What we'll discuss

Where an agent runs matters as much as what it's told. Copilot cloud agent runs in an **ephemeral GitHub Actions environment** with its own branch, token, network rules and secrets. Module 3 units 4–5 call this the **execution context**, and treat shaping it as one of the strongest guardrails you have, because it doesn't depend on the model following instructions.

We'll work through the layers of that context, from "helpful" to "hard stop":

- **Validation tools**: built-in scanning (CodeQL, secret scanning, Advisory DB, code review) that gives the agent evaluation signals while it works.
- **Setup steps**: a deterministic, pre-built environment, so the agent doesn't improvise installs.
- **Firewall**: an outbound network allowlist that limits where data can go.
- **Hooks**: your own code that runs *before every tool call* and can **deny** it. This is a deterministic block that prompt injection can't talk its way past.
- **Branch scope and secrets**: what the agent can target and what credentials it can see.

### What you'll learn

- How to evaluate and shape an agent's execution context
- How `copilot-setup-steps.yml` works, and which keys are honored
- What the firewall does and doesn't cover (a frequent exam trap)
- How to write a `preToolUse` hook that blocks high-risk actions, and why that beats an instruction
- How to scope an agent task to a release branch
- Why Agents secrets are separate from Actions secrets

### Where this lands in the exam

| Domain (weight) | Study guide objective | Skill bullet |
| --- | --- | --- |
| Implement tool use and environment interaction (20–25%) | Integrate agents within development environments | *Evaluate the execution context for an agent* · *Configure an agent's scope to a specific repository* · *Configure an agent to use branch-based scope* · *Configure an agent to handle environment-specific constraints* |
| Implement tool use and environment interaction (20–25%) | Select and configure agent tools | *Configure agent tool permissions* |
| Implement guardrails and accountability (10–15%) | Implement guardrails and human-in-the-loop workflows | *Block actions that violate defined security, compliance, or Responsible AI policies* · *Scope permissions and execution contexts to enforce least-privilege access* · *Require explicit authorization or controlled paths for irreversible or compliance-sensitive changes* |
| Perform evaluation, error analysis, and tuning (15–20%) | Define success criteria and evaluation signals | *Generate evaluation signals by using automated scanning tools* |
| Perform evaluation, error analysis, and tuning (15–20%) | Analyze agent failures and identify root causes | *Classify root causes, including … context or environment issues* |

📘 Source: [GH-600 study guide — Skills measured](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600#skills-measured) · Docs linked from the study guide: [Build guardrails for cloud agent](https://docs.github.com/copilot/tutorials/cloud-agent/build-guardrails) and [Risks and mitigations](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations)

## Part A — Validation tools and workflow approval

**Settings → Copilot → Cloud agent**

Review the settings. Leave the defaults on and write down what each one does:

| Setting | What it does |
| --- | --- |
| CodeQL | Agent runs code scanning on its changes and tries to fix findings |
| Secret scanning | Blocks agent changes that introduce secrets |
| Dependency (Advisory DB) checks | Flags newly added vulnerable dependencies |
| Copilot code review | Agent gets a "second opinion" review and addresses it |
| Workflow approval | Actions wait for **Approve and run workflows** on agent PRs (Lab 01) |

These validation checks run **inside the session** and don't need GitHub Advanced Security licenses for that use.

## Part B — `copilot-setup-steps.yml`: deterministic environment setup

The agent runs in an ephemeral GitHub Actions environment. Instead of letting it guess how to install tools (slow and non-deterministic), pre-install them.

Branch `lab06-setup`, file `.github/workflows/copilot-setup-steps.yml`:

```yaml
name: Copilot Setup Steps

on:
  workflow_dispatch:
  push:
    paths: [.github/workflows/copilot-setup-steps.yml]
  pull_request:
    paths: [.github/workflows/copilot-setup-steps.yml]

jobs:
  # The job MUST be named copilot-setup-steps or Copilot ignores it.
  copilot-setup-steps:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Verify toolchain
        run: |
          node --version
          jq --version
          npm test
```

Merge via PR. Then **Actions → Copilot Setup Steps → Run workflow** to test it like any workflow.

Facts to remember:

- It only takes effect from the **default branch**.
- Only `steps`, `permissions`, `runs-on`, `services`, `snapshot`, and `timeout-minutes` (max **59**) are honored; other job keys are ignored.
- Setup steps run **before** the firewall is enabled, so you can install from anywhere. The agent session runs **after**.
- `runs-on` can point to larger runners or self-hosted ARC runners. The firewall doesn't apply to self-hosted runners, so you control network there yourself.

## Part C — Firewall (Internet access)

**Settings → Copilot → Cloud agent → Internet access** (label may vary)

- ✅ The firewall is **on** with the **recommended allowlist** (package registries, GitHub, OS packages, and similar).
- You can add **custom allowlist** entries (domains or URLs).

Test it:

1. Create an issue: `Diagnostics: run "curl -sI https://example.com" and report the HTTP status line in the PR description. Do not change any files other than a new docs/diagnostics.md with the output.`
2. Assign to Copilot. When finished, look at the PR description: a **warning that the firewall blocked** a request to `example.com`.
3. Close the PR without merging.

> The firewall applies to processes started by the agent's **Bash tool** and to the built-in Playwright server. It does **not** apply to other MCP servers or to setup steps. Exam questions test this boundary.

## Part D — Hooks: deterministic guardrails before each tool call

Instructions are *suggestions*. A `preToolUse` **hook** is *code* that runs before every tool call and can **deny** it.

1. Branch `lab06-hooks`. Create `scripts/hooks/pre-tool-guard.sh`:

   ```bash
   #!/usr/bin/env bash
   # preToolUse hook: receives JSON on stdin, prints exactly one JSON decision.
   set -euo pipefail

   input=$(cat)
   tool=$(jq -r '.toolName // ""' <<< "$input")
   args=$(jq -r '.toolArgs // ""' <<< "$input")

   deny() {
     jq -cn --arg r "$1" '{permissionDecision: "deny", permissionDecisionReason: $r}'
     exit 0
   }

   # Read-only tools may look at anything.
   case "$tool" in
     view|read|search|grep|glob) ;;
     *)
       if grep -q 'infra/' <<< "$args"; then
         deny "Changes touching infra/ are high-risk and require a human. Escalate instead."
       fi
       ;;
   esac

   if [ "$tool" = "bash" ] && grep -Eq 'rm -rf|terraform apply|az deployment' <<< "$args"; then
     deny "Destructive or deployment command blocked by repository policy."
   fi

   echo '{"permissionDecision": "allow"}'
   ```

2. Same branch, file `.github/hooks/guardrails.json`:

   ```json
   {
     "version": 1,
     "hooks": {
       "preToolUse": [
         {
           "type": "command",
           "bash": "bash scripts/hooks/pre-tool-guard.sh",
           "timeoutSec": 15
         }
       ]
     }
   }
   ```

   > The portal can't set the executable bit (`chmod +x`), so the hook calls `bash <script>` explicitly.

3. Merge via PR. Hooks load from the **default branch**.
4. Test: create an issue `Infra: change the App Service plan SKU in infra/main.bicep from B1 to P1v3`. Assign to Copilot.
5. In the **session log**, find the denied tool call and the reason. Observe how the agent reacts: it should explain that it could not make the change. Close the PR.

Facts to remember:

| Fact | Detail |
| --- | --- |
| Location | `.github/hooks/*.json` on the default branch |
| Cloud agent runs Linux | Use the `bash` (or `command`) field; `powershell` entries are ignored there |
| Working directory | The repository checkout |
| Output | Exactly one JSON object; `permissionDecision`: `allow`, `deny` (or `ask` in interactive clients) |
| Timeout | Default 30 s; set `timeoutSec` |
| Durable audit | The environment is ephemeral; send audit events to an external endpoint with an `http` hook if you need them kept |
| Other hook events | e.g. `sessionStart`, `userPromptSubmitted`, `postToolUse`, `errorOccurred`, `sessionEnd` |

> **Learn vs docs:** the Learn module shows an illustrative hook format (e.g. `trigger: pre-tool-use`). The GitHub docs format above (`version`, `hooks.preToolUse[]`) is what actually runs. For the exam, know the *concept*: pre-tool hooks can deny actions deterministically.

## Part E — Branch-scoped execution

1. **Code → Branches → New branch** `release/1.x` from `main`.
2. Go to **https://github.com/copilot/agents**, pick the repository and set the **base branch** to `release/1.x`. Prompt: `Update docs/api.md to state that this is the 1.x release line.`
3. The PR targets `release/1.x`, not `main`. The agent still pushes only to its own `copilot/…` branch.
4. Optional: add a ruleset targeting `release/**` that requires `test`.

## Part F — Secrets: Agents vs Actions (read-only)

**Settings → Secrets and variables**: compare **Actions** and **Agents**.

- Agent sessions **don't** get Actions secrets.
- Secrets for the agent's environment or MCP servers go under **Agents**. For MCP config they must be prefixed `COPILOT_MCP_`.
- Agent session logs and PRs are visible to repo readers, so never ask the agent to print secrets.

## Exam lens — self-check

<details><summary>1. The agent wastes 5 minutes per session installing a CLI. Fix?</summary>

Install it in `.github/workflows/copilot-setup-steps.yml` (job `copilot-setup-steps`) on the default branch.
</details>

<details><summary>2. You must guarantee an agent never runs <code>terraform apply</code>, even if instructions are ignored or a prompt injection asks for it. What do you use?</summary>

A `preToolUse` hook that denies the command (plus least-privilege tools/credentials). Instructions alone aren't a guarantee.
</details>

<details><summary>3. An agent needs to call an internal API at <code>api.contoso.internal</code> from a test script. It gets blocked. Fix?</summary>

Add the domain to the cloud agent firewall's custom allowlist (repo or org setting), or use self-hosted runners with network you control.
</details>

<details><summary>4. Does the agent firewall restrict a remote MCP server's own outbound calls?</summary>

No. It applies to Bash-tool processes and built-in Playwright, not to other MCP servers.
</details>

<details><summary>5. Why can't the agent read your Actions secret <code>PROD_DB_PASSWORD</code>?</summary>

Agent sessions use a separate **Agents** secrets store. Actions secrets aren't exposed to the agent, which limits blast radius.
</details>
