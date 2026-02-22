# WORKFLOW.md

This document defines the ONLY allowed execution flow for development.
AI agents must follow this sequence strictly.
No step may be skipped, reordered, or merged.

---

## STEP 1 — IDENTIFY THE ISSUE (ENTRY POINT)

* Locate the target file in `project/issues/`.
* Confirm:

  * purpose of change
  * expected outcome
  * constraints

If no Issue exists → **STOP immediately.**
Work without an Issue is prohibited.

---

## STEP 2 — LOAD AUTHORITATIVE CONTEXT

Before touching code, you must read:

* `project/specs/*` related to the Issue
* `project/decisions/*` affecting design or constraints
* referenced `project/tasks/*` (if present)

You are building an understanding of intent — not code behavior.

---

## STEP 3 — DEFINE IMPACT BOUNDARY

You must explicitly determine:

* What is allowed to change
* What must remain unchanged
* What tests must be updated
* What side-effects are forbidden

No speculative refactor allowed.

---

## STEP 4 — IMPLEMENT MINIMAL CHANGE

Implementation rules:

* Smallest change necessary to satisfy the Issue
* No optimization unless explicitly required
* No structural redesign unless defined in specs/decisions
* Do not “improve” unrelated code

You are executing, not enhancing.

---

## STEP 5 — ALIGN TESTS WITH SPECIFICATION

Tests must reflect **current specification**, not legacy behavior.

Before running tests:

* Update or add tests required by the spec change
* Remove tests that validate obsolete behavior
* Ensure tests validate outcomes, not implementation details

---

## STEP 6 — EXECUTE FULL TEST SUITE

Run ALL tests:

* Functional tests
* Integration tests (if present)
* E2E tests

Partial execution is forbidden.

---

## STEP 7 — FAILURE LOOP (MANDATORY)

If any test fails:

1. Analyze the failure
2. Fix implementation (not the test unless spec changed)
3. Re-run the entire suite

Repeat until **100% pass**.

Skipping failures is a violation of protocol.

---

## STEP 8 — VERIFY SPEC CONSISTENCY

After tests pass, re-check:

* Implementation matches `project/specs`
* No contradiction with `project/decisions`
* Behavior matches Issue intent exactly

If mismatch found → return to STEP 4.

---

## STEP 9 — CLOSE THE ISSUE

Only after all prior steps succeed:

* Update Issue status (`open → closed`)
* Record any necessary notes
* Ensure repository remains consistent

Completion without Issue update is invalid.

---

## CORE PRINCIPLE

Workflow is deterministic.

Issue defines WHY.
Specs define WHAT.
Decisions define CONSTRAINTS.
Workflow defines HOW.
Tests prove RESULT.

The AI must not invent behavior outside this chain.
