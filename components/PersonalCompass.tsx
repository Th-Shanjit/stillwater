import { CompassTimeChart } from './CompassTimeChart';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { getPersonalCompass } from '../db/personalCompass';

import type {
  PersonalCompassSummary,
} from '../content/personalCompass';

import {
  V2Text,
  V2Card,
  V2Button,
} from './StillwaterUI';

import { StillwaterV2 } from '../theme/stillwaterV2';

const mode = 'day' as const;
const p = StillwaterV2.day;

export function PersonalCompass() {
  const focused = useIsFocused();
  const [data, setData] =
    useState<PersonalCompassSummary | null>(null);

  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
      if (!focused) return;
      let active = true;

      getPersonalCompass()
        .then(summary => {
          if (active) {
            setData(summary);
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

  return (
    <View style={{ gap: 12 }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        <Feather
          name="compass"
          size={25}
          color={p.primary}
        />

        <V2Text mode={mode} variant="heading">
          Personal Compass
        </V2Text>
      </View>

      <V2Text mode={mode} muted variant="secondary">
        Understand your recorded patterns.
      </V2Text>

      <V2Text mode={mode} muted variant="label">
        LAST 30 DAYS
      </V2Text>

      {failed ? (
        <V2Card mode={mode}>
          <V2Text mode={mode}>
            Your observations could not be loaded.
          </V2Text>

          <V2Button
            mode={mode}
            tone="secondary"
            label="Try again"
            onPress={() => setRetry(old => old + 1)}
          />
        </V2Card>
      ) : !data ? (
        <V2Card mode={mode}>
          <V2Text mode={mode} muted>
            Loading recorded activity...
          </V2Text>
        </V2Card>
      ) : (
        <>
          <View style={{
            flexDirection: 'row',
            gap: 10,
          }}>
            {[
              {
                label: 'Recorded pauses',
                count: data.pauseCount,
              },
              {
                label: 'Recorded returns',
                count: data.returnCount,
              },
            ].map(item => (
              <V2Card
                key={item.label}
                mode={mode}
                style={{ flex: 1 }}
              >
                <V2Text
                  mode={mode}
                  variant="display"
                >
                  {item.count}
                </V2Text>

                <V2Text
                  mode={mode}
                  muted
                  variant="secondary"
                >
                  {item.label}
                </V2Text>
              </V2Card>
            ))}
          </View>

          <V2Card mode={mode}>
            <V2Text mode={mode} variant="section">
              When you seek support
            </V2Text>

            {data.pauseCount > 0 && (
              <CompassTimeChart data={data} />
            )}

            {data.timePattern ? (
              <>
                <V2Card mode={mode} tonal>
                  <V2Text
                    mode={mode}
                    variant="section"
                  >
                    {data.timePattern.label}
                  </V2Text>

                  <V2Text mode={mode}>
                    {data.timePattern.count} of {
                      data.timePattern.total
                    } recorded pauses occurred in this
                    window, across {
                      data.timePattern.distinctDates
                    } separate dates.
                  </V2Text>

                  <V2Text
                    mode={mode}
                    muted
                    variant="secondary"
                  >
                    You may find it useful to prepare
                    for this part of the day.
                  </V2Text>
                </V2Card>
              </>
            ) : (
              <>
                <V2Text mode={mode}>
                  No clear repeated time pattern yet.
                </V2Text>

                <V2Text mode={mode} muted>
                  You have {data.pauseCount} recorded
                  pauses across {data.distinctDates} dates.
                  A repeated pattern requires more
                  consistent observations.
                </V2Text>
              </>
            )}
          </V2Card>

          <V2Card mode={mode}>
            <V2Text mode={mode} variant="section">
              Context you have noticed
            </V2Text>

            {data.contextPattern ? (
              <>
                <V2Text mode={mode} variant="heading">
                  {data.contextPattern.label}
                </V2Text>

                <V2Text mode={mode} muted>
                  Selected in {data.contextPattern.count} of {
                    data.contextPattern.total
                  } pauses with a recorded context.
                </V2Text>
              </>
            ) : (
              <V2Text mode={mode} muted>
                No clear repeated context yet.
                Adding context is always optional.
              </V2Text>
            )}
          </V2Card>

          <V2Card mode={mode}>
            <V2Text mode={mode} variant="section">
              Practical actions you choose
            </V2Text>

            {data.chosenActions.length > 0 ? (
              <>
                {data.chosenActions.map(item => (
                  <View
                    key={item.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <V2Text mode={mode}>
                        {item.label}
                      </V2Text>
                    </View>

                    <V2Text
                      mode={mode}
                      variant="section"
                    >
                      {item.count}
                    </V2Text>
                  </View>
                ))}

                <V2Text
                  mode={mode}
                  muted
                  variant="secondary"
                >
                  {data.actionSelectionCount} recorded
                  selections. This does not establish
                  which actions were performed or helpful.
                </V2Text>
              </>
            ) : (
              <V2Text mode={mode} muted>
                No practical action selections have
                been recorded yet.
              </V2Text>
            )}
          </V2Card>

          <V2Card mode={mode}>
            <V2Text mode={mode} variant="section">
              Guided practices
            </V2Text>

            <V2Text mode={mode}>
              {data.practicesStarted} recorded starts
            </V2Text>

            <V2Text mode={mode}>
              {data.practicesEnded} of those sessions
              have a recorded end.
            </V2Text>

            <V2Text
              mode={mode}
              muted
              variant="secondary"
            >
              Leaving early is allowed. These counts
              are not measures of recovery success.
            </V2Text>
          </V2Card>

          <V2Text
            mode={mode}
            muted
            variant="secondary"
          >
            Observations describe recorded activity,
            not predicted setbacks. All of this
            analysis takes place on your device.
          </V2Text>
        </>
      )}
    </View>
  );
}
