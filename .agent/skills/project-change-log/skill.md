---
name: project-change-log
description: Append a structured log entry to LOG_Changes.md at the project root after completing ANY task.
---

# Project Change Log Skill

## Context
Use this skill immediately after finishing any code generation, modification, or project execution task. Do not skip this step.

## Instructions
Append a new entry to `LOG_Changes.md` at the project root using this exact format. Never overwrite, edit, or delete previous entries.

```markdown
---
## [Task Name] | DD Mon YYYY, HH:MM IST

**Prompt Summary:** One line of what was asked.

**Files Created:**
- `path/to/file1.ext` - brief description

**Files Modified:**
- `path/to/file3.ext` - what changed

**Files Deleted:**
- `path/to/file5.ext` - reason (if any)

**Status:** ✅ Complete / ⚠️ Partial / ❌ Failed

**Notes:** (optional) Any blockers, decisions, or next steps
---
```

## Rules
* **Always Append:** Only append to the bottom of the log file.
* **Initialization:** If `LOG_Changes.md` does not exist, create it with this exact header first:
  ```markdown
  # Project Change Log
  
  *This log tracks all changes made during development. Entries are appended chronologically.*
  ```
* **Relative Paths:** Use workspace-relative paths (e.g., `src/app.py`).
* **Specificity:** Describe precise additions or changes (e.g., "modified database.py — added connection pooling").
* **Timezone:** Use 24-hour Indian Standard Time (IST).
