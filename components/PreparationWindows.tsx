
import {
  getPreparationReminderState,
  enablePreparationReminder,
  cancelPreparationReminder,
  PreparationReminderError,
} from '../db/preparationReminders';

import type {
  PreparationReminderState,
} from '../db/preparationReminders';

import {
  reminderIdentifier,
  reminderTime,
} from '../content/preparationReminderRules';

import { useCallback, useRef, useState } from 'react';
import {
  Alert, Switch, TextInput, View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import {
  getPreparationWindows,
  savePreparationWindow,
  setPreparationWindowEnabled,
  removePreparationWindow,
} from '../db/preparationWindows';

import {
  validWindow,
  formatWindow,
  formatWindowTime,
} from '../content/preparationWindows';

import type {
  PreparationWindow,
} from '../content/preparationWindows';

import {
  V2Card, V2Text, V2Button,
} from './StillwaterUI';

import { StillwaterV2 } from '../theme/stillwaterV2';

const mode = 'day' as const;
const p = StillwaterV2.day;

export function PreparationWindows() {
  const [windows, setWindows] =
    useState<PreparationWindow[]>([]);

  const [reminders, setReminders] =
    useState<PreparationReminderState | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [start, setStart] = useState('21:00');
  const [end, setEnd] = useState('00:00');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const refresh = useCallback(async () => {
    const rows = await getPreparationWindows();
    setWindows(rows);
    setLoaded(true);

    // A notification error must not hide saved windows.
    const reminderState =
      await getPreparationReminderState()
        .catch(() => null);

    setReminders(reminderState);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {
        setError('Unable to load preparation windows.');
      });
    }, [refresh])
  );

  const perform = async (
    operation: () => Promise<void>
  ): Promise<boolean> => {
    if (lock.current) return false;

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      await operation();

      try {
        await refresh();
      } catch {
        setError('Change saved. Reopen Progress to refresh.');
      }

      return true;
    } catch (failure) {
      setError(
        failure instanceof PreparationReminderError
          ? failure.message
          : 'Unable to save this change. Check your settings and try again.'
      );

      // Refresh even after a partial native failure.
      await refresh().catch(() => {});
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const openEditor = (window?: PreparationWindow) => {
    setEditingId(window?.id);
    setStart(window?.start ?? '21:00');
    setEnd(window?.end ?? '00:00');
    setError('');
    setEditing(true);
  };

  const save = async () => {
    const from = start.trim();
    const to = end.trim();

    if (!validWindow(from, to)) {
      setError(
        'Use HH:MM in 24-hour format. Start and end must differ.'
      );
      return;
    }

    if (windows.some(window =>
      window.id !== editingId &&
      window.start === from &&
      window.end === to
    )) {
      setError('This preparation window already exists.');
      return;
    }

    if (await perform(() =>
      savePreparationWindow(from, to, editingId)
    )) {
      setEditing(false);
    }
  };

  const inputStyle = {
    color: p.text,
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: p.muted,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    minHeight: 52,
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        <Feather name="clock" size={25} color={p.primary} />

        <V2Text mode={mode} variant="heading">
          Times to prepare
        </V2Text>
      </View>

      <V2Text mode={mode} muted>
        Choose times when a little extra preparation might help.
      </V2Text>

      {!loaded ? (
        <V2Button
          mode={mode}
          tone="secondary"
          label="Load preparation windows"
          onPress={() => void refresh().catch(() =>
            setError('Unable to load preparation windows.')
          )}
        />
      ) : (
        <>
          {windows.length === 0 && (
            <V2Card mode={mode}>
              <V2Text mode={mode} muted>
                No preparation windows chosen.
                Add one only if it would be useful.
              </V2Text>
            </V2Card>
          )}

          {windows.map(window => (
            <V2Card key={window.id} mode={mode}>
              <V2Text mode={mode} muted variant="label">
                DAILY
              </V2Text>

              <V2Text mode={mode} variant="section">
                {formatWindow(window)}
              </V2Text>

              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <V2Text mode={mode}>
                  {window.enabled ? 'Enabled' : 'Paused'}
                </V2Text>

                <Switch
                  accessibilityLabel={'Enable ' + formatWindow(window)}
                  value={window.enabled}
                  disabled={busy}
                  onValueChange={value => void perform(() =>
                    setPreparationWindowEnabled(window.id, value)
                  )}
                  trackColor={{ true: p.primary, false: p.border }}
                />
              </View>

              <View style={{
                borderTopWidth: 1,
                borderTopColor: p.border,
                paddingTop: 12,
                gap: 8,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  <Feather
                    name="bell"
                    size={21}
                    color={p.muted}
                  />

                  <View style={{ flex: 1 }}>
                    <V2Text mode={mode}>
                      Quiet reminder
                    </V2Text>

                    <V2Text
                      mode={mode}
                      muted
                      variant="secondary"
                    >
                      Daily at {
                        formatWindowTime(
                          reminderTime(window.start).hhmm
                        )
                      }
                    </V2Text>
                  </View>
                </View>

                {!reminders ? (
                  <V2Text mode={mode} muted variant="secondary">
                    Reminder status unavailable.
                  </V2Text>
                ) : !reminders.supported ? (
                  <V2Text mode={mode} muted variant="secondary">
                    Available on Android and iOS.
                  </V2Text>
                ) : reminders.scheduledIds.includes(
                  reminderIdentifier(window.id)
                ) ? (
                  <>
                    <V2Text mode={mode} muted variant="secondary">
                      {reminders.permissionGranted
                        ? 'Scheduled on this device.'
                        : 'Scheduled, but notification permission is unavailable.'}
                    </V2Text>

                    <V2Button
                      mode={mode}
                      tone="secondary"
                      label="Disable reminder"
                      disabled={busy}
                      onPress={() => void perform(() =>
                        cancelPreparationReminder(window.id)
                      )}
                    />
                  </>
                ) : (
                  <V2Button
                    mode={mode}
                    tone="secondary"
                    label="Enable reminder"
                    disabled={busy || !window.enabled}
                    onPress={() => Alert.alert(
                      'Enable a daily reminder?',
                      'Stillwater will send a discreet notification 30 minutes before this window.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Enable',
                          onPress: () => {
                            void perform(() =>
                              enablePreparationReminder(window)
                            );
                          },
                        },
                      ]
                    )}
                  />
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <V2Button
                    mode={mode}
                    tone="secondary"
                    label="Edit"
                    disabled={busy}
                    onPress={() => openEditor(window)}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <V2Button
                    mode={mode}
                    tone="quiet"
                    label="Remove"
                    disabled={busy}
                    onPress={() => Alert.alert(
                      'Remove this window?',
                      'It will no longer influence your preparation suggestions.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => {
                            void perform(() =>
                              removePreparationWindow(window.id)
                            );

                            if (editingId === window.id) {
                              setEditing(false);
                            }
                          },
                        },
                      ]
                    )}
                  />
                </View>
              </View>
            </V2Card>
          ))}

          {editing ? (
            <V2Card mode={mode} tonal>
              <V2Text mode={mode} variant="section">
                {editingId ? 'Edit window' : 'New preparation window'}
              </V2Text>

              <V2Text mode={mode} muted variant="secondary">
                Enter local time using the 24-hour format.
                Overnight windows are supported.
                Editing a window disables its existing reminder.
              </V2Text>

              <V2Text mode={mode}>Start time</V2Text>

              <TextInput
                accessibilityLabel="Start time in 24-hour format"
                value={start}
                onChangeText={setStart}
                editable={!busy}
                maxLength={5}
                autoCorrect={false}
                placeholder="21:00"
                placeholderTextColor={p.muted}
                style={inputStyle}
              />

              <V2Text mode={mode}>End time</V2Text>

              <TextInput
                accessibilityLabel="End time in 24-hour format"
                value={end}
                onChangeText={setEnd}
                editable={!busy}
                maxLength={5}
                autoCorrect={false}
                placeholder="00:00"
                placeholderTextColor={p.muted}
                style={inputStyle}
              />

              <V2Button
                mode={mode}
                label={busy ? 'Saving...' : 'Save window'}
                disabled={busy}
                onPress={() => void save()}
              />

              <V2Button
                mode={mode}
                tone="quiet"
                label="Cancel"
                disabled={busy}
                onPress={() => {
                  setEditing(false);
                  setError('');
                }}
              />
            </V2Card>
          ) : (
            <V2Button
              mode={mode}
              tone="secondary"
              icon="plus"
              label="Add a preparation window"
              disabled={busy}
              onPress={() => openEditor()}
            />
          )}
        </>
      )}

      {error !== '' && (
        <V2Text mode={mode}>{error}</V2Text>
      )}

      <V2Text mode={mode} muted variant="secondary">
        Reminders are optional and limited to three per day.
        Pausing, editing or removing a window cancels its reminder.
        Delivery and lock-screen visibility depend on device settings.
      </V2Text>
    </View>
  );
}
