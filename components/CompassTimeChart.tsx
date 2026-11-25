import { View, useWindowDimensions } from 'react-native';

import type {
  PersonalCompassSummary,
} from '../content/personalCompass';

import { V2Text } from './StillwaterUI';
import { StillwaterV2 } from '../theme/stillwaterV2';

const mode = 'day' as const;
const p = StillwaterV2.day;

const LABELS = [
  '12a', '3a', '6a', '9a',
  '12p', '3p', '6p', '9p',
];

export function CompassTimeChart({
  data,
}: {
  data: PersonalCompassSummary;
}) {
  const { width, fontScale } = useWindowDimensions();

  const max = Math.max(
    1,
    ...data.timeBuckets.map(item => item.count)
  );

  const horizontal = width < 350 || fontScale > 1.2;

  return (
    <View style={{ gap: 10 }}>
      <V2Text mode={mode} muted variant="label">
        {data.pauseCount} RECORDED PAUSES
      </V2Text>

      {horizontal ? (
        <View style={{ gap: 9 }}>
          {data.timeBuckets.map(item => (
            <View
              key={item.key}
              accessible
              accessibilityLabel={
                item.label + ': ' + item.count +
                ' recorded pauses'
              }
              style={{ gap: 4 }}
            >
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}>
                <V2Text mode={mode} variant="secondary">
                  {item.label}
                </V2Text>

                <V2Text mode={mode} variant="secondary">
                  {item.count}
                </V2Text>
              </View>

              <View style={{
                height: 8,
                borderRadius: 4,
                backgroundColor: p.secondary,
              }}>
                <View style={{
                  height: 8,
                  borderRadius: 4,
                  width: (item.count / max * 100) + '%',
                  backgroundColor:
                    data.timePattern?.key === item.key
                      ? p.primary
                      : '#779A8B',
                }} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{
          flexDirection: 'row',
          gap: 4,
          paddingVertical: 4,
        }}>
          {data.timeBuckets.map((item, index) => (
            <View
              key={item.key}
              accessible
              accessibilityLabel={
                item.label + ': ' + item.count +
                ' recorded pauses'
              }
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 5,
              }}
            >
              <View style={{
                height: 112,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'flex-end',
                borderBottomWidth: 1,
                borderBottomColor: p.border,
                paddingBottom: 2,
                gap: 4,
              }}>
                <V2Text
                  mode={mode}
                  variant="secondary"
                  style={{ fontSize: 12 }}
                >
                  {item.count}
                </V2Text>

                <View style={{
                  width: '72%',
                  height: item.count / max * 82,
                  borderRadius: 4,
                  backgroundColor:
                    data.timePattern?.key === item.key
                      ? p.primary
                      : '#779A8B',
                }} />
              </View>

              <V2Text
                mode={mode}
                muted
                style={{
                  fontSize: 10,
                  lineHeight: 15,
                }}
              >
                {LABELS[index]}
              </V2Text>
            </View>
          ))}
        </View>
      )}

      <V2Text mode={mode} muted variant="secondary">
        Three-hour windows, shown in local clock time.
      </V2Text>
    </View>
  );
}
