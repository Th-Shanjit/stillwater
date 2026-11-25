import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  Pressable, View, useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import {
  checkAbsenceAndTouch,
  completeMorningAnchor,
  getClarityGrid,
  getPreferences,
  getActiveBoundaries,
  addCustomBoundary,
} from '../../db/queries';

import type { BoundaryItem } from '../../db/queries';

import { getSmartMorningAnchor } from '../../db/contentEngine';
import type { ResolvedMorningAnchor } from '../../db/contentEngine';

import { StillwaterMark } from '../../components/RoyalUI';

import {
  V2Screen,
  V2Text,
  V2Card,
  V2Button,
  V2Artwork,
  V2ActionRow,
} from '../../components/StillwaterUI';

import { StillwaterV2 } from '../../theme/stillwaterV2';

const mode = 'day' as const;
const p = StillwaterV2.day;

const suggestedPlan =
  'Charge my phone outside the bedroom tonight.';

export default function TodayScreen() {
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();

  const stacked = width < 340 || fontScale > 1.3;

  const [anchor, setAnchor] =
    useState<ResolvedMorningAnchor | null>(null);

  const [boundaries, setBoundaries] =
    useState<BoundaryItem[]>([]);

  const [morningDone, setMorningDone] = useState(false);
  const [showPrayer, setShowPrayer] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const actionBusy = useRef(false);

  useEffect(() => {
    let mounted = true;

    checkAbsenceAndTouch()
      .then(days => {
        if (mounted && days >= 7) {
          setWelcomeBack(true);
        }
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, []);

  const load = useCallback(async () => {
    setError('');

    try {
      const prefs = await getPreferences();

      const [activity, nextAnchor, plans] =
        await Promise.all([
          getClarityGrid(30),
          getSmartMorningAnchor(prefs.tone_track),
          getActiveBoundaries(),
        ]);

      setAnchor(nextAnchor);
      setBoundaries(plans);

      const today =
        activity.grid[activity.grid.length - 1];

      setMorningDone(Boolean(today?.morningCompleted));
      setReady(true);

    } catch {
      setError('Unable to load your personal plan. Try again.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openPlan = () => {
    router.push('/(tabs)/rhythm');
  };

  const savePlan = async () => {
    if (actionBusy.current) return;

    actionBusy.current = true;
    setSaving(true);
    setError('');

    try {
      const current = await getActiveBoundaries();

      if (!current.some(item =>
        item.label === suggestedPlan
      )) {
        await addCustomBoundary(suggestedPlan);
      }

      await load();

    } catch {
      setError('Your plan could not be saved. Please try again.');
    } finally {
      actionBusy.current = false;
      setSaving(false);
    }
  };

  const carryPrayer = async () => {
    if (!anchor || morningDone || actionBusy.current) {
      return;
    }

    actionBusy.current = true;
    setSaving(true);

    try {
      await completeMorningAnchor(anchor.id);
      setMorningDone(true);
      await load();

    } catch {
      setError('Unable to save this practice.');
    } finally {
      actionBusy.current = false;
      setSaving(false);
    }
  };

  const activePlan = boundaries[0];

  return (
    <V2Screen mode={mode} bottomInset={false}>

      {/* Brand and existing settings destination */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
      }}>
        <StillwaterMark size={27} color={p.primary} />

        <V2Text
          mode={mode}
          variant="section"
          style={{ flex: 1, letterSpacing: -0.6 }}
        >
          stillwater.
        </V2Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open plans and settings"
          onPress={openPlan}
          style={{
            minWidth: 48,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather
            name="settings"
            size={22}
            color={p.muted}
          />
        </Pressable>
      </View>

      <V2Text mode={mode} muted variant="secondary">
        {new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })}
      </V2Text>

      {/* Essential support always available */}
      <V2Card
        mode="night"
        style={{
          backgroundColor: '#193B35',
          borderColor: '#193B35',
          padding: 12,
        }}
      >
        <V2Artwork
          mode={mode}
          kind="water"
          height={88}
        />

        <View style={{ padding: 6, gap: 12 }}>
          <V2Text
            mode="night"
            variant="display"
            style={{
              fontSize: 34,
              lineHeight: 38,
            }}
          >
            Need a moment?
          </V2Text>

          <V2Button
            mode="night"
            label="Help me right now"
            icon="arrow-right"
            onPress={() => router.push('/pause')}
          />
        </View>
      </V2Card>

      <View style={{
        flexDirection: stacked ? 'column' : 'row',
        gap: 10,
      }}>
        {([
          {
            key: 'reset',
            icon: 'rotate-ccw',
            title: 'Start again',
            subtitle: 'After a setback',
          },
          {
            key: 'plan',
            icon: 'compass',
            title: 'My plan',
            subtitle: 'Prepare for today',
          },
        ] as const).map(item => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            onPress={() => {
              if (item.key === 'reset') {
                router.push('/grace-reset');
              } else {
                openPlan();
              }
            }}
            style={({ pressed }) => ({
              flex: stacked ? undefined : 1,
              minHeight: 108,
              padding: 15,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: p.border,
              backgroundColor:
                item.key === 'plan'
                  ? p.secondary
                  : p.surface,
              opacity: pressed ? 0.8 : 1,
              gap: 6,
            })}
          >
            <Feather
              name={item.icon}
              size={23}
              color={p.muted}
            />

            <V2Text
              mode={mode}
              style={{ fontWeight: '600' }}
            >
              {item.title}
            </V2Text>

            <V2Text
              mode={mode}
              muted
              variant="secondary"
            >
              {item.subtitle}
            </V2Text>
          </Pressable>
        ))}
      </View>

      {welcomeBack && (
        <V2Card mode={mode} tonal>
          <V2Text mode={mode} variant="section">
            Welcome back.
          </V2Text>

          <V2Text mode={mode}>
            You can begin wherever you are.
          </V2Text>

          <V2Button
            mode={mode}
            tone="quiet"
            label="Continue"
            onPress={() => setWelcomeBack(false)}
          />
        </V2Card>
      )}

      {/* Useful preparation, not mandatory reflection */}
      <V2Text mode={mode} muted variant="label">
        YOUR NEXT STEP
      </V2Text>

      {!ready ? (
        <V2Card mode={mode}>
          <V2Text mode={mode} muted>
            {error || 'Loading your personal plan...'}
          </V2Text>

          {error !== '' && (
            <V2Button
              mode={mode}
              tone="secondary"
              label="Try again"
              onPress={() => void load()}
            />
          )}
        </V2Card>
      ) : activePlan ? (
        <V2Card mode={mode}>
          <Feather
            name="check-circle"
            size={23}
            color={p.muted}
          />

          <V2Text mode={mode} variant="section">
            Your current plan
          </V2Text>

          <V2Text mode={mode}>
            {activePlan.label}
          </V2Text>

          <V2Text mode={mode} muted variant="secondary">
            A chosen action, not a completed outcome.
          </V2Text>

          <V2Button
            mode={mode}
            tone="secondary"
            label="Manage my plan"
            onPress={openPlan}
          />
        </V2Card>
      ) : (
        <V2Card mode={mode}>
          <Feather
            name="moon"
            size={23}
            color={p.muted}
          />

          <V2Text mode={mode} variant="section">
            Prepare for tonight.
          </V2Text>

          <V2Text mode={mode} muted>
            {suggestedPlan}
          </V2Text>

          <V2Button
            mode={mode}
            tone="secondary"
            icon="plus"
            label={
              saving
                ? 'Saving...'
                : 'Make this my plan'
            }
            disabled={saving}
            onPress={() => void savePlan()}
          />

          <V2Button
            mode={mode}
            tone="quiet"
            label="Choose a different plan"
            onPress={openPlan}
          />
        </V2Card>
      )}

      {ready && error !== '' && (
        <V2Card mode={mode}>
          <V2Text mode={mode}>{error}</V2Text>
          <V2Button
            mode={mode}
            tone="secondary"
            label="Try again"
            onPress={() => void load()}
          />
        </V2Card>
      )}

      {/* Spiritual guidance remains available, not mandatory */}
      <V2Text mode={mode} muted variant="label">
        MOMENTS OF FAITH
      </V2Text>

      <V2ActionRow
        mode={mode}
        icon="book-open"
        label="A quiet word for today"
        description={
          morningDone
            ? 'Practice recorded'
            : 'Scripture and prayer'
        }
        selected={showPrayer}
        onPress={() => setShowPrayer(old => !old)}
      />

      {showPrayer && (
        <V2Card mode={mode} tonal>
          {anchor ? (
            <>
              <V2Text mode={mode} muted variant="label">
                {anchor.source}
              </V2Text>

              <V2Text
                mode={mode}
                variant="display"
                style={{
                  fontSize: 26,
                  lineHeight: 32,
                }}
              >
                {anchor.excerpt}
              </V2Text>

              <V2Text mode={mode} muted>
                {anchor.reflection}
              </V2Text>

              <V2Button
                mode={mode}
                label={
                  morningDone
                    ? 'Practice recorded'
                    : 'Carry this into today'
                }
                disabled={morningDone || saving}
                onPress={() => void carryPrayer()}
              />
            </>
          ) : (
            <V2Text mode={mode} muted>
              Today&apos;s guidance is not available yet.
            </V2Text>
          )}
        </V2Card>
      )}

      <V2ActionRow
        mode={mode}
        icon="moon"
        label="End the day"
        description="Evening Examen"
        onPress={() => router.push('/examen')}
      />

      <V2ActionRow
        mode={mode}
        icon="compass"
        label="Explore your journey"
        description="Guided practices and programmes"
        onPress={() => router.push('/(tabs)/library')}
      />

    </V2Screen>
  );
}
