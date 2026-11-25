# Stillwater Architecture

## Existing implementation

Expo Router and React Native.
Expo SDK 58 at the reviewed baseline.
SQLite for local persistence.
Reanimated for motion.
Expo Audio for audio playback.
RevenueCat for purchase entitlements.

Live application routes are in app/.

Always verify the installed Expo version and consult
matching documentation before changing native APIs.

## Preserve existing functionality

- State-aware morning content.
- Welcome after absence.
- Editable behavioural plans.
- Boundaries.
- Trusted-contact functionality.
- Recovery programme content.
- Audio player.
- Purchase restoration and entitlements.
- Local Grace Scholarship.

Adapt these rather than unnecessarily rebuilding them.

## Private data domain

Recovery events, reflections, personal plans,
trusted contacts and sensitive preferences.

No compulsory account for personal support.

Do not send private recovery records to future
programme, creator or church infrastructure.

## Connected data domain

Future backend may handle:

- Versioned programme definitions.
- Invitations.
- Voluntary membership.
- Shared schedules.
- Licensed media.
- Commercial entitlements.
- Consented participation information.

Separate this domain from private local recovery data.

## Shared programme engine

Design towards reusable, versioned programme definitions.

Proposed fields:

- Programme ID and version.
- Content owner.
- Intended audience.
- Language and spiritual tradition.
- Ordered steps.
- Step type.
- Duration.
- Content references.
- Optional audio asset reference.
- Accessibility alternative.
- Scheduling information.
- Access requirements.

Do not build the complete backend before validating
the local programme engine.

## Media architecture

Keep stable content IDs.

An audio asset may be absent during development.

Timed visual and text practices must remain functional.

Only record actual playback as audio usage.

Do not require network access for essential interventions.

## Security status

Known authentication exception bug addressed in Part 00B.

Outstanding:
- Full authentication lifecycle verification.
- Native modal protection.
- App-switcher privacy.
- Database encryption assessment.
- Device backup assessment.
- User-accessible deletion.
- Trusted-contact data protection.
- Billing SDK privacy review.
- Future backend threat modelling.

Local storage alone does not guarantee absolute privacy.

Historical records must not be silently deleted.
