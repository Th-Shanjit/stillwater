# Part 04A - Personal Compass

## Purpose

Describe observed local recovery activity without
predicting setbacks or diagnosing the user.

## Sources

Pause counts, hours and contexts use pause_events.
Return counts use grace_resets.
Action selections and guided-practice participation
use the supplementary recovery_events table.

Never combine these counts into a recovery score.

## Observation rules

Time patterns require five recorded pauses on at
least three dates.

The leading time bucket must contain at least three
observations on three separate dates.

Tied leading buckets produce no highlighted pattern.

Context patterns apply the same requirements to
pauses with recognised context tags.

These are product heuristics, not validated
statistical or clinical prediction thresholds.

Action counts reflect recorded final selections.
They do not establish action execution or helpfulness.

Practice ends are matched to starts by session ID,
content ID and content version.

## Time handling

The reporting period covers today and the previous
29 local calendar dates.

Legacy recorded hours are preserved.
Legacy dates are reconstructed using the current
device timezone. Travel can affect date grouping.

## Privacy

Read-only analysis of the existing local database.
No new personal records, cloud calls or AI services.

## Limitations

Supplementary event histories may be incomplete.
Recorded interaction counts are not behavioural
frequency estimates.

No adaptive home recommendations are added yet.

04B will consume this summary to generate
explainable, optional preparation suggestions.
