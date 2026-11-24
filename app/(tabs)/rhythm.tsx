import { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { Feather } from '@expo/vector-icons';
import { Palette, Radius, Sizes, Spacing, Typography } from '../../theme/tokens';
import {
  addCustomBoundary,
  BoundaryItem,
  getActiveBoundaries,
  getAllIfThenPlans,
  getPreferences,
  getWeatherMapInsights,
  IfThenPlan,
  resolveBoundary,
  ToneTrack,
  updateIfThenPlan,
  updatePreferences,
  UserPreferences,
  WeatherMapInsights,
} from '../../db/queries';
import { requestNotificationPermission, scheduleDailyRhythms } from '../../db/notifications';
import {
  AppHeader,
  ChoiceChip,
  PrimaryButton,
  SecondaryButton,
  useScreenInset,
} from '../../components/RoyalUI';

const BEDTIMES = [
  { label: '9:30 PM', value: '21:30' },
  { label: '10:00 PM', value: '22:00' },
  { label: '10:30 PM', value: '22:30' },
  { label: '11:00 PM', value: '23:00' },
  { label: '11:30 PM', value: '23:30' },
];

export default function RhythmScreen() {
  const { inset, isNarrow } = useScreenInset();
  const [insights, setInsights] = useState<WeatherMapInsights | null>(null);
  const [boundaries, setBoundaries] = useState<BoundaryItem[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [plans, setPlans] = useState<IfThenPlan[]>([]);

  const [newBoundary, setNewBoundary] = useState('');
  const [allyName, setAllyName] = useState('');
  const [allyPhone, setAllyPhone] = useState('');
  const [editingAlly, setEditingAlly] = useState(false);

  const [editingPlanTag, setEditingPlanTag] = useState<string | null>(null);
  const [editingPlanText, setEditingPlanText] = useState('');

  const loadAll = useCallback(async () => {
    const [w, b, p, pl] = await Promise.all([
      getWeatherMapInsights(),
      getActiveBoundaries(),
      getPreferences(),
      getAllIfThenPlans(),
    ]);
    setInsights(w);
    setBoundaries(b);
    setPrefs(p);
    setPlans(pl);
    setAllyName(p.trusted_ally_name ?? '');
    setAllyPhone(p.trusted_ally_phone ?? '');
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const handleAddBoundary = async () => {
    if (!newBoundary.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await addCustomBoundary(newBoundary);
    setNewBoundary('');
    await loadAll();
  };

  const handleResolveBoundary = async (id: string, kept: boolean) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await resolveBoundary(id, kept);
    await loadAll();
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
    Haptics.selectionAsync().catch(() => {});
    await updatePreferences({ bedtime_hhmm: bedtime });
    try {
      const granted = await requestNotificationPermission();
      if (granted) await scheduleDailyRhythms(prefs?.morning_hhmm ?? '07:30', bedtime);
    } catch {
      // Ignored if local notifications unavailable in Expo Go
    }
    await loadAll();
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

  const handleToggleBurnBox = async (burnImmediately: boolean) => {
    await updatePreferences({ save_laments: !burnImmediately });
    await loadAll();
  };

  const handleSaveOffRamp = async () => {
    if (!editingPlanTag || !editingPlanText.trim()) return;
    await updateIfThenPlan(editingPlanTag, editingPlanText);
    setEditingPlanTag(null);
    setEditingPlanText('');
    await loadAll();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingHorizontal: inset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headingBlock}>
          <Text style={styles.eyebrow}>Patterns & stewardship</Text>
          <Text style={[Typography.display, isNarrow && Typography.displayNarrow, styles.title]}>
            Rhythm
          </Text>
        </View>

        {/* 1. Active 24-Hour Boundaries (Custody of the Senses) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Active 24-hour boundaries</Text>
          <View style={styles.card}>
            {boundaries.length === 0 ? (
              <Text style={styles.bodyMuted}>
                No active boundaries right now. Set one simple environmental shift below to protect tonight.
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
                        <Feather name="check" size={15} color={Palette.light.onPrimary} />
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
                placeholder="Add a 24-hour boundary..."
                placeholderTextColor={Palette.light.textSecondary}
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
                <Feather name="plus" size={20} color={Palette.light.onPrimary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* 2. Weather Map Insights (30-Day Local Analytics) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Weather map (30 days)</Text>
          <View style={styles.card}>
            {insights?.hasEnoughData ? (
              <>
                <View style={styles.metricRow}>
                  <Text style={styles.rowLabel}>Peak noisy window</Text>
                  <Text style={styles.rowValue}>{insights.peakWindowLabel}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.metricRow}>
                  <Text style={styles.rowLabel}>Most common root need</Text>
                  <Text style={styles.rowValue}>
                    {insights.topEmotionTag ?? 'Still observing'}
                  </Text>
                </View>

                {insights.examenProtectionRate !== null && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.metricRow}>
                      <Text style={styles.rowLabel}>Clarity rate on Evening Examen nights</Text>
                      <Text style={[styles.rowValue, { color: Palette.light.success }]}>
                        {insights.examenProtectionRate}%
                      </Text>
                    </View>
                  </>
                )}
              </>
            ) : (
              <Text style={styles.bodyMuted}>
                Check in quietly over the next few days. Once you log at least 3 pauses or resets, your personal weather patterns will surface here.
              </Text>
            )}
          </View>
        </View>

        {/* 3. Trusted Ally Quick-Ping (Zero Spyware, Ordinary Human Contact) */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Trusted ally check-in</Text>
          <View style={styles.card}>
            <Text style={styles.bodyMuted}>
              No surveillance reports. One tap opens a plain, normal text message to a friend so you do not stay isolated.
            </Text>

            {editingAlly ? (
              <View style={{ gap: Spacing.sm }}>
                <TextInput
                  style={styles.input}
                  placeholder="Friend's first name"
                  placeholderTextColor={Palette.light.textSecondary}
                  value={allyName}
                  onChangeText={setAllyName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor={Palette.light.textSecondary}
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
          <Text style={styles.sectionTitle}>Pause off-ramps</Text>
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

        {/* 5. Care & Preferences */}
        {prefs && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Care & preferences</Text>
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

              <Text style={styles.fieldLabel}>Evening Examen reminder (30m before sleep)</Text>
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
                  <Text style={styles.smallNote}>Require FaceID or fingerprint on resume</Text>
                </View>
                <Switch
                  value={prefs.biometric_lock}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ true: Palette.light.primary, false: Palette.light.border }}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Burn Box laments</Text>
                  <Text style={styles.smallNote}>Dissolve laments immediately without saving</Text>
                </View>
                <Switch
                  value={!prefs.save_laments}
                  onValueChange={handleToggleBurnBox}
                  trackColor={{ true: Palette.light.primary, false: Palette.light.border }}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.light.background },
  container: { paddingTop: Spacing.sm, paddingBottom: Spacing.xxl, gap: Spacing.xl },
  headingBlock: { gap: Spacing.xs },
  eyebrow: { ...Typography.label, color: Palette.light.textSecondary },
  title: { color: Palette.light.text },
  sectionBlock: { gap: Spacing.sm },
  sectionTitle: { ...Typography.section, color: Palette.light.text },
  card: {
    backgroundColor: Palette.light.surface,
    padding: Spacing.lg,
    borderRadius: Radius.group,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    gap: Spacing.md,
  },
  divider: { height: Sizes.borderWidth, backgroundColor: Palette.light.border },
  bodyMuted: { ...Typography.body, fontSize: 15, lineHeight: 22, color: Palette.light.textSecondary },
  smallNote: { ...Typography.secondary, color: Palette.light.textSecondary },
  fieldLabel: {
    fontFamily: Typography.sansFamily,
    fontSize: 15,
    fontWeight: '600',
    color: Palette.light.text,
  },
  metricRow: { gap: 4 },
  rowLabel: { ...Typography.secondary, color: Palette.light.textSecondary },
  rowValue: { ...Typography.section, color: Palette.light.text, fontVariant: ['tabular-nums'] },
  boundaryItem: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  boundaryLabel: { ...Typography.body, fontWeight: '500', color: Palette.light.text },
  boundaryActions: { flexDirection: 'row', gap: Spacing.sm },
  keptBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.standard,
    backgroundColor: Palette.light.success,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  keptBtnText: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.light.onPrimary,
  },
  adjustBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: Radius.standard,
    backgroundColor: Palette.light.surfaceSecondary,
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.light.text,
  },
  addRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  addBtn: {
    width: Sizes.minTouchTarget,
    height: Sizes.minTouchTarget,
    borderRadius: Radius.standard,
    backgroundColor: Palette.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    minHeight: Sizes.minTouchTarget,
    backgroundColor: Palette.light.background,
    borderWidth: Sizes.borderWidth,
    borderColor: Palette.light.border,
    borderRadius: Radius.standard,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    ...Typography.body,
    fontSize: 15,
    color: Palette.light.text,
  },
  planRow: { gap: 4, paddingVertical: Spacing.xs },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTag: { ...Typography.label, color: Palette.light.scripture },
  quietLink: {
    fontFamily: Typography.sansFamily,
    fontSize: 13,
    fontWeight: '600',
    color: Palette.light.primary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
});