import React from 'react';
import { Stack } from 'expo-router';

export default function GuideLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F3F4F6' },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
