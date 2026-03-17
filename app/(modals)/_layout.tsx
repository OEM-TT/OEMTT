import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerShown: false,
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
    >
      <Stack.Screen
        name="scanner"
        options={{
          presentation: 'fullScreenModal',
          headerShown: false,
          // Black background so camera fills edge-to-edge
          contentStyle: { backgroundColor: '#000' },
        }}
      />
    </Stack>
  );
}
