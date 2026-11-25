import { useEffect, useRef, useState } from 'react';
import { Share, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  V2Screen, V2Text, V2Card, V2Button, V2Artwork,
} from '../components/StillwaterUI';

import { StillwaterV2 } from '../theme/stillwaterV2';

import {
  circlesConfigured, validInvite, loadCircle,
  createCircle, joinCircle, changeCheckin,
  generateInvite, revokeInvite, leaveCircle,
  circleShareMessage, type CircleState,
} from '../services/circles';

import { STILLWATER_ROUTES } from '../content/stillwaterRoutes';

const mode = 'day' as const;
const p = StillwaterV2.day;

const titles: Record<string, string> = {
  make_space: 'Make space',
  reconnect: 'Reconnect',
  carry_forward: 'Carry it forward',
};

const inputStyle = {
  minHeight: 52,
  padding: 14,
  borderWidth: 1,
  borderRadius: 12,
  borderColor: p.border,
  color: p.text,
  backgroundColor: p.surface,
  fontSize: 16,
};

export default function CirclesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const incoming = typeof params.invite === 'string'
    && validInvite(params.invite)
    ? params.invite : '';

  const [circle, setCircle] = useState<CircleState | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [pilotCode, setPilotCode] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(circlesConfigured);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const lock = useRef(circlesConfigured);

  useEffect(() => {
    if (!circlesConfigured) return;

    let active = true;

    loadCircle()
      .then(result => {
        if (!active) return;
        setCircle(result);
        setLoaded(true);
      })
      .catch(() => {
        if (active) {
          setError('Unable to retrieve your circle. Check your connection.');
        }
      })
      .finally(() => {
        if (active) {
          lock.current = false;
          setBusy(false);
        }
      });

    return () => { active = false; };
  }, []);

  const perform = async (action: () => Promise<void>) => {
    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      await action();
    } catch (failure) {
      setError(failure instanceof Error
        ? failure.message
        : 'Unable to complete this request.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const leaveScreen = () => {
    if (lock.current) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/library');
  };

  const refresh = () => void perform(async () => {
    const next = await loadCircle();
    setCircle(next);
    setLoaded(true);
    setShareCode('');
  });

  return (
    <V2Screen mode={mode}>
      <V2Button mode={mode} tone="quiet"
        icon="arrow-left" label="Return to Journey"
        disabled={busy} onPress={leaveScreen} />

      <V2Artwork mode={mode} kind="growth" height={160} />

      <V2Text mode={mode} muted variant="label">
        STILLWATER CIRCLES
      </V2Text>

      <V2Text mode={mode} variant="display">
        A little better, together.
      </V2Text>

      {!circlesConfigured ? (
        <V2Card mode={mode}>
          <V2Text mode={mode} variant="section">
            Connected participation
          </V2Text>

          <V2Text mode={mode} muted>
            Circles are not available on this build yet.
            Your personal programmes remain available.
          </V2Text>
        </V2Card>
      ) : (
        <>
          {busy && (
            <V2Text mode={mode} muted>Connecting...</V2Text>
          )}

          <V2Button mode={mode} tone="quiet"
            icon="refresh-cw" label="Refresh"
            disabled={busy} onPress={refresh} />

          {loaded && !circle && (
            <>
              <V2Card mode={mode}>
                <V2Text mode={mode} variant="section">
                  Before you begin
                </V2Text>

                <V2Text mode={mode}>
                  Your anonymous membership and any check-ins
                  you choose to share are stored on the connected
                  server.
                </V2Text>

                <V2Text mode={mode} muted>
                  Other members see participation totals, not
                  your recovery records. In small groups,
                  totals may reveal who checked in.
                  Pilot circles expire after 30 days.
                </V2Text>

                <V2Button mode={mode}
                  tone={consent ? 'secondary' : 'primary'}
                  icon={consent ? 'check' : undefined}
                  label={consent
                    ? 'Participation consent given'
                    : 'I understand and agree'}
                  disabled={busy}
                  onPress={() => setConsent(value => !value)} />
              </V2Card>

              <V2Card mode={mode}>
                <V2Text mode={mode} variant="section">
                  Join a Circle
                </V2Text>

                {incoming !== '' && (
                  <V2Button mode={mode} tone="secondary"
                    label="Use received invitation"
                    disabled={busy}
                    onPress={() => setJoinCode(incoming)} />
                )}

                <TextInput
                  accessibilityLabel="Circle invitation code"
                  placeholder="Invitation code"
                  placeholderTextColor={p.muted}
                  value={joinCode}
                  onChangeText={setJoinCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  style={inputStyle}
                />

                <V2Button mode={mode}
                  label="Join Circle"
                  disabled={
                    busy || !consent ||
                    !validInvite(joinCode.trim())
                  }
                  onPress={() => void perform(async () => {
                    setCircle(await joinCircle(joinCode.trim()));
                    setJoinCode('');
                  })} />
              </V2Card>

              <V2Card mode={mode}>
                <V2Text mode={mode} variant="section">
                  Create a private group
                </V2Text>

                <V2Text mode={mode} muted>
                  Creating groups currently requires
                  a private pilot access code.
                </V2Text>

                <TextInput
                  accessibilityLabel="Pilot access code"
                  placeholder="Pilot access code"
                  placeholderTextColor={p.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={pilotCode}
                  onChangeText={setPilotCode}
                  editable={!busy}
                  style={inputStyle}
                />

                <V2Button mode={mode} icon="users"
                  label="Walk With Me · 2 people"
                  disabled={busy || !consent || !pilotCode}
                  onPress={() => void perform(async () => {
                    setCircle(await createCircle('pair', pilotCode));
                    setPilotCode('');
                  })} />

                <V2Button mode={mode} tone="secondary"
                  label="Start a Circle · up to 8 people"
                  disabled={busy || !consent || !pilotCode}
                  onPress={() => void perform(async () => {
                    setCircle(await createCircle('circle', pilotCode));
                    setPilotCode('');
                  })} />
              </V2Card>
            </>
          )}

          {circle && (
            <>
              <V2Card mode={mode} tonal>
                <V2Text mode={mode} muted variant="label">
                  {circle.mode === 'pair' ? 'WALK WITH ME' : 'YOUR CIRCLE'}
                </V2Text>

                <V2Text mode={mode} variant="heading">
                  Three Quiet Evenings
                </V2Text>

                <V2Text mode={mode}>
                  {circle.members} of {circle.capacity} participants
                </V2Text>

                <V2Text mode={mode} muted variant="secondary">
                  Expires {new Date(circle.expiresAt).toLocaleDateString()}
                </V2Text>

                <V2Button mode={mode} tone="secondary"
                  label="Open programme library"
                  disabled={busy}
                  onPress={() =>
                    router.push(STILLWATER_ROUTES.programmes)
                  } />
              </V2Card>

              <V2Text mode={mode} variant="section">
                Shared participation
              </V2Text>

              <V2Text mode={mode} muted variant="secondary">
                Share only when you choose. These check-ins
                are separate from your saved private sessions.
              </V2Text>

              {circle.checkins.map(item => (
                <V2Card key={item.dayId} mode={mode}>
                  <V2Text mode={mode} variant="section">
                    {titles[item.dayId]}
                  </V2Text>

                  <V2Text mode={mode} muted>
                    {item.count} of {circle.members} shared
                  </V2Text>

                  <View style={{
                    height: 6,
                    backgroundColor: p.secondary,
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      height: 6,
                      width: (item.count / circle.members * 100) + '%',
                      backgroundColor: p.primary,
                    }} />
                  </View>

                  <V2Button mode={mode}
                    tone={item.mine ? 'quiet' : 'secondary'}
                    label={item.mine
                      ? 'Remove my shared check-in'
                      : 'Share that I finished this session'}
                    disabled={busy}
                    onPress={() => void perform(async () => {
                      setCircle(await changeCheckin(
                        item.dayId, !item.mine
                      ));
                    })} />
                </V2Card>
              ))}

              {circle.owner && (
                <V2Card mode={mode}>
                  <V2Text mode={mode} variant="section">
                    Invite someone
                  </V2Text>

                  <V2Text mode={mode} muted>
                    A new invitation invalidates the previous
                    invitation, but does not remove existing members.
                  </V2Text>

                  <V2Button mode={mode} icon="link"
                    label="Generate invitation"
                    disabled={busy}
                    onPress={() => void perform(async () => {
                      setShareCode(await generateInvite());
                    })} />

                  {shareCode !== '' && (
                    <>
                      <Text selectable style={{
                        color: p.text,
                        fontSize: 13,
                      }}>{shareCode}</Text>

                      <V2Button mode={mode} icon="share-2"
                        label="Share invitation"
                        disabled={busy}
                        onPress={() => void perform(async () => {
                          await Share.share({
                            message: circleShareMessage(shareCode),
                          });
                        })} />
                    </>
                  )}

                  <V2Button mode={mode} tone="quiet"
                    label="Revoke invitation"
                    disabled={busy}
                    onPress={() => void perform(async () => {
                      await revokeInvite();
                      setShareCode('');
                    })} />
                </V2Card>
              )}

              {confirmLeave ? (
                <V2Card mode={mode}>
                  <V2Text mode={mode}>
                    {circle.owner
                      ? 'Closing this circle removes all connected membership and check-ins for everyone.'
                      : 'Leaving removes your membership and shared check-ins.'}
                  </V2Text>

                  <V2Button mode={mode}
                    label={circle.owner ? 'Confirm close' : 'Confirm leave'}
                    disabled={busy}
                    onPress={() => void perform(async () => {
                      await leaveCircle();
                      setCircle(null);
                      setConsent(false);
                      setShareCode('');
                      setConfirmLeave(false);
                    })} />

                  <V2Button mode={mode} tone="quiet"
                    label="Cancel" disabled={busy}
                    onPress={() => setConfirmLeave(false)} />
                </V2Card>
              ) : (
                <V2Button mode={mode} tone="quiet"
                  label={circle.owner ? 'Close Circle' : 'Leave Circle'}
                  disabled={busy}
                  onPress={() => setConfirmLeave(true)} />
              )}
            </>
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
