import "@/global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { useAuthStore } from "../src/store/auth-store";
import { Colors } from "../constants/colors";

import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. Initialize auth session
    useAuthStore.getState().initialize()
      .catch((err) => {
        console.error("Auth initialization failed", err);
      })
      .finally(() => {
        setIsReady(true);
      });

    // 2. Setup global deep link handling (warm/background starts)
    const handleDeepLink = async (event: { url: string }) => {
      console.log("[Global Deep Link] Received URL:", event.url);
      
      // Ignore Expo Dev Client bundle boot URL
      if (event.url.includes("expo-development-client")) {
        return;
      }

      const hash = event.url.split("#")[1];
      if (hash) {
        const getParam = (name: string) => {
          const match = hash.match(new RegExp(`(^|&)${name}=([^&]*)(&|$)`));
          return match ? decodeURIComponent(match[2]) : null;
        };

        const token = getParam("access_token");
        if (token) {
          console.log("[Global Deep Link] Found token, exchanging...");
          try {
            await useAuthStore.getState().loginWithGoogle(token);
            console.log("[Global Deep Link] Login successful, routing to home...");
            router.replace("/(tabs)/home");
          } catch (err) {
            console.error("[Global Deep Link] Token exchange failed:", err);
          }
        }
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Also check if app was opened via deep link on cold start
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!isReady) return;

    const inTabsGroup = segments[0] === "(tabs)";
    const onAuthScreens =
      segments[0] === "login" ||
      segments[0] === "forgot-password" ||
      segments[0] === "index" ||
      !segments[0];

    if (!isAuthenticated && inTabsGroup) {
      // Redirect unauthenticated users to landing page
      router.replace("/");
    } else if (isAuthenticated && onAuthScreens) {
      // Redirect authenticated users to home tab
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, segments, isReady]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.backgroundDark} />
        <Text style={{ marginTop: 16, color: Colors.textPrimary, fontWeight: "700", fontSize: 12, letterSpacing: 2 }}>
          INITIALIZING VESTRO
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="google-auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
