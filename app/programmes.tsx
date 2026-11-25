import { getPublisherProfile } from '../content/publishers';
import { STILLWATER_ROUTES } from '../content/stillwaterRoutes';

import {
  listProgrammeParticipation,
  getProgrammeParticipation,
  saveProgrammeProgress,
  finishProgrammeSession,
} from '../db/programmeParticipation';

import {
  restoreSavedSession,
  participationStatus,
  type ProgrammeParticipation,
} from '../content/programmeParticipation';

import type {
  ProgrammeSession,
} from '../content/programmeSession';

import {
  useCallback,
  useRef,
  useState,
} from 'react';

import { Alert, BackHandler, Platform, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import {
  listProgrammes,
  getProgramme,
} from '../content/programmeCatalog';

import {
  programmeKey,
  type ProgrammeDefinition,
} from '../content/programme';

import {
  selectCatalogueEditions,
  programmeAccessDecision,
  type ProgrammeEnrollment,
} from '../content/programmeEnrollment';

import {
  listProgrammeEnrollments,
  joinProgramme,
  leaveProgramme,
  getEnrolledProgramme,
} from '../db/programmeEnrollments';

import { hasStillwaterPlus } from '../db/entitlements';

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

import { StillwaterV2 } from '../theme/stillwaterV2';

const mode = 'day' as const;
const p = StillwaterV2.day;

interface SelectedEdition {
  id: string;
  version: number;
}

interface ActiveSession {
  programme: ProgrammeDefinition;
  enrollmentId: string;
  dayId: string;
  initialSession?: ProgrammeSession;
  replay: boolean;
}

export default function ProgrammesScreen() {
  const router = useRouter();

  const [enrollments, setEnrollments] =
    useState<ProgrammeEnrollment[]>([]);

  const [catalogue, setCatalogue] =
    useState<ProgrammeDefinition[]>([]);

  const [hasPlus, setHasPlus] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [selected, setSelected] =
    useState<SelectedEdition | null>(null);

  const [active, setActive] =
    useState<ActiveSession | null>(null);

  const [finishedTitle, setFinishedTitle] =
    useState<string | null>(null);

  const [finishedReplay, setFinishedReplay] =
    useState(false);

  const [participation, setParticipation] =
    useState<ProgrammeParticipation[]>([]);

  const operationLock = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          // The player owns back navigation while open.
          if (active) return false;

          if (operationLock.current) return true;

          if (finishedTitle) {
            setFinishedTitle(null);
            return true;
          }

          if (selected) {
            setSelected(null);
            setError('');
            return true;
          }

          // Let Expo Router handle catalogue exit.
          return false;
        }
      );

      return () => subscription.remove();
    }, [active, finishedTitle, selected])
  );

  const updateParticipation = (
    record: ProgrammeParticipation
  ) => {
    setParticipation(previous => [
      ...previous.filter(item =>
        item.enrollmentId !== record.enrollmentId ||
        item.dayId !== record.dayId
      ),
      record,
    ]);
  };

  const readCatalogue = useCallback(async () => {
    const [records, sessions] = await Promise.all([
      listProgrammeEnrollments(),
      listProgrammeParticipation(),
    ]);
    const definitions = listProgrammes();

    const plus = definitions.some(
      item => item.access === 'plus'
    )
      ? await hasStillwaterPlus().catch(() => false)
      : false;

    return {
      records,
      sessions,
      definitions: selectCatalogueEditions(
        definitions,
        records
      ),
      plus,
    };
  }, []);

  const refresh = useCallback(async () => {
    const next = await readCatalogue();

    setEnrollments(next.records);
    setParticipation(next.sessions);
    setCatalogue(next.definitions);
    setHasPlus(next.plus);
    setLoaded(true);
    setError('');
  }, [readCatalogue]);

  useFocusEffect(
    useCallback(() => {
      let activeFocus = true;

      readCatalogue()
        .then(next => {
          if (!activeFocus) return;

          setEnrollments(next.records);
    setParticipation(next.sessions);
          setCatalogue(next.definitions);
          setHasPlus(next.plus);
          setLoaded(true);
          setError('');
        })
        .catch(() => {
          if (activeFocus) {
            setError('Unable to load programmes.');
          }
        });

      return () => {
        activeFocus = false;
      };
    }, [readCatalogue])
  );

  const perform = async (
    action: () => Promise<void>
  ) => {
    if (operationLock.current) return;

    operationLock.current = true;
    setBusy(true);
    setError('');

    try {
      await action();
    } catch {
      setError(
        'Unable to complete this change. Please try again.'
      );
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  };

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/library');
    }
  };

  const programme = selected
    ? getProgramme(selected.id, selected.version)
    : null;

  const enrollment = programme
    ? enrollments.find(item =>
        item.programmeId === programme.id &&
        item.programmeVersion === programme.version
      )
    : undefined;

  const access = programme
    ? programmeAccessDecision(programme, hasPlus)
    : null;

  const openSession = (
    enrollmentId: string,
    dayId: string
  ) => {
    void perform(async () => {
      const definition =
        await getEnrolledProgramme(enrollmentId);

      if (
        !definition ||
        !definition.days.some(day => day.id === dayId)
      ) {
        throw new Error('Session access unavailable.');
      }

      const day = definition.days.find(
        item => item.id === dayId
      );

      if (!day) {
        throw new Error('Session unavailable.');
      }

      const saved = await getProgrammeParticipation(
        enrollmentId,
        dayId
      );

      const replay = Boolean(saved?.completedAt);

      const restored = saved
        ? restoreSavedSession(day, saved)
        : null;

      if (saved && !restored) {
        throw new Error('Saved session is invalid.');
      }

      setActive({
        programme: definition,
        enrollmentId,
        dayId,
        initialSession: replay
          ? undefined
          : restored ?? undefined,
        replay,
      });
    });
  };

  if (active) {
    const dayIndex = active.programme.days.findIndex(
      day => day.id === active.dayId
    );

    const day = active.programme.days[dayIndex];

    if (day) {
      return (
        <ProgrammePlayer
          key={
            programmeKey(active.programme) +
            ':' + day.id
          }
          programmeTitle={active.programme.title}
          day={day}
          dayNumber={dayIndex + 1}
          totalDays={active.programme.days.length}
          initialSession={active.initialSession}
          onProgress={active.replay
            ? undefined
            : async next => {
                const record = await saveProgrammeProgress(
                  active.enrollmentId,
                  day.id,
                  next
                );

                updateParticipation(record);
              }}
          onExit={() => setActive(null)}
          onFinish={async result => {
            if (!active.replay) {
              const record = await finishProgrammeSession(
                active.enrollmentId,
                result
              );

              updateParticipation(record);
            }

            setFinishedReplay(active.replay);
            setFinishedTitle(day.title);
            setActive(null);
          }}
        />
      );
    }
  }

  if (finishedTitle) {
    return (
      <V2Screen mode={mode}>
        <V2Artwork
          mode={mode}
          kind="growth"
          height={180}
        />

        <V2Text mode={mode} variant="display">
          {finishedReplay
            ? 'A moment revisited.'
            : 'Session finished.'}
        </V2Text>

        <V2Text mode={mode}>
          {finishedTitle}
        </V2Text>

        <V2Text mode={mode} muted>
          You can return to the rest of your day.
        </V2Text>

        <V2Text mode={mode} muted variant="secondary">
          {finishedReplay
            ? 'Your original completion record is unchanged.'
            : 'Your session has been saved on this device. Continue whenever you are ready.'}
        </V2Text>

        <V2Button
          mode={mode}
          label="Return to programme"
          onPress={() => setFinishedTitle(null)}
        />
      </V2Screen>
    );
  }

  if (programme) {
    return (
      <V2Screen mode={mode}>
        <V2Button
          mode={mode}
          tone="quiet"
          icon="arrow-left"
          label="All programmes"
          disabled={busy}
          onPress={() => {
            setSelected(null);
            setError('');
          }}
        />

        <V2Artwork
          mode={mode}
          kind="water"
          height={180}
        />

        <V2Text mode={mode} muted variant="label">
          BY {programme.publisher.name.toUpperCase()}
        </V2Text>

        {getPublisherProfile(programme.publisher) && (
          <V2Button mode={mode}
            tone="quiet"
            label="About this publisher"
            onPress={() =>
              router.push(
                STILLWATER_ROUTES.publisherProfile(
                  programme.publisher.id
                )
              )
            } />
        )}

        <V2Text mode={mode} variant="display">
          {programme.title}
        </V2Text>

        <V2Text mode={mode} muted>
          {programme.description}
        </V2Text>

        <V2Text mode={mode} muted variant="secondary">
          {programme.days.length} sessions · {
            programme.access === 'free' ? 'Free' : 'Plus'
          } · {
            programme.schedule === 'self_paced'
              ? 'Self-paced' : 'Daily'
          }
        </V2Text>

        {programme.audience === 'recovery' && (
          <V2Text mode={mode} muted variant="secondary">
            Intended for personal recovery support.
          </V2Text>
        )}

        {enrollment ? (
          <V2Card mode={mode} tonal>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
              <Feather
                name="check-circle"
                size={22}
                color={p.primary}
              />

              <V2Text mode={mode} variant="section">
                Your programme
              </V2Text>
            </View>

            <V2Text mode={mode} muted>
              {participation.filter(item =>
                item.enrollmentId === enrollment.id &&
                item.completedAt &&
                programme.days.some(day => day.id === item.dayId)
              ).length} of {programme.days.length} sessions finished.
              Continue whenever you are ready.
            </V2Text>
          </V2Card>
        ) : access === 'allowed' ? (
          <V2Button
            mode={mode}
            label={busy ? 'Joining...' : 'Begin programme'}
            disabled={busy}
            onPress={() => void perform(async () => {
              await joinProgramme(
                programme.id,
                programme.version
              );

              await refresh();
            })}
          />
        ) : (
          <V2Card mode={mode}>
            <V2Text mode={mode}>
              {access === 'plus_required'
                ? 'Stillwater Plus access required.'
                : 'Daily scheduling is not available yet.'}
            </V2Text>

            {access === 'plus_required' && (
              <V2Button mode={mode}
                tone="secondary"
                label="View Plus membership"
                disabled={busy}
                onPress={() =>
                  router.push(STILLWATER_ROUTES.plus)
                } />
            )}
          </V2Card>
        )}


        {programme.days.map((day, index) => {
          const record = enrollment
            ? participation.find(item =>
                item.enrollmentId === enrollment.id &&
                item.dayId === day.id
              )
            : undefined;

          const status = participationStatus(record);

          return (
            <V2Card
              key={day.id}
              mode={mode}
              tonal={status === 'finished'}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}>
                <Feather
                  name={status === 'finished'
                    ? 'check-circle'
                    : status === 'in_progress'
                      ? 'clock'
                      : 'book-open'}
                  size={22}
                  color={p.muted}
                />

                <V2Text
                  mode={mode}
                  muted
                  variant="label"
                >
                  SESSION {index + 1}
                </V2Text>
              </View>

              <V2Text
                mode={mode}
                variant="section"
              >
                {day.title}
              </V2Text>

              <V2Text mode={mode} muted>
                {day.description}
              </V2Text>

              {enrollment && (
                <V2Text
                  mode={mode}
                  muted
                  variant="secondary"
                >
                  {status === 'finished'
                    ? 'Finished'
                    : status === 'in_progress'
                      ? 'In progress'
                      : 'Not started'}
                </V2Text>
              )}

              {enrollment &&
                access === 'allowed' && (
                  <V2Button
                    mode={mode}
                    tone={status === 'in_progress'
                      ? 'primary'
                      : 'secondary'}
                    icon="play"
                    label={status === 'finished'
                      ? 'Revisit session'
                      : status === 'in_progress'
                        ? 'Continue session'
                        : 'Begin session'}
                    disabled={busy}
                    onPress={() => openSession(
                      enrollment.id,
                      day.id
                    )}
                  />
                )}
            </V2Card>
          );
        })}

        {error !== '' && (
          <V2Text mode={mode}>{error}</V2Text>
        )}

        <V2Text mode={mode} muted variant="secondary">
          Your enrolment stays on this device.
          Joining does not share your recovery history
          or create a connected group membership.
        </V2Text>

        {enrollment && (
          <V2Button
            mode={mode}
            tone="quiet"
            label="Leave programme"
            disabled={busy}
            onPress={() => Alert.alert(
              'Leave this programme?',
              'Your local enrolment and saved session progress will be removed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Leave',
                  style: 'destructive',
                  onPress: () => {
                    void perform(async () => {
                      await leaveProgramme(enrollment.id);
                      setSelected(null);
                      await refresh();
                    });
                  },
                },
              ]
            )}
          />
        )}
      </V2Screen>
    );
  }

  const unavailable = enrollments.filter(
    item => !catalogue.some(programme =>
      programme.id === item.programmeId &&
      programme.version === item.programmeVersion
    )
  );

  const ordered = [...catalogue].sort((a, b) => {
    const joined = (id: string) =>
      enrollments.some(item => item.programmeId === id);

    return Number(joined(b.id)) - Number(joined(a.id));
  });

  return (
    <V2Screen mode={mode}>
      <V2Button
        mode={mode}
        tone="quiet"
        icon="arrow-left"
        label="Return to Journey"
        onPress={leave}
      />

      <V2Text mode={mode} muted variant="label">
        STILLWATER JOURNEYS
      </V2Text>

      <V2Text mode={mode} variant="display">
        Find your next step.
      </V2Text>

      <V2Text mode={mode} muted>
        Small, intentional practices for everyday life
        and faith.
      </V2Text>

      {!loaded && !error && (
        <V2Text mode={mode} muted>
          Opening the programme library...
        </V2Text>
      )}

      {error !== '' && (
        <V2Card mode={mode}>
          <V2Text mode={mode}>{error}</V2Text>

          <V2Button
            mode={mode}
            tone="secondary"
            label="Try again"
            disabled={busy}
            onPress={() => void perform(refresh)}
          />
        </V2Card>
      )}

      {ordered.map(item => {
        const joined = enrollments.some(
          record =>
            record.programmeId === item.id &&
            record.programmeVersion === item.version
        );

        return (
          <V2Card
            key={programmeKey(item)}
            mode={mode}
          >
            <V2Artwork
              mode={mode}
              kind="water"
              height={140}
            />

            <V2Text mode={mode} muted variant="label">
              {item.publisher.name.toUpperCase()} · {
                item.access === 'free' ? 'FREE' : 'PLUS'
              }
            </V2Text>

            <V2Text mode={mode} variant="heading">
              {item.title}
            </V2Text>

            <V2Text mode={mode} muted>
              {item.description}
            </V2Text>

            <V2Text
              mode={mode}
              muted
              variant="secondary"
            >
              {item.days.length} sessions · {
                item.schedule === 'self_paced'
                  ? 'Self-paced' : 'Daily'
              }
              {joined ? ' · Enrolled' : ''}
            </V2Text>

            <V2Button
              mode={mode}
              label={joined
                ? 'Open your programme'
                : 'Explore programme'}
              icon="arrow-right"
              onPress={() => {
                setSelected({
                  id: item.id,
                  version: item.version,
                });

                setError('');
              }}
            />
          </V2Card>
        );
      })}

      {unavailable.map(item => (
        <V2Card key={item.id} mode={mode}>
          <V2Text mode={mode} variant="section">
            Programme edition unavailable
          </V2Text>

          <V2Text mode={mode} muted>
            Your enrolment has been retained, but the
            original content edition is unavailable.
          </V2Text>

          <V2Button
            mode={mode}
            tone="quiet"
            label="Remove enrolment"
            disabled={busy}
            onPress={() => Alert.alert(
              'Remove enrolment?',
              'This removes the local enrolment and its saved session progress.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => void perform(async () => {
                    await leaveProgramme(item.id);
                    await refresh();
                  }),
                },
              ]
            )}
          />
        </V2Card>
      ))}

      {loaded && !ordered.length && !unavailable.length && (
        <V2Text mode={mode} muted>
          No programmes available.
        </V2Text>
      )}
    </V2Screen>
  );
}
