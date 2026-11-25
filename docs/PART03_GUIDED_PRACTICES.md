# Part 03C - Guided Practice Engine

## Purpose

Provide a reusable foundation for personal guided
practices and future shared programmes.

## Content model

Every practice contains:
- Stable practice ID.
- Content version.
- Title and description.
- Access tier.
- Optional audio URI.
- Ordered, individually identifiable steps.

Steps contain a kind, text and suggested duration.

The current renderer treats all step kinds as readable
guidance. Specialised interactive step renderers
remain future work.

## Compatibility

Existing midnight_audio.json entries are converted
to the new content model without modifying their IDs,
access tiers, durations or scripts.

AudioRescuePlayer retains its existing public API.

Text-only practices use GuidedPracticePlayer.
Tracks with recordings use the existing audio adapter.

## Session controls

Manual reading is the default.
Timed guidance starts only after explicit user action.

Manual navigation pauses timed progression.
Backgrounding and loss of focus pause progression.

The user may stop without finishing.

Reaching the last step does not prove that an action
was performed or that a recovery outcome occurred.

## Content production

Existing scripts are temporary working content.

Before release, review instructions that refer to
eyes-closed listening when no recording is present.

Review theological statements, psychological claims,
accessibility and context-specific guidance.

Recordings and additional artwork remain deferred.

## Future work

03D: evening wind-down.
03E: practice event and outcome persistence.
06: shared programme publication and scheduling.

Native audio lifecycle, recorded playback and
device accessibility still require testing.

The content engine has automated tests independent
of Expo and native device execution.
