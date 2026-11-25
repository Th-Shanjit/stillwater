import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useIsFocused } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StillwaterV2 } from '../theme/stillwaterV2';
import type { V2Mode } from '../theme/stillwaterV2';
import {
  V2Screen, V2Text, V2Button,
  V2Card, V2Artwork, V2ActionRow,
} from './StillwaterUI';
import { V2Breathing } from './StillwaterBreathing';

type Scene = 'home' | 'help' | 'reset' | 'plan' | 'prayer';

export function StillwaterDesignLab({
  onClose,
}: {
  onClose: () => void;
}) {
  const [mode, setMode] = useState<V2Mode>('day');
  const [scene, setScene] = useState<Scene>('home');
  const [action, setAction] = useState('');
  const [prepared, setPrepared] = useState(false);
  const [breathing, setBreathing] = useState(false);

  const p = StillwaterV2[mode];
  const focused = useIsFocused();
  const { width, fontScale } = useWindowDimensions();
  const stackCards = width < 340 || fontScale > 1.3;

  const go = (next: Scene) => {
    setAction('');
    setBreathing(false);
    setScene(next);
  };

  const header = (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    }}>
      <V2Text mode={mode} variant="label"
        muted style={{ flex: 1 }}>
        {scene === 'home' ? 'V2 COMPONENT LAB'
          : scene === 'help' ? 'IMMEDIATE SUPPORT'
          : scene === 'reset' ? 'START AGAIN'
          : scene === 'prayer' ? 'A QUIET PRAYER' : 'MY PLAN'}
      </V2Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          mode === 'day' ? 'Switch to Midnight' : 'Switch to Daylight'
        }
        onPress={() => setMode(
          old => old === 'day' ? 'night' : 'day'
        )}
        style={{
          minWidth: 48, minHeight: 48,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Feather name={mode === 'day' ? 'moon' : 'sun'}
          size={22} color={p.text} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Exit preview"
        onPress={() => scene === 'home' ? onClose() : go('home')}
        style={{
          minWidth: 48, minHeight: 48,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Feather name="x" size={22} color={p.text} />
      </Pressable>
    </View>
  );

  return (
    <V2Screen
      mode={mode}
      bottomInset={false}
      footer={scene === 'help' ? (
        <V2Button
          mode={mode}
          label="Ready to step away"
          icon="arrow-right"
          onPress={() => go('home')}
        />
      ) : undefined}
    >
      {header}

      {scene === 'home' && (
        <>
          <View style={{ gap: 3 }}>
            <V2Text mode={mode} variant="section">
              stillwater.
            </V2Text>
            <V2Text mode={mode} muted variant="secondary">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long', month: 'long', day: 'numeric',
              })}
            </V2Text>
          </View>

          <V2Card mode="night" style={{
            backgroundColor: '#193B35',
            borderColor: '#193B35',
            padding: 12,
          }}>
            <V2Artwork mode={mode} kind="water" height={88} />
            <View style={{ padding: 6, gap: 10 }}>
              <V2Text mode="night" variant="display"
                style={{ fontSize: 34, lineHeight: 38 }}>
                Need a moment?
              </V2Text>
              <V2Button
                mode="night"
                label="Help me right now"
                icon="arrow-right"
                onPress={() => {
                  setMode('night');
                  go('help');
                }}
              />
            </View>
          </V2Card>

          <View style={{
            flexDirection: stackCards ? 'column' : 'row',
            gap: 10,
          }}>
            {([
              ['reset','rotate-ccw','Start again','After a setback'],
              ['plan','compass','My plan','Prepare for today'],
            ] as const).map(([key, icon, label, sub]) => (
              <Pressable key={key}
                accessibilityRole="button"
                onPress={() => go(key)}
                style={{
                  flex: stackCards ? undefined : 1,
                  backgroundColor: key === 'plan'
                    ? p.secondary : p.surface,
                  borderRadius: 18, borderWidth: 1,
                  borderColor: p.border,
                  padding: 15, gap: 6,
                  minHeight: 100,
                }}
              >
                <Feather name={icon} color={p.muted} size={23} />
                <V2Text mode={mode}
                  style={{ fontWeight: '600' }}>
                  {label}
                </V2Text>
                <V2Text mode={mode} muted variant="secondary">
                  {sub}
                </V2Text>
              </Pressable>
            ))}
          </View>

          <V2Text mode={mode} muted variant="label">
            YOUR NEXT STEP
          </V2Text>

          <V2Card mode={mode}>
            <Feather name="moon" color={p.muted} size={22} />
            <V2Text mode={mode} variant="section">
              Prepare for tonight.
            </V2Text>
            <V2Text mode={mode} muted>
              Charge your phone outside your bedroom.
            </V2Text>
            <V2Button
              mode={mode}
              tone="secondary"
              label={prepared ? 'Plan chosen' : 'I will do this'}
              icon={prepared ? 'check-circle' : 'check'}
              onPress={() => setPrepared(old => !old)}
            />
          </V2Card>

          <V2ActionRow
            mode={mode}
            icon="book-open"
            label="A quiet word for today"
            description="Optional prayer"
            onPress={() => go('prayer')}
          />
        </>
      )}

      {scene === 'help' && (
        <>
          <V2Text mode={mode} variant="display">
            Just this moment.
          </V2Text>

          <V2Card mode={mode} tonal>
            <V2Text mode={mode} variant="section">
              Rest your feet on the floor.
            </V2Text>
            <V2Text mode={mode} muted>
              Move away from the screen if you can.
            </V2Text>
          </V2Card>

          {!breathing ? (
            <>
              <V2ActionRow
                mode={mode}
                icon="wind"
                label="Take three slow breaths"
                description="Optional 30-second practice"
                onPress={() => setBreathing(true)}
              />
              <V2ActionRow
                mode={mode}
                icon="compass"
                label="Show me another action"
                onPress={() => go('reset')}
              />
            </>
          ) : (
            <>
              <V2Breathing mode={mode} active={focused} />
              <V2Button mode={mode} tone="quiet"
                label="Skip breathing"
                onPress={() => setBreathing(false)} />
            </>
          )}
        </>
      )}

      {(scene === 'reset' || scene === 'plan') && (
        <>
          <V2Artwork mode={mode}
            kind={scene === 'reset' ? 'threshold' : 'growth'}
            height={96} />

          <V2Text mode={mode} variant="display">
            {scene === 'reset' ? 'Begin again.' : 'Prepare for today.'}
          </V2Text>

          <V2Text mode={mode} muted>
            {scene === 'reset'
              ? 'You can choose what happens next.'
              : 'Make one useful change before a difficult moment.'}
          </V2Text>

          <V2Card mode={mode} tonal>
            <V2Text mode={mode} muted variant="label">
              SUGGESTED NEXT STEP
            </V2Text>
            <V2Text mode={mode} variant="section">
              {scene === 'reset'
                ? 'Change your surroundings.'
                : 'Create a phone-free bedtime.'}
            </V2Text>
            <V2Text mode={mode} muted>
              {scene === 'reset'
                ? 'Move to another room, if possible.'
                : 'Choose somewhere outside your bedroom to charge your phone.'}
            </V2Text>
            <V2Button mode={mode}
              label="I will do this"
              onPress={() => setAction(
                scene === 'reset'
                  ? 'Change surroundings' : 'Phone-free bedtime'
              )} />
          </V2Card>

          <V2Text mode={mode} muted variant="label">
            OTHER OPTIONS
          </V2Text>

          {(scene === 'reset'
            ? ['Put my phone away','Contact someone I trust']
            : ['Take a short walk','Set aside time to rest']
          ).map((item,index) => (
            <V2ActionRow key={item}
              mode={mode}
              label={item}
              icon={index === 0 ? 'smartphone' : 'message-circle'}
              selected={action === item}
              onPress={() => setAction(item)} />
          ))}

          {action !== '' && (
            <V2Card mode={mode}>
              <V2Text mode={mode} variant="secondary" muted>
                Your chosen next step
              </V2Text>
              <V2Text mode={mode}>{action}</V2Text>
              <V2Button mode={mode} label="Done"
                onPress={() => go('home')} />
            </V2Card>
          )}

          <V2Button mode={mode} tone="quiet"
            label="Take a moment to pray"
            onPress={() => go('prayer')} />
        </>
      )}

      {scene === 'prayer' && (
        <>
          <V2Artwork mode={mode} kind="threshold" height={110} />
          <V2Text mode={mode} variant="display">
            Be still.
          </V2Text>
          <V2Card mode={mode}>
            <V2Text mode={mode} variant="section">
              Lord, help me choose the next good thing.
            </V2Text>
            <V2Text mode={mode} muted>
              Stay here briefly, or return whenever you are ready.
            </V2Text>
          </V2Card>
          <V2Button mode={mode} label="Return to today"
            onPress={() => go('home')} />
        </>
      )}

      <V2Text mode={mode} muted variant="secondary"
        style={{ textAlign: 'center', marginTop: 12 }}>
        Component preview. Choices are not saved.
      </V2Text>
    </V2Screen>
  );
}
