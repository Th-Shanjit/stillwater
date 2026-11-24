import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';
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
}

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AudioRescuePlayer({
  track,
  onComplete,
  completeLabel = 'Put phone down & close',
}: AudioRescuePlayerProps) {
  const hasRealAudio = Boolean(track.audioUri);
  const audioSource = useMemo(
    () => (track.audioUri ? { uri: track.audioUri } : null),
    [track.audioUri]
  );

  // Expo SDK 58 native audio player hook
  const player = useAudioPlayer(audioSource);
  const status = useAudioPlayerStatus(player);

  // Fallback timed-script state when audioUri is null (pre-recording)
  const [timedRunning, setTimedRunning] = useState(true);
  const [timedElapsed, setTimedElapsed] = useState(0);
  const [eyesClosedDim, setEyesClosedDim] = useState(false);

  const lastCueIdxRef = useRef(-1);

  // Enable playback past iOS silent switch and in background when MP3 is present
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});

    if (hasRealAudio) {
      try {
        player.play();
      } catch {
        // User can tap Play manually
      }
    }

    return () => {
      try {
        player.pause();
      } catch {
        // Safe cleanup
      }
    };
  }, [hasRealAudio, player]);

  // Pause fallback text timer if app is backgrounded; real MP3 keeps playing in background
  useEffect(() => {
    if (hasRealAudio) return;
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') setTimedRunning(false);
    });
    return () => sub.remove();
  }, [hasRealAudio]);

  useEffect(() => {
    if (hasRealAudio || !timedRunning) return;
    const interval = setInterval(() => {
      setTimedElapsed((prev) => {
        if (prev + 1 >= track.durationSeconds) {
          clearInterval(interval);
          setTimedRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return track.durationSeconds;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [hasRealAudio, timedRunning, track.durationSeconds]);

  const totalSeconds =
    hasRealAudio && status.duration > 0 ? Math.round(status.duration) : track.durationSeconds;
  const elapsedSeconds = hasRealAudio ? Math.floor(status.currentTime ?? 0) : timedElapsed;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const isPlaying = hasRealAudio ? Boolean(status.playing) : timedRunning;
  const isFinished =
    hasRealAudio ? Boolean(status.didJustFinish) : timedElapsed >= track.durationSeconds;

  // Resolve current synced script cue
  const activeCueIndex = useMemo(() => {
    let idx = 0;
    for (let i = 0; i < track.cues.length; i++) {
      if (elapsedSeconds >= track.cues[i].atSecond) idx = i;
    }
    return idx;
  }, [elapsedSeconds, track.cues]);

  useEffect(() => {
    if (activeCueIndex !== lastCueIdxRef.current && lastCueIdxRef.current !== -1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    }
    lastCueIdxRef.current = activeCueIndex;
  }, [activeCueIndex]);

  const handleTogglePlay = () => {
    Haptics.selectionAsync().catch(() => {});
    if (hasRealAudio) {
      if (isPlaying) {
        player.pause();
      } else {
        if (isFinished) {
          Promise.resolve(player.seekTo(0)).catch(() => {});
        }
        player.play();
      }
    } else {
      if (isFinished) {
        setTimedElapsed(0);
        setTimedRunning(true);
      } else {
        setTimedRunning((prev) => !prev);
      }
    }
  };

  const handleSkip = (deltaSec: number) => {
    Haptics.selectionAsync().catch(() => {});
    const target = Math.max(0, Math.min(totalSeconds, elapsedSeconds + deltaSec));
    if (hasRealAudio) {
      Promise.resolve(player.seekTo(target)).catch(() => {});
    } else {
      setTimedElapsed(target);
    }
  };

  const progressPct = totalSeconds > 0 ? Math.min(100, (elapsedSeconds / totalSeconds) * 100) : 0;

  if (eyesClosedDim) {
    return (
      <Pressable
        onPress={() => setEyesClosedDim(false)}
        accessibilityRole="button"
        accessibilityLabel="Tap anywhere to wake screen from eyes-closed mode"
        style={styles.dimOverlay}
      >
        <Text style={styles.dimClock}>{formatClock(remainingSeconds)}</Text>
        <Text style={styles.dimNote}>
          {isPlaying ? 'Eyes-closed mode · tap anywhere to brighten' : 'Paused · tap to wake'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>
          {hasRealAudio ? 'AUDIO SANCTUARY' : 'GUIDED RESCUE · VOICE-READY'}
        </Text>
        <Text style={styles.title}>{track.title}</Text>
      </View>

      <Text style={styles.timer}>{formatClock(remainingSeconds)}</Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>

      <View style={styles.cueCard}>
        <Text style={styles.cueText}>{track.cues[activeCueIndex]?.text ?? ''}</Text>
      </View>

      {/* Transport Controls (48px+ targets) */}
      <View style={styles.controlsRow}>
        <Pressable
          onPress={() => handleSkip(-15)}
          accessibilityRole="button"
          accessibilityLabel="Rewind 15 seconds"
          style={styles.iconControl}
        >
          <Feather name="rotate-ccw" size={20} color={Palette.night.text} />
          <Text style={styles.skipLabel}>15s</Text>
        </Pressable>

        <Pressable
          onPress={handleTogglePlay}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          style={styles.playControl}
        >
          <Feather
            name={isPlaying ? 'pause' : 'play'}
            size={26}
            color={Palette.night.onPrimary}
          />
        </Pressable>

        <Pressable
          onPress={() => handleSkip(15)}
          accessibilityRole="button"
          accessibilityLabel="Forward 15 seconds"
          style={styles.iconControl}
        >
          <Feather name="rotate-cw" size={20} color={Palette.night.text} />
          <Text style={styles.skipLabel}>15s</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          setEyesClosedDim(true);
        }}
        accessibilityRole="button"
        style={styles.dimToggle}
      >
        <Feather name="eye-off" size={16} color={Palette.night.primaryTonalText} />
        <Text style={styles.dimToggleText}>Dim screen for eyes-closed listening</Text>
      </Pressable>

      <PrimaryButton
        label={isFinished ? completeLabel : 'I’m steady now'}
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