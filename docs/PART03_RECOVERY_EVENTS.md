# Part 03E - Recovery Events

## Purpose

Provide structured local interaction records for
future personal preparation and progress features.

## Storage

An additive recovery_events table uses stable session
IDs, event kinds, content versions and optional parent
session IDs.

Each event kind is unique per session.
Existing records are not migrated or rewritten.

Only fixed event fields are persisted.
No new raw journal text, custom plan text,
message content or phone numbers are stored here.

## Semantics

A selected action is not an action performed.

Reaching the end of a guided practice is not proof of
improved mental health or recovery.

Missing records imply nothing.

Existing daily_logs and grace_resets remain the
authoritative sources for practice and return counts.

Do not aggregate supplementary events and legacy
records as though they were independent recoveries.

## Reliability

Existing core persistence succeeds independently
of supplementary event recording.

Supplementary writes are best-effort and idempotent.
They are not atomic with existing core records.

Explicit close buttons and guided-player exits are
recorded where implemented.

Hardware back, parent-modal dismissal and process
termination may leave incomplete event histories.

Real recorded-audio participation events remain
deferred until recordings are available.

## Privacy

Local database storage does not mean encryption.
Review backup exclusions, access controls, retention,
export and deletion before public release.

Do not transmit personal recovery events to future
creator, church or host systems.

## Validation

Run guided-practice and recovery-event tests.
Run TypeScript and lint checks.
Perform combined native device testing for Parts 03A-E.

Content expansion and recording production remain
separate milestones.
