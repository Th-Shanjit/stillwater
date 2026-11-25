# Phase 10 private data management

## Deletion workflow

The user explicitly confirms deletion by typing DELETE.

A pending reset marker is stored before reloading.

On the next startup, before personal screens mount,
the application cancels its scheduled notifications,
dismisses its notifications and clears personal data
inside an exclusive SQLite transaction.

The marker is removed only when the transaction commits.

If deletion fails, startup remains blocked and the
existing startup retry screen can retry the operation.

## Preserved information

- Purchased store access.
- Existing local Grace Scholarship.
- App lock preference.
- Onboarding status.
- Prayer preference.
- Separate Circle membership.

## Database reliability

Concurrent initial database opening is consolidated.

Missing preference columns are detected explicitly.
Unexpected migration errors are no longer swallowed.

SQLite secure_delete is enabled as an additional
local deletion measure.

A WAL checkpoint is attempted after deletion.

## Encryption assessment

The existing SQLite database is not SQLCipher encrypted.

Enabling SQLCipher requires a native rebuild,
secure key management, compatible transaction
connections and a tested migration of existing data.

Do not simply enable encryption against an existing
plaintext database or claim encryption from a PRAGMA
that the installed binary does not support.

## Limitations

Deletion is not guaranteed forensic erasure.

External backups, store records, messages already
sent and remote Circle records are outside this reset.

Actual device deletion, restart, reminder cleanup,
failure recovery and migration tests remain required.

First-install invitation preservation remains pending.
