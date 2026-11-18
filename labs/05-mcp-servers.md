# Lab 05 — MCP servers and tool scoping

| | |
| --- | --- |
| **Read first** | M3 *Configuring Agent Tooling and Execution* — unit 3 (MCP) · M2 unit 7 |
| **Exam skills** | Configure MCP servers for agents (D2) · restrict tools to least privilege (D2) · manage MCP access with allowlists/registries (D2, D6) · supply secrets safely (D2) |
| **You will** | Add the Microsoft Learn MCP server to the repository, restrict which of its tools the agent can call, create a custom agent that uses a single MCP tool, and verify the calls in the session log |

## About this lab

### What we'll discuss

An agent can only act through its **tools**. The **Model Context Protocol (MCP)** is the open standard for plugging new tools into an agent, such as documentation search, ticketing systems, databases, or cloud APIs. That's powerful, and risky: every MCP tool expands what the agent can read and do, and Copilot cloud agent calls those tools **without asking for approval each time**.

Module 3 unit 3 therefore treats MCP as a **least-privilege** problem at three levels:

1. **Repository**: which servers are connected, and which of their tools are allowlisted.
2. **Agent**: which of those tools a specific custom agent may use (`server/tool`).
3. **Organization/enterprise**: which servers are allowed at all, through policies and an MCP **registry**.

We'll connect the Microsoft Learn MCP server, narrow it to the tools we need, give one agent a single tool, and verify in the session log that the agent really used it.

### What you'll learn

- How MCP servers are configured for Copilot cloud agent (JSON `mcpServers`, `type`, `url`, `tools`)
- The built-in `github` and `playwright` servers and their default limits
- How repository allowlists and custom agent `tools` stack to give least privilege
- How secrets reach MCP servers safely (`COPILOT_MCP_` agent secrets)
- How org and enterprise admins govern MCP with policies, registries and allowlists
- How to use session logs as evidence that tools were used correctly

### Where this lands in the exam

| Domain (weight) | Study guide objective | Skill bullet |
| --- | --- | --- |
| Implement tool use and environment interaction (20–25%) | Configure MCP servers | *Add an MCP server as a tool to an agent* · *Configure a GitHub remote MCP server* · *Configure the MCP registries* · *Configure MCP allow lists* |
| Implement tool use and environment interaction (20–25%) | Select and configure agent tools | *Identify required tools* · *Configure agent tools* · *Configure agent tool permissions* |
| Implement guardrails and accountability (10–15%) | Implement guardrails and human-in-the-loop workflows | *Scope permissions and execution contexts to enforce least-privilege access* |
| Perform evaluation, error analysis, and tuning (15–20%) | Analyze agent failures and identify root causes | *Identify failures by using logs, plans, traces, outputs, and workflow artifacts* · *Classify root causes, including … tool misuse* |

