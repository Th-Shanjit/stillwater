# Part 06C - Programme Catalogue and Enrolment

Journey now provides a production catalogue route.

Users can inspect programme details and explicitly
join an available programme on their device.

Enrolment records store:
- Local enrolment identifier
- Programme identifier
- Exact programme edition
- Joined timestamp

One active enrolment per programme is permitted.
Existing enrolments never silently change editions.

Unavailable editions retain their enrolment records
until the user explicitly removes them.

Free programmes do not require an account.
Plus programmes use the existing entitlement mechanism.
Access is checked at enrolment and session launch.

Daily-scheduled content cannot be joined yet.

The interactive player supports temporary sessions.
The catalogue does not claim durable completion.
06D adds participation history and session resumption.

Withdrawal removes the enrolment. Future participation
tables must be included in withdrawal semantics.

No private recovery records are read, copied,
uploaded or included in programme enrolment.

No backend, invitations, connected memberships,
publication service or payment changes are introduced.

The existing recovery path and development preview remain.

Native SQLite migration, navigation, offline access,
withdrawal and entitlement behaviour require testing.
