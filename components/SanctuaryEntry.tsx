
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  V2Card,
  V2Text,
  V2Button,
} from './StillwaterUI';

import {
  SanctuaryLandscape,
} from './SanctuaryLandscape';

import {
  useSanctuaryGrowth,
} from './useSanctuaryGrowth';

import {
  STILLWATER_ROUTES,
} from '../content/stillwaterRoutes';

import {
  StillwaterV2,
} from '../theme/stillwaterV2';

export function SanctuaryEntry() {
  const router = useRouter();

  const { snapshot, failed, retry } =
    useSanctuaryGrowth();

  return (
    <V2Card
      mode="day"
      style={{ padding: 12, gap: 14 }}
    >
      {snapshot ? (
        <SanctuaryLandscape
          mode={snapshot.appearance}
          stage={snapshot.stage}
          compact
        />
      ) : (
        <View style={{
          width: '100%',
          aspectRatio: 1.5,
          borderRadius: 15,
          backgroundColor: StillwaterV2.day.secondary,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}>
          <V2Text
            mode="day"
            muted
            variant="secondary"
            style={{ textAlign: 'center' }}
          >
            {failed
              ? 'Saved landscape unavailable.'
              : 'Opening your sanctuary...'}
          </V2Text>
        </View>
      )}

      <V2Text mode="day" variant="section">
        Your sanctuary
      </V2Text>

      <V2Text mode="day" muted variant="secondary">
        A quiet place to return to.
      </V2Text>

      {failed && (
        <V2Button
          mode="day"
          tone="quiet"
          label="Refresh landscape"
          onPress={retry}
        />
      )}

      <V2Button
        mode="day"
        tone="secondary"
        icon="arrow-right"
        label="Visit your sanctuary"
        onPress={() =>
          router.push(STILLWATER_ROUTES.sanctuary)
        }
      />
    </V2Card>
  );
}