📘 Source: [GH-600 study guide — Skills measured](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600#skills-measured)

> Domain 2 is the **largest** exam domain (20–25%), and MCP has its own objective in it. Expect several scenario questions on allowlists and registries.

## Part A — What's there by default

**Settings → Copilot → Cloud agent → MCP servers** (under *Code, planning, and automation*; the exact label may vary).

Copilot cloud agent has two **built-in** MCP servers:

| Server | Default behavior |
| --- | --- |
| `github` | **Read-only** access to GitHub data, with a token scoped to **this repository** |
| `playwright` | Browser automation, limited to localhost by default; subject to the firewall |

## Part B — Add a remote MCP server with a tool allowlist

In the **MCP configuration** box, paste and **Save**:

```json
{
  "mcpServers": {
    "mslearn": {
      "type": "http",
      "url": "https://learn.microsoft.com/api/mcp",
      "tools": ["microsoft_docs_search", "microsoft_docs_fetch"]
    }
  }
}
```

The configuration is validated on save.

| Field | Meaning |
| --- | --- |
| `type` | `local`/`stdio` (process started in the agent's environment) or `http`/`sse` (remote) |
| `url` | Remote endpoint |
| `tools` | **Allowlist**. Only these tools are exposed. `["*"]` exposes all tools. Prefer an explicit list. |

> The server's third tool, `microsoft_code_sample_search`, is **not** allowlisted, so the agent can't call it. That is least privilege at the MCP layer.

Facts to remember:

- Copilot cloud agent **uses MCP tools autonomously, without asking for per-call approval**. That's why the allowlist matters.
- Only MCP **tools** are supported, not resources or prompts.
- Remote servers that need **OAuth** aren't supported in repository settings.
- The repository MCP configuration is shared by cloud agent, automations, and Copilot code review (code review only uses tools marked read-only).

## Part C — A custom agent that can use exactly one MCP tool

Branch `lab05-docs-agent`, file `.github/agents/docs-researcher.agent.md`:

```markdown
---
name: docs-researcher
description: Writes documentation in docs/ backed by citations from Microsoft Learn.
tools: ["read", "search", "edit", "mslearn/microsoft_docs_search"]
---

You write documentation for this repository.

- Use `mslearn/microsoft_docs_search` to find authoritative Microsoft Learn sources.
- Only create or edit files under `docs/`.
- Cite every factual claim with a learn.microsoft.com link.
- Follow the repository PR template in the PR description.
```

Merge via PR.

Note the **namespacing**: `server-name/tool-name`. This agent can search Learn but **cannot** call `microsoft_docs_fetch` (even though the repository allows it), and it has no `execute` tool. Agent tool lists narrow what the repository config allows.

## Part D — Run it and verify the tool calls

1. Create an issue: `Docs: add docs/deploy-azure.md explaining how to deploy this Node.js API to Azure App Service, with Learn citations`. Add success criteria (e.g. "at least 3 learn.microsoft.com citations", "only docs/ changed").
2. Assign to **Copilot** with the custom agent **docs-researcher**.
3. In the **session log**, find the `mslearn/microsoft_docs_search` tool calls, including the query and returned results. This is your evidence that the content came from the tool rather than the model's memory.
4. Review the PR. Are citations real? Are only `docs/` files changed? Merge or request changes.

## Part E — Alternative: MCP server defined inside the agent profile

A custom agent can bring its own server via `mcp-servers:` in front matter. This is useful for org-level agents. Read-only example, **don't commit**:

```yaml
---
name: docs-researcher
description: ...
tools: ["read", "search", "edit", "mslearn/microsoft_docs_search"]
mcp-servers:
  mslearn:
    type: http
    url: https://learn.microsoft.com/api/mcp
    tools: ["microsoft_docs_search"]
---
```

## Part F — Secrets for MCP servers (read-only exercise)

Many MCP servers need an API key. **Settings → Secrets and variables → Agents**: note that this is **separate from Actions secrets**.

- Secret and variable names must start with **`COPILOT_MCP_`** to be passed to MCP configuration.
- Reference them in the config, for example `"env": { "API_KEY": "COPILOT_MCP_API_KEY" }` or in `headers` as `"$COPILOT_MCP_API_KEY"`.

## Part G — Organization/enterprise governance (walkthrough)

You need **org owner** rights for these, so read and map them; don't do them.

| Control | Where | Effect |
| --- | --- | --- |
| MCP policy | Org **Settings → Copilot → Policies → MCP servers in Copilot** | Enable or disable MCP use for members |
| MCP registry URL | Org Copilot policies (Enterprise: **AI controls → MCP**) | Point Copilot at a curated catalog |
| Restrict access | **Restrict MCP access to registry servers**: *Allow all* or *Registry only* | *Registry only* = allowlist; only servers in the registry can run |
| Registry hosting | Self-hosted (implements MCP Registry API v0.1, e.g. `/v0.1/servers`, with CORS) or Azure API Center | Central inventory |

> Enterprise policy overrides org policy, which overrides repository choices. A repository can't enable something its org or enterprise disabled.

## Optional — the GitHub remote MCP server in VS Code

`https://api.githubcopilot.com/mcp/` is GitHub's hosted MCP server, used by IDE agents and supporting OAuth there. Compare: in cloud agent, the `github` server is built-in and read-only by default.

## Exam lens — self-check

<details><summary>1. Your agent needs to search an internal knowledge base through an MCP server that exposes 25 tools, 3 of which write data. How do you configure it?</summary>

List only the needed read tools in the `tools` allowlist (not `"*"`). Optionally narrow further per custom agent with `server/tool` names. Store credentials as `COPILOT_MCP_*` agent secrets.
</details>

<details><summary>2. Does Copilot cloud agent prompt the user before each MCP tool call?</summary>

No, it uses configured tools autonomously. Restrict tools up front.
</details>

<details><summary>3. Your security team wants developers to only use approved MCP servers. What do you configure?</summary>

An MCP registry (self-hosted or Azure API Center) plus the org/enterprise policy **Restrict MCP access to registry servers → Registry only**.
</details>

<details><summary>4. A secret named <code>MY_API_KEY</code> in Agents secrets isn't reaching the MCP server. Why?</summary>

Agent secrets used by MCP configuration must be prefixed with `COPILOT_MCP_`.
</details>

<details><summary>5. What's the default permission of the built-in <code>github</code> MCP server in cloud agent?</summary>

Read-only, scoped to the current repository.
</details>
