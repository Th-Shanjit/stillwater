import { useRef, useState } from 'react';
import { Share, View } from 'react-native';
import {
  useLocalSearchParams,
  useRouter,
  type Href,
} from 'expo-router';

import {
  V2Screen, V2Text, V2Card, V2Button, V2Artwork,
} from '../components/StillwaterUI';

import {
  MOMENT_LINK, WALK_LINK,
  parseSharedLink, sameSharedLink,
  publicShareLink, type SharedLink,
} from '../content/shareLinks';

import moment from '../assets/content/shared_moment.json';
import { getProgramme } from '../content/programmeCatalog';
import { joinProgramme } from '../db/programmeEnrollments';
import { STILLWATER_ROUTES } from '../content/stillwaterRoutes';

const base = process.env.EXPO_PUBLIC_STILLWATER_SHARE_URL;

const walk = getProgramme(WALK_LINK.id, WALK_LINK.version);

const availableWalk = walk &&
  walk.access === 'free' &&
  walk.audience === 'general' &&
  walk.schedule === 'self_paced'
  ? walk
  : null;

function MomentPlayer({ onExit }: { onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const step = moment.steps[index];

  const advance = () => {
    setIndex(previous =>
      Math.min(moment.steps.length, previous + 1)
    );
  };

  return (
    <V2Screen mode="day">
      <V2Button mode="day" tone="quiet"
        icon="x" label="Close" onPress={onExit} />

      <V2Artwork mode="day" kind="water" height={180} />

      <V2Text mode="day" muted variant="label">
        A MOMENT FROM STILLWATER
      </V2Text>

      <V2Text mode="day" variant="display">
        {step ? step.title : 'Carry a little peace with you.'}
      </V2Text>

      <V2Text mode="day">
        {step ? step.text : 'You can return to your day now.'}
      </V2Text>

      {step ? (
        <View style={{ gap: 10 }}>
          <V2Text mode="day" muted variant="secondary">
            Step {index + 1} of {moment.steps.length}
          </V2Text>

          <V2Button mode="day"
            label="Continue when ready"
            onPress={advance} />

          {step.optional && (
            <V2Button mode="day" tone="quiet"
              label="Skip prayer" onPress={advance} />
          )}

          {index > 0 && (
            <V2Button mode="day" tone="quiet"
              label="Previous step"
              onPress={() => setIndex(old => old - 1)} />
          )}
        </View>
      ) : (
        <V2Button mode="day"
          label="Done" onPress={onExit} />
      )}
    </V2Screen>
  );
}

export default function SharedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const incoming = Object.keys(params).length > 0;
  const link = incoming ? parseSharedLink(params) : null;

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/library');
  };

  const share = async (
    target: SharedLink,
    message: string
  ) => {
    const url = publicShareLink(base, target);

    if (!url) {
      setError('Public sharing has not been configured.');
      return;
    }

    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');

    try {
      await Share.share({ message: message + '\n\n' + url });
    } catch {
      setError('Unable to open the sharing menu.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!availableWalk || lock.current) return;

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      await joinProgramme(
        availableWalk.id, availableWalk.version
      );

      router.replace(STILLWATER_ROUTES.programmes);
    } catch {
      setError(
        'Unable to join. You may already have another edition enrolled.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  if (link && sameSharedLink(link, MOMENT_LINK)) {
    return <MomentPlayer key="little-room-v1" onExit={leave} />;
  }

  if (link && sameSharedLink(link, WALK_LINK) && availableWalk) {
    return (
      <V2Screen mode="day">
        <V2Button mode="day" tone="quiet"
          label="Close invitation"
          disabled={busy} onPress={leave} />

        <V2Artwork mode="day" kind="growth" height={180} />

        <V2Text mode="day" muted variant="label">
          WALK WITH ME
        </V2Text>

        <V2Text mode="day" variant="display">
          {availableWalk.title}
        </V2Text>

        <V2Text mode="day">
          {availableWalk.description}
        </V2Text>

        <V2Text mode="day" muted>
          {availableWalk.days.length} sessions · Free · Self-paced
        </V2Text>

        <V2Card mode="day" tonal>
          <V2Text mode="day">
            Someone has shared this programme with you.
            You can follow it independently.
          </V2Text>

          <V2Text mode="day" muted variant="secondary">
            Your progress is not shared with the sender.
          </V2Text>
        </V2Card>

        <V2Button mode="day"
          label={busy ? 'Joining...' : 'Join programme'}
          disabled={busy}
          onPress={() => void accept()} />

        {error !== '' && (
          <V2Text mode="day">{error}</V2Text>
        )}
      </V2Screen>
    );
  }

  if (incoming) {
    return (
      <V2Screen mode="day">
        <V2Text mode="day" variant="heading">
          This invitation is unavailable.
        </V2Text>

        <V2Text mode="day" muted>
          The link may be invalid or refer to an unavailable edition.
        </V2Text>

        <V2Button mode="day" label="Return to Journey"
          onPress={leave} />
      </V2Screen>
    );
  }

  const configured = Boolean(publicShareLink(base, MOMENT_LINK));

  return (
    <V2Screen mode="day">
      <V2Button mode="day" tone="quiet"
        icon="arrow-left" label="Return to Journey"
        disabled={busy} onPress={leave} />

      <V2Text mode="day" variant="display">
        Share something good.
      </V2Text>

      <V2Card mode="day">
        <V2Artwork mode="day" kind="water" height={130} />

        <V2Text mode="day" variant="section">
          Send somebody a moment
        </V2Text>

        <V2Text mode="day" muted>
          A little space to breathe. No installation required.
        </V2Text>

        <V2Button mode="day" icon="gift"
          label="Share a quiet moment"
          disabled={!configured || busy}
          onPress={() => void share(
            MOMENT_LINK,
            'A little quiet moment for you.'
          )} />

        <V2Button mode="day" tone="quiet"
          label="Preview moment"
          disabled={busy}
          onPress={() => router.push(
            ('/shared?kind=moment&id=' +
              MOMENT_LINK.id +
              '&v=' + MOMENT_LINK.version) as Href
          )} />
      </V2Card>

      {availableWalk && (
        <V2Card mode="day">
          <V2Artwork mode="day" kind="growth" height={110} />

          <V2Text mode="day" variant="section">
            Walk With Me
          </V2Text>

          <V2Text mode="day" muted>
            Invite someone to follow {availableWalk.title}.
          </V2Text>

          <V2Button mode="day" tone="secondary"
            icon="users" label="Invite someone"
            disabled={!configured || busy}
            onPress={() => void share(
              WALK_LINK,
              'Would you like to try Three Quiet Evenings?'
            )} />
        </V2Card>
      )}

      {!configured && (
        <V2Text mode="day" muted variant="secondary">
          Public links are not available yet.
        </V2Text>
      )}

      {error !== '' && (
        <V2Text mode="day">{error}</V2Text>
      )}
    </V2Screen>
  );
}
