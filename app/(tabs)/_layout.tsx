import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Palette, Sizes, Typography } from '../../theme/tokens';

const resolveIconColor = (color: unknown): string =>
  typeof color === 'string' ? color : Palette.light.textSecondary;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Palette.light.surface,
          borderTopColor: Palette.light.border,
          borderTopWidth: Sizes.borderWidth,
          elevation: 0,
          shadowOpacity: 0,
          minHeight: 62,
          paddingTop: 4,
        },
        tabBarItemStyle: {
          minHeight: Sizes.minTouchTarget,
          paddingVertical: 2,
        },
        tabBarActiveTintColor: Palette.light.primary,
        tabBarInactiveTintColor: Palette.light.textSecondary,
        tabBarLabelStyle: {
          ...Typography.tab,
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => (
            <Feather name="sun" size={Sizes.icon} color={resolveIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="rhythm"
        options={{
          title: 'Rhythm',
          tabBarIcon: ({ color }) => (
            <Feather name="grid" size={Sizes.icon} color={resolveIconColor(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => (
            <Feather name="book-open" size={Sizes.icon} color={resolveIconColor(color)} />
          ),
        }}
      />
    </Tabs>
  );
}