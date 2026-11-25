import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  getPendingPlanFeedback,
  recordPlanFeedback,
} from '../db/preparationFeedback';

import type {
  PendingPlanFeedback,
} from '../db/preparationFeedback';

import type {
  PlanFeedback,
} from '../content/preparationFeedback';

import {
  V2Card,
  V2Text,
  V2Button,
} from './StillwaterUI';

const mode = 'day' as const;

export function PreparationFeedback() {
  const [pending, setPending] =
    useState<PendingPlanFeedback | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] =
    useState(false);

  const lock = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      getPendingPlanFeedback()
        .then(item => {
          if (active) {
            setPending(item);
            setAcknowledged(false);
            setError('');
          }
        })
        .catch(() => {});

      return () => {
        active = false;
      };
    }, [])
  );

  const respond = async (value: PlanFeedback) => {
    if (!pending || lock.current) return;

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      await recordPlanFeedback(
        pending.boundaryId,
        value
      );

      setPending(null);
      setAcknowledged(value !== 'skipped');

    } catch {
      setError('Unable to save feedback. Please try again.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  if (acknowledged) {
    return (
      <V2Card mode={mode} tonal>
        <V2Text mode={mode} variant="section">
          Feedback recorded.
        </V2Text>

        <V2Text mode={mode} muted>
          Choose what works for you. You can always
          make a different plan.
        </V2Text>

        <V2Button
          mode={mode}
          tone="quiet"
          label="Dismiss"
          onPress={() => setAcknowledged(false)}
        />
      </V2Card>
    );
  }

  if (!pending) return null;

  return (
    <V2Card mode={mode}>
      <V2Text mode={mode} muted variant="label">
        OPTIONAL CHECK-IN
      </V2Text>

      <V2Text mode={mode} variant="heading">
        Did your plan help?
      </V2Text>

      <View style={{ gap: 6 }}>
        <V2Text mode={mode}>
          {pending.label}
        </V2Text>

        <V2Text mode={mode} muted variant="secondary">
          Your previously chosen plan
        </V2Text>
      </View>

      <V2Button
        mode={mode}
        tone="secondary"
        icon="thumbs-up"
        label="It helped"
        disabled={busy}
        onPress={() => void respond('helpful')}
      />

      <V2Button
        mode={mode}
        tone="secondary"
        icon="minus-circle"
        label="It did not help"
        disabled={busy}
        onPress={() => void respond('not_helpful')}
      />

      <V2Button
        mode={mode}
        tone="secondary"
        icon="clock"
        label="I did not try it"
        disabled={busy}
        onPress={() => void respond('not_tried')}
      />

      <V2Button
        mode={mode}
        tone="quiet"
        label="Skip this check-in"
        disabled={busy}
        onPress={() => void respond('skipped')}
      />

      {error !== '' && (
        <V2Text mode={mode}>{error}</V2Text>
      )}

      <V2Text mode={mode} muted variant="secondary">
        Optional feedback helps refine future
        suggestions. It stays on this device.
      </V2Text>
    </V2Card>
  );
}
