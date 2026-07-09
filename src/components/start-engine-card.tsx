import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Power } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { API_BASE_URL } from "../services/api/config";
import * as Haptics from "expo-haptics";

interface StartEngineCardProps {
  style?: any;
}

export default function StartEngineCard({ style }: StartEngineCardProps) {
  const [status, setStatus] = useState<"offline" | "connecting" | "online">("offline");
  const opacity = useSharedValue(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pulse effect for the status dot during connecting
  useEffect(() => {
    if (status === "connecting") {
      opacity.value = withRepeat(
        withTiming(0.3, { duration: 600 }),
        -1,
        true
      );
    } else {
      opacity.value = 1;
    }
  }, [status]);

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const checkHealth = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.status === 200;
    } catch {
      return false;
    }
  };

  const startPingLoop = () => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(async () => {
      const isHealthy = await checkHealth();
      if (isHealthy) {
        setStatus("online");
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 3000);
  };

  // Check health on mount (passive check)
  useEffect(() => {
    const initCheck = async () => {
      const isHealthy = await checkHealth();
      if (isHealthy) {
        setStatus("online");
      } else {
        setStatus("offline");
      }
    };
    initCheck();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleStart = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    setStatus("connecting");
    // Do an immediate check
    const isHealthy = await checkHealth();
    if (isHealthy) {
      setStatus("online");
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } else {
      // Start polling
      startPingLoop();
    }
  };

  return (
    <View
      className="bg-white border border-borderLight rounded-2xl p-4 flex-row items-center w-full mt-4"
      style={[{ borderColor: Colors.borderLight }, style]}
    >
      {/* Left Icon Button */}
      <TouchableOpacity
        onPress={handleStart}
        disabled={status === "online" || status === "connecting"}
        className="w-12 h-12 rounded-full items-center justify-center bg-backgroundDark mr-4"
        activeOpacity={0.7}
      >
        {status === "connecting" ? (
          <ActivityIndicator size="small" color={Colors.actionPrimary} />
        ) : (
          <Power
            size={Sizes.iconLarge}
            color={status === "online" ? Colors.successAlt : Colors.white}
            strokeWidth={Sizes.strokeMedium}
          />
        )}
      </TouchableOpacity>

      {/* Right Details */}
      <View className="flex-1 justify-center">
        <Text className="text-xs font-black text-textPrimary uppercase tracking-wider">
          Start Engine
        </Text>
        <View className="flex-row items-center mt-1">
          <Animated.View
            style={[
              {
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  status === "online"
                    ? Colors.successAlt
                    : status === "connecting"
                    ? Colors.warningAlt
                    : Colors.actionPrimary,
              },
              animatedDotStyle,
            ]}
            className="mr-2"
          />
          <Text className="text-[10px] font-bold text-textSecondary uppercase tracking-widest">
            {status === "online"
              ? "Online"
              : status === "connecting"
              ? "Pinging Backend..."
              : "Offline"}
          </Text>
        </View>
      </View>
    </View>
  );
}
