import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const LOGO = require('@/assets/icon.png');

const HeaderLogo = () => (
  <Image source={LOGO} style={tabStyles.headerLogo} />
);

const tabStyles = StyleSheet.create({
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 7,
    marginLeft: 16,
  },
});

export default function TabLayout() {
    const { theme, isDark } = useTheme();

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textTertiary,
                tabBarStyle: {
                    backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white,
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
