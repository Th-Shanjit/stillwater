# Part 06F - Programme Integration

## Completed functionality

- Versioned programme definitions.
- Validated JSON content packages.
- Local catalogue and enrolment.
- Free and Plus access decisions.
- Interactive programme player.
- Optional prayer and reflection.
- Durable session position.
- Explicit session completion.
- Voluntary programme withdrawal.
- Read-only replay of completed sessions.
- Android back navigation.
- Edition registry and publishing validation.

## Replay semantics

Completed sessions remain available for revisiting.

Replay starts from the first step.

Replay does not invoke progress or completion writes.

The original completion timestamp remains unchanged.

Replay position is temporary and is not persisted.

## Navigation

The Android hardware back button returns from an
active session to its programme.

During a player save, Android hardware back is ignored.

Back from a completion screen returns to programme details.

Back from programme details returns to the catalogue.

The catalogue delegates exit navigation to Expo Router.

Native navigation behaviour requires device testing.

## Privacy boundary

Programme definitions, enrolments and participation
are separate from personal recovery records.

Programme completion does not update:

- Recovery activity calendar
- Personal Compass
- Sanctuary growth
- Recovery events

No publisher receives participation information.

No network request is needed to access the bundled
free programme or its saved session position.

## Native acceptance tests

- Open the catalogue from Journey.
- Join and reopen Three Quiet Evenings.
- Save, exit and resume a partially completed session.
- Resume after an app restart.
- Skip optional prayer and reflection.
- Finish a session explicitly.
- Revisit without changing the original completion.
- Check Android hardware back navigation.
- Withdraw and confirm saved participation is removed.
- Check large text and narrow-screen behaviour.
- Confirm offline access.
- Verify the legacy recovery path remains unchanged.
- Verify programme activity does not alter recovery data.

## Outstanding work

Daily scheduling and connected memberships.
Host and creator publishing interfaces.
Invitations and shareable browser experiences.
Cloud security and consent boundaries.
Production audio, artwork and content review.
Comprehensive privacy deletion and backup policy.

No new external dependencies or services.
