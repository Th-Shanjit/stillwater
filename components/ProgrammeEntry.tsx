import { useState } from 'react';
import { useRouter } from 'expo-router';

import {
  V2Artwork,
  V2Card,
  V2Text,
  V2Button,
} from './StillwaterUI';

import {
  STILLWATER_ROUTES,
} from '../content/stillwaterRoutes';

export function ProgrammeEntry() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  return (
    <V2Card mode="day">
      <V2Artwork
        mode="day"
        kind="water"
        height={125}
      />

      <V2Text mode="day" muted variant="label">
        STILLWATER JOURNEYS
      </V2Text>

      <V2Text mode="day" variant="heading">
        Explore programmes
      </V2Text>

      <V2Text mode="day" muted>
        Guided experiences for intentional living,
        spiritual growth and everyday habits.
      </V2Text>

      <V2Button
        mode="day"
        label="Browse programmes"
        icon="arrow-right"
        onPress={() =>
          router.push(STILLWATER_ROUTES.programmes)
        }
      />
      <V2Button mode="day" tone="quiet"
        icon={expanded ? 'chevron-up' : 'chevron-down'}
        label={expanded
          ? 'Hide community tools'
          : 'Sharing and community'}
        onPress={() => setExpanded(value => !value)}
      />

      {expanded && (
        <>
      <V2Button mode="day" tone="secondary"
        icon="gift" label="Share something good"
        onPress={() =>
          router.push(STILLWATER_ROUTES.shared)
        } />
      <V2Button mode="day" tone="secondary"
        icon="users" label="Stillwater Circles"
        onPress={() =>
          router.push(STILLWATER_ROUTES.circles)
        } />
      <V2Button mode="day" tone="secondary"
        icon="book-open" label="Stillwater Host"
        onPress={() =>
          router.push(STILLWATER_ROUTES.host)
        } />

      <V2Button mode="day" tone="quiet"
        label="Meet our publishers"
        onPress={() =>
          router.push(STILLWATER_ROUTES.publishers)
        } />
        </>
      )}
    </V2Card>
  );
}
