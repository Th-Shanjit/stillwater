import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StillwaterV2 } from '../../theme/stillwaterV2';

const p = StillwaterV2.day;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: p.primary,
        tabBarInactiveTintColor: p.muted,
        tabBarStyle: {
          backgroundColor: p.surface,
          borderTopColor: p.border,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          paddingTop: 4,
          minHeight: 60,
        },
        tabBarItemStyle: {
          minHeight: 48,
          paddingVertical: 3,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={22} color={typeof color === 'string' ? color : p.muted} />
          ),
        }}
      />

      <Tabs.Screen
        name="library"
        options={{
          title: 'Journey',
          tabBarIcon: ({ color }) => (
            <Feather name="compass" size={22} color={typeof color === 'string' ? color : p.muted} />
          ),
        }}
      />

      <Tabs.Screen
        name="rhythm"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => (
            <Feather name="bar-chart-2" size={22} color={typeof color === 'string' ? color : p.muted} />
          ),
        }}
      />
    </Tabs>
  );
}
