import React from "react";
import { View, Text, ScrollView, Switch, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, Shield, Moon, ChevronRight } from "lucide-react-native";
import { Colors } from "../../constants/colors";

export default function NetworkScreen() {
  const insets = useSafeAreaInsets();

  // Mock state for settings
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-8 mt-4">
          <Text className="text-3xl font-black tracking-widest text-textPrimary">
            NETWORK
          </Text>
          <Text className="text-xs uppercase tracking-widest text-gray-400 mt-1">
            Network Settings
          </Text>
        </View>

        {/* Settings List */}
        <View className="space-y-4">
          
          {/* Push Notifications */}
          <View className="border border-borderLight rounded-2xl p-5 bg-background mb-4 flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="bg-backgroundDark/5 rounded-xl p-2 mr-3">
                <Bell size={18} stroke={Colors.textPrimary} strokeWidth={2.5} />
              </View>
              <Text className="text-textPrimary text-sm font-bold uppercase tracking-wider">
                Push Notifications
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.borderLight, true: Colors.actionPrimary }}
            />
          </View>

          {/* Dark Mode */}
          <View className="border border-borderLight rounded-2xl p-5 bg-background mb-4 flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="bg-backgroundDark/5 rounded-xl p-2 mr-3">
                <Moon size={18} stroke={Colors.textPrimary} strokeWidth={2.5} />
              </View>
              <Text className="text-textPrimary text-sm font-bold uppercase tracking-wider">
                Dark Mode
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: Colors.borderLight, true: Colors.actionPrimary }}
            />
          </View>

          {/* Privacy & Security */}
          <TouchableOpacity className="border border-borderLight rounded-2xl p-5 bg-background mb-4 flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View className="bg-backgroundDark/5 rounded-xl p-2 mr-3">
                <Shield size={18} stroke={Colors.textPrimary} strokeWidth={2.5} />
              </View>
              <Text className="text-textPrimary text-sm font-bold uppercase tracking-wider">
                Privacy & Security
              </Text>
            </View>
            <ChevronRight size={18} stroke={Colors.textMuted} strokeWidth={2.5} />
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}
