# Parts 07D, 07E and 07F

## Pilot implementation

Node.js HTTP service backed by server-side SQLite.

The mobile application uses SecureStore to retain
one anonymous connected membership credential.

Credentials are bound to the configured API origin.

The server stores hashed membership and invitation
credentials, membership roles, circle expiry and
explicitly shared session check-ins.

No private recovery database is connected.

## Participation

Walk With Me supports two participants.
Circles support eight participants.

The pilot supports Three Quiet Evenings version 1.

Members may independently enrol in the private
programme library.

Private programme completion is not synchronised.

Only deliberate shared check-ins affect circle totals.

Check-ins are removable by their author.

Small-group totals may reveal individual participation.

No public profile, chat, personal recovery report,
contact upload or participant tracking is introduced.

## Membership controls

Invitation generation rotates the existing code.
Owners may revoke invitation codes.

Leaving removes a member and their shared check-ins.
Closing removes the entire circle.

Circle data expires after 30 days.

Expiration cleanup runs while the service is operating.

## Pilot security

Group creation requires a server-side pilot code.
Never expose this code through EXPO_PUBLIC variables.

The service listens on localhost only.
The application accepts configured HTTPS origins only.

Do not expose the service publicly before security review.

Request size and basic rate limits are implemented.
Production abuse prevention, infrastructure controls,
backup encryption, moderation, recovery of lost
credentials and multi-instance deployment remain pending.

Membership credentials are bearer credentials.
Possession grants access. Do not log request bodies.

Invitation links can be forwarded by their recipients.
They are not identity-verified invitations.

## Local server

Set CIRCLES_DB to a path outside the repository.

Set CIRCLES_PILOT_CODE to a private random secret.

Run:

node server/circles.cjs

The app remains disconnected until a reviewed HTTPS
deployment is configured.

EXPO_PUBLIC_CIRCLES_API_URL is the API origin,
not a secret.

EXPO_PUBLIC_STILLWATER_SHARE_URL is the public
static sharing website address.

## Acceptance tests

- Two independent devices join the same group.
- Pair and Circle capacity is enforced.
- Revoked invitations fail.
- Membership survives application restart.
- Check-ins require an explicit participant action.
- Other devices receive new totals after refresh.
- Check-in withdrawal updates the total.
- Leaving removes membership.
- Owner closure removes the group.
- Expired circles become unavailable.
- No recovery records are transmitted.
- Legacy personal functionality remains available.
- Unconfigured backend remains clearly unavailable.

## Remaining limitations

No live hosting or public deployment has been performed.

No automatic real-time updates; refresh retrieves totals.

There is one active membership per app installation.

The app does not provide identity or membership recovery.

Verified Universal Links, first-install routing,
server hardening and device testing remain outstanding.

This is a functional connected pilot, not a
production-ready community service.
