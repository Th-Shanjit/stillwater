import { useState } from 'react';
import { useRouter } from 'expo-router';

import {
  getProgramme,
} from '../content/programmeCatalog';

import {
  buildHostGuide,
  hostGuideMinutes,
} from '../content/hostGuides';

import {
  ProgrammePlayer,
} from '../components/ProgrammePlayer';

import {
  V2Screen,
  V2Text,
  V2Card,
  V2Button,
  V2Artwork,
} from '../components/StillwaterUI';

import {
  STILLWATER_ROUTES,
} from '../content/stillwaterRoutes';

const mode = 'day' as const;

export default function HostScreen() {
  const router = useRouter();

  const [dayId, setDayId] =
    useState<string | null>(null);

  const [agendaIndex, setAgendaIndex] =
    useState(0);

  const [playing, setPlaying] =
    useState(false);

  const [finished, setFinished] =
    useState(false);

  const [acknowledged, setAcknowledged] =
    useState(false);

  const programme = getProgramme(
    'three_quiet_evenings', 1
  );

  const dayIndex = programme
    ? programme.days.findIndex(
        item => item.id === dayId
      )
    : -1;

  const day = programme && dayIndex >= 0
    ? programme.days[dayIndex]
    : null;

  const guide = programme && day
    ? buildHostGuide(programme, day.id)
    : null;

  const item = guide?.agenda[agendaIndex];

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/library');
  };

  const reset = () => {
    setDayId(null);
    setAgendaIndex(0);
    setPlaying(false);
    setFinished(false);
  };

  const advance = () => {
    if (!guide) return;

    if (agendaIndex >= guide.agenda.length - 1) {
      setFinished(true);
      return;
    }

    setAgendaIndex(index =>
      Math.min(guide.agenda.length - 1, index + 1)
    );
  };

  // Host sessions are deliberately independent of
  // enrolment and participation persistence.
  if (playing && programme && day && guide) {
    return (
      <ProgrammePlayer
        key={'host:' + programme.version + ':' + day.id}
        programmeTitle={programme.title + ' · Host'}
        day={day}
        dayNumber={dayIndex + 1}
        totalDays={programme.days.length}
        onExit={() => setPlaying(false)}
        onFinish={() => {
          setPlaying(false);
          setAgendaIndex(index =>
            Math.min(
              guide.agenda.length - 1,
              index + 1
            )
          );
        }}
      />
    );
  }

  if (finished && guide) {
    return (
      <V2Screen mode={mode}>
        <V2Artwork mode={mode}
          kind="growth" height={180} />

        <V2Text mode={mode} variant="display">
          A moment shared.
        </V2Text>

        <V2Text mode={mode}>
          You have reached the end of the host guide.
        </V2Text>

        <V2Text mode={mode} muted>
          No participant attendance, recovery information
          or personal programme completion has been recorded.
        </V2Text>

        <V2Button mode={mode}
          label="Choose another session"
          onPress={reset} />

        <V2Button mode={mode} tone="quiet"
          label="Return to Journey"
          onPress={leave} />
      </V2Screen>
    );
  }

  if (guide && item) {
    return (
      <V2Screen mode={mode}
        footer={
          <V2Button mode={mode}
            label={
              agendaIndex === guide.agenda.length - 1
                ? 'Finish facilitation'
                : 'Next agenda item'
            }
            onPress={advance} />
        }>

        <V2Button mode={mode} tone="quiet"
          icon="arrow-left" label="Return to host guide"
          onPress={reset} />

        <V2Text mode={mode} muted variant="label">
          HOST MODE · SESSION {dayIndex + 1}
        </V2Text>

        <V2Text mode={mode} variant="heading">
          {guide.title}
        </V2Text>

        <V2Text mode={mode} muted variant="secondary">
          Approximately {hostGuideMinutes(guide)} minutes
          {' · '}
          {agendaIndex + 1} of {guide.agenda.length} agenda items
        </V2Text>

        <V2Artwork mode={mode}
          kind="growth" height={130} />

        <V2Card mode={mode} tonal>
          <V2Text mode={mode} muted variant="label">
            {item.suggestedMinutes} MIN SUGGESTED
          </V2Text>

          <V2Text mode={mode} variant="heading">
            {item.title}
          </V2Text>

          <V2Text mode={mode}>
            {item.instructions}
          </V2Text>

          {item.kind === 'programme' && (
            <V2Button mode={mode}
              icon="play-circle"
              label="Open guided experience"
              onPress={() => setPlaying(true)} />
          )}
        </V2Card>

        <V2Text mode={mode} variant="section">
          Session agenda
        </V2Text>

        {guide.agenda.map((stage, index) => (
          <V2Button
            key={stage.id}
            mode={mode}
            tone={index === agendaIndex
              ? 'primary'
              : 'secondary'}
            label={
              (index + 1) + '. ' + stage.title +
              ' · ' + stage.suggestedMinutes + ' min'
            }
            onPress={() => setAgendaIndex(index)}
          />
        ))}

        <V2Text mode={mode} muted variant="secondary">
          Move through the agenda at your group&apos;s pace.
          You may skip or revisit any item.
        </V2Text>
      </V2Screen>
    );
  }

  return (
    <V2Screen mode={mode}>
      <V2Button mode={mode} tone="quiet"
        icon="arrow-left" label="Return to Journey"
        onPress={leave} />

      <V2Artwork mode={mode}
        kind="growth" height={180} />

      <V2Text mode={mode} muted variant="label">
        STILLWATER HOST
      </V2Text>

      <V2Text mode={mode} variant="display">
        Make space for others.
      </V2Text>

      <V2Text mode={mode} muted>
        Ready-to-use guided experiences for small groups,
        friends and church communities.
      </V2Text>

      <V2Card mode={mode}>
        <V2Text mode={mode} variant="section">
          Hosting with care
        </V2Text>

        <V2Text mode={mode}>
          This pilot is intended for adult groups.
          Participation, prayer and discussion are voluntary.
        </V2Text>

        <V2Text mode={mode} muted>
          Do not ask people to disclose private recovery
          experiences. Respect confidentiality, but never
          promise absolute secrecy or ignore safeguarding
          concerns.
        </V2Text>

        <V2Text mode={mode} muted>
          Stillwater does not replace professional care.
          Follow appropriate local safeguarding procedures
          if someone needs additional support.
        </V2Text>

        <V2Button mode={mode}
          tone={acknowledged ? 'secondary' : 'primary'}
          icon={acknowledged ? 'check' : undefined}
          label={acknowledged
            ? 'Hosting guidance acknowledged'
            : 'I understand'}
          onPress={() =>
            setAcknowledged(value => !value)
          } />
      </V2Card>

      {programme && (
        <V2Card mode={mode}>
          <V2Text mode={mode} muted variant="label">
            READY-TO-HOST PROGRAMME · FREE
          </V2Text>

          <V2Text mode={mode} variant="heading">
            {programme.title}
          </V2Text>

          <V2Text mode={mode} muted>
            {programme.description}
          </V2Text>

          {programme.days.map((session, index) => {
            const hostGuide = buildHostGuide(
              programme, session.id
            );

            if (!hostGuide) return null;

            return (
              <V2Card key={session.id} mode={mode}>
                <V2Text mode={mode} variant="section">
                  Session {index + 1}: {session.title}
                </V2Text>

                <V2Text mode={mode} muted>
                  {hostGuide.preparation}
                </V2Text>

                <V2Text mode={mode}
                  muted variant="secondary">
                  Approx. {hostGuideMinutes(hostGuide)} min
                </V2Text>

                <V2Button mode={mode}
                  tone="secondary"
                  label="Open host guide"
                  disabled={!acknowledged}
                  onPress={() => {
                    setDayId(session.id);
                    setAgendaIndex(0);
                    setFinished(false);
                  }} />
              </V2Card>
            );
          })}
        </V2Card>
      )}

      <V2Card mode={mode}>
        <V2Text mode={mode} variant="section">
          Bring people together
        </V2Text>

        <V2Text mode={mode} muted>
          Connected Circles are optional. You can
          facilitate an in-person session without them.
        </V2Text>

        <V2Button mode={mode}
          tone="secondary" icon="share-2"
          label="Share a programme invitation"
          onPress={() =>
            router.push(STILLWATER_ROUTES.shared)
          } />

        <V2Button mode={mode}
          tone="secondary" icon="users"
          label="Open Stillwater Circles"
          onPress={() =>
            router.push(STILLWATER_ROUTES.circles)
          } />
      </V2Card>

      <V2Text mode={mode} muted variant="secondary">
        Host sessions do not track attendance or affect
        personal programme and recovery progress.
      </V2Text>
    </V2Screen>
  );
}
