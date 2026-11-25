# Part 03B - Start Again

## Workflow

Immediate practical action comes first.

Users may:
- Leave without recording anything.
- Explicitly record a return and leave.
- Choose an optional 24-hour plan.
- Add optional structured reflection.
- Open immediate support.
- Access optional prayer after saving.

No mandatory lament, confession or questionnaire.

## Persistence

A return is recorded only after an explicit save action.

Saving does not establish abstinence or successful
completion of the chosen practical action.

Existing grace_resets and daily_logs remain compatible.

No new raw lament text is stored.

Native writes use an exclusive SQLite transaction.
Web uses the supported non-exclusive transaction fallback.

Identical active boundary labels reuse existing records.
Existing expiry times are preserved.

Previously recorded practice flags remain intact
when a return is recorded on the same date.

## Limitations

Immediate support opened from Start Again does not
automatically record a setback.

The legacy was_binge_breaker field represents a recent
recorded return, not a verified binge or diagnosis.

Optional content remains intentionally limited.
Detailed content expansion and audio production are
separate production milestones.

Full native transaction and concurrency testing remains
required before release.
