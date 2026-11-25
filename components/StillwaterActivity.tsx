
import { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useIsFocused } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import {
  getClarityGrid,
  getLocalDateString,
} from '../db/queries';

import {
  calendarWeeks,
  dateRange,
  shortDate,
  activityFlags,
  activityLabel,
} from '../content/activityCalendar';

import { StillwaterV2 } from '../theme/stillwaterV2';

import {
  V2Card, V2Text, V2Button,
} from './StillwaterUI';

type Activity =
  Awaited<ReturnType<typeof getClarityGrid>>;

const mode = 'day' as const;
const p = StillwaterV2.day;

const returnColor = '#986C39';
const returnSurface = '#F1E8D8';

function ActivityMark({
  kind,
}: {
  kind: 'practice' | 'return';
}) {
  return (
    <View style={{
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        kind === 'practice' ? p.muted : 'transparent',
      borderWidth: kind === 'return' ? 1.6 : 0,
      borderColor: returnColor,
    }} />
  );
}

export function StillwaterActivity() {
  const focused = useIsFocused();
  const { width, fontScale } = useWindowDimensions();

  const [data, setData] = useState<Activity | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
      if (!focused) return;
      let active = true;

      getClarityGrid(30)
        .then(activity => {
          if (active) {
            setData(activity);
            setFailed(false);
          }
        })
        .catch(() => {
          if (active) setFailed(true);
        });

      return () => {
        active = false;
      };
    }, [focused, retry]);

  const today = getLocalDateString();

  const weeks = calendarWeeks(data?.grid ?? []);

  const returnDays = data?.grid.filter(
    day => day.status === 'returned'
  ).length ?? 0;

  const morningDays = data?.grid.filter(
    day => day.morningCompleted
  ).length ?? 0;

  const eveningDays = data?.grid.filter(
    day => day.examenCompleted
  ).length ?? 0;

  const stacked = width < 340 || fontScale > 1.3;

  return (
    <V2Card mode={mode}>
      <V2Text mode={mode} muted variant="label">
        YOUR LAST 30 DAYS
      </V2Text>

      <V2Text mode={mode} variant="heading">
        Small steps matter.
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
            onPress={() => setRetry(old => old + 1)}
          />
        </>
      ) : !data ? (
        <V2Text mode={mode} muted>
          Loading recorded activity...
        </V2Text>
      ) : (
        <>
          <View style={{
            flexDirection: stacked ? 'column' : 'row',
            gap: 8,
          }}>
            {[
              {
                count: data.practiceCount,
                label: 'Practice days',
                color: p.secondary,
              },
              {
                count: returnDays,
                label: 'Days with a return',
                color: returnSurface,
              },
            ].map(item => (
              <View key={item.label} style={{
                flex: stacked ? undefined : 1,
                backgroundColor: item.color,
                padding: 14,
                borderRadius: 15,
                gap: 4,
              }}>
                <V2Text mode={mode} variant="display">
                  {item.count}
                </V2Text>

                <V2Text mode={mode} muted variant="secondary">
                  {item.label}
                </V2Text>
              </View>
            ))}
          </View>

          {data.grid.length > 0 && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginTop: 6,
            }}>
              <V2Text mode={mode} variant="secondary">
                {dateRange(
                  data.grid[0].date,
                  data.grid[data.grid.length - 1].date
                )}
              </V2Text>

              <Feather
                name="calendar"
                size={20}
                color={p.muted}
              />
            </View>
          )}

          {fontScale > 1.6 ? (
            // A readable list alternative for large text.
            <View style={{ gap: 8 }}>
              {data.grid.map(day => (
                <View key={day.date} style={{
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: p.border,
                }}>
                  <V2Text mode={mode}>
                    {shortDate(day.date)}
                  </V2Text>

                  <V2Text
                    mode={mode}
                    muted
                    variant="secondary"
                  >
                    {activityLabel(day)}
                  </V2Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row' }}>
                {[
                  'M', 'T', 'W', 'T', 'F', 'S', 'S'
                ].map((label, index) => (
                  <View key={index} style={{
                    flex: 1,
                    alignItems: 'center',
                  }}>
                    <V2Text
                      mode={mode}
                      muted
                      variant="secondary"
                    >
                      {label}
                    </V2Text>
                  </View>
                ))}
              </View>

              {weeks.map((week, weekIndex) => (
                <View key={weekIndex} style={{
                  flexDirection: 'row',
                  gap: 3,
                }}>
                  {week.map((day, index) => {
                    if (!day) {
                      return (
                        <View
                          key={'empty-' + index}
                          style={{ flex: 1 }}
                        />
                      );
                    }

                    const flags = activityFlags(day);
                    const current = day.date === today;

                    const showMonth =
                      day.date === data.grid[0].date ||
                      day.date.slice(8, 10) === '01';

                    return (
                      <View
                        key={day.date}
                        accessible
                        accessibilityLabel={
                          day.date + '. ' +
                          (current ? 'Today. ' : '') +
                          activityLabel(day)
                        }
                        style={{
                          flex: 1,
                          minHeight: 48,
                          paddingVertical: 6,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 3,
                          backgroundColor: flags.practice
                            ? p.secondary
                            : flags.returned
                              ? returnSurface
                              : p.background,
                          borderWidth: current ? 2 : 0,
                          borderColor: p.muted,
                        }}
                      >
                        <V2Text
                          mode={mode}
                          variant="secondary"
                          style={{
                            fontSize: 12,
                            lineHeight: 16,
                            textAlign: 'center',
                          }}
                        >
                          {Number(day.date.slice(8, 10))}
                        </V2Text>

                        {showMonth && (
                          <V2Text
                            mode={mode}
                            muted
                            style={{
                              fontSize: 9,
                              lineHeight: 12,
                              textAlign: 'center',
                            }}
                          >
                            {shortDate(day.date).split(' ')[1]}
                          </V2Text>
                        )}

                        <View style={{
                          flexDirection: 'row',
                          gap: 3,
                          minHeight: 9,
                          alignItems: 'center',
                        }}>
                          {flags.practice && (
                            <ActivityMark kind="practice" />
                          )}

                          {flags.returned && (
                            <ActivityMark kind="return" />
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            paddingVertical: 4,
          }}>
            <View style={{
              flexDirection: 'row',
              gap: 5,
              alignItems: 'center',
            }}>
              <ActivityMark kind="practice" />
              <V2Text mode={mode} muted variant="secondary">
                Practice
              </V2Text>
            </View>

            <View style={{
              flexDirection: 'row',
              gap: 5,
              alignItems: 'center',
            }}>
              <ActivityMark kind="return" />
              <V2Text mode={mode} muted variant="secondary">
                Return
              </V2Text>
            </View>
          </View>

          <V2Text mode={mode} muted variant="secondary">
            Unmarked dates have neither a morning or
            evening practice nor a return recorded.
          </V2Text>

          <View style={{
            height: 1,
            backgroundColor: p.border,
          }} />

          {[
            {
              label: 'Morning practice',
              count: morningDays,
              icon: 'sunrise' as const,
            },
            {
              label: 'Evening practice',
              count: eveningDays,
              icon: 'moon' as const,
            },
          ].map(item => (
            <View key={item.label} style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
              <Feather
                name={item.icon}
                size={20}
                color={p.muted}
              />

              <V2Text mode={mode} style={{ flex: 1 }}>
                {item.label}
              </V2Text>

              <V2Text mode={mode} variant="section">
                {item.count}
              </V2Text>
            </View>
          ))}

          <V2Text mode={mode} muted variant="secondary">
            A return does not erase a practice.
            Both can appear on the same day.
            These records are not an abstinence score.
          </V2Text>
        </>
      )}
    </V2Card>
  );
}
