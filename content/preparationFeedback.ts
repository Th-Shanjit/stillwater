export type PlanFeedback =
  | 'helpful'
  | 'not_helpful'
  | 'not_tried'
  | 'skipped';

export interface FeedbackObservation {
  suggestionId: string;
  suggestionVersion: number;
  feedback: PlanFeedback;
}

export const FEEDBACK_SCHEMA = [
  'CREATE TABLE IF NOT EXISTS preparation_feedback (',
  '  boundary_id TEXT PRIMARY KEY,',
  '  suggestion_id TEXT NOT NULL,',
  '  suggestion_version INTEGER NOT NULL,',
  '  source TEXT NOT NULL,',
  '  accepted_at TEXT NOT NULL,',
  '  feedback TEXT,',
  '  responded_at TEXT',
  ');',
  'CREATE INDEX IF NOT EXISTS idx_feedback_responded',
  '  ON preparation_feedback(responded_at);'
].join('\n');

export function feedbackKey(
  id: string,
  version: number
): string {
  return id + ':' + version;
}

export function validFeedback(
  value: string
): value is PlanFeedback {
  return [
    'helpful',
    'not_helpful',
    'not_tried',
    'skipped',
  ].includes(value);
}

export function getAvoidedSuggestions(
  observations: FeedbackObservation[]
): string[] {
  const scores = new Map<
    string,
    { helpful: number; unhelpful: number }
  >();

  for (const row of observations) {
    if (
      !row.suggestionId ||
      !Number.isInteger(row.suggestionVersion) ||
      row.suggestionVersion < 1
    ) {
      continue;
    }

    if (
      row.feedback !== 'helpful' &&
      row.feedback !== 'not_helpful'
    ) {
      continue;
    }

    const key = feedbackKey(
      row.suggestionId,
      row.suggestionVersion
    );

    const score = scores.get(key) ?? {
      helpful: 0,
      unhelpful: 0,
    };

    if (row.feedback === 'helpful') {
      score.helpful++;
    } else {
      score.unhelpful++;
    }

    scores.set(key, score);
  }

  return [...scores.entries()]
    .filter(([, score]) =>
      score.unhelpful - score.helpful >= 2
    )
    .map(([key]) => key)
    .sort();
}
