# Part 06E - Programme Publishing

## Package storage

Approved programme definitions are stored as JSON
under assets/programmes/.

Filename convention:

programme_id.v1.json

The application imports approved packages through
content/programmeCatalog.ts.

## Validation

Run:

node scripts/programme-publish.cjs validate path/to/programme.json

Packages must satisfy the version-one content contract.

The development publishing tool accepts UTF-8 JSON
files up to 512 KiB.

Every step requires usable text.

Audio references must be stable asset identifiers,
not arbitrary URLs or executable content.

The existing catalogue parser remains authoritative.

## Edition integrity

assets/programme-editions.lock.json stores canonical
SHA-256 fingerprints of registered content editions.

Changing an existing edition produces a validation
error. Publish a new version instead.

JSON formatting differences do not alter fingerprints.

Previously registered editions must remain available.

The registry is a development integrity mechanism,
not a digital signature or proof of publisher identity.

Registry changes require Git review. Never rewrite
existing fingerprints to bypass an edition conflict.

## Registration procedure

1. Author a new JSON package.
2. Validate the package.
3. Review content, rights, accessibility and safety.
4. Copy the approved file into assets/programmes/.
5. Add a static import in programmeCatalog.ts.
6. Add the package to BUNDLED_PROGRAMMES.
7. Append its fingerprint to the edition registry.
8. Run the catalogue check and all regression tests.
9. Commit the approved content edition.

## Export

The publishing tool can export any available edition.

node scripts/programme-publish.cjs export three_quiet_evenings 1 draft.json

Existing destination files are never overwritten.

## Privacy

Packages contain distributable content only.

Enrolment and session participation remain in their
separate local database tables.

Structural validation does not detect all sensitive
information that could be inserted into free-text
content fields. Human review remains mandatory.

## Review requirements

Before production publication, check:

- Publisher identity and authority.
- Scripture, artwork and audio licensing.
- Theological suitability.
- Clinical and safeguarding concerns.
- Non-coercive language.
- Accessibility and translation quality.
- Accurate access and scheduling information.

## Limitations

This is a local development publishing pipeline.

No public uploads, remote publishing, digital
signatures, automatic moderation or creator
dashboard exists yet.

The production player is still text-based.
Recording production remains deferred.

Daily-scheduled programmes are not yet supported
by the enrolment experience.
