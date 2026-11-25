import { useState } from 'react';
import { useRouter } from 'expo-router';

import {
  getProgramme,
} from '../content/programmeCatalog';

import type {
  ProgrammeSessionResult,
} from '../content/programmeSession';

import {
  V2Screen,
  V2Text,
  V2Card,
  V2Button,
  V2Artwork,
} from '../components/StillwaterUI';

import {
  ProgrammePlayer,
} from '../components/ProgrammePlayer';

export default function ProgrammePreviewScreen() {
  const router = useRouter();

  const programme = getProgramme(
    'three_quiet_evenings',
    1
  );

  const [selectedDay, setSelectedDay] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<ProgrammeSessionResult | null>(null);

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/library');
    }
  };

  if (!__DEV__ || !programme) {
    return (
      <V2Screen mode="day">
        <V2Text mode="day">
          Programme preview unavailable.
        </V2Text>

        <V2Button
          mode="day"
          label="Return to Journey"
          onPress={leave}
        />
      </V2Screen>
    );
  }

  const dayIndex = programme.days.findIndex(
    day => day.id === selectedDay
  );

  const day = programme.days[dayIndex];

  if (result) {
    return (
      <V2Screen mode="day">
        <V2Artwork
          mode="day"
          kind="growth"
          height={180}
        />

        <V2Text mode="day" variant="display">
          Session finished.
        </V2Text>

        <V2Text mode="day" muted>
          You can return to your day now.
        </V2Text>

        <V2Card mode="day" tonal>
          <V2Text mode="day" variant="label">
            DEVELOPMENT PREVIEW
          </V2Text>

          <V2Text mode="day" muted>
            Session completion was received successfully.
            No permanent participation or recovery record
            has been created.
          </V2Text>
        </V2Card>

        <V2Button
          mode="day"
          label="Choose another session"
          onPress={() => {
            setResult(null);
            setSelectedDay(null);
          }}
        />

        <V2Button
          mode="day"
          tone="quiet"
          label="Return to Journey"
          onPress={leave}
        />
      </V2Screen>
    );
  }

  if (day) {
    return (
      <ProgrammePlayer
        key={day.id}
        programmeTitle={programme.title}
        day={day}
        dayNumber={dayIndex + 1}
        totalDays={programme.days.length}
        onExit={() => setSelectedDay(null)}
        onFinish={setResult}
      />
    );
  }

  return (
    <V2Screen mode="day">
      <V2Button
        mode="day"
        tone="quiet"
        icon="arrow-left"
        label="Return to Journey"
        onPress={leave}
      />

      <V2Text
        mode="day"
        muted
        variant="label"
      >
        DEVELOPMENT PREVIEW
      </V2Text>

      <V2Artwork
        mode="day"
        kind="water"
        height={180}
      />

      <V2Text
        mode="day"
        variant="display"
      >
        {programme.title}
      </V2Text>

      <V2Text mode="day" muted>
        {programme.description}
      </V2Text>

      {programme.days.map((item, index) => (
        <V2Card key={item.id} mode="day">
          <V2Text
            mode="day"
            muted
            variant="label"
          >
            DAY {index + 1}
          </V2Text>

          <V2Text
            mode="day"
            variant="section"
          >
            {item.title}
          </V2Text>

          <V2Text mode="day" muted>
            {item.description}
          </V2Text>

          <V2Button
            mode="day"
            tone="secondary"
            label="Preview session"
            icon="play"
            onPress={() => setSelectedDay(item.id)}
          />
        </V2Card>
      ))}

      <V2Text
        mode="day"
        muted
        variant="secondary"
      >
        Preview sessions do not alter your recovery
        records or sanctuary.
      </V2Text>
    </V2Screen>
  );
}
