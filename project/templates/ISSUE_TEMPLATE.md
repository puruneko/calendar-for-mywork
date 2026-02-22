# ISSUE TEMPLATE (DO NOT MODIFY STRUCTURE)

This template defines the mandatory structure for all Issues.
AI agents must reproduce this format exactly.
Field names, order, and sections are immutable.

---

## FILENAME RULE

```
NNNN-short-kebab-title.md
```

* NNNN = zero-padded numeric ID (0001, 0002…)
* Title = kebab-case summary
* Filename must never change after creation.

---

## FRONTMATTER (REQUIRED)

```yaml
id: NNNN
title: Human readable title
status: open
type: feature
priority: medium
assignee: unassigned
created: YYYY-MM-DD
updated: YYYY-MM-DD
related_specs: []
related_decisions: []
related_tasks: []
```

### Allowed Values

status:

* open
* in-progress
* blocked
* closed

type:

* feature
* bug
* refactor
* chore
* test

priority:

* low
* medium
* high
* critical

AI must not invent new values.

---

## BODY STRUCTURE (KEEP ORDER)

### 1. Background

Why this Issue exists.
Describe the problem or goal.
No implementation discussion.

---

### 2. Expected Behavior

Define observable outcome only.
Must align with project/specs.

Write in verification terms, not ideas.

---

### 3. Non-Goals

Explicitly state what must NOT change.

Prevents AI overreach.

---

### 4. Constraints

Technical or business constraints pulled from:

* specs
* decisions
* environment

If none: write `None`.

---

### 5. Acceptance Criteria

List measurable completion conditions.

Example:

* [ ] Behavior matches spec X
* [ ] No regression in Y
* [ ] All tests pass

Must be testable statements.

---

### 6. Implementation Notes (Optional)

Hints for execution.
Not a design document.

---

### 7. Definition of Done (MANDATORY)

Issue is complete only if:

* [ ] Implementation merged
* [ ] Tests updated and passing
* [ ] Specs remain consistent
* [ ] Issue status set to closed

---

## UPDATE RULES

AI may update ONLY these fields during execution:

* status
* assignee
* updated
* Implementation Notes (append-only)

AI must NEVER rewrite history or alter Background.

---

## FORBIDDEN ACTIONS

AI must not:

* Change template structure
* Reorder sections
* Add new metadata fields
* Rename headings
* Delete recorded decisions

---

## PRINCIPLE

Uniform Issues enable deterministic AI execution.
Variability is treated as a defect.
