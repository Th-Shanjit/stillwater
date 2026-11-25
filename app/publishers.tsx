import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  listPublisherProfiles,
  publisherProgrammes,
} from '../content/publishers';

import {
  listProgrammes,
} from '../content/programmeCatalog';

import {
  STILLWATER_ROUTES,
} from '../content/stillwaterRoutes';

import {
  V2Screen,
  V2Text,
  V2Card,
  V2Button,
  V2Artwork,
} from '../components/StillwaterUI';

const mode = 'day' as const;

export default function PublishersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const profiles = listPublisherProfiles();

  const requestedId =
    typeof params.id === 'string'
      ? params.id
      : null;

  const profile = profiles.find(
    item => item.id === requestedId
  );

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/library');
  };

  if (Object.hasOwn(params, 'id') && !profile) {
    return (
      <V2Screen mode={mode}>
        <V2Text mode={mode} variant="heading">
          Publisher profile unavailable.
        </V2Text>

        <V2Button mode={mode}
          label="Go back" onPress={leave} />
      </V2Screen>
    );
  }

  if (profile) {
    const programmes = publisherProgrammes(
      profile.id,
      listProgrammes()
    );

    return (
      <V2Screen mode={mode}>
        <V2Button mode={mode} tone="quiet"
          icon="arrow-left" label="Go back"
          onPress={leave} />

        <V2Artwork mode={mode}
          kind="water" height={180} />

        <V2Text mode={mode} muted variant="label">
          PROGRAMME PUBLISHER
        </V2Text>

        <V2Text mode={mode} variant="display">
          {profile.name}
        </V2Text>

        <V2Text mode={mode}>
          {profile.biography}
        </V2Text>

        <V2Text mode={mode} muted variant="secondary">
          Tradition: {profile.tradition}
        </V2Text>

        <V2Text mode={mode} variant="section">
          Published programmes
        </V2Text>

        {programmes.map(item => (
          <V2Card key={item.id} mode={mode}>
            <V2Text mode={mode} variant="heading">
              {item.title}
            </V2Text>

            <V2Text mode={mode} muted>
              {item.description}
            </V2Text>

            <V2Text mode={mode} muted variant="secondary">
              {item.days.length} sessions
              {' · '}
              {item.access === 'free' ? 'Free' : 'Plus'}
            </V2Text>
          </V2Card>
        ))}

        {programmes.length === 0 && (
          <V2Text mode={mode} muted>
            No programmes available.
          </V2Text>
        )}

        <V2Button mode={mode}
          label="Browse programme library"
          onPress={() =>
            router.push(STILLWATER_ROUTES.programmes)
          } />

        <V2Text mode={mode} muted variant="secondary">
          Publisher attribution does not grant access
          to your personal records or participation history.
        </V2Text>
      </V2Screen>
    );
  }

  return (
    <V2Screen mode={mode}>
      <V2Button mode={mode} tone="quiet"
        icon="arrow-left" label="Return to Journey"
        onPress={leave} />

      <V2Text mode={mode} variant="display">
        Our publishers
      </V2Text>

      <V2Text mode={mode} muted>
        Discover the people and organisations
        behind Stillwater programmes.
      </V2Text>

      {profiles.map(item => (
        <V2Card key={item.id} mode={mode}>
          <V2Artwork mode={mode}
            kind="water" height={100} />

          <V2Text mode={mode} variant="section">
            {item.name}
          </V2Text>

          <V2Text mode={mode} muted>
            {item.biography}
          </V2Text>

          <V2Button mode={mode} tone="secondary"
            label="View publisher"
            onPress={() =>
              router.push(
                STILLWATER_ROUTES.publisherProfile(item.id)
              )
            } />
        </V2Card>
      ))}
    </V2Screen>
  );
}
