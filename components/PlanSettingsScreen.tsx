import { STILLWATER_ROUTES } from '../content/stillwaterRoutes';
import { PreparationFeedback } from './PreparationFeedback';
import { PreparationWindows } from './PreparationWindows';
import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { Feather } from '@expo/vector-icons';
import { Radius, Sizes, Spacing, Typography } from '../theme/tokens';
import {
  addCustomBoundary,
  BoundaryItem,
  getActiveBoundaries,
  getAllIfThenPlans,
  getPreferences,
  IfThenPlan,
  resolveBoundary,
  ToneTrack,
  updateIfThenPlan,
  updatePreferences,
  UserPreferences,
} from '../db/queries';
import { requestNotificationPermission, scheduleDailyRhythms, hasDailyRhythms, cancelDailyRhythms } from '../db/notifications';
import {
  V2Screen,
  V2Text,
  V2Button,
  V2Card,
} from './StillwaterUI';

import { StillwaterV2 } from '../theme/stillwaterV2';

const mode = 'day' as const;
const p = StillwaterV2.day;

const colors = {
  ...p,
  surfaceSecondary: p.secondary,
  textSecondary: p.muted,
  scripture: p.primary,
  success: p.primary,
};

type LegacyButtonProps = {
  label: string;
  onPress: () => void;
};

function PrimaryButton(props: LegacyButtonProps) {
  return <V2Button mode={mode} {...props} />;
}

function SecondaryButton(props: LegacyButtonProps) {
  return <V2Button mode={mode} tone="secondary" {...props} />;
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: LegacyButtonProps & { selected: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? p.muted : p.border,
        backgroundColor: selected ? p.secondary : p.surface,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <V2Text mode={mode} variant="secondary">
        {label}
      </V2Text>
    </Pressable>
  );
}

const BEDTIMES = [
  { label: '9:30 PM', value: '21:30' },
  { label: '10:00 PM', value: '22:00' },
  { label: '10:30 PM', value: '22:30' },
  { label: '11:00 PM', value: '23:00' },
  { label: '11:30 PM', value: '23:30' },
  { label: '12:00 AM', value: '00:00' },
];

