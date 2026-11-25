import { useGlobalSearchParams, type Href } from 'expo-router';
import { invitationDestination } from '../content/onboardingInvitation';
import { applyPendingPrivateReset } from '../db/privateDataReset';
import * as ScreenCapture from 'expo-screen-capture';
import { PrivacyCoverContext } from '../components/PrivacyCover';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
} from '@expo-google-fonts/newsreader';
import { initDatabase } from '../db/schema';
import { getPreferences } from '../db/queries';
import { initEntitlements } from '../db/entitlements';
import { Palette, Spacing, Typography } from '../theme/tokens';
import { PrimaryButton, StillwaterMark } from '../components/RoyalUI';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const globalParams = useGlobalSearchParams();
  const navState = useRootNavigationState();

  const [dbReady, setDbReady] = useState(false);

  const [startupError, setStartupError] =
    useState(false);

  const [bootAttempt, setBootAttempt] =
    useState(0);

  const [backgroundCovered, setBackgroundCovered] =
    useState(false);

  const resumeEpoch = useRef(0);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const onboardingRedirected = useRef(false);
  const [isLocked, setIsLocked] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const authInProgress = useRef(false);

  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
  });

  const promptUnlock = useCallback(async () => {
    if (authInProgress.current) return;
    authInProgress.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Stillwater',
        fallbackLabel: 'Use Passcode',
      });
      if (
        result.success &&
        AppState.currentState === 'active'
      ) {
        resumeEpoch.current += 1;
        setBackgroundCovered(false);
        setIsLocked(false);
      }
    } catch {
      setIsLocked(true);
    } finally {
      authInProgress.current = false;
    }
  }, []);


  // Startup must fail visibly rather than remain
  // on an indefinite loading screen.
  useEffect(() => {
    let active = true;

    const boot = async () => {
      try {
        // Android release builds prevent screen capture
        // and normally suppress recent-app previews.
        // Development builds retain screenshot capability
        // for interface testing.
        if (
          Platform.OS === 'android' &&
          !__DEV__
        ) {
          await ScreenCapture.preventScreenCaptureAsync(
            'stillwater-private'
          );
        }

        if (Platform.OS === 'ios') {
          await ScreenCapture
            .enableAppSwitcherProtectionAsync(1);
        }

        await initDatabase();
        await applyPendingPrivateReset();

        const prefs = await getPreferences();

        if (!active) return;

        setNeedsOnboarding(
          !prefs.onboarding_completed
        );

        setIsLocked(
          Boolean(prefs.biometric_lock)
        );

        setBackgroundCovered(
          AppState.currentState === 'background' ||
          AppState.currentState === 'inactive'
        );

        initEntitlements().catch(() => {});

        setStartupError(false);
        setDbReady(true);

      } catch {
        if (active) {
          setStartupError(true);
          setDbReady(false);
        }
      }
    };

    void boot();

    return () => {
      active = false;
    };
  }, [bootAttempt]);

  // Cover the interface before an asynchronous
  // preference lookup occurs on resume.
  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      nextState => {
        const previous = appStateRef.current;

        appStateRef.current = nextState;

        const epoch = ++resumeEpoch.current;

        if (
          nextState === 'background' ||
          nextState === 'inactive'
        ) {
          setBackgroundCovered(true);
          return;
        }

        if (
          nextState !== 'active' ||
          previous === 'active'
        ) {
          return;
        }

        setBackgroundCovered(true);

        void (async () => {
          try {
            const prefs = await getPreferences();

            if (epoch !== resumeEpoch.current) {
              return;
            }

            if (prefs.biometric_lock) {
              setIsLocked(true);
            }

          } catch {
            if (epoch !== resumeEpoch.current) {
              return;
            }

            // Fail closed if privacy preferences
            // cannot be retrieved.
            setIsLocked(true);
          } finally {
            if (epoch === resumeEpoch.current) {
              setBackgroundCovered(false);
            }
          }
        })();
      }
    );

    return () => {
      resumeEpoch.current += 1;
      sub.remove();
    };
  }, []);

  // Authentication is explicit. Do not automatically
  // relaunch a cancelled native authentication prompt.

  useEffect(() => {
    if (!navState?.key || !dbReady || !fontsLoaded) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (needsOnboarding && !onboardingRedirected.current) {
      onboardingRedirected.current = true;

      if (!inOnboarding) {
        const destination = invitationDestination(
          segments[0],
          globalParams
        );

        if (destination) {
          router.replace(
            ('/onboarding?next=' +
              encodeURIComponent(destination)) as Href
          );
        } else {
          router.replace('/onboarding');
        }
      }
    }
  }, [navState?.key, dbReady, fontsLoaded, needsOnboarding, segments, router, globalParams]);

  if (startupError || fontError) {
    return (
      <View style={[
        styles.center,
        { padding: 24, gap: 16 },
      ]}>
        <StillwaterMark
          size={38}
          color={Palette.light.scripture}
        />

        <Text style={styles.lockBrand}>
          Unable to open Stillwater
        </Text>

        <Text style={styles.lockSub}>
          Your existing records have not been reset.
          Try opening the app again.
        </Text>

        {!fontError && (
          <PrimaryButton
            label="Try again"
            onPress={() => {
              setStartupError(false);
              setBootAttempt(value => value + 1);
            }}
          />
        )}

        {fontError && (
          <Text style={styles.lockSub}>
            Close and reopen the application.
          </Text>
        )}
      </View>
    );
  }

  if (!dbReady || !fontsLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Palette.light.primary} />
      </View>
    );
  }

  const covered =
    isLocked || backgroundCovered;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        style={
          !covered &&
          ['pause', 'examen'].includes(String(segments[0]))
            ? 'light'
            : 'dark'
        }
      />
      <PrivacyCoverContext.Provider value={covered}>
        <View
          style={{
            flex: 1,
            opacity: covered ? 0 : 1,
          }}
          pointerEvents={covered ? 'none' : 'auto'}
          accessibilityElementsHidden={covered}
          importantForAccessibility={
            covered
              ? 'no-hide-descendants'
              : 'auto'
          }
        >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plans" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="sanctuary" />
        <Stack.Screen name="programme-preview" />
        <Stack.Screen name="programmes" />
        <Stack.Screen name="shared" />
        <Stack.Screen name="circles" />
        <Stack.Screen name="host" />
        <Stack.Screen name="publishers" />
        <Stack.Screen name="plus" />
        <Stack.Screen name="privacy-data" options={{ gestureEnabled: false }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="pause" options={{ presentation: 'card', animation: 'fade' }} />
        <Stack.Screen name="grace-reset" options={{ presentation: 'card' }} />
        <Stack.Screen name="examen" options={{ presentation: 'card', animation: 'fade' }} />
      </Stack>
        </View>
      </PrivacyCoverContext.Provider>

      {covered && (
        <View
          style={styles.lockOverlay}
          accessibilityViewIsModal
        >
          <StillwaterMark size={38} color={Palette.light.scripture} />
          <Text style={styles.lockBrand}>stillwater.</Text>
          <Text style={styles.lockSub}>
            {backgroundCovered
              ? 'Your private space.'
              : 'Unlock to continue.'}
          </Text>

          {!backgroundCovered && isLocked && (
            <PrimaryButton
              label="Unlock"
              onPress={promptUnlock}
              style={{
                maxWidth: 240,
                marginTop: Spacing.md,
              }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: Palette.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: Palette.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  lockBrand: {
    ...Typography.display,
    color: Palette.light.text,
    marginTop: Spacing.xs,
  },
  lockSub: {
    ...Typography.body,
    color: Palette.light.textSecondary,
  },
});
