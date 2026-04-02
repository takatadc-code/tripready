import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { rescheduleAllAlerts } from '../lib/notifications';

const { width, height } = Dimensions.get('window');

function SplashOverlay({ onFinish }: { onFinish: () => void }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const mascotY = useRef(new Animated.Value(30)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // マスコットがふわっと浮き上がる
    Animated.sequence([
      Animated.parallel([
        Animated.timing(mascotOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(mascotY, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      // タイトル表示
      Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // サブタイトル表示
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      // 少し見せてから
      Animated.delay(800),
      // フェードアウト
      Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[splash.container, { opacity: fadeAnim }]} pointerEvents="none">
      <StatusBar style="light" />
      <Animated.View style={{ opacity: mascotOpacity, transform: [{ translateY: mascotY }] }}>
        <Image
          source={require('../assets/images/aero-cloud-mascot.png')}
          style={splash.mascot}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={{ opacity: titleOpacity, alignItems: 'center' }}>
        <Text style={splash.title}>TripReady</Text>
      </Animated.View>
      <Animated.View style={{ opacity: subtitleOpacity, alignItems: 'center' }}>
        <Text style={splash.subtitle}>あなたの旅をもっと安心に</Text>
      </Animated.View>
    </Animated.View>
  );
}

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  // 起動時に全通知を再スケジュール
  useEffect(() => {
    rescheduleAllAlerts().catch(() => {});
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="guide" options={{ headerShown: false }} />
        <Stack.Screen
          name="trip/[id]"
          options={{
            headerStyle: { backgroundColor: '#0891B2' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
            headerBackTitle: '戻る',
          }}
        />
      </Stack>
      {showSplash && <SplashOverlay onFinish={() => setShowSplash(false)} />}
    </>
  );
}

const splash = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0891B2',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  mascot: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    letterSpacing: 1,
  },
});
