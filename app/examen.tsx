
import {
  newRecoverySessionId,
  recordRecoveryEvent,
} from '../db/recoveryEvents';

import {
  useEffect, useRef, useState,
} from 'react';

import {
  Pressable, View,
} from 'react-native';

import {
  useRouter, useIsFocused,
} from 'expo-router';

import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import {
  getPreferences,
  getLocalDateString,
  recordEveningWindDown,
} from '../db/queries';

import type { ToneTrack } from '../db/queries';

import {
  V2Screen,
  V2Text,
  V2Button,
  V2Card,
  V2ActionRow,
} from '../components/StillwaterUI';

import { V2Breathing } from '../components/StillwaterBreathing';

import {
  GuidedPracticePlayer,
} from '../components/GuidedPracticePlayer';

import {
  fromLegacyPractice,
} from '../content/guidedPractice';

import type {
  LegacyPractice,
} from '../content/guidedPractice';

import { StillwaterMark } from '../components/RoyalUI';
import { StillwaterV2 } from '../theme/stillwaterV2';

import examenPrompts from '../assets/content/examen_prompts.json';
import midnightAudio from '../assets/content/midnight_audio.json';

type Scene =
  | 'main'
  | 'reflection'
  | 'breathing'
  | 'prayer'
  | 'guided'
  | 'finished';

const mode = 'night' as const;
const p = StillwaterV2.night;

const DRAINED_OPTIONS = [
  ['work_pressure', 'Work pressure'],
  ['feeling_unseen', 'Feeling unseen'],
  ['physical_fatigue', 'Physical fatigue'],
  ['aimless_scrolling', 'Aimless scrolling'],
  ['conflict_or_tension', 'Conflict or tension'],
] as const;

const legacyEveningPractice = (
  midnightAudio as LegacyPractice[]
).find(track => track.id === 'eyes_closed_examen');

function MoonArtwork() {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{
        borderRadius: 18,
        overflow: 'hidden',
      }}
    >
      <Svg
        width="100%"
        height={132}
        viewBox="0 0 340 132"
        preserveAspectRatio="xMidYMid slice"
      >
        <Rect width={340} height={132} fill="#1C302F" />

        <Circle
          cx={170} cy={44} r={37}
          fill="#D6B47D" opacity={0.04}
        />

        <Circle
          cx={170} cy={44} r={27}
          fill="#D6B47D" opacity={0.08}
        />

        <Path
          d="M180 23 A24 24 0 1 0 192 61
             A29 29 0 0 1 180 23Z"
          fill="#D6B47D"
        />

        <Path
          d="M0 89 Q70 48 145 91 T340 76 V132 H0Z"
          fill="#36534D"
        />

        <Path
          d="M0 105 Q80 84 170 105 T340 97 V132 H0Z"
          fill="#29403C"
        />

        <Path
          d="M143 113 H197 M125 122 H215 M151 129 H189"
          stroke="#D6B47D"
          strokeWidth={1}
          opacity={0.4}
        />
      </Svg>
    </View>
  );
}

