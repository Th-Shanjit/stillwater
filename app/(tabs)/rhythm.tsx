import { SanctuaryEntry } from '../../components/SanctuaryEntry';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { StillwaterActivity } from '../../components/StillwaterActivity';
import { PersonalCompass } from '../../components/PersonalCompass';
import { PreparationFeedback } from '../../components/PreparationFeedback';
import { StillwaterMark } from '../../components/RoyalUI';

import {
  V2Screen,
  V2Text,
  V2Card,
  V2Button,
} from '../../components/StillwaterUI';

import { STILLWATER_ROUTES } from '../../content/stillwaterRoutes';
import { StillwaterV2 } from '../../theme/stillwaterV2';

const mode = 'day' as const;
const p = StillwaterV2.day;

export default function RhythmScreen() {
  const router = useRouter();

  return (
    <V2Screen mode={mode} bottomInset={false}>

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
      }}>
        <StillwaterMark size={27} color={p.primary} />

        <V2Text
          mode={mode}
          variant="section"
          style={{ flex: 1, letterSpacing: -0.6 }}
        >
          stillwater.
        </V2Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() =>
            router.push(STILLWATER_ROUTES.settings)
          }
          style={{
            minWidth: 48,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather
            name="settings"
            size={22}
            color={p.muted}
          />
        </Pressable>
      </View>

      <V2Text mode={mode} variant="display">
        Progress
      </V2Text>

      <V2Text mode={mode} muted>
        Notice the steps you have taken.
      </V2Text>

      <StillwaterActivity />

      <PreparationFeedback />

      <SanctuaryEntry />

      <V2Card mode={mode} tonal>
        <Feather
          name="compass"
          size={27}
          color={p.primary}
        />

        <V2Text mode={mode} variant="section">
          My plan
        </V2Text>

        <V2Text mode={mode} muted>
          Review your chosen actions, preparation
          windows and personal coping strategies.
        </V2Text>

        <V2Button
          mode={mode}
          tone="secondary"
          label="Manage my plan"
          icon="arrow-right"
          onPress={() =>
            router.push(STILLWATER_ROUTES.plans)
          }
        />
      </V2Card>

      <PersonalCompass />

    </V2Screen>
  );
}
