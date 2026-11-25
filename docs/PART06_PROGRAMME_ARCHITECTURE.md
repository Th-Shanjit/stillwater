# Part 06A - Shared Programme Architecture

## Content contract

Programme definitions contain:

- Schema version
- Stable programme ID
- Content edition number
- Publisher identity
- Title and description
- Language and spiritual tradition
- Intended audience
- Access tier
- Scheduling intention
- Ordered days and interactive steps

Programme IDs and versions identify content editions.

Published editions must be immutable. A future
publication system must enforce this separately.

## Steps

Supported kinds:

- Guidance
- Practical action
- Prayer
- Reflection
- Quiet moment

Each step has stable identity, usable text and
an optional audio asset reference.

Duration is a suggestion, never a requirement
to remain inside the application.

Core steps describe the default programme flow.
They do not prove that a participant performed an action.

Prayer and reflection must remain optional.

## Content validation

Validate structured definitions before use.

Reject unknown fields, unsupported schema versions,
duplicate identifiers, invalid durations and missing text.

Validation checks structure, not theological accuracy,
clinical safety, licensing or publisher authenticity.

Those require independent review before publication.

## Privacy boundary

A programme definition is distributable content.

It must not contain:

- Private recovery records
- Personal plans
- Trusted contact details
- Private reflections
- Personal recovery outcomes

Participation records will be stored independently.

Future connected programmes may expose only
explicitly consented participation information.

No personal recovery data is sent to a publisher.

## Current implementation

The local catalogue contains a provisional
Three Quiet Evenings programme.

It is free and self-paced.

Publisher metadata is not verified identity.

Access and schedule fields are descriptive contracts
until dedicated enforcement is implemented.

The existing recovery path is unchanged.

No enrolment, player, backend, media download,
publishing tool or connected membership exists yet.

## Future work

06B: Reusable interactive programme player.
06C: Catalogue and enrolment.
06D: Local participation persistence.
06E: Publishing format and validation.
06F: Integration and audit.

Content and recordings remain provisional.
