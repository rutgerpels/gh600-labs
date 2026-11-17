# Lab 01 — Plan → Act → Evaluate and the contributor model

| | |
| --- | --- |
| **Read first** | M1 *Foundations of Agentic AI in GitHub* — units 2–6 |
| **Exam skills** | Define inputs, outputs and success criteria (D1) · identify anti-patterns (D1) · enable autonomous branch/PR creation (D2) · traceability and accountability (D2) · use logs and artifacts to evaluate (D4) |
| **You will** | Assign a well-specified issue to Copilot cloud agent, watch the plan → act → evaluate loop, review the PR with the contributor rubric, and trace every agent action back to a person and a session |

## Part A — Write a well-specified agent task

An agent task needs explicit **inputs**, **outputs**, **success criteria**, and **boundaries**. A vague task is a known anti-pattern because it produces scope creep and unverifiable results.

1. Go to **Issues → New issue**.
2. Title: `Fix: GET /tasks ignores the status query filter`
3. Body:

   ```markdown
   ## Context
   `GET /tasks?status=done` returns every task. `store.list(status)` in `src/tasks.js` ignores its argument.

   ## Inputs
   - `src/tasks.js` (`list`), `src/server.js` (`GET /tasks`)
   - Valid statuses: `VALID_STATUSES` in `src/tasks.js`

   ## Expected output
   - `list()` without an argument returns all tasks (unchanged behavior)
   - `list('done')` returns only tasks with status `done`
   - `GET /tasks?status=<invalid>` returns HTTP 400 with `{ "error": "invalid status: <value>" }`

   ## Success criteria (verifiable)
   - [ ] New unit tests in `test/tasks.test.js` cover filtered, unfiltered, and invalid status
   - [ ] `npm test` passes in CI
   - [ ] `docs/api.md` documents the 400 response

   ## Boundaries
   - Do NOT modify `src/auth/`, `infra/`, or `.github/`
   - No new dependencies
   ```

4. Add the label `agent-task`, then click **Create**.

## Part B — Delegate and watch the loop

1. In the issue sidebar, click **Assignees → Copilot**. In the dialog you can add optional extra instructions and select the base branch (leave `main`). Click **Assign**.
2. Watch for these signals:
   - 👀 reaction on the issue → the agent picked up the task
   - A **draft PR** appears, linked to the issue, on a branch named `copilot/...`
   - The PR description contains a **checklist plan**, which Copilot updates as it works
3. In the PR timeline, click **View session** (or open **https://github.com/copilot/agents**). Map what you see to the lifecycle:

   | Phase | What to look for in the session log |
   | --- | --- |
   | **Plan** | Repository exploration (`view`, `search`), then a plan or checklist |
   | **Act** | File edits and commits pushed to the `copilot/...` branch |
   | **Evaluate** | `npm test` runs, CodeQL and secret scanning validation, Copilot code review "second opinion", and self-fixes |

4. When the session ends, Copilot requests your review.

## Part C — Approve workflows (human-in-the-loop for CI)

By default, **GitHub Actions workflows do not run on a Copilot PR until someone with write access clicks _Approve and run workflows_**. This prevents an agent-authored change to a workflow file from running untrusted code with your repository's Actions permissions.

1. On the PR, find the **Approve and run workflows** banner and click it.
2. Wait for **CI / test** to pass.

> This behavior can be changed under **Settings → Copilot → Cloud agent**. Ask yourself when relaxing it would be appropriate (hint: low-risk repositories, never when workflow files can change unreviewed).

## Part D — Review using the contributor model

Evaluate the PR the way you would evaluate a human contributor's PR — no more suspicion and no more trust. Fill in this rubric as a PR review comment:

```markdown
### Contributor-model review
- Intent: Is there a clear goal and visible plan?            ☐
- Scope: Do the changed files match the issue's boundaries?   ☐
- Evidence: Do checks pass? Are tests meaningful?             ☐
- Ownership: Would the right owners need to review? (Lab 02)  ☐
- Policy: Does it respect repository rules?                    ☐
- Fallback: Is it easy to revert?                              ☐
```

## Part E — Traceability: who did what?

Open the **Commits** tab of the PR and click one commit. Verify these facts. Each one has appeared in exam-style questions:

- [ ] **Author** is Copilot, and **you** are listed as `Co-authored-by` (the person who started the task)
- [ ] The commit shows **Verified** because Copilot cloud agent signs its commits
- [ ] The commit message contains a **link to the agent session log**
- [ ] The branch is `copilot/...`. Copilot can only push to that single branch.

## Part F — Iterate inside the PR

1. In **Files changed**, leave a review comment on the server change:
   `@copilot Also return 400 when the status query parameter is an empty string, and add a test for it.`
2. Submit the review with **Request changes**.
3. Observe: a new session starts **on the same PR branch**. Copilot only acts on comments from users with write access.
4. When it finishes, approve workflows again, review, click **Ready for review**, and **Squash and merge**.

> Copilot cannot mark its own PR ready for review, approve it, or merge it. A human always closes the loop.

## Part G (optional, ~1 premium request) — See the anti-pattern

1. Create an issue titled `Make the API better` with no body, and assign it to Copilot.
2. Compare the resulting PR with the Part B PR: files touched, size of the diff, and whether it is verifiable.
3. **Close the PR without merging** and delete its branch. Write down which anti-patterns you saw, such as vague goals, unbounded scope, or missing success criteria.

## Exam lens — self-check

<details><summary>1. A developer assigned an issue to Copilot. Who can approve the resulting PR when a ruleset requires one approval?</summary>

Any other user with write access, but **not** the developer who asked Copilot to create the PR. That restriction preserves the meaning of "required approvals". If Copilot opened the PR under its own identity (not attributed to a person), one **additional** approval is required by default.
</details>

<details><summary>2. Your security lead asks how to prove which human initiated an agent change six months ago. What do you point to?</summary>

The commit's `Co-authored-by` trailer (the initiating user), the signed (Verified) Copilot authorship, the session-log link in the commit message, the linked issue and PR timeline, and the audit log.
</details>

<details><summary>3. Why don't workflows run automatically on Copilot PRs by default?</summary>

So a human reviews the agent's changes before they run with the repository's Actions token and secrets. This is a human-in-the-loop gate against malicious or mistaken workflow changes and against prompt-injection chains.
</details>

<details><summary>4. Which is the better agent task: "Improve error handling" or the Part A issue? Name two properties that make it better.</summary>

The Part A issue: explicit inputs and outputs, verifiable success criteria, and explicit boundaries (out-of-scope paths, no new dependencies). Together these make scope reviewable and success measurable.
</details>
