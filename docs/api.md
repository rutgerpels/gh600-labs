# Task API

Low-risk path (documentation). Used in the risk-based autonomy exercises.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness probe (no auth) |
| GET | `/tasks?status=<status>` | List tasks, optionally filtered by status (`todo`, `in-progress`, `done`) |
| POST | `/tasks` | Create a task. Body: `{ "title": "..." }` |

Authentication: when `API_TOKEN` is set, send `Authorization: Bearer <token>`.
