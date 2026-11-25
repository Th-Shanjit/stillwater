# Stillwater initial production audit

Reviewed source checkpoint:
1db7c39d82e91af12158d21dc913def4e266bd02

## Initial corrections

- Disable audio recording permissions.
- Disable normal Android automatic data backup.
- Preserve audio playback capability.
- Update legacy recovery path navigation.
- Improve initial guided practice wording.
- Document optional connected configuration.

Native permission and backup changes require a new build.
Backup settings are not proof of complete device-transfer
or iOS backup protection.

## Release blockers

### Privacy and security

- Verify biometric lock across every native modal.
- Protect sensitive app-switcher previews.
- Assess SQLite encryption and platform backup behaviour.
- Implement user-accessible private data deletion.
- Verify notification privacy and trusted-contact handling.
- Review Circle server security before public deployment.
- Verify billing SDK data practices.

### Reliability

- Recover gracefully from database initialisation failure.
- Verify database migrations on existing installations.
- Preserve first-install invitation routes.
- Verify premium access after expiry and refund.
- Make fresh-checkout lint validation reproducible.

### Interface

- Finish Journey design consistency.
- Review navigation hierarchy.
- Review screen-reader labels.
- Test large system text and small displays.
- Test reduced motion.
- Test hardware back and modal dismissal.

### Content

- Verify clinical claims and their supporting references.
- Avoid guaranteed urge durations and recovery outcomes.
- Review theological language across Christian traditions.
- Review possible reassurance and scrupulosity patterns.
- Verify scripture text, attribution and usage rights.
- Obtain qualified clinical and safeguarding review.
- Finalise all scripts before commissioning recordings.

### Commercial

- Publish accurate privacy policy and terms.
- Verify actual store products and prices.
- Test purchases, restoration and refunds.
- Keep unsupported gifts and paid hosted services unavailable.

## Release status

Source tests do not establish clinical safety,
native security, accessibility or store readiness.

Production release remains blocked pending the
relevant corrective work and human/device validation.
