import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react-native";
import { useToastStore } from "../store/toast-store";
import { Colors } from "../../constants/colors";

export default function Toast() {
  const { isVisible, message, type, hide } = useToastStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isVisible) {
      // Trigger corresponding haptics when shown
      if (type === "success") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else if (type === "error") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } else if (type === "warning") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } else if (type === "info") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    }
  }, [isVisible, type]);

  if (!isVisible || !message) return null;

  // Set colors and icon based on type
  let borderColor: string = Colors.border;
  let bg = Colors.background;
  let textColor = Colors.textPrimary;
  let IconComponent = CheckCircle2;
  let iconColor: string = Colors.success;

  if (type === "success") {
    borderColor = Colors.success;
    iconColor = Colors.success;
  } else if (type === "error") {
    borderColor = Colors.error;
    iconColor = Colors.error;
    IconComponent = AlertCircle;
  } else if (type === "warning") {
    borderColor = Colors.warning;
    iconColor = Colors.warning;
    IconComponent = AlertTriangle;
  } else if (type === "info") {
    borderColor = Colors.textSecondary;
    iconColor = Colors.textSecondary;
    IconComponent = Info;
  }

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.container,
        {
          top: insets.top + 16,
          backgroundColor: bg,
          borderColor: borderColor,
        },
      ]}
      className="flex-row items-center border-2 rounded-2xl p-4 mx-4"
    >
      <View className="mr-3">
        <IconComponent size={20} color={iconColor} strokeWidth={2.5} />
      </View>
      <Text style={{ color: textColor }} className="flex-1 text-xs font-bold uppercase tracking-wider">
        {message}
      </Text>
      <Pressable onPress={hide} className="p-1">
        <X size={16} color={Colors.textMuted} strokeWidth={2.5} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 10000,
    // flat shadow / outline style
    elevation: 0,
    shadowColor: "transparent",
  },
});
