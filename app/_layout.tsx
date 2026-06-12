import "@/global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "../src/store/auth-store";

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    useAuthStore.getState().initialize()
      .catch((err) => {
        console.error("Auth initialization failed", err);
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inTabsGroup = segments[0] === "(tabs)";
    const onAuthScreens =
      segments[0] === "login" ||
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
      <View style={{ flex: 1, backgroundColor: "#fdfefe", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#373737" />
        <Text style={{ marginTop: 16, color: "#373737", fontWeight: "700", fontSize: 12, letterSpacing: 2 }}>
          INITIALIZING VESTRO
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
