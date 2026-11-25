
import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { useIsFocused } from 'expo-router';

import {
  refreshSanctuarySnapshot,
  saveSanctuaryAppearance,
} from '../db/sanctuary';

import type {
  SanctuarySnapshot,
} from '../db/sanctuary';

import type {
  SanctuaryAppearance,
} from '../content/sanctuaryAppearance';

export function useSanctuaryGrowth() {
  const focused = useIsFocused();
  const [snapshot, setSnapshot] =
    useState<SanctuarySnapshot | null>(null);

  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const requestId = useRef(0);
  const writeLock = useRef(false);

  useEffect(() => {
      if (!focused) return;
      let active = true;
      const request = ++requestId.current;

      refreshSanctuarySnapshot()
        .then(next => {
          if (!active || requestId.current !== request) return;

          setSnapshot(next);
          setFailed(false);
          setSaveFailed(false);
        })
        .catch(() => {
          if (active && requestId.current === request) {
            setFailed(true);
          }
        });

      return () => {
        active = false;
      };
    }, [focused, retryCount]);

  const chooseAppearance = async (
    appearance: SanctuaryAppearance
  ) => {
    if (
      !snapshot ||
      writeLock.current ||
      snapshot.appearance === appearance
    ) {
      return;
    }

    writeLock.current = true;
    const request = ++requestId.current;

    setSaving(true);
    setSaveFailed(false);

    try {
      await saveSanctuaryAppearance(appearance);

      if (requestId.current === request) {
        setSnapshot(previous =>
          previous
            ? { ...previous, appearance }
            : previous
        );
      }
    } catch {
      if (requestId.current === request) {
        setSaveFailed(true);
      }
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  };

  return {
    snapshot,
    stage: snapshot?.stage ?? null,
    failed,
    saving,
    saveFailed,
    chooseAppearance,
    retry: () => setRetryCount(old => old + 1),
  };
}