export function PlanSettingsScreen({
  section,
}: {
  section: 'plan' | 'settings';
}) {
  const router = useRouter();
  const [remindersOn, setRemindersOn] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [boundaries, setBoundaries] = useState<BoundaryItem[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [plans, setPlans] = useState<IfThenPlan[]>([]);

  const [feedbackRevision, setFeedbackRevision] =
    useState(0);

  const [loadError, setLoadError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const resolvingPlan = useRef(false);

  const [newBoundary, setNewBoundary] = useState('');
  const [allyName, setAllyName] = useState('');
  const [allyPhone, setAllyPhone] = useState('');
  const [editingAlly, setEditingAlly] = useState(false);

  const [editingPlanTag, setEditingPlanTag] = useState<string | null>(null);
  const [editingPlanText, setEditingPlanText] = useState('');

  const loadAll = useCallback(async () => {
    const [b, p, pl] = await Promise.all([
      getActiveBoundaries(),
      getPreferences(),
      getAllIfThenPlans(),
    ]);
    setBoundaries(b);
    setPrefs(p);
    setPlans(pl);
    setRemindersOn(
      await hasDailyRhythms().catch(() => false)
    );
    setAllyName(p.trusted_ally_name ?? '');
    setAllyPhone(p.trusted_ally_phone ?? '');
    setLoaded(true);
    setLoadError('');
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAll().catch(() => {
        setLoadError('Unable to load your settings and plans.');
      });
    }, [loadAll])
  );

  const handleAddBoundary = async () => {
    if (!newBoundary.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await addCustomBoundary(newBoundary);
    setNewBoundary('');
    await loadAll();
  };

  const handleResolveBoundary = async (
    id: string,
    kept: boolean
  ) => {
    if (resolvingPlan.current) return;

    resolvingPlan.current = true;

    try {
      await resolveBoundary(id, kept);
      setFeedbackRevision(old => old + 1);

      await loadAll();
    } catch {
      Alert.alert(
        'Unable to update plan',
        'Please reopen your plans and try again.'
      );
    } finally {
      resolvingPlan.current = false;
    }
  };

  const handleSaveAlly = async () => {
    await updatePreferences({
      trusted_ally_name: allyName.trim() || null,
      trusted_ally_phone: allyPhone.trim() || null,
    });
    setEditingAlly(false);
    await loadAll();
  };

  const handlePingAlly = async () => {
    const cleanPhone = (prefs?.trusted_ally_phone ?? '').replace(/[^\d+]/g, '');
    if (!cleanPhone) {
      setEditingAlly(true);
      return;
    }
    const msg =
      'Long night and feeling stretched thin—just texting a real human so I do not stay stuck in my own head. Hope your week is going well.';
    const sep = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${cleanPhone}${sep}body=${encodeURIComponent(msg)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open Messages', 'Check that a valid phone number is saved.');
    }
  };

  const handleSwitchTrack = async (track: ToneTrack) => {
    Haptics.selectionAsync().catch(() => {});
    await updatePreferences({ tone_track: track });
    await loadAll();
  };

  const handleSwitchBedtime = async (bedtime: string) => {
    if (reminderBusy) return;

    Haptics.selectionAsync().catch(() => {});

    await updatePreferences({ bedtime_hhmm: bedtime });

    try {
      // Changing a time does not enable reminders.
      if (await hasDailyRhythms()) {
        await scheduleDailyRhythms(
          prefs?.morning_hhmm ?? '07:30',
          bedtime
        );
      }
    } catch {
      Alert.alert(
        'Reminder unavailable',
        'Your bedtime was saved.'
      );
    }

    await loadAll();
  };

  const handleToggleReminders = async (next: boolean) => {
    if (reminderBusy || !prefs) return;

    setReminderBusy(true);

    try {
      if (!next) {
        await cancelDailyRhythms();
      } else {
        const granted =
          await requestNotificationPermission();

        if (granted) {
          await scheduleDailyRhythms(
            prefs.morning_hhmm,
            prefs.bedtime_hhmm
          );
        } else {
          Alert.alert(
            'Notifications disabled',
            'Allow notifications in device settings to receive reminders.'
          );
        }
      }
    } catch {
      Alert.alert(
        'Reminder unavailable',
        'Unable to update reminders right now.'
      );
    } finally {
      setRemindersOn(
        await hasDailyRhythms().catch(() => false)
      );
      setReminderBusy(false);
    }
  };

  const handleToggleBiometric = async (next: boolean) => {
    if (next) {
      const hasHw = await LocalAuthentication.hasHardwareAsync().catch(() => false);
      const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
      if (!hasHw || !enrolled) {
        Alert.alert('Biometrics unavailable', 'Set up FaceID or fingerprint in device settings first.');
        return;
      }
    }
    await updatePreferences({ biometric_lock: next });
    await loadAll();
  };

  const handleSaveOffRamp = async () => {
    if (!editingPlanTag || !editingPlanText.trim()) return;
    await updateIfThenPlan(editingPlanTag, editingPlanText);
    setEditingPlanTag(null);
    setEditingPlanText('');
    await loadAll();
  };


  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <V2Screen mode={mode}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={leave}
          style={{
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather
            name="arrow-left"
            size={23}
            color={p.text}
          />
        </Pressable>

        <V2Text mode={mode} muted variant="label">
          STILLWATER
        </V2Text>
      </View>

      <V2Text mode={mode} variant="display">
        {section === 'plan' ? 'My plan' : 'Settings'}
      </V2Text>

      <V2Text mode={mode} muted>
        {section === 'plan'
          ? 'Prepare for the moments that matter.'
          : 'Make Stillwater work for you.'}
      </V2Text>

      {loadError !== '' ? (
        <V2Card mode={mode}>
          <V2Text mode={mode}>{loadError}</V2Text>

          <V2Button
            mode={mode}
            tone="secondary"
            label="Try again"
            onPress={() => void loadAll().catch(() => {
              setLoadError('Unable to load your settings and plans.');
            })}
          />
        </V2Card>
      ) : !loaded ? (
        <V2Text mode={mode} muted>
          Loading...
        </V2Text>
      ) : section === 'plan' ? (
        <>
          <PreparationFeedback key={feedbackRevision} />

        {/* 1. Active 24-Hour Boundaries (Custody of the Senses) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Current plans</Text>
          <View style={styles.card}>
            {boundaries.length === 0 ? (
              <Text style={styles.bodyMuted}>
                No active plans right now. Choose a small practical action for today.
              </Text>
            ) : (
              boundaries.map((b, idx) => (
                <View key={b.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.boundaryItem}>
                    <Text style={styles.boundaryLabel}>{b.label}</Text>
                    <View style={styles.boundaryActions}>
                      <Pressable
                        onPress={() => handleResolveBoundary(b.id, true)}
                        accessibilityRole="button"
                        style={styles.keptBtn}
                      >
                        <Feather name="check" size={15} color={colors.onPrimary} />
                        <Text style={styles.keptBtnText}>Kept</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleResolveBoundary(b.id, false)}
                        accessibilityRole="button"
                        style={styles.adjustBtn}
                      >
                        <Text style={styles.adjustBtnText}>Adjust</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}

            <View style={styles.divider} />
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Add a practical plan..."
                placeholderTextColor={colors.textSecondary}
                value={newBoundary}
                onChangeText={setNewBoundary}
                returnKeyType="done"
                onSubmitEditing={handleAddBoundary}
              />
              <Pressable
                onPress={handleAddBoundary}
                accessibilityRole="button"
                accessibilityLabel="Add boundary"
                style={styles.addBtn}
              >
                <Feather name="plus" size={20} color={colors.onPrimary} />
              </Pressable>
            </View>
          </View>
        </View>

          <PreparationWindows />

        {/* 3. Trusted Ally Quick-Ping (Zero Spyware, Ordinary Human Contact) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Trusted contact</Text>
          <View style={styles.card}>
            <Text style={styles.bodyMuted}>
              No surveillance reports. One tap opens a plain, normal text message to a friend so you do not stay isolated.
            </Text>

            {editingAlly ? (
              <View style={{ gap: Spacing.sm }}>
                <TextInput
                  style={styles.input}
                  placeholder="Friend's first name"
                  placeholderTextColor={colors.textSecondary}
                  value={allyName}
                  onChangeText={setAllyName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  value={allyPhone}
                  onChangeText={setAllyPhone}
                />
                <PrimaryButton label="Save trusted ally" onPress={handleSaveAlly} />
              </View>
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {prefs?.trusted_ally_phone ? (
                  <>
                    <PrimaryButton
                      label={`Text ${prefs.trusted_ally_name || 'trusted ally'}`}
                      onPress={handlePingAlly}
                    />
                    <SecondaryButton
                      label="Edit ally contact"
                      onPress={() => setEditingAlly(true)}
                    />
                  </>
                ) : (
                  <SecondaryButton
                    label="Add a trusted friend"
                    onPress={() => setEditingAlly(true)}
                  />
                )}
              </View>
            )}
          </View>
        </View>

        {/* 4. Customizable If-Then Off-Ramps */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Personal coping strategies</Text>
          <View style={styles.card}>
            {plans.map((plan, idx) => {
              const isEditing = editingPlanTag === plan.emotion_tag;
              return (
                <View key={plan.emotion_tag}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.planRow}>
                    <View style={styles.planHeader}>
                      <Text style={styles.planTag}>{plan.emotion_tag.toUpperCase()}</Text>
                      {!isEditing && (
                        <Pressable
                          onPress={() => {
                            setEditingPlanTag(plan.emotion_tag);
                            setEditingPlanText(plan.off_ramp_text);
                          }}
                          hitSlop={10}
                        >
                          <Text style={styles.quietLink}>Edit</Text>
                        </Pressable>
                      )}
                    </View>

                    {isEditing ? (
                      <View style={{ gap: Spacing.sm, marginTop: Spacing.xs }}>
                        <TextInput
                          style={styles.input}
                          multiline
                          value={editingPlanText}
                          onChangeText={setEditingPlanText}
                        />
                        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                          <Pressable style={styles.keptBtn} onPress={handleSaveOffRamp}>
                            <Text style={styles.keptBtnText}>Save</Text>
                          </Pressable>
                          <Pressable
                            style={styles.adjustBtn}
                            onPress={() => setEditingPlanTag(null)}
                          >
                            <Text style={styles.adjustBtnText}>Cancel</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.bodyMuted}>{plan.off_ramp_text}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        </>
      ) : (
        <>
        <V2Card mode={mode}>
          <V2Text mode={mode} variant="section">
            Membership
          </V2Text>

          <V2Text mode={mode} muted>
            View Plus plans, restore purchases,
            or manage your existing membership.
          </V2Text>

          <V2Button mode={mode}
            tone="secondary"
            label="Stillwater membership"
            onPress={() =>
              router.push(STILLWATER_ROUTES.plus)
            } />
        </V2Card>

        {/* 5. Care & Preferences */}
        {prefs && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Daily rhythm and privacy</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Prayer voice</Text>
              <View style={styles.chipRow}>
                <ChoiceChip
                  label="Scripture & Reflection"
                  selected={prefs.tone_track === 'scripture'}
                  onPress={() => handleSwitchTrack('scripture')}
                />
                <ChoiceChip
                  label="Liturgical & Contemplative"
                  selected={prefs.tone_track === 'liturgical'}
                  onPress={() => handleSwitchTrack('liturgical')}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>
                    Quiet reminders
                  </Text>
                  <Text style={styles.smallNote}>
                    Optional morning and evening notifications
                  </Text>
                </View>
                <Switch
                  accessibilityLabel="Quiet reminders"
                  value={remindersOn}
                  disabled={reminderBusy}
                  onValueChange={handleToggleReminders}
                  trackColor={{
                    true: colors.primary,
                    false: colors.border,
                  }}
                />
              </View>

              <View style={styles.divider} />

              <Text style={styles.fieldLabel}>
                Usual bedtime
              </Text>
              <View style={styles.chipRow}>
                {BEDTIMES.map((b) => (
                  <ChoiceChip
                    key={b.value}
                    label={b.label}
                    selected={prefs.bedtime_hhmm === b.value}
                    onPress={() => handleSwitchBedtime(b.value)}
                  />
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Biometric lock</Text>
                  <Text style={styles.smallNote}>Require device authentication on resume</Text>
                </View>
                <Switch
                  value={prefs.biometric_lock}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Private laments</Text>
                  <Text style={styles.smallNote}>
                    New lament text is not saved to your recovery record.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {__DEV__ && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({
              pathname: '/onboarding',
              params: { preview: '1' },
            })}
            style={{
              padding: 16,
              borderRadius: 14,
              backgroundColor: '#DCE6D9',
            }}
          >
            <Text style={{
              color: '#193B35',
              fontWeight: '600',
              textAlign: 'center',
            }}>
              Preview V2 onboarding
            </Text>
          </Pressable>
        )}

        </>
      )}
    </V2Screen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { paddingTop: Spacing.sm, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  headingBlock: { gap: Spacing.xs },
  eyebrow: { ...Typography.label, color: colors.textSecondary },
  title: { color: colors.text },
  sectionBlock: { gap: Spacing.sm },
  sectionTitle: { ...Typography.section, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    padding: Spacing.lg,
    borderRadius: 20,
    borderWidth: Sizes.borderWidth,
    borderColor: colors.border,
    gap: Spacing.md,
  },
  divider: { height: Sizes.borderWidth, backgroundColor: colors.border },
  bodyMuted: { ...Typography.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  smallNote: { ...Typography.secondary, color: colors.textSecondary },
  fieldLabel: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  metricRow: { gap: 4 },
  rowLabel: { ...Typography.secondary, color: colors.textSecondary },
  rowValue: { ...Typography.section, color: colors.text, fontVariant: ['tabular-nums'] },
  boundaryItem: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  boundaryLabel: { ...Typography.body, fontWeight: '500', color: colors.text },
  boundaryActions: { flexDirection: 'row', gap: Spacing.sm },
  keptBtn: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: Radius.standard,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  keptBtnText: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  adjustBtn: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: Radius.standard,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  addRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  addBtn: {
    width: Sizes.minTouchTarget,
    height: Sizes.minTouchTarget,
    borderRadius: Radius.standard,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    minHeight: Sizes.minTouchTarget,
    backgroundColor: colors.background,
    borderWidth: Sizes.borderWidth,
    borderColor: colors.border,
    borderRadius: Radius.standard,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    ...Typography.body,
    fontSize: 15,
    color: colors.text,
  },
  planRow: { gap: 4, paddingVertical: Spacing.xs },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTag: { ...Typography.label, color: colors.scripture },
  quietLink: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
});
