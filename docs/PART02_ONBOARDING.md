# Part 02C - Onboarding

## Experience

One-tap entry from the welcome screen.

Optional personalisation:
- Prayer preference.
- App lock.
- Quiet reminders.
- Bedtime when reminders are enabled.

No compulsory recovery questionnaire.
No mandatory account or onboarding paywall.

## Notifications

New onboarding requests notification permission
only after explicit user selection.

Changing bedtime does not activate reminders.

Progress includes a reminder toggle.

Cancellation targets the existing Stillwater
daily reminders rather than all scheduled notifications.

A more comprehensive reminder preference model
will be implemented in Part 04.

## Privacy

App lock is optional.
Biometric availability is checked before enabling it.
The existing root authentication lifecycle is retained.

## Testing

Development builds can preview onboarding from Progress.

Preview does not update preferences, recovery records
or notification schedules.

Existing users are not forced to repeat onboarding.

Recording production remains deferred.
