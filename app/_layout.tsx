import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
} from '@expo-google-fonts/newsreader';
import { initDatabase } from '../db/schema';
import { getPreferences } from '../db/queries';
import { Palette, Spacing, Typography } from '../theme/tokens';
import { PrimaryButton, StillwaterMark } from '../components/RoyalUI';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  const [dbReady, setDbReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  const isSanctuaryScreen =
    segments[0] === 'pause' ||
    segments[0] === 'examen';

  const useLightSystemIcons =
    isSanctuaryScreen && !isLocked;

  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
  });

  const promptUnlock = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Stillwater',
        fallbackLabel: 'Use Passcode',
      });
      if (result.success) {
        setIsLocked(false);
      }
    } catch {
      setIsLocked(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await initDatabase();
      const prefs = await getPreferences();
      setNeedsOnboarding(!prefs.onboarding_completed);
      if (prefs.biometric_lock) {
        setIsLocked(true);
      }
      setDbReady(true);
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (appStateRef.current?.match(/inactive|background/) && nextState === 'active') {
        const prefs = await getPreferences();
        if (prefs.biometric_lock) {
          setIsLocked(true);
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isLocked && dbReady && fontsLoaded) {
      promptUnlock();
    }
  }, [isLocked, dbReady, fontsLoaded, promptUnlock]);

  useEffect(() => {
    if (!navState?.key || !dbReady || !fontsLoaded) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (needsOnboarding && !inOnboarding) {
      setNeedsOnboarding(false);
      router.replace('/onboarding');
    }
  }, [navState?.key, dbReady, fontsLoaded, needsOnboarding, segments, router]);

  if (!dbReady || !fontsLoaded) {
    return (
      <View style={styles.center}>
        <StatusBar style="dark" />
        <ActivityIndicator color={Palette.light.primary} />
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: useLightSystemIcons
          ? Palette.night.background
          : Palette.light.background,
      }}
    >
      <StatusBar
        style={useLightSystemIcons ? 'light' : 'dark'}
        animated
      />

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: Palette.light.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen
          name="pause"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            contentStyle: {
              backgroundColor: Palette.night.background,
            },
          }}
        />
        <Stack.Screen name="grace-reset" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="examen"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            contentStyle: {
              backgroundColor: Palette.night.background,
            },
          }}
        />
      </Stack>

      {isLocked && (
        <View style={styles.lockOverlay}>
          <StillwaterMark size={38} color={Palette.light.scripture} />
          <Text style={styles.lockBrand}>stillwater.</Text>
          <Text style={styles.lockSub}>Your space is private.</Text>
          <PrimaryButton
            label="Unlock"
            onPress={promptUnlock}
            style={{ maxWidth: 240, marginTop: Spacing.md }}
          />
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