# Stillwater Quality Assurance

## Foundation source verification

Part 00A: passed TypeScript and seven regression cases.
Part 00B: passed TypeScript and Git diff checks.
Part 00C: passed TypeScript and source assertions.

These checks do not establish device security
or clinical effectiveness.

## Required source checks

npx.cmd tsc --noEmit
npx.cmd expo lint
npx.cmd expo-doctor
npx.cmd expo install --check
git diff --check

Lint and Expo diagnostic checks remain outstanding.

## Functional device checks

- Application launches and navigates correctly.
- Onboarding completes without a purchase prompt.
- Unlogged dates are not successful recovery days.
- Practice and return records are preserved.
- Authentication errors do not unlock the app.
- Cancellation leaves the app protected.
- New raw laments are not stored.
- Timed-text practices are not reported as audio.
- Existing recovery plans and trusted contacts work.
- Essential interventions remain free.
- Unavailable store plans cannot be purchased.

## Later verification

- Screen-reader accessibility.
- Text scaling and reduced motion.
- Audio interruptions and playback.
- Notification permission and scheduling.
- Database encryption and backup behaviour.
- App-switcher and native modal privacy.
- Data deletion.
- Subscription renewal and expiry.
- Purchase restoration and refund handling.
- Lifetime entitlement boundaries.
- Shared programme privacy.
- Invitation consent and group departure.

## Human validation

Recruit consenting adult testers.

Evaluate immediate support usability, clarity,
perceived usefulness and unwanted effects.

Seek qualified mental health and pastoral review.

Do not claim clinical endorsement before obtaining it.

Do not use sensitive personal recovery information
for marketing attribution.

## Release gate

Source checks, device checks, privacy review,
content review and relevant store sandbox tests
must be complete before public release.
