import { useCallback, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import type {
  ProgrammeDay,
  ProgrammeStepKind,
} from '../content/programme';

import {
  initialProgrammeSession,
  advanceProgrammeStep,
  previousProgrammeStep,
  getProgrammeSessionResult,
  type ProgrammeSession,
  type StepDisposition,
  type ProgrammeSessionResult,
} from '../content/programmeSession';

import {
  V2Screen,
  V2Text,
  V2Card,
  V2Button,
  V2Artwork,
} from './StillwaterUI';

import { StillwaterV2 } from '../theme/stillwaterV2';

const mode = 'day' as const;
const p = StillwaterV2.day;

const PRESENTATION = {
  guidance: {
    label: 'Guidance',
    icon: 'sunrise',
    artwork: 'water',
  },
  action: {
    label: 'Practical action',
    icon: 'compass',
    artwork: 'threshold',
  },
  prayer: {
    label: 'Prayer',
    icon: 'book-open',
    artwork: 'water',
  },
  reflection: {
    label: 'Reflection',
    icon: 'feather',
    artwork: 'growth',
  },
  quiet: {
    label: 'A quiet moment',
    icon: 'sun',
    artwork: 'water',
  },
} as const satisfies Record<
  ProgrammeStepKind,
  {
    label: string;
    icon: string;
    artwork: 'water' | 'threshold' | 'growth';
  }
>;

export function ProgrammePlayer({
  programmeTitle,
  day,
  dayNumber,
  totalDays,
  initialSession,
  onProgress,
  onExit,
  onFinish,
}: {
  programmeTitle: string;
  day: ProgrammeDay;
  dayNumber: number;
  totalDays: number;
  initialSession?: ProgrammeSession;
  onProgress?: (
    session: ProgrammeSession
  ) => void | Promise<void>;
  onExit: () => void;
  onFinish: (
    result: ProgrammeSessionResult
  ) => void | Promise<void>;
}) {
  const [session, setSession] = useState(
    () => initialSession ?? initialProgrammeSession(day)
  );

  const [error, setError] = useState('');
  const finished = useRef(false);
  const savingLock = useRef(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (!savingLock.current && !finished.current) {
            onExit();
          }

          return true;
        }
      );

      return () => subscription.remove();
    }, [onExit])
  );

  const reviewing =
    session.cursor === day.steps.length;

  const step = day.steps[session.cursor];


  const saveAndMove = async (
    next: ProgrammeSession
  ) => {
    if (
      savingLock.current ||
      finished.current ||
      next === session
    ) {
      return;
    }

    savingLock.current = true;
    setSaving(true);
    setError('');

    try {
      await onProgress?.(next);
      setSession(next);
    } catch {
      setError(
        'Your position could not be saved. Please try again.'
      );
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  };

  const advance = (disposition: StepDisposition) => {
    void saveAndMove(
      advanceProgrammeStep(
        day,
        session,
        session.cursor,
        disposition
      )
    );
  };

  const back = () => {
    if (savingLock.current || finished.current) return;

    if (session.cursor === 0) {
      onExit();
      return;
    }

    void saveAndMove(
      previousProgrammeStep(session)
    );
  };

  const finish = async () => {
    if (finished.current || savingLock.current) return;

    const result =
      getProgrammeSessionResult(day, session);

    if (!result) {
      setError('Review the session before finishing.');
      return;
    }

    finished.current = true;
    savingLock.current = true;

    setSaving(true);
    setError('');

    try {
      await onFinish(result);
    } catch {
      finished.current = false;
      setError(
        'Unable to save completion. Please try again.'
      );
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  };

  const presentation = step
    ? PRESENTATION[step.kind]
    : null;

  return (
    <V2Screen
      mode={mode}
      footer={
        <View style={{ gap: 8 }}>
          {reviewing ? (
            <V2Button
              mode={mode}
              label={saving ? 'Saving...' : 'Finish session'}
              icon="check"
              disabled={saving}
              onPress={() => void finish()}
            />
          ) : (
            <>
              <V2Button
                mode={mode}
                label={step.kind === 'action'
                  ? 'Continue when ready'
                  : 'Continue'}
                icon="arrow-right"
                disabled={saving}
                onPress={() => advance('continued')}
              />

              {step.optional && (
                <V2Button
                  mode={mode}
                  tone="quiet"
                  label={step.kind === 'prayer'
                    ? 'Skip prayer'
                    : 'Skip this step'}
                  disabled={saving}
                  onPress={() => advance('skipped')}
                />
              )}
            </>
          )}
        </View>
      }
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous step"
          disabled={saving}
          onPress={back}
          style={{
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather
            name="arrow-left"
            color={p.primary}
            size={23}
          />
        </Pressable>

        <V2Text
          mode={mode}
          variant="label"
          muted
          style={{
            flex: 1,
            textAlign: 'center',
          }}
        >
          {programmeTitle}
        </V2Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Leave session"
          disabled={saving}
          onPress={() => {
            if (!savingLock.current) onExit();
          }}
          style={{
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather
            name="x"
            color={p.muted}
            size={23}
          />
        </Pressable>
      </View>

      <View
        accessible
        accessibilityLabel={reviewing
          ? 'Session review'
          : 'Step ' + (session.cursor + 1) +
            ' of ' + day.steps.length}
        style={{
          flexDirection: 'row',
          gap: 4,
        }}
      >
        {day.steps.map((item, index) => (
          <View
            key={item.id}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor:
                index <= session.cursor
                  ? p.muted
                  : p.secondary,
            }}
          />
        ))}
      </View>

      <V2Text mode={mode} muted variant="label">
        DAY {dayNumber} OF {totalDays} · {day.title}
      </V2Text>

      {reviewing ? (
        <>
          <V2Artwork
            mode={mode}
            kind="growth"
            height={150}
          />

          <V2Text
            mode={mode}
            variant="display"
            style={{ textAlign: 'center' }}
          >
            Ready to close?
          </V2Text>

          <V2Card mode={mode} tonal>
            <V2Text mode={mode}>
              Carry one small intention into the rest
              of your day.
            </V2Text>

            <V2Text
              mode={mode}
              muted
              variant="secondary"
            >
              {onProgress
                ? 'Finishing records the session, not proof that every suggested action was performed.'
                : 'This experience does not create a personal participation record.'}
            </V2Text>
          </V2Card>

          <V2Button
            mode={mode}
            tone="quiet"
            label="Review previous step"
            disabled={saving}
            onPress={back}
          />
        </>
      ) : step && presentation ? (
        <>
          <V2Artwork
            mode={mode}
            kind={presentation.artwork}
            height={150}
          />

          <View style={{
            alignItems: 'center',
            gap: 12,
            paddingVertical: 10,
          }}>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: p.secondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Feather
                name={presentation.icon}
                size={26}
                color={p.primary}
              />
            </View>

            <V2Text
              mode={mode}
              muted
              variant="label"
            >
              {presentation.label}
              {step.optional ? ' · Optional' : ''}
            </V2Text>

            <V2Text
              mode={mode}
              variant="display"
              style={{ textAlign: 'center' }}
            >
              {step.title}
            </V2Text>

            <V2Text
              mode={mode}
              style={{
                fontSize: 19,
                lineHeight: 28,
                textAlign: 'center',
              }}
            >
              {step.text}
            </V2Text>
          </View>

          {step.suggestedSeconds > 0 && (
            <V2Text
              mode={mode}
              muted
              variant="secondary"
              style={{ textAlign: 'center' }}
            >
              Suggested time: {step.suggestedSeconds} seconds.
              Continue whenever you are ready.
            </V2Text>
          )}

          {step.audioAssetId && (
            <V2Text
              mode={mode}
              muted
              variant="secondary"
              style={{ textAlign: 'center' }}
            >
              This step is currently available as guided text.
            </V2Text>
          )}
        </>
      ) : null}

      {error !== '' && (
        <V2Text mode={mode}>{error}</V2Text>
      )}
    </V2Screen>
  );
}
