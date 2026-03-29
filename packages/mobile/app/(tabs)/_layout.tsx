import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Home, PenLine, Trophy, Battery, Rocket } from 'lucide-react-native';
import { colors } from '../../lib/theme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? colors.dark : colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.bgSecondary,
          borderTopColor: c.surfaceBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: c.accentText,
        tabBarInactiveTintColor: c.textTertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, size }) => <PenLine size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="proof"
        options={{
          title: 'Proof',
          tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="battery"
        options={{
          title: 'Battery',
          tabBarIcon: ({ color, size }) => <Battery size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="runway"
        options={{
          title: 'Runway',
          tabBarIcon: ({ color, size }) => <Rocket size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
