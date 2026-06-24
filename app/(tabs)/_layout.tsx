import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import CustomTabBar from "../../src/components/custom-tab-bar";

export default function TabsLayout() {
  return (
    <>
    <StatusBar style="dark" />
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
      <Tabs.Screen name="add-transaction" options={{ title: "Add" }} />
      <Tabs.Screen name="network" options={{ title: "Network" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
    </>
  );
}