export default function ExamenModal() {
  const router = useRouter();
  const focused = useIsFocused();

  const [recoverySessionId] =
    useState(newRecoverySessionId);

  const [scene, setScene] = useState<Scene>('main');
  const [track, setTrack] = useState<ToneTrack>('scripture');

  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const busy = useRef(false);
  const recorded = useRef(false);

  // Keep one date for a session that crosses midnight.
  const [practiceDate] = useState(
    () => getLocalDateString()
  );

  const [prompt] = useState(() =>
    examenPrompts[new Date().getDate() % examenPrompts.length]
  );

  useEffect(() => {
    let mounted = true;

    getPreferences()
      .then(prefs => {
        if (mounted) {
          setTrack(prefs.tone_track);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const leave = () => {
    if (busy.current) return;

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const toggleTag = (tag: string) => {
    if (busy.current) return;

    setTags(old =>
      old.includes(tag)
        ? old.filter(item => item !== tag)
        : [...old, tag]
    );
  };

  const finish = async () => {
    if (busy.current || recorded.current) return;

    busy.current = true;
    setSaving(true);
    setError('');

    try {
      await recordEveningWindDown(
        practiceDate,
        tags.length > 0 ? tags : undefined
      );

      await recordRecoveryEvent({
        sessionId: recoverySessionId,
        flow: 'evening',
        kind: 'evening_saved',
        contentId: 'evening_wind_down',
        contentVersion: 1,
        localDate: practiceDate,
        result: 'saved',
      });

      recorded.current = true;
      setScene('finished');

    } catch {
      setError(
        'Your evening practice could not be saved. Try again or leave without recording.'
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const go = (next: Scene) => {
    if (busy.current) return;

    setError('');
    setScene(next);
  };

  const prayer =
    track === 'liturgical'
      ? 'Into your hands, Lord, I place this day and all that remains unfinished.'
      : 'Lord, thank you for the good of today. Help me rest and begin tomorrow with grace.';

  const headings: Record<Scene, string> = {
    main: 'END THE DAY',
    reflection: 'A QUIET REFLECTION',
    breathing: 'PREPARE TO REST',
    prayer: 'EVENING PRAYER',
    guided: 'GUIDED EXAMEN',
    finished: 'GOODNIGHT',
  };

  return (
    <V2Screen
      mode={mode}
      footer={
        scene === 'finished' ? (
          <V2Button
            mode={mode}
            label="Goodnight"
            icon="moon"
            onPress={leave}
          />
        ) : (
          <V2Button
            mode={mode}
            label={
              saving
                ? 'Recording...'
                : 'Finish for tonight'
            }
            disabled={saving}
            icon="check"
            onPress={() => void finish()}
          />
        )
      }
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        {scene !== 'main' && scene !== 'finished' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Return to evening options"
            disabled={saving}
            onPress={() => go('main')}
            style={{
              minWidth: 48,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Feather
              name="arrow-left"
              size={22}
              color={p.text}
            />
          </Pressable>
        )}

        <V2Text
          mode={mode}
          muted
          variant="label"
          style={{ flex: 1 }}
        >
          {headings[scene]}
        </V2Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close evening practice"
          disabled={saving}
          onPress={leave}
          style={{
            minWidth: 48,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="x" size={23} color={p.text} />
        </Pressable>
      </View>

      {scene === 'main' && (
        <>
          <MoonArtwork />

          <V2Text mode={mode} variant="display">
            Set the day down.
          </V2Text>

          <V2Text mode={mode} muted>
            Leave tomorrow&apos;s concerns for tomorrow.
          </V2Text>

          <V2Card mode={mode} tonal>
            <V2Text
              mode={mode}
              muted
              variant="label"
            >
              ONE THING BEFORE BED
            </V2Text>

            <Feather
              name="moon"
              size={28}
              color={p.primary}
            />

            <V2Text mode={mode} variant="heading">
              Give yourself room to rest.
            </V2Text>

            <V2Text mode={mode}>
              Choose somewhere away from your bed
              to leave your phone, if possible.
            </V2Text>
          </V2Card>

          <V2Text mode={mode} muted variant="label">
            OPTIONAL MOMENTS
          </V2Text>

          <V2ActionRow
            mode={mode}
            icon="book-open"
            label="Reflect on today"
            description="Notice what helped and what drained you"
            onPress={() => go('reflection')}
          />

          <V2ActionRow
            mode={mode}
            icon="wind"
            label="Take three slow breaths"
            description="30-second guided practice"
            onPress={() => go('breathing')}
          />

          <V2ActionRow
            mode={mode}
            icon="heart"
            label="Evening prayer"
            onPress={() => go('prayer')}
          />

          {legacyEveningPractice && (
            <V2ActionRow
              mode={mode}
              icon="book-open"
              label="A longer evening practice"
              description="Optional 5-minute guided text"
              onPress={() => go('guided')}
            />
          )}

          <V2Text mode={mode} muted variant="secondary">
            You can finish without completing any
            of these optional practices.
          </V2Text>
        </>
      )}

      {scene === 'reflection' && (
        <>
          <V2Text mode={mode} variant="display">
            Notice your day.
          </V2Text>

          <V2Card mode={mode} tonal>
            <V2Text
              mode={mode}
              muted
              variant="label"
            >
              GRATITUDE
            </V2Text>

            <V2Text mode={mode} variant="section">
              {prompt.consolation}
            </V2Text>

            <V2Text mode={mode} muted>
              Think of something quietly.
              There is no need to write it down.
            </V2Text>
          </V2Card>

          <V2Text mode={mode} variant="section">
            {prompt.desolation}
          </V2Text>

          <V2Text mode={mode} muted>
            Select anything that fits, or skip this.
          </V2Text>

          {DRAINED_OPTIONS.map(([key, label]) => (
            <V2ActionRow
              key={key}
              mode={mode}
              icon="circle"
              label={label}
              selected={tags.includes(key)}
              onPress={() => toggleTag(key)}
            />
          ))}

          <V2Button
            mode={mode}
            tone="quiet"
            label="Clear my selections"
            disabled={saving}
            onPress={() => setTags([])}
          />

          <V2Text mode={mode} muted variant="secondary">
            Selected answers are saved locally only
            when you finish the evening practice.
          </V2Text>
        </>
      )}

      {scene === 'breathing' && (
        <>
          <V2Text mode={mode} variant="display">
            Make room for rest.
          </V2Text>

          <V2Breathing
            mode={mode}
            active={focused && !saving}
          />

          <V2Button
            mode={mode}
            tone="quiet"
            label="Return to evening options"
            disabled={saving}
            onPress={() => go('main')}
          />
        </>
      )}

      {scene === 'prayer' && (
        <>
          <View style={{
            alignItems: 'center',
            paddingVertical: 32,
          }}>
            <StillwaterMark
              size={76}
              color={p.accent}
            />
          </View>

          <V2Text
            mode={mode}
            variant="display"
            style={{ textAlign: 'center' }}
          >
            Lay the day down.
          </V2Text>

          <V2Card mode={mode} tonal>
            <V2Text
              mode={mode}
              variant="section"
              style={{
                textAlign: 'center',
                lineHeight: 32,
              }}
            >
              {prayer}
            </V2Text>
          </V2Card>

          <V2Text
            mode={mode}
            muted
            style={{ textAlign: 'center' }}
          >
            Stay briefly, or leave when you are ready.
          </V2Text>
        </>
      )}

      {scene === 'guided' && legacyEveningPractice && (
        <GuidedPracticePlayer
          key="evening-wind-down"
          source="evening"
          parentSessionId={recoverySessionId}
          practice={fromLegacyPractice(legacyEveningPractice)}
          mode={mode}
          exitLabel="Return to evening options"
          onExit={() => go('main')}
        />
      )}

      {scene === 'finished' && (
        <>
          <MoonArtwork />

          <View style={{
            alignItems: 'center',
            paddingVertical: 24,
          }}>
            <StillwaterMark
              size={64}
              color={p.accent}
            />
          </View>

          <V2Text
            mode={mode}
            variant="display"
            style={{ textAlign: 'center' }}
          >
            Rest well.
          </V2Text>

          <V2Text
            mode={mode}
            muted
            style={{ textAlign: 'center' }}
          >
            Your evening practice is recorded.
          </V2Text>

          <V2Text
            mode={mode}
            muted
            variant="secondary"
            style={{ textAlign: 'center' }}
          >
            Put your phone away when you are ready.
          </V2Text>
        </>
      )}

      {error !== '' && (
        <V2Card mode={mode}>
          <V2Text mode={mode}>{error}</V2Text>
        </V2Card>
      )}
    </V2Screen>
  );
}
