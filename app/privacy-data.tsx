import { useRef, useState } from 'react';
import { reloadAppAsync } from 'expo';
import { TextInput } from 'react-native';
import { useRouter } from 'expo-router';

import {
  queuePrivateDataReset,
  privateResetSupported,
} from '../db/privateDataReset';

import {
  confirmsPrivateReset,
} from '../content/privateDataReset';

import {
  V2Screen,
  V2Card,
  V2Text,
  V2Button,
} from '../components/StillwaterUI';

import {
  StillwaterV2,
} from '../theme/stillwaterV2';

const mode = 'day' as const;
const p = StillwaterV2.day;

export default function PrivacyDataScreen() {
  const router = useRouter();

  const [confirming, setConfirming] =
    useState(false);

  const [confirmation, setConfirmation] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [queued, setQueued] =
    useState(false);

  const [error, setError] =
    useState('');

  const lock = useRef(false);

  const leave = () => {
    if (lock.current || queued) return;

    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  const restart = async () => {
    try {
      await reloadAppAsync(
        'Apply confirmed private data reset'
      );
    } catch {
      setError(
        'Close Stillwater completely and reopen it to finish deleting your records.'
      );
    }
  };

  const remove = async () => {
    if (
      lock.current ||
      queued ||
      !privateResetSupported ||
      !confirmsPrivateReset(confirmation)
    ) return;

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      await queuePrivateDataReset();
      setQueued(true);

      await restart();

    } catch {
      setError(
        'Unable to schedule data deletion. Please try again.'
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };

  return (
    <V2Screen mode={mode}>
      <V2Button mode={mode}
        tone="quiet"
        icon="arrow-left"
        label="Return to settings"
        disabled={busy || queued}
        onPress={leave} />

      <V2Text mode={mode} muted variant="label">
        PRIVACY AND DATA
      </V2Text>

      <V2Text mode={mode} variant="display">
        Your data belongs to you.
      </V2Text>

      <V2Card mode={mode}>
        <V2Text mode={mode} variant="section">
          Delete personal records
        </V2Text>

        <V2Text mode={mode}>
          Remove recovery history, personal plans,
          trusted contact details, preparation windows,
          local programme progress and Sanctuary growth.
        </V2Text>

        <V2Text mode={mode} muted>
          Scheduled reminders will be cancelled.
          Custom coping strategies will return
          to their original defaults.
        </V2Text>
      </V2Card>

      <V2Card mode={mode}>
        <V2Text mode={mode} variant="section">
          What stays
        </V2Text>

        <V2Text mode={mode}>
          Your purchased membership, Grace Scholarship,
          app lock and prayer preferences are preserved.
        </V2Text>

        <V2Text mode={mode} muted>
          Connected Circle membership is separate.
          Leave or close a Circle from its own screen.
          This action does not delete store records,
          external backups or messages you have sent.
        </V2Text>
      </V2Card>

      {!privateResetSupported && (
        <V2Text mode={mode} muted>
          Personal data reset is available in
          the installed mobile application.
        </V2Text>
      )}

      {!confirming && !queued && (
        <V2Button mode={mode}
          tone="secondary"
          icon="trash-2"
          label="Delete personal data"
          disabled={!privateResetSupported}
          onPress={() => setConfirming(true)} />
      )}

      {confirming && !queued && (
        <V2Card mode={mode}>
          <V2Text mode={mode}
            variant="section"
            style={{ color: p.danger }}>
            This cannot be undone.
          </V2Text>

          <V2Text mode={mode}>
            Type DELETE to confirm that you want
            to permanently remove these local records.
          </V2Text>

          <TextInput
            accessibilityLabel="Type DELETE to confirm"
            value={confirmation}
            onChangeText={setConfirmation}
            editable={!busy}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="DELETE"
            placeholderTextColor={p.muted}
            style={{
              minHeight: 52,
              padding: 12,
              borderWidth: 1,
              borderColor: p.border,
              borderRadius: 12,
              color: p.text,
              fontSize: 16,
            }}
          />

          <V2Button mode={mode}
            label={busy
              ? 'Preparing deletion...'
              : 'Confirm deletion and restart'}
            disabled={
              busy ||
              !confirmsPrivateReset(confirmation)
            }
            onPress={() => void remove()} />

          <V2Button mode={mode} tone="quiet"
            label="Cancel"
            disabled={busy}
            onPress={() => {
              setConfirming(false);
              setConfirmation('');
            }} />
        </V2Card>
      )}

      {queued && (
        <V2Card mode={mode}>
          <V2Text mode={mode} variant="section">
            Restart required
          </V2Text>

          <V2Text mode={mode}>
            Deletion is scheduled. Stillwater will
            remove the records before opening
            your personal screens again.
          </V2Text>

          <V2Button mode={mode}
            label="Restart Stillwater"
            disabled={busy}
            onPress={() => void restart()} />
        </V2Card>
      )}

      {error !== '' && (
        <V2Text mode={mode}>
          {error}
        </V2Text>
      )}
    </V2Screen>
  );
}
