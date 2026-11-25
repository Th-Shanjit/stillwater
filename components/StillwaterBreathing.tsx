import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Easing,
  View,
  useWindowDimensions,
} from 'react-native';

import Svg, { Circle, Path } from 'react-native-svg';

import { StillwaterV2 } from '../theme/stillwaterV2';
import type { V2Mode } from '../theme/stillwaterV2';

import { V2Button, V2Text } from './StillwaterUI';

const TOTAL_PHASES = 6;
const MIN_SCALE = 0.56;
const MAX_SCALE = 1;

const phaseDuration = (phase: number) =>
  phase % 2 === 0 ? 4000 : 6000;

export function V2Breathing({
  mode,
  active = true,
  onCyclesCompleted,
}: {
  mode: V2Mode;
  active?: boolean;
  onCyclesCompleted?: (count: number) => void;
}) {
  const p = StillwaterV2[mode];
  const night = mode === 'night';
  const { width } = useWindowDimensions();

  const size = Math.min(280, width - 64);

  const [phase, setPhase] = useState(0);
  const [running, setRunning] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [seconds, setSeconds] = useState(4);

  const [scale] = useState(
    () => new Animated.Value(MIN_SCALE)
  );

  const remainingMs = useRef<number | null>(null);

  const finished = phase >= TOTAL_PHASES;
  const inhaling = phase % 2 === 0;

  const cycle = Math.min(
    3, Math.floor(phase / 2) + 1
  );

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (mounted) setReduced(value);
      })
      .catch(() => {});

    const motion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced
    );

    const app = AppState.addEventListener(
      'change',
      state => {
        if (state !== 'active') {
          setRunning(false);
        }
      }
    );

    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);

  const [previousActive, setPreviousActive] =
    useState(active);

  if (previousActive !== active) {
    setPreviousActive(active);

    if (!active) {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (!running || !active || finished) return;

    const duration =
      remainingMs.current ?? phaseDuration(phase);

    const startedAt = Date.now();

    let completed = false;

    const target =
      inhaling ? MAX_SCALE : MIN_SCALE;

    const animation = reduced
      ? null
      : Animated.timing(scale, {
          toValue: target,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        });

    animation?.start();

    const countdown = setInterval(() => {
      const left =
        duration - (Date.now() - startedAt);

      setSeconds(
        Math.max(1, Math.ceil(left / 1000))
      );
    }, 150);

    const timer = setTimeout(() => {
      completed = true;
      remainingMs.current = null;

      scale.setValue(target);

      const nextPhase = phase + 1;

      setPhase(nextPhase);

      if (nextPhase >= TOTAL_PHASES) {
        setSeconds(0);
        setRunning(false);
      } else {
        setSeconds(
          phaseDuration(nextPhase) / 1000
        );
      }
    }, duration);

    return () => {
      clearTimeout(timer);
      clearInterval(countdown);

      animation?.stop();

      if (!completed) {
        remainingMs.current = Math.max(
          1,
          duration - (Date.now() - startedAt)
        );
      }
    };
  }, [
    phase,
    running,
    active,
    finished,
    inhaling,
    reduced,
    scale,
  ]);

  useEffect(() => {
    const completed = Math.floor(
      Math.min(phase, TOTAL_PHASES) / 2
    );

    onCyclesCompleted?.(completed);
  }, [phase, onCyclesCompleted]);

  const toggle = () => {
    if (finished) {
      remainingMs.current = null;

      scale.setValue(MIN_SCALE);

      setPhase(0);
      setSeconds(4);
      setRunning(true);
    } else {
      setRunning(previous => !previous);
    }
  };

  const instruction = finished
    ? 'Practice complete'
    : !running
      ? phase === 0 && seconds === 4
        ? 'Find your stillness'
        : 'Paused'
      : inhaling
        ? 'Breathe in'
        : 'Breathe out';

  const rim = night ? '#D9E6CA' : '#48645A';

  return (
    <View style={{
      alignItems: 'center',
      gap: 14,
    }}>

      <V2Text mode={mode} muted variant="label">
        {finished
          ? '3 OF 3 CYCLES COMPLETE'
          : `BREATH ${cycle} OF 3`}
      </V2Text>

      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Fixed outer guide makes movement perceptible. */}
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: p.border,
        }} />

        {/* All layers expand as one native-driven animation. */}
        <Animated.View style={{
          position: 'absolute',
          width: size - 12,
          height: size - 12,
          transform: [{
            scale: reduced ? 1 : scale,
          }],
        }}>
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 280 280"
          >
            <Circle
              cx={140}
              cy={140}
              r={137}
              fill={night ? '#29403C' : '#DCE6D9'}
              stroke={rim}
              strokeWidth={2}
            />

            <Circle
              cx={140}
              cy={140}
              r={111}
              fill={night ? '#36534D' : '#C6D7C7'}
              stroke={rim}
              strokeWidth={1.2}
              strokeOpacity={0.65}
            />

            <Circle
              cx={140}
              cy={140}
              r={85}
              fill={night ? '#486F61' : '#A6C0AE'}
              stroke={rim}
              strokeWidth={1.5}
              strokeOpacity={0.8}
            />

            <Circle
              cx={140}
              cy={140}
              r={59}
              fill={night ? '#668B7B' : '#779A8B'}
              stroke={rim}
              strokeWidth={1}
            />
          </Svg>
        </Animated.View>

        {/* The central cross remains visually stationary. */}
        <Svg
          width={34}
          height={42}
          viewBox="0 0 34 42"
        >
          <Path
            d="M17 3 V39 M5 15 H29"
            stroke={night ? '#F0F2E8' : '#19332E'}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </Svg>
      </View>

      <View
        accessibilityLiveRegion="polite"
        style={{
          alignItems: 'center',
          gap: 6,
        }}
      >
        <V2Text
          mode={mode}
          variant="display"
          style={{
            fontSize: 32,
            lineHeight: 40,
            textAlign: 'center',
          }}
        >
          {instruction}
        </V2Text>

        <V2Text mode={mode} muted>
          {finished
            ? 'Continue whenever you are ready.'
            : running
              ? inhaling
                ? 'Gently let the breath in'
                : 'Slowly let the breath out'
              : 'Take it at your own pace.'}
        </V2Text>
      </View>

      {running && !finished && (
        <V2Text
          mode={mode}
          style={{
            fontSize: 28,
            lineHeight: 36,
            fontVariant: ['tabular-nums'],
            fontWeight: '300',
          }}
        >
          {seconds}s
        </V2Text>
      )}

      {/* Six phases, with stronger active-state contrast. */}
      <View
        accessibilityLabel={
          `${Math.min(phase, TOTAL_PHASES)} of 6 phases completed`
        }
        style={{
          flexDirection: 'row',
          gap: 7,
        }}
      >
        {Array.from(
          { length: TOTAL_PHASES },
          (_, index) => (
            <View
              key={index}
              style={{
                width: 27,
                height: 5,
                borderRadius: 3,
                backgroundColor:
                  index < phase
                    ? p.primary
                    : index === phase && running
                      ? p.accent
                      : p.border,
              }}
            />
          )
        )}
      </View>

      <View style={{ width: '100%' }}>
        <V2Button
          mode={mode}
          tone="secondary"
          disabled={!active}
          icon={running ? 'pause' : 'play'}
          label={
            finished
              ? 'Repeat practice'
              : running
                ? 'Pause breathing'
                : phase === 0 && seconds === 4
                  ? 'Begin breathing'
                  : 'Resume breathing'
          }
          onPress={toggle}
        />
      </View>

      <V2Text
        mode={mode}
        muted
        variant="secondary"
        style={{ textAlign: 'center' }}
      >
        Breathe comfortably. Skip if this feels uncomfortable.
      </V2Text>

      {reduced && (
        <V2Text
          mode={mode}
          muted
          variant="secondary"
          style={{ textAlign: 'center' }}
        >
          Reduced motion is enabled. Follow the written cues.
        </V2Text>
      )}

    </View>
  );
}
