# Part 04D - Intelligent Reminders

## Consent

Preparation reminders are disabled by default.
Each enabled window requires explicit reminder consent.
No automatic reminders are generated from observed patterns.

## Scheduling

Daily reminder 30 minutes before window start.
Cross-midnight lead times are supported.
Maximum three preparation reminders.
Duplicate reminder times are rejected.

Preparation reminders use isolated identifiers
and a dedicated Android notification channel.

Existing morning and evening schedules are unchanged.

## Lifecycle

Pause, edit or remove cancels the associated reminder
before updating the window database record.

Resuming a window does not automatically restore reminders.
Editing requires explicit reminder re-enablement.

Native schedules are the source of truth for status.
If cancellation fails, the database mutation is blocked.

If cancellation succeeds but the database write fails,
the original window may remain without its reminder.

## Privacy

Neutral notification wording.
No emotional context, recovery history, plan text,
phone numbers or other private details in notifications.

Silent sound configuration and private Android
lock-screen visibility are requested.

Users and device settings can override presentation.

## Limitations

OS delivery times are not guaranteed.
Permission revocation can suppress existing schedules.
Previously authorised schedules may resume if OS
permission is restored.

No server, push token, background prediction
or notification-specific navigation is introduced.

Native scheduling and cancellation require device tests.
Pure rule tests do not simulate operating-system delivery.
