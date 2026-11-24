import anchorsData from '../assets/content/morning_anchors.json';
import { didResetRecently, getDominantRecentEmotion, ToneTrack } from './queries';

interface TrackCopy {
  source: string;
  excerpt: string;
  reflection: string;
  intentionPrompt: string;
}

interface AnchorEntry {
  id: string;
  category: 'daily' | 'mercy_return' | 'emotion';
  emotionTag?: string;
  tracks: {
    scripture: TrackCopy;
    liturgical: TrackCopy;
  };
}

export interface ResolvedMorningAnchor {
  id: string;
  badge: string;
  source: string;
  excerpt: string;
  reflection: string;
  intentionPrompt: string;
  mode: 'mercy' | 'emotion' | 'daily';
}

const ANCHORS = anchorsData as AnchorEntry[];

const EMOTION_MAP: Record<string, string> = {
  lonely: 'lonely',
  loneliness: 'lonely',
  exhausted: 'exhausted',
  exhaustion: 'exhausted',
  stressed: 'stressed',
  pressure: 'stressed',
};

/**
 * Local state-aware content selector (zero cloud calls):
 * 1. Day-After-Mercy if a Grace Reset occurred yesterday or today.
 * 2. Emotion-Matched anchor if the same root trigger appeared 2+ times in 7 days.
 * 3. Deterministic day-of-year rotation through the 14 daily BSB anchors.
 */
export async function getSmartMorningAnchor(track: ToneTrack): Promise<ResolvedMorningAnchor> {
  const recentReset = await didResetRecently();
  if (recentReset) {
    const mercyPool = ANCHORS.filter((a) => a.category === 'mercy_return');
    const chosen = mercyPool[new Date().getDate() % mercyPool.length] ?? ANCHORS[0];
    const copy = chosen.tracks[track];
    return {
      id: chosen.id,
      badge: `MERCY NEW · ${copy.source.toUpperCase()}`,
      ...copy,
      mode: 'mercy',
    };
  }

  const dominantEmotion = await getDominantRecentEmotion();
  const mappedEmotion = dominantEmotion ? EMOTION_MAP[dominantEmotion] : undefined;
  if (mappedEmotion) {
    const match = ANCHORS.find(
      (a) => a.category === 'emotion' && a.emotionTag === mappedEmotion
    );
    if (match) {
      const copy = match.tracks[track];
      return {
        id: match.id,
        badge: `FOR THIS WEEK · ${copy.source.toUpperCase()}`,
        ...copy,
        mode: 'emotion',
      };
    }
  }

  const dailyPool = ANCHORS.filter((a) => a.category === 'daily');
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const chosen = dailyPool[dayOfYear % dailyPool.length] ?? ANCHORS[0];
  const copy = chosen.tracks[track];

  return {
    id: chosen.id,
    badge: `MORNING ANCHOR · ${copy.source.toUpperCase()}`,
    ...copy,
    mode: 'daily',
  };
}