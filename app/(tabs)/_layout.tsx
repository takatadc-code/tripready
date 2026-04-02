import React from 'react';
import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 24 }}>{label}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0891B2',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#0891B2',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'TripReady',
          tabBarLabel: '旅行',
          tabBarIcon: () => <TabIcon label="✈️" />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: '家族',
          tabBarLabel: '家族',
          tabBarIcon: () => <TabIcon label="👨‍👩‍👧‍👦" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'マイ情報',
          tabBarLabel: 'マイ情報',
          tabBarIcon: () => <TabIcon label="🛂" />,
        }}
      />
      {/* 旧タブを非表示 */}
      <Tabs.Screen name="requirements" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen name="flights" options={{ href: null }} />
    </Tabs>
  );
}
