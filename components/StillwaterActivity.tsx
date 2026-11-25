import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getClarityGrid, getLocalDateString } from '../db/queries';
import { StillwaterV2 } from '../theme/stillwaterV2';
import {
  V2Card, V2Text, V2Button,
} from './StillwaterUI';

type Activity = Awaited<ReturnType<typeof getClarityGrid>>;

const p = StillwaterV2.day;
const mode = 'day' as const;

export function StillwaterActivity() {
  const [data, setData] = useState<Activity | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    setFailed(false);

    try {
      const activity = await getClarityGrid(30);
      setData(activity);
    } catch {
      setFailed(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const today = getLocalDateString();

  return (
    <V2Card mode={mode}>
      <V2Text mode={mode} variant="section">
        Your last 30 days
      </V2Text>

      {failed ? (
        <>
          <V2Text mode={mode} muted>
            Activity could not be loaded.
          </V2Text>

          <V2Button
            mode={mode}
            tone="secondary"
            label="Try again"
            onPress={() => void refresh()}
          />
        </>
      ) : !data ? (
        <V2Text mode={mode} muted>
          Loading your recorded activity...
        </V2Text>
      ) : (
        <>
          <V2Text
            mode={mode}
            variant="display"
          >
            {data.practiceCount}
          </V2Text>

          <V2Text mode={mode}>
            Days with a recorded practice
          </V2Text>

          <V2Text mode={mode} muted variant="secondary">
            {data.activeDays} days with a practice or
            recorded return.
          </V2Text>

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
          }}>
            {data.grid.map(day => {
              const returned = day.status === 'returned';
              const practiced =
                day.morningCompleted ||
                day.examenCompleted;

              const recorded = returned || practiced;

              const symbol =
                returned
                  ? practiced ? 'P/R' : 'R'
                  : practiced ? 'P' : '-';

              const label =
                returned
                  ? practiced
                    ? 'Practice and return recorded'
                    : 'Return recorded'
                  : practiced
                    ? 'Practice recorded'
                    : 'No practice or return recorded';

              return (
                <View
                  key={day.date}
                  accessible
                  accessibilityLabel={`${day.date}: ${label}`}
                  style={{
                    width: '14.2857%',
                    padding: 3,
                  }}
                >
                  <View style={{
                    minHeight: 44,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: returned
                      ? '#EBDFC8'
                      : practiced
                        ? p.secondary
                        : p.surface,
                    borderWidth: day.date === today ? 2 : 1,
                    borderColor: day.date === today
                      ? p.muted
                      : p.border,
                  }}>
                    <V2Text
                      mode={mode}
                      variant="secondary"
                    >
                      {Number(day.date.slice(8,10))}
                    </V2Text>

                    <V2Text
                      mode={mode}
                      variant="label"
                      muted={!recorded}
                      style={{ fontSize: 10 }}
                    >
                      {symbol}
                    </V2Text>
                  </View>
                </View>
              );
            })}
          </View>

          <V2Text mode={mode} muted variant="secondary">
            P = practice. R = return. P/R = both.
            A dash means neither was recorded.
          </V2Text>

          <V2Text mode={mode} muted variant="secondary">
            This is a record of activity, not a recovery score
            or a measure of abstinence.
          </V2Text>
        </>
      )}
    </V2Card>
  );
}
