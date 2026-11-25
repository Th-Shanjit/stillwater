import { useRouter } from 'expo-router';

import { PlusOfferView } from '../components/PlusOfferView';

import {
  V2Screen,
} from '../components/StillwaterUI';

export default function PlusScreen() {
  const router = useRouter();

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  return (
    <V2Screen mode="day">
      <PlusOfferView
        headline="Your Stillwater membership"
        freeActionLabel="Go back"
        onUnlocked={leave}
        onContinueFree={leave}
      />
    </V2Screen>
  );
}
