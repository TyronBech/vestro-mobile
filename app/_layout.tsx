import "@/global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { useAuthStore } from "../src/store/auth-store";
import { Colors } from "../constants/colors";
import Toast from "../src/components/toast";
import BudgetConfigModal from "../src/components/budget-config-modal";
import MacroAssetModal from "../src/components/macro-asset-modal";
import CoreNetworkModal from "../src/components/core-network-modal";
import SessionLockScreen from "../src/components/session-lock-screen";

import { GestureHandlerRootView } from "react-native-gesture-handler";

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
function b64Decode(input: string): string {
  const str = input.replace(/=+$/, '');
  let output = '';
  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  for (let bc = 0, bs = 0, rbuffer, idx = 0; idx < str.length; idx++) {
    const char = str.charAt(idx);
    const pos = chars.indexOf(char);
    if (pos === -1) continue;
    bs = bc % 4 ? bs * 64 + pos : pos;
    if (bc++ % 4) {
      rbuffer = (bs >> ((-2 * bc) & 6));
      output += String.fromCharCode(255 & rbuffer);
    }
  }
  return output;
}

function getJwtExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = b64Decode(base64);
    const payload = JSON.parse(decoded);
    return payload.exp ? payload.exp * 1000 : null;
  } catch (e) {
    console.error("JWT Decode error:", e);
    return null;
  }
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { isAuthenticated, accessToken, isSessionLocked, setSessionLocked } = useAuthStore();
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
    if (!isAuthenticated || !accessToken || isSessionLocked) return;

    const checkExpiry = () => {
      const exp = getJwtExpiry(accessToken);
      if (exp) {
        const now = Date.now();
        if (now >= exp) {
          console.log("[Session Watchdog] JWT expired. Locking session.");
          setSessionLocked(true);
        }
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, accessToken, isSessionLocked, setSessionLocked]);

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
        <StatusBar style="dark" />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="google-auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
        </Stack>
        {isAuthenticated && isSessionLocked && <SessionLockScreen />}
        <Toast />
        <BudgetConfigModal />
        <MacroAssetModal />
        <CoreNetworkModal />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
