import "@/global.css";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "../src/store/auth-store";

export default function RootLayout() {
  useEffect(() => {
    useAuthStore.getState().initialize().catch((err) => {
      console.error("Auth initialization failed", err);
    });
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: "Not found" }} />
    </Stack>
  );
}
