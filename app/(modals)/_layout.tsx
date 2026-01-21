import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#0F172A',
        },
        headerTintColor: '#F1F5F9',
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: '#0F172A',
        },
      }}
    />
  );
}
