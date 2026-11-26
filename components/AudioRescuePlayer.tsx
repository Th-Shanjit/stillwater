import { bundledRecording } from '../content/bundledRecordings';
import { usePrivacyCovered } from './PrivacyCover';
import { useIsFocused } from 'expo-router';
import type { RecoveryFlow } from '../content/recoveryEvents';
import { GuidedPracticePlayer } from './GuidedPracticePlayer';
import { fromLegacyPractice } from '../content/guidedPractice';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Sizes, Spacing, Typography } from '../theme/tokens';
import { PrimaryButton } from './RoyalUI';

export interface RescueAudioCue {
  atSecond: number;
  text: string;
}

export interface RescueAudioTrack {
  id: string;
  title: string;
  subtitle: string;
  durationSeconds: number;
  tier: 'free' | 'plus';
  audioUri: string | null;
  cues: RescueAudioCue[];
}

interface AudioRescuePlayerProps {
  track: RescueAudioTrack;
  onComplete: () => void;
  completeLabel?: string;
  inProgressLabel?: string;
  practiceSource?: RecoveryFlow;
  parentSessionId?: string;
  onPlaybackStarted?: () => void;
}

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}


function RecordedAudioPlayer({
  track,
  source,
  onComplete,
  onReadInstead,
  completeLabel = 'Close practice',
  inProgressLabel = 'Return to options',
  onPlaybackStarted,
}: AudioRescuePlayerProps & {
  source: number;
  onReadInstead: () => void;
}) {
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);

  const covered = usePrivacyCovered();
  const focused = useIsFocused();

  const [modeReady, setModeReady] =
    useState(false);

  const [failed, setFailed] =
    useState(false);

  const [eyesClosedDim, setEyesClosedDim] =
    useState(false);

  const playbackReported = useRef(false);
  const operationEpoch = useRef(0);
  const transportBusy = useRef(false);

  // Configure foreground playback only.
  // Never publish sensitive track titles to lockscreen
  // media controls.
  useEffect(() => {
    let mounted = true;

    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    })
      .then(() => {
        if (mounted) setModeReady(true);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Privacy and route transitions must pause playback.
  useEffect(() => {
    if (covered || !focused) {
      operationEpoch.current += 1;

      try {
        player.pause();
      } catch {
        // Player may already be released.
      }
    }
  }, [covered, focused, player]);

  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState !== 'active') {
          operationEpoch.current += 1;

          try {
            player.pause();
          } catch {
            // Safe cleanup.
          }
        }
      }
    );

    return () => {
      operationEpoch.current += 1;
      sub.remove();

      try {
        player.pause();
      } catch {
        // Safe cleanup.
      }
    };
  }, [player]);

  useEffect(() => {
    if (
      status.playing &&
      !playbackReported.current
    ) {
      playbackReported.current = true;
      onPlaybackStarted?.();
    }
  }, [status.playing, onPlaybackStarted]);

  const totalSeconds =
    status.duration > 0
      ? status.duration
      : track.durationSeconds;

  const elapsedSeconds =
    status.currentTime ?? 0;

  const remainingSeconds = Math.max(
    0,
    totalSeconds - elapsedSeconds
  );

  const isFinished =
    status.didJustFinish ||
    (
      status.duration > 0 &&
      elapsedSeconds >= status.duration - 0.25
    );

  let activeCueIndex = 0;

  for (let i = 0; i < track.cues.length; i++) {
    if (
      elapsedSeconds >= track.cues[i].atSecond
    ) {
      activeCueIndex = i;
    }
  }

  const canPlay =
    modeReady &&
    status.isLoaded &&
    !status.error &&
    !failed &&
    !covered &&
    focused;

  const handleTogglePlay = async () => {
    if (!canPlay || transportBusy.current) return;

    const epoch = ++operationEpoch.current;

    transportBusy.current = true;

    try {
      if (status.playing) {
        player.pause();
        return;
      }

      if (isFinished) {
        await player.seekTo(0);
      }

      if (
        epoch !== operationEpoch.current ||
        AppState.currentState !== 'active'
      ) {
        return;
      }

      player.play();

    } catch {
      setFailed(true);
    } finally {
      transportBusy.current = false;
    }
  };

  const handleSkip = async (
    deltaSeconds: number
  ) => {
    if (!canPlay || transportBusy.current) return;

    transportBusy.current = true;

    try {
      await player.seekTo(
        Math.max(
          0,
          Math.min(
            totalSeconds,
            elapsedSeconds + deltaSeconds
          )
        )
      );
    } catch {
      setFailed(true);
    } finally {
      transportBusy.current = false;
    }
  };

  const progress = totalSeconds > 0
    ? Math.min(
        100,
        elapsedSeconds / totalSeconds * 100
      )
    : 0;

  if (eyesClosedDim && !failed && !status.error) {
    return (
      <Pressable
        onPress={() => setEyesClosedDim(false)}
        accessibilityRole="button"
        accessibilityLabel="Return to audio controls"
        style={styles.dimOverlay}
      >
        <Text style={styles.dimClock}>
          {formatClock(remainingSeconds)}
        </Text>

        <Text style={styles.dimNote}>
          {status.playing
            ? 'Listening. Tap to show controls.'
            : 'Paused. Tap to show controls.'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>
          GUIDED LISTENING
        </Text>

        <Text style={styles.title}>
          {track.title}
        </Text>

        <Text style={styles.cueText}>
          {failed || status.error
            ? 'The recording is unavailable. You can continue using the text practice.'
            : !canPlay
              ? 'Preparing your recording...'
              : 'Listen at your own pace. You can pause or leave whenever you wish.'}
        </Text>
      </View>

      <Text style={styles.timer}>
        {formatClock(remainingSeconds)}
      </Text>

      <View style={styles.progressTrack}>
        <View style={[
          styles.progressFill,
          { width: progress + '%' },
        ]} />
      </View>

      <View style={styles.cueCard}>
        <Text style={styles.cueText}>
          {track.cues[activeCueIndex]?.text ?? ''}
        </Text>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Rewind 15 seconds"
          accessibilityState={{ disabled: !canPlay }}
          disabled={!canPlay}
          onPress={() => void handleSkip(-15)}
          style={styles.iconControl}
        >
          <Feather
            name="rotate-ccw"
            size={20}
            color={Palette.night.text}
          />
          <Text style={styles.skipLabel}>
            15s
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            status.playing ? 'Pause' : 'Play'
          }
          accessibilityState={{ disabled: !canPlay }}
          disabled={!canPlay}
          onPress={() => void handleTogglePlay()}
          style={[
            styles.playControl,
            { opacity: canPlay ? 1 : 0.5 },
          ]}
        >
          <Feather
            name={status.playing ? 'pause' : 'play'}
            size={26}
            color={Palette.night.onPrimary}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Forward 15 seconds"
          accessibilityState={{ disabled: !canPlay }}
          disabled={!canPlay}
          onPress={() => void handleSkip(15)}
          style={styles.iconControl}
        >
          <Feather
            name="rotate-cw"
            size={20}
            color={Palette.night.text}
          />

          <Text style={styles.skipLabel}>
            15s
          </Text>
        </Pressable>
      </View>

      {canPlay && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dim screen for listening"
          onPress={() => setEyesClosedDim(true)}
          style={styles.dimToggle}
        >
          <Text style={styles.dimToggleText}>
            Dim screen for listening
          </Text>
        </Pressable>
      )}

      <PrimaryButton
        label="Read instead"
        onPress={onReadInstead}
      />

      <PrimaryButton
        label={
          isFinished
            ? completeLabel
            : inProgressLabel
        }
        onPress={onComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  headerBlock: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  eyebrow: {
    ...Typography.label,
    color: Palette.night.scriptureGold,
    letterSpacing: 1.1,
  },
  title: {
    ...Typography.section,
    color: Palette.night.text,
    textAlign: 'center',
  },
  timer: {
    ...Typography.metric,
    fontSize: 52,
    lineHeight: 56,
    color: Palette.night.primaryTonalText,
    textAlign: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 3,
    backgroundColor: Palette.night.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Palette.night.breathRing,
  },
  cueCard: {
    backgroundColor: Palette.night.surface,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.night.border,
    borderRadius: Radius.group,
    padding: Spacing.lg,
    minHeight: 150,
    justifyContent: 'center',
  },
  cueText: {
    fontFamily: Typography.scriptureFamily,
    fontSize: 19,
    lineHeight: 29,
    color: Palette.night.text,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  iconControl: {
    minWidth: 56,
    minHeight: Sizes.minTouchTarget,
    borderRadius: Radius.standard,
    backgroundColor: Palette.night.surface,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.night.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
  },
  skipLabel: {
    fontFamily: Typography.sansFamily,
    fontSize: 12,
    fontWeight: '600',
    color: Palette.night.textSecondary,
  },
  playControl: {
    width: 64,
    height: 64,
    borderRadius: Radius.circle,
    backgroundColor: Palette.night.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimToggle: {
    minHeight: Sizes.minTouchTarget,
    borderRadius: Radius.standard,
    backgroundColor: Palette.night.primaryTonal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  dimToggleText: {
    fontFamily: Typography.sansFamily,
    fontSize: 14,
    fontWeight: '600',
    color: Palette.night.primaryTonalText,
  },
  dimOverlay: {
    flex: 1,
    backgroundColor: '#0A0C14',
    borderRadius: Radius.feature,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  dimClock: {
    ...Typography.metric,
    fontSize: 48,
    color: '#465070',
  },
  dimNote: {
    ...Typography.secondary,
    color: '#465070',
    textAlign: 'center',
  },
});

/**
 * Preserve the existing public component interface.
 * Text practices use the V2 guided engine.
 * Recorded assets retain the native audio implementation.
 */

function PracticeMedia(
  props: AudioRescuePlayerProps
) {
  const { track } = props;

  const [readInstead, setReadInstead] =
    useState(false);

  const source = bundledRecording(track.id);

  if (
    source !== undefined &&
    !readInstead
  ) {
    return (
      <RecordedAudioPlayer
        {...props}
        source={source}
        onReadInstead={() => setReadInstead(true)}
      />
    );
  }

  return (
    <GuidedPracticePlayer
      key={track.id}
      practice={fromLegacyPractice({
        ...track,
        audioUri: null,
      })}
      source={props.practiceSource ?? 'journey'}
      parentSessionId={props.parentSessionId}
      onExit={props.onComplete}
      exitLabel={
        props.inProgressLabel ??
        'Return to options'
      }
    />
  );
}

export function AudioRescuePlayer(
  props: AudioRescuePlayerProps
) {
  return (
    <PracticeMedia
      key={props.track.id}
      {...props}
    />
  );
}
