# Lab 04 — Reliable workflows: outputs, gating, artifacts, approvals, retry/escalate/rollback

| | |
| --- | --- |
| **Read first** | M2 — unit 6 (building reliable agent workflows), unit 7 (operations controls) |
| **Exam skills** | Pass structured outputs between steps (D1) · gate execution on results (D1) · persist evidence as artifacts (D4) · approval gates for high-risk actions (D6) · retry, escalate, roll back (D1, D6) · least-privilege `GITHUB_TOKEN` (D2) |
| **You will** | Build a multi-stage *agent-style* release pipeline in GitHub Actions. It produces a plan, validates it with bounded retries, escalates failures to a human, and waits for approval before "deploying" |

No Copilot session is needed in this lab; it works on any plan.

## Part A — Create the `production` environment

**Settings → Environments → New environment** → `production`

- ✅ **Required reviewers** → add yourself
- ✅ **Prevent self-review**: leave **unchecked** (you are the only user; in a team you'd check it)
- **Deployment branches and tags** → **Selected branches and tags** → add `main`

## Part B — The workflow

Create it through a branch and PR (rules apply). Branch `lab04-release`, file `.github/workflows/agent-release.yml`:

```yaml
name: Agent Release

on:
  workflow_dispatch:
    inputs:
      ref:
        description: "Commit SHA or tag to release (an explicit ref makes rollback a re-run)"
        required: true
        default: main
      simulate_failure:
        description: "Make validation fail to test escalation"
        type: boolean
        default: false

# Least privilege: read-only by default; jobs opt in to more.
permissions:
  contents: read

concurrency:
  group: agent-release
  cancel-in-progress: false

jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      sha: ${{ steps.resolve.outputs.sha }}
      summary: ${{ steps.resolve.outputs.summary }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.ref }}
          fetch-depth: 0
      - id: resolve
        name: Resolve the exact commit and build a release plan
        run: |
          sha=$(git rev-parse HEAD)
          summary="Release $sha ($(git log -1 --pretty=%s))"
          echo "sha=$sha" >> "$GITHUB_OUTPUT"
          echo "summary=$summary" >> "$GITHUB_OUTPUT"
          mkdir -p evidence
          {
            echo "# Release plan"
            echo "- Requested ref: ${{ inputs.ref }}"
            echo "- Resolved SHA: $sha"
            echo "- Changes since previous tag:"
            git log --oneline -n 10
          } > evidence/plan.md
          cat evidence/plan.md >> "$GITHUB_STEP_SUMMARY"
      - uses: actions/upload-artifact@v4
        with:
          name: release-plan-${{ github.run_id }}
          path: evidence/

  validate:
    needs: plan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ needs.plan.outputs.sha }}
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run tests with a bounded retry (max 2 attempts)
        env:
          SIMULATE_FAILURE: ${{ inputs.simulate_failure }}
        run: |
          mkdir -p evidence
          for attempt in 1 2; do
            echo "Attempt $attempt" | tee -a evidence/validate.log
            if [ "$SIMULATE_FAILURE" != "true" ] && npm test >> evidence/validate.log 2>&1; then
              echo "Validation passed" | tee -a evidence/validate.log
              exit 0
            fi
            echo "Attempt $attempt failed" | tee -a evidence/validate.log
            sleep 5
          done
          echo "::error::Validation failed after 2 attempts"
          exit 1
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: validation-evidence-${{ github.run_id }}
          path: evidence/

  escalate:
    needs: [plan, validate]
    if: failure()
    runs-on: ubuntu-latest
    permissions:
      issues: write
    steps:
      - name: Open an escalation issue for a human
        env:
          GH_TOKEN: ${{ github.token }}
          SHA: ${{ needs.plan.outputs.sha }}
          RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: |
          gh issue create --repo "$GITHUB_REPOSITORY" \
            --title "Release validation failed for ${SHA:0:7}" \
            --label escalation \
            --body "Validation failed after bounded retries.

          - SHA: \`$SHA\`
          - Run and evidence artifacts: $RUN_URL

          A human must decide: fix forward, or re-run **Agent Release** with the previous good SHA (rollback)."

  deploy:
    needs: [plan, validate]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy (simulated)
        run: |
          echo "Deploying ${{ needs.plan.outputs.summary }}"
          echo "### Deployed \`${{ needs.plan.outputs.sha }}\`" >> "$GITHUB_STEP_SUMMARY"
```

Create the PR, fill in the template, wait for checks, and merge it (bypass).

> `workflow_dispatch` workflows show the **Run workflow** button only after the file is on the default branch.

## Part C — Happy path with an approval gate

1. **Actions → Agent Release → Run workflow** (ref `main`, simulate_failure unchecked).
2. Watch the graph: `plan` → `validate` → `deploy` **waits** (yellow, "Waiting for review"). `escalate` is skipped.
3. Open the run summary: the release plan and the **artifacts** (`release-plan-…`, `validation-evidence-…`).
4. Click **Review deployments → production → Approve and deploy**.
5. Copy the deployed SHA from the summary. This is your *last known good* SHA.

## Part D — Failure path: retry → escalate

1. Run again with **simulate_failure ✅**.
2. Observe: `validate` logs two attempts, then fails. `deploy` is **skipped** (gated on success), and `escalate` **runs**.
3. Open **Issues**: an `escalation` issue with the SHA and a run link. Download the `validation-evidence` artifact; it was uploaded even on failure because of `if: always()`.

## Part E — Rollback = re-run a known-good ref

1. **Run workflow** with `ref` = the SHA from Part C.
2. Approve the deployment. Because the pipeline always deploys an **explicit, resolved SHA**, rollback is just a re-run. No hand-crafted revert is needed in the pipeline.
3. Close the escalation issue with a comment linking the rollback run.

## Part F — Map controls to risk (M2 unit 6)

| Risk tier | Example in this repo | Autonomy | Controls you've now seen |
| --- | --- | --- | --- |
| Low | `docs/` | Agent can merge after checks (with auto-merge) | Required checks |
| Medium | `src/`, `test/` | Agent proposes; human reviews | PR + checks + 1 approval |
| High | `src/auth/`, `infra/`, `.github/` | Agent proposes; owner reviews | + CODEOWNERS required review, hooks (Lab 06) |
| Critical | `production` | Agent prepares; human approves the action | Environment required reviewers, artifacts, escalation, rollback |

## Exam lens — self-check

<details><summary>1. How do you pass a value from one job to a later job?</summary>

Write `name=value` to `$GITHUB_OUTPUT` in a step with an `id`, expose it under `jobs.<job>.outputs`, declare `needs: <job>` in the consumer, and read `needs.<job>.outputs.<name>`.
</details>

<details><summary>2. An agent pipeline deploys to production. Leadership wants a human to sign off on each deploy without blocking validation. What do you use?</summary>

An environment (`production`) with **required reviewers**, referenced by the deploy job with `environment: production`. Validation still runs automatically; deploy waits.
</details>

<details><summary>3. Validation is flaky. Should the agent retry until it passes?</summary>

No. Use a **bounded** retry (e.g. max 2–3 attempts), then **escalate** to a human with evidence. Unbounded retries waste resources and hide real failures.
</details>

<details><summary>4. What's the point of uploading artifacts with <code>if: always()</code>?</summary>

Evidence for evaluation and audit is kept even when the job fails, which is exactly when you need it most.
</details>

<details><summary>5. Why does the workflow declare <code>permissions: contents: read</code> at top level and <code>issues: write</code> only on <code>escalate</code>?</summary>

Least privilege. Each job gets the minimal `GITHUB_TOKEN` scope it needs, which limits the blast radius if a step is compromised or misbehaves.
</details>
