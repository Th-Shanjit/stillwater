# Phase 10 privacy and startup hardening

## Changes

- Visible recovery from startup failure.
- No database reset on initialization failure.
- Background privacy cover before preference retrieval.
- Explicit biometric unlock.
- Privacy preference lookup failures fail closed.
- Concealed content removed from accessibility interaction.
- Native Journey modal windows unmounted while covered.
- Recovery routes use main navigation card presentation.
- Accessible close controls for Journey readers.

## Native screen protection

Expo ScreenCapture is used for Android release builds.

Android development builds retain screenshot capability
for design testing.

iOS app-switcher protection is enabled.

Native protection is not a substitute for application
authentication or encrypted database storage.

The dependency requires a compatible native build.

## Limitations

Actual background snapshots, native modal behaviour,
authentication interruptions and screen capture protection
require physical device testing.

Temporary modal contents may be remounted after unlocking.
Guided practice playback may restart.

The local database remains unencrypted by SQLCipher.

User-accessible deletion remains a separate corrective task.

No historical recovery records are erased by this patch.
