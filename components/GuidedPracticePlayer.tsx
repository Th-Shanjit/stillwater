
import {
  newRecoverySessionId,
  recordRecoveryEvent,
} from '../db/recoveryEvents';

import type {
  RecoveryFlow,
  RecoveryEventKind,
  RecoveryResult,
} from '../content/recoveryEvents';

import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import {
  initialSession,
  moveStep,
  tickSession,
  totalDuration,
  sessionElapsed,
  formatPracticeTime,
} from '../content/guidedPractice';

import type {
  GuidedPractice,
} from '../content/guidedPractice';

import {
  V2Text,
  V2Card,
  V2Button,
} from './StillwaterUI';

import { StillwaterMark } from './RoyalUI';
import { StillwaterV2 } from '../theme/stillwaterV2';
import type { V2Mode } from '../theme/stillwaterV2';

type PlaybackMode = 'manual' | 'timed';

interface Props {
  practice: GuidedPractice;
  onExit: () => void;
  mode?: V2Mode;
  exitLabel?: string;
  source?: RecoveryFlow;
  parentSessionId?: string;
}

export function GuidedPracticePlayer(props: Props) {
  return (
    <GuidedPracticeSession
      key={props.practice.id + ':' + props.practice.version}
      {...props}
    />
  );
}

function GuidedPracticeSession({
  practice,
  onExit,
  mode = 'night',
  exitLabel = 'Return to options',
  source = 'journey',
  parentSessionId,
}: Props) {
  const p = StillwaterV2[mode];
  const focused = useIsFocused();

  const [practiceSessionId, setPracticeSessionId] =
    useState(newRecoverySessionId);

  const started = useRef(false);

  const [playbackMode, setPlaybackMode] =
    useState<PlaybackMode>('manual');

  const [session, setSession] =
    useState(initialSession);

  const [foreground, setForeground] =
    useState(AppState.currentState === 'active');

  const step = practice.steps[session.stepIndex];
  const count = practice.steps.length;
  const total = totalDuration(practice);

  const elapsed = sessionElapsed(
    practice,
    session
  );

  const progress = session.reachedEnd
    ? 100
    : playbackMode === 'manual'
      ? (session.stepIndex / count) * 100
      : (elapsed / total) * 100;



  // Stop automatic progression when backgrounded.
  useEffect(() => {
    const subscription =
      AppState.addEventListener('change', state => {
        const active = state === 'active';

        setForeground(active);

        if (!active) {
          setSession(old => ({
            ...old,
            running: false,
          }));
        }
      });

    return () => subscription.remove();
  }, []);

  // Pause immediately when focus changes.
  const [previousFocus, setPreviousFocus] = useState(focused);

  if (previousFocus !== focused) {
    setPreviousFocus(focused);

    if (!focused) {
      setSession(old => ({
        ...old,
        running: false,
      }));
    }
  }

  useEffect(() => {
    if (
      playbackMode !== 'timed' ||
      !session.running ||
      session.reachedEnd ||
      !focused ||
      !foreground
    ) {
      return;
    }

    const timer = setInterval(() => {
      setSession(old => tickSession(practice, old));
    }, 1000);

    return () => clearInterval(timer);
  }, [
    practice,
    playbackMode,
    session.running,
    session.reachedEnd,
    focused,
    foreground,
  ]);

  const emitPracticeEvent = (
    kind: RecoveryEventKind,
    result: RecoveryResult
  ) => {
    void recordRecoveryEvent({
      sessionId: practiceSessionId,
      parentSessionId,
      flow: source,
      kind,
      contentId: practice.id,
      contentVersion: practice.version,
      result,
    });
  };

  const markStarted = () => {
    if (started.current) return;

    started.current = true;

    emitPracticeEvent(
      'practice_started',
      playbackMode
    );
  };

  useEffect(() => {
    if (session.reachedEnd && started.current) {
      void recordRecoveryEvent({
        sessionId: practiceSessionId,
        parentSessionId,
        flow: source,
        kind: 'practice_end_reached',
        contentId: practice.id,
        contentVersion: practice.version,
        result: 'reached_end',
      });
    }
  }, [
    session.reachedEnd,
    practiceSessionId,
    parentSessionId,
    source,
    practice.id,
    practice.version,
  ]);

  const exitPractice = () => {
    if (started.current) {
      if (session.reachedEnd) {
        emitPracticeEvent(
          'practice_end_reached',
          'reached_end'
        );
      }

      emitPracticeEvent(
        'practice_exit',
        session.reachedEnd
          ? 'reached_end'
          : 'left_before_end'
      );
    }

    onExit();
  };

  const restartPractice = () => {
    started.current = false;
    setPracticeSessionId(newRecoverySessionId());
    setSession(initialSession());
  };

  const changeMode = (next: PlaybackMode) => {
    setPlaybackMode(next);

    setSession(old => ({
      ...old,
      running: false,
      elapsedSeconds: 0,
    }));
  };

  const navigate = (delta: -1 | 1) => {
    if (delta === 1) markStarted();
    setSession(old => ({
      ...moveStep(practice, old, delta),
      running: false,
    }));
  };

  return (
    <View style={{ gap: 16 }}>

      <V2Text mode={mode} muted variant="label">
        GUIDED TEXT PRACTICE
      </V2Text>

      <V2Text mode={mode} variant="heading">
        {practice.title}
      </V2Text>

      <V2Text mode={mode} muted variant="secondary">
        {count} steps · {Math.ceil(total / 60)} min
        at the suggested pace
      </V2Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <V2Button
            mode={mode}
            label="My pace"
            tone={playbackMode === 'manual'
              ? 'primary' : 'secondary'}
            onPress={() => changeMode('manual')}
          />
        </View>

        <View style={{ flex: 1 }}>
          <V2Button
            mode={mode}
            label="Timed"
            tone={playbackMode === 'timed'
              ? 'primary' : 'secondary'}
            onPress={() => changeMode('timed')}
          />
        </View>
      </View>

      <V2Text mode={mode} muted variant="secondary">
        {playbackMode === 'manual'
          ? 'Continue whenever you are ready.'
          : 'Timed steps advance automatically while running.'}
      </V2Text>

      <View
        accessibilityLabel={
          session.reachedEnd
            ? 'End of practice'
            : `Step ${session.stepIndex + 1} of ${count}`
        }
        style={{
          height: 5,
          borderRadius: 4,
          backgroundColor: p.border,
          overflow: 'hidden',
        }}
      >
        <View style={{
          width: `${Math.min(100, progress)}%`,
          height: 5,
          borderRadius: 4,
          backgroundColor: p.primary,
        }} />
      </View>

      {session.reachedEnd ? (
        <>
          <V2Card mode={mode} tonal>
            <View style={{
              alignItems: 'center',
              paddingVertical: 18,
            }}>
              <Feather
                name="check-circle"
                size={46}
                color={p.primary}
              />
            </View>

            <V2Text
              mode={mode}
              variant="heading"
              style={{ textAlign: 'center' }}
            >
              End of practice.
            </V2Text>

            <V2Text
              mode={mode}
              muted
              style={{ textAlign: 'center' }}
            >
              Take your next step when you are ready.
            </V2Text>
          </V2Card>

          <V2Button
            mode={mode}
            label="Read the last step again"
            tone="secondary"
            onPress={() => setSession({
              stepIndex: count - 1,
              elapsedSeconds: 0,
              running: false,
              reachedEnd: false,
            })}
          />

          <V2Button
            mode={mode}
            label="Start again"
            tone="secondary"
            onPress={restartPractice}
          />
        </>
      ) : (
        <>
          <V2Card mode={mode}>
            <V2Text mode={mode} muted variant="label">
              STEP {session.stepIndex + 1} OF {count}
            </V2Text>

            <View style={{
              alignItems: 'center',
              paddingVertical: 18,
            }}>
              <StillwaterMark
                size={54}
                color={p.accent}
              />
            </View>

            <V2Text
              mode={mode}
              variant="section"
              style={{
                textAlign: 'center',
                fontWeight: '400',
                lineHeight: 31,
              }}
            >
              {step.text}
            </V2Text>
          </V2Card>

          {playbackMode === 'timed' && (
            <>
              <V2Text
                mode={mode}
                variant="heading"
                style={{ textAlign: 'center' }}
              >
                {formatPracticeTime(
                  step.durationSeconds -
                  session.elapsedSeconds
                )}
              </V2Text>

              <V2Button
                mode={mode}
                tone="secondary"
                icon={session.running ? 'pause' : 'play'}
                label={session.running
                  ? 'Pause guidance'
                  : 'Start timed guidance'}
                disabled={!foreground || !focused}
                onPress={() => {
                  if (!session.running) markStarted();

                  setSession(old => ({
                    ...old,
                    running: !old.running,
                  }));
                }}
              />
            </>
          )}

          <View style={{
            flexDirection: 'row',
            gap: 8,
          }}>
            <View style={{ flex: 1 }}>
              <V2Button
                mode={mode}
                tone="secondary"
                label="Previous"
                disabled={session.stepIndex === 0}
                onPress={() => navigate(-1)}
              />
            </View>

            <View style={{ flex: 1 }}>
              <V2Button
                mode={mode}
                label={
                  session.stepIndex === count - 1
                    ? 'Finish'
                    : 'Continue'
                }
                onPress={() => navigate(1)}
              />
            </View>
          </View>
        </>
      )}

      <V2Text
        mode={mode}
        muted
        variant="secondary"
        style={{ textAlign: 'center' }}
      >
        You can stop at any point.
        No voice recording is needed for this practice.
      </V2Text>

      <V2Button
        mode={mode}
        tone="quiet"
        label={exitLabel}
        onPress={exitPractice}
      />
    </View>
  );
}
