# Part 04E - Feedback and Adaptation

Accepted adaptive recommendations are linked to their
boundary ID, suggestion ID and content version.

Acceptance and boundary creation share a transaction
on native devices.

Feedback appears in Progress only after a tracked
boundary is resolved or expires.

One feedback response is recorded per accepted plan.

Feedback is optional:
- helpful
- not_helpful
- not_tried
- skipped

Only helpful and not_helpful affect recommendation logic.

A suggestion version is deprioritised when negative
responses exceed positive responses by at least two
in the previous 30 days.

Existing active plans are never replaced automatically.
A general suggestion remains the neutral fallback.

Older feedback ages out of recommendation logic.
New content versions have independent feedback histories.

No personal feedback is sent to a remote service.
No new notification is scheduled.

Limitations:
- Only suggestions accepted from Today are tracked.
- Historical plans are not retroactively attributed.
- General fallback is not suppressed.
- Custom plans and immediate-support action feedback
  require future expansion.
- Feedback is self-reported, not a clinical outcome.
- Web transactions are not exclusive.
- No feedback editing or dedicated deletion UI yet.
- Native database and full device validation required.
