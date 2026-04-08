import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const LOGO_DARK  = require('@/assets/OEMTT_LOGO_DARK.png');
const LOGO_LIGHT = require('@/assets/OEMTT_LOGO_LIGHT.png');

const HeaderLogo = () => {
  const { isDark } = useTheme();
  return (
    <Image
      source={isDark ? LOGO_DARK : LOGO_LIGHT}
      style={tabStyles.headerLogo}
      resizeMode="contain"
    />
  );
};

const tabStyles = StyleSheet.create({
  headerLogo: {
    height: 38,
    width: 120,
    marginLeft: -20,
  },
});

export default function TabLayout() {
    const { theme, isDark } = useTheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: '#4A6680',
                tabBarStyle: {
                    backgroundColor: theme.colors.background,
                    borderTopColor: theme.colors.border,
                    borderTopWidth: 1,
                    height: 84,
                    paddingBottom: 16,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
                headerStyle: {
                    backgroundColor: theme.colors.background,
                },
                headerTintColor: theme.colors.text,
                headerShadowVisible: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Search',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search" size={size} color={color} />
                    ),
                    headerLeft: () => <HeaderLogo />,
                }}
            />
            <Tabs.Screen
                name="library"
                options={{
                    title: 'Library',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="library" size={size} color={color} />
                    ),
                    headerLeft: () => <HeaderLogo />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                    headerLeft: () => <HeaderLogo />,
                }}
            />
        </Tabs>
    );
}
