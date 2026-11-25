# Part 04C - Preparation Windows

Users can optionally create daily recurring local-time
windows, edit them, pause them or remove them.

No windows are created automatically.

Cross-midnight windows are supported.
Start and end must differ.
Start is inclusive; end is exclusive.

A current or upcoming enabled window within 180 minutes
takes priority over observed patterns when there is
no existing active plan.

Recommendations refresh when Today reloads.
They are not real-time background predictions.

Storage uses an additive preparation_windows table.
Legacy vulnerable_windows preferences are preserved
but not automatically converted into clock times.

No notification permissions or schedules are changed.

Initial release supports daily windows.
Weekday-specific and weekend-only schedules are deferred.

04D will add separate reminder consent and scheduling.
