
import {
  newRecoverySessionId,
  recordRecoveryEvent,
} from '../db/recoveryEvents';

import type {
  RecoveryAction,
} from '../content/recoveryEvents';

import {
  useCallback, useRef, useState,
} from 'react';

import {
  Alert, Linking, Platform, Pressable, View,
} from 'react-native';

import {
  useIsFocused, useRouter,
} from 'expo-router';

import { Feather } from '@expo/vector-icons';

import {
  getOffRampForEmotion,
  getPreferences,
  logPauseEvent,
} from '../db/queries';

import {
  V2Screen,
  V2Text,
  V2Button,
  V2Card,
  V2ActionRow,
} from '../components/StillwaterUI';

import { V2Breathing } from '../components/StillwaterBreathing';

import {
  AudioRescuePlayer,
} from '../components/AudioRescuePlayer';

import type {
  RescueAudioTrack,
} from '../components/AudioRescuePlayer';

import { StillwaterMark } from '../components/RoyalUI';
import { StillwaterV2 } from '../theme/stillwaterV2';

import midnightAudioData from '../assets/content/midnight_audio.json';

type Scene =
  | 'main'
  | 'breathing'
  | 'alternatives'
  | 'personal'
  | 'extended'
  | 'prayer';

type Outcome =
  | 'steady'
  | 'exited_early'
  | 'ready_to_step_away';

const mode = 'night' as const;
const p = StillwaterV2.night;

const TRACKS = midnightAudioData as RescueAudioTrack[];

const FREE_TRACK = TRACKS.find(
  track => track.id === 'urge_1am' &&
    track.tier === 'free'
);

const CONTEXTS = [
  ['exhausted', 'Tired'],
  ['lonely', 'Lonely'],
  ['stressed', 'Stressed'],
  ['bored', 'Bored'],
  ['numb', 'Feeling numb'],
  ['rejected', 'Hurt or rejected'],
  ['autopilot', 'Acting on autopilot'],
] as const;

const ALTERNATIVES = [
  {
    id: 'move',
    icon: 'log-out',
    title: 'Change your surroundings',
    detail: 'Move to another room if you can.',
  },
  {
    id: 'phone',
    icon: 'smartphone',
    title: 'Put your phone away',
    detail: 'Leave it somewhere out of reach.',
  },
  {
    id: 'water',
    icon: 'droplet',
    title: 'Get a glass of water',
    detail: 'Take a short break from the screen.',
  },
] as const;

