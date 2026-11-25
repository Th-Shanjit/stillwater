import type { ReactNode, ComponentProps } from 'react';
import {
  Pressable, ScrollView, Text, View,
  useWindowDimensions,
} from 'react-native';
import type {
  StyleProp, TextStyle, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Svg, {
  Circle, Path, Rect, Defs,
  LinearGradient, Stop,
} from 'react-native-svg';
import {
  StillwaterV2, V2Type, V2Radius,
} from '../theme/stillwaterV2';
import type { V2Mode } from '../theme/stillwaterV2';

type IconName = ComponentProps<typeof Feather>['name'];
type TextVariant = keyof typeof V2Type;

export function V2Text({
  mode, children, variant = 'body',
  muted = false, style,
}: {
  mode: V2Mode;
  children: ReactNode;
  variant?: TextVariant;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const p = StillwaterV2[mode];

  return (
    <Text style={[
      V2Type[variant],
      { color: muted ? p.muted : p.text },
      style,
    ]}>
      {children}
    </Text>
  );
}

export function V2Screen({
  mode, children, footer, bottomInset = true,
}: {
  mode: V2Mode;
  children: ReactNode;
  footer?: ReactNode;
  bottomInset?: boolean;
}) {
  const p = StillwaterV2[mode];
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const inset = width < 360 ? 16 : 20;

  return (
    <SafeAreaView
      edges={bottomInset ? ['top', 'bottom'] : ['top']}
      style={{ flex: 1, backgroundColor: p.background }}
    >
      {focused && (
        <StatusBar style={mode === 'night' ? 'light' : 'dark'} />
      )}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: inset,
          paddingBottom: 24,
          gap: 16,
          width: '100%',
          maxWidth: 560,
          alignSelf: 'center',
        }}
      >
        {children}
      </ScrollView>

      {footer && (
        <View style={{
          paddingHorizontal: inset,
          paddingVertical: 12,
          width: '100%',
          maxWidth: 560,
          alignSelf: 'center',
          backgroundColor: p.background,
        }}>
          {footer}
        </View>
      )}
    </SafeAreaView>
  );
}

export function V2Button({
  mode, label, onPress, icon,
  tone = 'primary', disabled = false,
}: {
  mode: V2Mode;
  label: string;
  onPress: () => void;
  icon?: IconName;
  tone?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
}) {
  const p = StillwaterV2[mode];
  const color = tone === 'primary' ? p.onPrimary : p.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        borderRadius: V2Radius.small,
        borderWidth: tone === 'secondary' ? 1 : 0,
        borderColor: p.muted,
        backgroundColor: tone === 'primary'
          ? p.primary
          : tone === 'secondary'
            ? p.surface : 'transparent',
        paddingHorizontal: 16,
        paddingVertical: 13,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
      })}
    >
      {icon && <Feather name={icon} color={color} size={19} />}
      <Text style={{
        ...V2Type.body,
        fontWeight: '600',
        color,
        textAlign: 'center',
        flexShrink: 1,
      }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function V2Card({
  mode, children, style, tonal = false,
}: {
  mode: V2Mode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tonal?: boolean;
}) {
  const p = StillwaterV2[mode];

  return (
    <View style={[{
      backgroundColor: tonal ? p.secondary : p.surface,
      borderColor: p.border,
      borderWidth: 1,
      borderRadius: V2Radius.card,
      padding: 16,
      gap: 10,
    }, style]}>
      {children}
    </View>
  );
}

export function V2ActionRow({
  mode, label, icon, onPress,
  description, selected,
}: {
  mode: V2Mode;
  label: string;
  icon: IconName;
  onPress: () => void;
  description?: string;
  selected?: boolean;
}) {
  const p = StillwaterV2[mode];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={
        selected === undefined ? undefined : { selected }
      }
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 58,
        padding: 14,
        borderWidth: 1,
        borderColor: selected ? p.muted : p.border,
        borderRadius: V2Radius.small,
        backgroundColor: selected ? p.secondary : p.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Feather name={icon} color={p.muted} size={22} />
      <View style={{ flex: 1, gap: 3 }}>
        <V2Text mode={mode}>{label}</V2Text>
        {description && (
          <V2Text mode={mode} muted variant="secondary">
            {description}
          </V2Text>
        )}
      </View>
      <Feather
        name={selected ? 'check-circle' : 'chevron-right'}
        color={p.muted}
        size={19}
      />
    </Pressable>
  );
}

export function V2Artwork({
  mode, kind = 'water', height = 100,
}: {
  mode: V2Mode;
  kind?: 'water' | 'threshold' | 'growth';
  height?: number;
}) {
  const night = mode === 'night';
  const sky = night ? '#1C302F' : '#E1E8DB';
  const distant = night ? '#36534D' : '#ABC0AE';
  const middle = night ? '#29443F' : '#779A8B';
  const deep = '#193B35';
  const light = night ? '#D6B47D' : '#B88A50';

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{ borderRadius: 16, overflow: 'hidden' }}
    >
      <Svg
        width="100%" height={height}
        viewBox="0 0 340 120"
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sky} />
            <Stop offset="1" stopColor={distant} />
          </LinearGradient>
        </Defs>
        <Rect width={340} height={120} fill="url(#sky)" />

        {kind === 'water' && (
          <>
            <Circle cx={250} cy={28} r={17} fill={light} />
            <Path d="M0 76 Q55 12 135 70 T340 45 V120 H0Z"
              fill={distant} />
            <Path d="M0 86 Q75 47 165 81 T340 74 V120 H0Z"
              fill={middle} />
            <Path d="M0 96 Q100 80 205 97 T340 89 V120 H0Z"
              fill={deep} />
            {[100,108,115].map((y,i) => (
              <Path key={y}
                d={`M${220-i*13} ${y} Q250 ${y-3} ${280+i*13} ${y}`}
                stroke={light} opacity={0.45}
                strokeWidth={1} fill="none" />
            ))}
            <Path d="M46 72 V41 M36 50 H56"
              stroke={night ? '#B6C9BE' : '#48645A'}
              strokeWidth={1.6} opacity={0.8} />
          </>
        )}

        {kind === 'threshold' && (
          <>
            <Path d="M111 115 V58 A59 59 0 0 1 229 58 V115Z"
              fill={distant} />
            <Path d="M130 115 V60 A40 40 0 0 1 210 60 V115Z"
              fill={middle} />
            <Path d="M148 115 V67 A22 22 0 0 1 192 67 V115Z"
              fill={deep} />
            <Path d="M170 43 V61 M164 49 H176"
              stroke={light} strokeWidth={2}
              strokeLinecap="round" />
            <Path d="M170 91 L138 120 H202Z"
              fill={night ? '#36534D' : '#F6F3EB'} />
          </>
        )}

        {kind === 'growth' && (
          <>
            <Circle cx={262} cy={28} r={16}
              fill={light} opacity={0.7} />
            <Path d="M0 106 Q85 83 170 105 T340 96 V120 H0Z"
              fill={middle} />
            <Path d="M170 112 Q150 76 170 24"
              stroke={night ? '#D9E6CA' : deep}
              strokeWidth={3} fill="none" />
            {[0,1,2].map((i) => (
              <Path key={i}
                d={`M164 ${92-i*23} Q${115+i*7} ${61-i*18} 164 ${79-i*23} Q${205-i*4} ${53-i*16} 168 ${91-i*23}Z`}
                fill={night ? '#A6BDAD' : '#48645A'} />
            ))}
          </>
        )}
      </Svg>
    </View>
  );
}
