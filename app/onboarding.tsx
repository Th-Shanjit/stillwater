import type { Href } from 'expo-router';
import { safeOnboardingDestination } from '../content/onboardingInvitation';
import { useRef, useState } from 'react';
import {
  Alert, Pressable, Switch, View,
} from 'react-native';
import {
  useLocalSearchParams, useRouter,
} from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { Feather } from '@expo/vector-icons';

import { updatePreferences } from '../db/queries';
import type { ToneTrack } from '../db/queries';

import {
  requestNotificationPermission,
  scheduleDailyRhythms,
} from '../db/notifications';

import { StillwaterMark } from '../components/RoyalUI';

import {
  V2Screen, V2Text, V2Button, V2Card,
  V2Artwork, V2ActionRow,
} from '../components/StillwaterUI';

import { StillwaterV2 } from '../theme/stillwaterV2';

const mode = 'day' as const;
const p = StillwaterV2.day;

const BEDTIMES = [
  ['9:30 PM', '21:30'],
  ['10:00 PM', '22:00'],
  ['10:30 PM', '22:30'],
  ['11:00 PM', '23:00'],
  ['11:30 PM', '23:30'],
  ['12:00 AM', '00:00'],
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    preview?: string;
    next?: string;
  }>();

  const preview =
    __DEV__ && params.preview === '1';

  const [personalise, setPersonalise] = useState(false);
  const [track, setTrack] = useState<ToneTrack>('scripture');
  const [bedtime, setBedtime] = useState('22:30');

  const [lock, setLock] = useState(false);
  const [reminders, setReminders] = useState(false);

  const [checkingLock, setCheckingLock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const busy = useRef(false);

  const toggleLock = async (next: boolean) => {
    if (checkingLock || saving) return;

    if (!next || preview) {
      setLock(next);
      return;
    }

    setCheckingLock(true);
    setError('');

    try {
      const available =
        await LocalAuthentication.hasHardwareAsync();

      const enrolled =
        await LocalAuthentication.isEnrolledAsync();

      if (!available || !enrolled) {
        setError(
          'Set up face or fingerprint authentication in your device settings first.'
        );
        return;
      }

      const result =
        await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable Stillwater app lock',
          fallbackLabel: 'Use device passcode',
        });

      setLock(result.success);

      if (!result.success) {
        setError('App lock was not enabled.');
      }
    } catch {
      setError('App lock is unavailable on this device.');
    } finally {
      setCheckingLock(false);
    }
  };

  const enter = async (custom: boolean) => {
    if (busy.current || checkingLock) return;

    // Development preview never changes preferences.
    if (preview) {
      router.back();
      return;
    }

    busy.current = true;
    setSaving(true);
    setError('');

    try {
      await updatePreferences({
        ...(custom ? {
          tone_track: track,
          bedtime_hhmm: bedtime,
          biometric_lock: lock,
        } : {}),
        save_laments: false,
        onboarding_completed: true,
        onboarded_at: new Date().toISOString(),
      });

      if (custom && reminders) {
        try {
          const granted =
            await requestNotificationPermission();

          if (granted) {
            await scheduleDailyRhythms('07:30', bedtime);
          } else {
            Alert.alert(
              'Reminders not enabled',
              'You can enable them later in Settings.'
            );
          }
        } catch {
          Alert.alert(
            'Reminders unavailable',
            'You can continue using Stillwater without reminders.'
          );
        }
      }

      router.replace(
        safeOnboardingDestination(params.next) as Href
      );

    } catch {
      setError(
        'Your setup could not be saved. Please try again.'
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <V2Screen
      mode={mode}
      footer={
        <View style={{ gap: 8 }}>
          <V2Button
            mode={mode}
            label={
              saving
                ? 'Getting things ready...'
                : preview
                  ? 'Finish preview'
                  : personalise
                    ? 'Enter Stillwater'
                    : 'Get started'
            }
            icon="arrow-right"
            disabled={saving || checkingLock}
            onPress={() => void enter(personalise)}
          />

          {!personalise && (
            <V2Button
              mode={mode}
              tone="quiet"
              label="Personalise my experience"
              disabled={saving}
              onPress={() => setPersonalise(true)}
            />
          )}
        </View>
      }
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        <StillwaterMark size={29} color={p.primary} />

        <V2Text
          mode={mode}
          variant="section"
          style={{ flex: 1 }}
        >
          stillwater.
        </V2Text>

        {personalise && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to welcome"
            disabled={saving || checkingLock}
            onPress={() => setPersonalise(false)}
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
      </View>

      {preview && (
        <V2Text mode={mode} muted variant="label">
          DEVELOPMENT PREVIEW - NO DATA WILL CHANGE
        </V2Text>
      )}

      {!personalise ? (
        <>
          <V2Artwork
            mode={mode}
            kind="water"
            height={150}
          />

          <V2Text mode={mode} variant="display">
            A place to begin again.
          </V2Text>

          <V2Text mode={mode} muted>
            Christian support for changing unwanted
            habits, one practical step at a time.
          </V2Text>

          <V2Card mode={mode}>
            {([
              [
                'wind',
                'Find support in difficult moments.',
              ],
              [
                'compass',
                'Make small, practical changes.',
              ],
              [
                'heart',
                'Return with grace, not shame.',
              ],
            ] as const).map(([icon, label]) => (
              <View
                key={label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 5,
                  gap: 12,
                }}
              >
                <Feather
                  name={icon}
                  size={21}
                  color={p.muted}
                />

                <V2Text
                  mode={mode}
                  style={{ flex: 1 }}
                >
                  {label}
                </V2Text>
              </View>
            ))}
          </V2Card>

          <V2Text
            mode={mode}
            muted
            variant="secondary"
          >
            No account needed for personal support.
            Recovery records are stored locally.
          </V2Text>

          <V2Text
            mode={mode}
            muted
            variant="secondary"
          >
            Stillwater complements, rather than replaces,
            professional support.
          </V2Text>
        </>
      ) : (
        <>
          <V2Text mode={mode} muted variant="label">
            OPTIONAL SETUP
          </V2Text>

          <V2Text mode={mode} variant="display">
            Make it your own.
          </V2Text>

          <V2Text mode={mode} muted>
            Choose what suits you. Everything here
            can be adjusted later.
          </V2Text>

          <V2Text mode={mode} variant="section">
            Prayer preference
          </V2Text>

          <V2ActionRow
            mode={mode}
            icon="book-open"
            label="Scripture and reflection"
            selected={track === 'scripture'}
            onPress={() => setTrack('scripture')}
          />

          <V2ActionRow
            mode={mode}
            icon="sunrise"
            label="Liturgical and contemplative"
            selected={track === 'liturgical'}
            onPress={() => setTrack('liturgical')}
          />

          <V2Text mode={mode} variant="section">
            Privacy and reminders
          </V2Text>

          <V2Card mode={mode}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}>
              <Feather
                name="lock"
                color={p.muted}
                size={22}
              />

              <View style={{ flex: 1, gap: 3 }}>
                <V2Text mode={mode}>App lock</V2Text>
                <V2Text
                  mode={mode}
                  muted
                  variant="secondary"
                >
                  Ask for device authentication
                  when reopening Stillwater.
                </V2Text>
              </View>

              <Switch
                accessibilityLabel="Enable app lock"
                value={lock}
                disabled={checkingLock || saving}
                onValueChange={value => void toggleLock(value)}
                trackColor={{
                  true: p.primary,
                  false: p.border,
                }}
              />
            </View>
          </V2Card>

          <V2Card mode={mode}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}>
              <Feather
                name="bell"
                color={p.muted}
                size={22}
              />

              <View style={{ flex: 1, gap: 3 }}>
                <V2Text mode={mode}>Quiet reminders</V2Text>
                <V2Text
                  mode={mode}
                  muted
                  variant="secondary"
                >
                  Optional morning and evening reminders.
                </V2Text>
              </View>

              <Switch
                accessibilityLabel="Enable quiet reminders"
                value={reminders}
                disabled={saving}
                onValueChange={setReminders}
                trackColor={{
                  true: p.primary,
                  false: p.border,
                }}
              />
            </View>

            {reminders && (
              <>
                <V2Text mode={mode}>
                  When do you usually go to bed?
                </V2Text>

                <View style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}>
                  {BEDTIMES.map(([label, value]) => (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: bedtime === value,
                      }}
                      disabled={saving}
                      onPress={() => setBedtime(value)}
                      style={{
                        minHeight: 48,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: bedtime === value
                          ? p.primary : p.border,
                        backgroundColor: bedtime === value
                          ? p.secondary : p.surface,
                      }}
                    >
                      <V2Text mode={mode}>{label}</V2Text>
                    </Pressable>
                  ))}
                </View>

                <V2Text
                  mode={mode}
                  muted
                  variant="secondary"
                >
                  Morning reminder at 7:30 AM.
                  Evening reminder 30 minutes before bedtime.
                </V2Text>
              </>
            )}
          </V2Card>

          <V2Text
            mode={mode}
            muted
            variant="secondary"
          >
            Device security and backup settings can affect
            privacy. New raw laments are not saved.
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