export default function PauseModal() {
  const router = useRouter();
  const focused = useIsFocused();

  const [recoverySessionId] =
    useState(newRecoverySessionId);

  const actionKey =
    useRef<RecoveryAction | undefined>(undefined);

  const [scene, setScene] = useState<Scene>('main');

  const [selectedAction, setSelectedAction] =
    useState<string | null>(null);

  const [personalPlan, setPersonalPlan] =
    useState('');

  const [context, setContext] =
    useState<string | undefined>();

  const [loadingPlan, setLoadingPlan] =
    useState(false);

  const [contactBusy, setContactBusy] =
    useState(false);

  const cyclesCompleted = useRef(0);
  const usedAudio = useRef(false);
  const leaving = useRef(false);

  const handleCycles = useCallback((count: number) => {
    cyclesCompleted.current = Math.max(
      cyclesCompleted.current,
      count
    );
  }, []);

  const exit = (outcome: Outcome) => {
    if (leaving.current) return;

    leaving.current = true;

    // Recording is best-effort and must not delay leaving.
    void logPauseEvent({
      emotionTag: context,
      breathCyclesCompleted: cyclesCompleted.current,
      usedAudio: usedAudio.current,
      outcome,
    }).then(() => recordRecoveryEvent({
      sessionId: recoverySessionId,
      flow: 'pause',
      kind: 'pause_exit',
      contentId: 'immediate_support',
      contentVersion: 1,
      action: actionKey.current,
      result: outcome,
    })).catch(() => {
      if (__DEV__) {
        console.warn('Unable to save pause event.');
      }
    });

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const openPersonalPlan = async (
    tag: string
  ) => {
    if (loadingPlan) return;

    setLoadingPlan(true);
    setContext(tag);
    actionKey.current = 'personal_plan';
    setPersonalPlan('');

    try {
      const plan =
        await getOffRampForEmotion(tag);

      setPersonalPlan(plan);

    } catch {
      setPersonalPlan(
        'Put your phone down and move somewhere else, if possible.'
      );
    } finally {
      setLoadingPlan(false);
    }
  };

  const contactSomeone = async () => {
    if (contactBusy) return;

    setContactBusy(true);

    try {
      const prefs = await getPreferences();

      const phone = (
        prefs.trusted_ally_phone ?? ''
      ).replace(/[^\d+]/g, '');

      if (!phone || !/^\+?\d{5,15}$/.test(phone)) {
        Alert.alert(
          'Reach out to someone',
          'Open your usual messaging app and contact someone you trust. You can save a contact later in Progress.'
        );

        return;
      }

      const message =
        'Could we talk for a few minutes? I could use some company right now.';

      const separator =
        Platform.OS === 'ios' ? '&' : '?';

      const url =
        `sms:${phone}${separator}body=${encodeURIComponent(message)}`;

      // Opens a draft. The user chooses whether to send.
      await Linking.openURL(url);
      actionKey.current = 'trusted_contact';

    } catch {
      Alert.alert(
        'Unable to open Messages',
        'You can contact someone using your usual messaging app.'
      );
    } finally {
      setContactBusy(false);
    }
  };

  const headings: Record<Scene, string> = {
    main: 'A MOMENT OF STILLNESS',
    breathing: 'GUIDED BREATHING',
    alternatives: 'FIND ANOTHER ACTION',
    personal: 'YOUR PERSONAL PLAN',
    extended: 'STAY A LITTLE LONGER',
    prayer: 'A QUIET PRAYER',
  };

  return (
    <V2Screen
      mode={mode}
      footer={
        <V2Button
          mode={mode}
          label="I'm ready to step away"
          icon="arrow-right"
          onPress={() => exit('ready_to_step_away')}
        />
      }
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        {scene !== 'main' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to support options"
            onPress={() => setScene('main')}
            style={{
              minHeight: 48,
              minWidth: 48,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Feather
              name="arrow-left"
              color={p.text}
              size={22}
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
          accessibilityLabel="Close immediate support"
          onPress={() => exit('exited_early')}
          style={{
            minHeight: 48,
            minWidth: 48,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Feather name="x" color={p.text} size={24} />
        </Pressable>
      </View>

      {scene === 'main' && (
        <>
          <View style={{
            alignItems: 'center',
            paddingVertical: 12,
          }}>
            <StillwaterMark
              size={64}
              color={p.accent}
            />
          </View>

          <V2Text mode={mode} variant="display">
            Just this moment.
          </V2Text>

          <V2Card mode={mode} tonal>
            <V2Text
              mode={mode}
              muted
              variant="label"
            >
              DO THIS FIRST
            </V2Text>

            <V2Text mode={mode} variant="heading">
              Set your phone down.
            </V2Text>

            <V2Text mode={mode} muted>
              If you can, stand up and move
              somewhere else.
            </V2Text>
          </V2Card>

          <V2Text mode={mode} muted variant="label">
            IF YOU NEED MORE SUPPORT
          </V2Text>

          <V2ActionRow
            mode={mode}
            icon="wind"
            label="Guide my breathing"
            description="30-second optional practice"
            onPress={() => setScene('breathing')}
          />

          <V2ActionRow
            mode={mode}
            icon="compass"
            label="Show me another action"
            onPress={() => setScene('alternatives')}
          />

          {FREE_TRACK && (
            <V2ActionRow
              mode={mode}
              icon={FREE_TRACK.audioUri
                ? 'headphones' : 'book-open'}
              label="Stay with me a little longer"
              description="3-minute guided practice"
              onPress={() => setScene('extended')}
            />
          )}

          <V2ActionRow
            mode={mode}
            icon="message-circle"
            label="Contact someone I trust"
            onPress={() => void contactSomeone()}
          />

          <V2ActionRow
            mode={mode}
            icon="heart"
            label="Take a moment to pray"
            onPress={() => setScene('prayer')}
          />

          <V2Button
            mode={mode}
            tone="quiet"
            label="I feel steadier now"
            onPress={() => exit('steady')}
          />
        </>
      )}

      {scene === 'breathing' && (
        <>
          <V2Text mode={mode} variant="display">
            Breathe gently.
          </V2Text>

          <V2Text mode={mode} muted>
            Rest your feet on the floor.
            There is no need to force your breath.
          </V2Text>

          <V2Breathing
            mode={mode}
            active={focused}
            onCyclesCompleted={handleCycles}
          />

          <V2Button
            mode={mode}
            tone="quiet"
            label="Skip breathing"
            onPress={() => setScene('main')}
          />
        </>
      )}

      {scene === 'alternatives' && (
        <>
          <V2Text mode={mode} variant="display">
            One small action.
          </V2Text>

          <V2Text mode={mode} muted>
            Choose whatever is practical right now.
          </V2Text>

          {ALTERNATIVES.map(action => (
            <V2ActionRow
              key={action.id}
              mode={mode}
              icon={action.icon}
              label={action.title}
              description={action.detail}
              selected={selectedAction === action.id}
              onPress={() => {
                setSelectedAction(action.id);
                actionKey.current = action.id;
              }}
            />
          ))}

          {selectedAction && (
            <V2Card mode={mode} tonal>
              <V2Text mode={mode} variant="section">
                {ALTERNATIVES.find(
                  action => action.id === selectedAction
                )?.title}
              </V2Text>

              <V2Text mode={mode} muted>
                You can leave the app and try this now.
              </V2Text>
            </V2Card>
          )}

          <V2ActionRow
            mode={mode}
            icon="message-circle"
            label="Contact someone I trust"
            onPress={() => void contactSomeone()}
          />

          <V2Button
            mode={mode}
            tone="secondary"
            label="Find an action from my personal plan"
            onPress={() => setScene('personal')}
          />
        </>
      )}

      {scene === 'personal' && (
        <>
          <V2Text mode={mode} variant="display">
            What would help?
          </V2Text>

          <V2Text mode={mode} muted>
            Optional: choose what fits your situation
            to see a related personal plan.
          </V2Text>

          <View style={{ gap: 8 }}>
            {CONTEXTS.map(([key, label]) => (
              <V2ActionRow
                key={key}
                mode={mode}
                icon="circle"
                label={label}
                selected={context === key}
                onPress={() => void openPersonalPlan(key)}
              />
            ))}
          </View>

          {loadingPlan && (
            <V2Text mode={mode} muted>
              Loading your plan...
            </V2Text>
          )}

          {personalPlan !== '' && (
            <V2Card mode={mode} tonal>
              <V2Text
                mode={mode}
                muted
                variant="label"
              >
                YOUR NEXT ACTION
              </V2Text>

              <V2Text mode={mode} variant="section">
                {personalPlan}
              </V2Text>
            </V2Card>
          )}

          <V2Button
            mode={mode}
            tone="quiet"
            label="Skip this question"
            onPress={() => setScene('alternatives')}
          />
        </>
      )}

      {scene === 'extended' && FREE_TRACK && (
        <>
          <AudioRescuePlayer
            track={FREE_TRACK}
            practiceSource="pause"
            parentSessionId={recoverySessionId}
            completeLabel="Return to support options"
            inProgressLabel="Return to support options"
            onPlaybackStarted={() => {
              usedAudio.current = true;
            }}
            onComplete={() => setScene('main')}
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
              size={80}
              color={p.accent}
            />
          </View>

          <V2Text
            mode={mode}
            variant="display"
            style={{ textAlign: 'center' }}
          >
            Be still.
          </V2Text>

          <V2Card mode={mode} tonal>
            <V2Text
              mode={mode}
              variant="heading"
              style={{ textAlign: 'center' }}
            >
              Lord, help me choose the next good thing.
            </V2Text>
          </V2Card>

          <V2Text
            mode={mode}
            muted
            style={{ textAlign: 'center' }}
          >
            Stay here briefly, or return whenever
            you are ready.
          </V2Text>

          <V2Button
            mode={mode}
            tone="quiet"
            label="Return to support options"
            onPress={() => setScene('main')}
          />
        </>
      )}
    </V2Screen>
  );
}
