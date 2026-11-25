
import { useState } from 'react';
import {
  View,
  useWindowDimensions,
} from 'react-native';

import { useRouter } from 'expo-router';

import {
  V2Screen,
  V2Text,
  V2Button,
  V2Card,
} from '../components/StillwaterUI';

import {
  SanctuaryLandscape,
} from '../components/SanctuaryLandscape';

import {
  useSanctuaryGrowth,
} from '../components/useSanctuaryGrowth';

export default function SanctuaryScreen() {
  const router = useRouter();

  const { width, fontScale } =
    useWindowDimensions();

  const {
    snapshot,
    failed,
    saving,
    saveFailed,
    chooseAppearance,
    retry,
  } = useSanctuaryGrowth();

  const [showPrayer, setShowPrayer] =
    useState(false);

  const mode = snapshot?.appearance ?? 'day';

  const stacked =
    width < 350 || fontScale > 1.3;

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/rhythm');
    }
  };

  return (
    <V2Screen
      mode={mode}
      footer={
        <V2Button
          mode={mode}
          tone="secondary"
          label="Return to Progress"
          icon="arrow-left"
          onPress={leave}
        />
      }
    >
      <V2Text
        mode={mode}
        muted
        variant="label"
        style={{ textAlign: 'center' }}
      >
        YOUR SANCTUARY
      </V2Text>

      {snapshot ? (
        <SanctuaryLandscape
          mode={mode}
          stage={snapshot.stage}
        />
      ) : (
        <V2Card
          mode={mode}
          tonal
          style={{
            aspectRatio: 1.2,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <V2Text
            mode={mode}
            muted
            style={{ textAlign: 'center' }}
          >
            {failed
              ? 'Saved landscape temporarily unavailable.'
              : 'Opening your sanctuary...'}
          </V2Text>
        </V2Card>
      )}

      {failed && (
        <V2Card mode={mode}>
          <V2Text mode={mode} muted>
            Unable to refresh your saved landscape.
          </V2Text>

          <V2Button
            mode={mode}
            tone="secondary"
            label="Try again"
            onPress={retry}
          />
        </V2Card>
      )}

      <V2Text
        mode={mode}
        variant="display"
        style={{
          textAlign: 'center',
          fontSize: 34,
          lineHeight: 40,
        }}
      >
        A place of stillness.
      </V2Text>

      <V2Text
        mode={mode}
        muted
        style={{ textAlign: 'center' }}
      >
        You are welcome here. Nothing needs to be
        accomplished in this moment.
      </V2Text>

      {snapshot && (
        <View style={{
          flexDirection: stacked ? 'column' : 'row',
          gap: 10,
        }}>
          <View style={{
            flex: stacked ? undefined : 1,
          }}>
            <V2Button
              mode={mode}
              tone={mode === 'day'
                ? 'primary' : 'secondary'}
              icon="sun"
              label="Daylight"
              disabled={saving}
              onPress={() =>
                void chooseAppearance('day')
              }
            />
          </View>

          <View style={{
            flex: stacked ? undefined : 1,
          }}>
            <V2Button
              mode={mode}
              tone={mode === 'night'
                ? 'primary' : 'secondary'}
              icon="moon"
              label="Moonlight"
              disabled={saving}
              onPress={() =>
                void chooseAppearance('night')
              }
            />
          </View>
        </View>
      )}

      {saveFailed && (
        <V2Text mode={mode} muted>
          Appearance could not be saved. Please try again.
        </V2Text>
      )}

      <V2Button
        mode={mode}
        tone="quiet"
        icon="book-open"
        label={showPrayer
          ? 'Close quiet prayer'
          : 'A quiet prayer'}
        onPress={() => setShowPrayer(old => !old)}
      />

      {showPrayer && (
        <V2Card mode={mode} tonal>
          <V2Text
            mode={mode}
            variant="display"
            style={{
              fontSize: 25,
              lineHeight: 32,
              textAlign: 'center',
            }}
          >
            Lord, grant me peace for this moment,
            patience for the road ahead, and grace
            to begin again.
          </V2Text>

          <V2Text
            mode={mode}
            muted
            style={{ textAlign: 'center' }}
          >
            Amen.
          </V2Text>
        </V2Card>
      )}

      <V2Text
        mode={mode}
        muted
        variant="secondary"
        style={{ textAlign: 'center' }}
      >
        Your sanctuary can grow through ordinary
        practices. A missed day or setback does not
        remove any saved additions.
      </V2Text>
    </V2Screen>
  );
}
