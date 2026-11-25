# Part 05A - Progress Redesign

## Navigation

Bottom navigation remains:
- Today
- Journey
- Progress

New root stack screens:
- /plans
- /settings

Today and Progress provide direct access.

## Progress

Contains recorded activity, optional feedback,
a plan-management shortcut and Personal Compass.

The sanctuary will be added in a later phase.

## My Plan

Contains active plans, preparation windows,
preparation reminders, trusted contact and
personal coping strategies.

Existing data operations remain intact.

Resolving a plan refreshes its optional feedback
check-in without requiring a tab switch.

## Settings

Contains prayer preferences, morning and evening
reminders, bedtime, biometric lock and privacy copy.

The development onboarding preview remains available.

## Visual design

Use the Stillwater V2 day palette, shared screen
components, buttons and consistent card styling.

Management touch targets are at least 48dp where
updated by this patch.

## Validation

No database schema or dependency changes.

Typed route declarations regenerate when Expo starts.
Explicit static route annotations are used until then.

Verify navigation, data retention, authentication,
contact composition and reminder settings on device.
