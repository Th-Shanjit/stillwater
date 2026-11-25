
import {
  newRecoverySessionId,
  recordRecoveryEvent,
} from '../db/recoveryEvents';

import type {
  RecoveryAction,
} from '../content/recoveryEvents';

import { useRef, useState } from 'react';
import {
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import {
  logGraceReset,
  shouldTriggerBingeBreaker,
} from '../db/queries';

import {
  V2Screen,
  V2Text,
  V2Card,
  V2Button,
  V2Artwork,
  V2ActionRow,
} from '../components/StillwaterUI';

import { StillwaterV2 } from '../theme/stillwaterV2';
import { StillwaterMark } from '../components/RoyalUI';

type Scene =
  | 'start'
  | 'plan'
  | 'reflection'
  | 'finished';

const mode = 'day' as const;
const p = StillwaterV2.day;

const BOUNDARIES = [
  {
    label: 'Charge my phone outside the bedroom tonight',
    icon: 'smartphone',
  },
  {
    label: 'Take a break from social media tonight',
    icon: 'clock',
  },
  {
    label: 'Spend some time away from my usual screen',
    icon: 'sun',
  },
  {
    label: 'Make time to connect with someone I trust',
    icon: 'message-circle',
  },
] as const;

const CONTEXTS = [
  ['phone_in_bed', 'Phone in bed'],
  ['alone_in_the_house', 'Being alone'],
  ['heavy_stress', 'Stress'],
  ['late-night_insomnia', 'Difficulty sleeping'],
  ['conflict_/_hurt', 'Conflict or hurt'],
] as const;

const NEEDS = [
  ['loneliness', 'Connection'],
  ['pressure', 'Relief from pressure'],
  ['boredom', 'Something to do'],
  ['restlessness', 'Restlessness'],
  ['exhaustion', 'Rest'],
] as const;

export default function GraceResetModal() {
  const router = useRouter();

  const [recoverySessionId] =
    useState(newRecoverySessionId);

  const [scene, setScene] = useState<Scene>('start');

  const [boundary, setBoundary] =
    useState<string | undefined>();

  const [customBoundary, setCustomBoundary] =
    useState('');

  const [context, setContext] =
    useState<string | undefined>();

  const [need, setNeed] =
    useState<string | undefined>();

  const [saving, setSaving] = useState(false);
  const [showPrayer, setShowPrayer] = useState(false);
  const [error, setError] = useState('');

  const busy = useRef(false);
  const recorded = useRef(false);

  const leave = () => {
    if (busy.current) return;

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const chosenBoundary =
    customBoundary.trim() || boundary;

  const save = async (
    includeBoundary: boolean,
    leaveImmediately = false
  ) => {
    if (busy.current || recorded.current) return;

    busy.current = true;
    setSaving(true);
    setError('');

    let success = false;

    try {
      const recentReturn =
        await shouldTriggerBingeBreaker()
          .catch(() => false);

      await logGraceReset({
        wasBingeBreaker: recentReturn,
        doorOpenerTag: context,
        numbingNeedTag: need,
        boundaryLabel: includeBoundary
          ? chosenBoundary
          : undefined,
      });

      const presetKeys: RecoveryAction[] = [
        'phone_outside',
        'social_break',
        'screen_break',
        'connection',
      ];

      const selectedPreset = BOUNDARIES.findIndex(
        item => item.label === chosenBoundary
      );

      const action: RecoveryAction =
        !includeBoundary || !chosenBoundary
          ? 'none'
          : customBoundary.trim()
            ? 'custom'
            : presetKeys[selectedPreset] ?? 'custom';

      // Only the action category is recorded.
      // Custom boundary text remains in its original store.
      await recordRecoveryEvent({
        sessionId: recoverySessionId,
        flow: 'return',
        kind: 'return_saved',
        contentId: 'start_again',
        contentVersion: 1,
        action,
        result: 'saved',
      });

      recorded.current = true;
      success = true;
      setScene('finished');

    } catch {
      setError(
        'Your return could not be recorded. You can retry or leave without saving.'
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }

    if (success && leaveImmediately) {
      leave();
    }
  };

  const back = () => {
    if (saving) return;

    if (scene === 'reflection') {
      setScene('plan');
    } else if (scene === 'plan') {
      setScene('start');
    } else {
      leave();
    }
  };

  const footer = (
    <View style={{ gap: 6 }}>

      {scene === 'start' && (
        <>
          <V2Button
            mode={mode}
            label="Choose my next step"
            icon="arrow-right"
            disabled={saving}
            onPress={() => setScene('plan')}
          />

          <V2Button
            mode={mode}
            tone="quiet"
            label={saving
              ? 'Recording...'
              : 'Record my return and leave'}
            disabled={saving}
            onPress={() => void save(false, true)}
          />
        </>
      )}

      {scene === 'plan' && (
        <>
          <V2Button
            mode={mode}
            label={saving
              ? 'Saving...'
              : 'Save my next step'}
            disabled={saving || !chosenBoundary}
            onPress={() => void save(true)}
          />

          <V2Button
            mode={mode}
            tone="quiet"
            label="Continue without a plan"
            disabled={saving}
            onPress={() => void save(false)}
          />
        </>
      )}

      {scene === 'reflection' && (
        <V2Button
          mode={mode}
          label="Return to my plan"
          onPress={() => setScene('plan')}
        />
      )}

      {scene === 'finished' && (
        <V2Button
          mode={mode}
          label="Return to today"
          icon="arrow-right"
          onPress={leave}
        />
      )}

    </View>
  );

  return (
    <V2Screen mode={mode} footer={footer}>

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        {(scene === 'plan' ||
          scene === 'reflection') && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            disabled={saving}
            onPress={back}
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
          START AGAIN
        </V2Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close Start Again"
          disabled={saving}
          onPress={leave}
          style={{
            minWidth: 48,
            minHeight: 48,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Feather name="x" color={p.text} size={23} />
        </Pressable>
      </View>

      {scene === 'start' && (
        <>
          <V2Artwork
            mode={mode}
            kind="threshold"
            height={100}
          />

          <V2Text mode={mode} variant="display">
            Begin again.
          </V2Text>

          <V2Text mode={mode} muted>
            What happened does not have to determine
            what you do next.
          </V2Text>

          <V2Card mode={mode} tonal>
            <V2Text
              mode={mode}
              muted
              variant="label"
            >
              DO THIS FIRST
            </V2Text>

            <Feather
              name="log-out"
              size={30}
              color={p.primary}
            />

            <V2Text mode={mode} variant="heading">
              Change your surroundings.
            </V2Text>

            <V2Text mode={mode}>
              Put your phone down and move somewhere
              else, if possible.
            </V2Text>
          </V2Card>

          <V2ActionRow
            mode={mode}
            icon="wind"
            label="I need immediate support"
            description="Open a guided moment"
            onPress={() => {
              if (!busy.current) {
                router.push('/pause');
              }
            }}
          />

          <V2Text
            mode={mode}
            muted
            variant="secondary"
          >
            You do not need to explain everything.
            One useful action is enough for now.
          </V2Text>
        </>
      )}

      {scene === 'plan' && (
        <>
          <V2Text mode={mode} variant="display">
            One small change.
          </V2Text>

          <V2Text mode={mode} muted>
            Choose an optional practical plan for
            the next 24 hours.
          </V2Text>

          {BOUNDARIES.map(item => (
            <V2ActionRow
              key={item.label}
              mode={mode}
              icon={item.icon}
              label={item.label}
              selected={
                boundary === item.label &&
                !customBoundary.trim()
              }
              onPress={() => {
                if (busy.current) return;
                setCustomBoundary('');
                setBoundary(old =>
                  old === item.label
                    ? undefined
                    : item.label
                );
              }}
            />
          ))}

          <V2Card mode={mode}>
            <V2Text mode={mode} variant="section">
              Or make your own
            </V2Text>

            <TextInput
              accessibilityLabel="Custom practical plan"
              editable={!saving}
              value={customBoundary}
              onChangeText={value => {
                setCustomBoundary(value);
                setBoundary(undefined);
              }}
              placeholder="One practical change..."
              placeholderTextColor={p.muted}
              maxLength={180}
              multiline
              style={{
                minHeight: 75,
                borderWidth: 1,
                borderColor: p.muted,
                borderRadius: 12,
                padding: 12,
                fontSize: 16,
                color: p.text,
                backgroundColor: p.surface,
                textAlignVertical: 'top',
              }}
            />

            <V2Text
              mode={mode}
              muted
              variant="secondary"
            >
              Your chosen plan is stored on this device.
              Avoid including unnecessary sensitive details.
            </V2Text>
          </V2Card>

          <V2ActionRow
            mode={mode}
            icon="book-open"
            label="Reflect briefly"
            description={
              context || need
                ? 'Optional reflection selected'
                : 'Optional, no writing required'
            }
            onPress={() => {
              if (!busy.current) {
                setScene('reflection');
              }
            }}
          />
        </>
      )}

      {scene === 'reflection' && (
        <>
          <V2Text mode={mode} variant="display">
            Notice, without judgement.
          </V2Text>

          <V2Text mode={mode} muted>
            Skip any question you do not want to answer.
            Your selections are saved only if you
            choose to record your return.
          </V2Text>

          <V2Text mode={mode} variant="section">
            What was happening?
          </V2Text>

          {CONTEXTS.map(([key, label]) => (
            <V2ActionRow
              key={key}
              mode={mode}
              icon="circle"
              label={label}
              selected={context === key}
              onPress={() => setContext(old =>
                old === key ? undefined : key
              )}
            />
          ))}

          <V2Text mode={mode} variant="section">
            What might have helped?
          </V2Text>

          {NEEDS.map(([key, label]) => (
            <V2ActionRow
              key={key}
              mode={mode}
              icon="heart"
              label={label}
              selected={need === key}
              onPress={() => setNeed(old =>
                old === key ? undefined : key
              )}
            />
          ))}

          <V2Button
            mode={mode}
            tone="quiet"
            label="Clear my answers"
            onPress={() => {
              setContext(undefined);
              setNeed(undefined);
            }}
          />
        </>
      )}

      {scene === 'finished' && (
        <>
          <View style={{
            alignItems: 'center',
            paddingVertical: 26,
          }}>
            <View style={{
              width: 106,
              height: 106,
              borderRadius: 53,
              borderWidth: 1,
              borderColor: p.muted,
              backgroundColor: p.secondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Feather
                name="check"
                size={45}
                color={p.primary}
              />
            </View>
          </View>

          <V2Text
            mode={mode}
            variant="display"
            style={{ textAlign: 'center' }}
          >
            Your return is recorded.
          </V2Text>

          <V2Text
            mode={mode}
            muted
            style={{ textAlign: 'center' }}
          >
            Take your next step when you are ready.
          </V2Text>

          <V2ActionRow
            mode={mode}
            icon="heart"
            label="Take a moment to pray"
            selected={showPrayer}
            onPress={() => setShowPrayer(old => !old)}
          />

          {showPrayer && (
            <V2Card mode={mode} tonal>
              <View style={{ alignItems: 'center' }}>
                <StillwaterMark
                  size={36}
                  color={p.primary}
                />
              </View>

              <V2Text
                mode={mode}
                variant="section"
                style={{ textAlign: 'center' }}
              >
                Lord, give me the courage to begin again.
              </V2Text>

              <V2Text
                mode={mode}
                muted
                variant="secondary"
                style={{ textAlign: 'center' }}
              >
                Stay briefly, or leave whenever you wish.
              </V2Text>
            </V2Card>
          )}
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
