import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "center",
        tabBarActiveTintColor: "#111827",
        tabBarInactiveTintColor: "#6B7280",
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
    </Tabs>
  );
}
