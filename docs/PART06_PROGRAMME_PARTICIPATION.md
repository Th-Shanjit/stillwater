# Part 06D - Programme Participation

Participation is stored independently from
private recovery events and personal records.

Each enrolment and programme day has one
participation record.

Saved information:
- Enrolment ID
- Day ID
- Current step position
- Continued or skipped dispositions
- Updated timestamp
- Explicit completion timestamp

No free-text reflection or prayer response is stored.

Step navigation saves before changing the displayed
position. Failed saves retain the current position.

Completion requires all core steps to have been
continued and optional steps continued or skipped.

Reaching the review screen does not mark completion.

Completed records are protected against later
progress overwrites and duplicate completion writes.

Enrolment withdrawal atomically removes its
participation records through a database trigger.

Late writes cannot recreate deleted enrolment progress.

Content editions remain pinned.

Current scheduling remains self-paced.

Completed sessions are not replayable through the
production catalogue in this milestone.

No cloud sync, host reporting, shared memberships
or recovery analytics integration is introduced.

Native persistence and concurrent-navigation
behaviour require device validation.

A future full-data deletion workflow must include
programme enrolments and participation records.
