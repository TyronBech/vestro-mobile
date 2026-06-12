import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ArrowLeft, PhilippinePeso } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../src/store/auth-store";
import { APP_NAME } from "../src/services/api/config";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading, error, clearError } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("tyron.bechayda@vestro.app");
  const [password, setPassword] = useState("Password123!");

  // Reanimated shared value for card shake
  const shakeOffset = useSharedValue(0);

  // Animated style for card (combining rotation and translation)
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: "0deg" },
      { translateX: shakeOffset.value }
    ],
  }));

  // Trigger shake animation & haptic feedback on error
  const triggerErrorEffects = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    
    shakeOffset.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  }, [shakeOffset]);

  // Handle errors triggered from store
  useEffect(() => {
    if (error) {
      triggerErrorEffects();
    }
  }, [error, triggerErrorEffects]);

  const handleLogin = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {}

    if (!email.trim() || !password.trim()) {
      useAuthStore.setState({ error: "Please enter both email and password." });
      triggerErrorEffects();
      return;
    }

    try {
      await login({ email: email.trim(), password: password.trim() });
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (e) {}
    } catch (err) {
      // Error is caught in auth-store, which triggers the error useEffect
    }
  };

  const handleForgotPassword = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {}
    Alert.alert(
      "Password Reset",
      "A password reset link will be sent to your registered email address.",
      [{ text: "OK" }]
    );
  };

  const handleBack = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {}
    clearError();
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View 
        style={{ 
          flex: 1, 
          backgroundColor: "#fdfefe", 
          paddingTop: insets.top, 
          paddingBottom: Math.max(insets.bottom, 16) 
        }} 
        className="justify-between relative overflow-hidden"
      >
        
        {/* 1. TOP HEADER & METADATA */}
        <View className="px-6 pt-4">
          <View className="flex-row justify-between items-center mb-2">
            <PhilippinePeso size={15} strokeWidth={2.5} stroke="#373737" />
            <View className="flex-row items-center space-x-2">
              <Text className="text-xs font-bold text-[#373737] tracking-widest uppercase">EN</Text>
              <View className="w-1.5 h-1.5 ml-2 rounded-full bg-[#ee4e43]" />
            </View>
          </View>
          
          {/* Horizontal Divider Line */}
          <View className="h-[1px] bg-gray-100 w-full mb-2" />
          
          {/* Micro Labels */}
          <View className="flex-row justify-between mt-1.5">
            <Text className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
              DESIGN BY TYRON BECHAYDA
            </Text>
            <Text className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
              FREEDOM ENGINE V1.0.0
            </Text>
          </View>
        </View>

        {/* 2. MAIN CENTER HERO SECTION */}
        <View className="flex-1 items-center justify-center relative px-6">
          
          {/* Track indicator decoration on the right edge */}
          <View className="absolute right-6 top-1/2 flex-col items-center space-y-4 h-36">
            <Text className="relative text-[10px] top-[20%] font-bold text-gray-400 rotate-90 transform origin-left">
              11 / 12
            </Text>
            <View className="w-[2px] top-1/3 h-16 bg-[#373737] relative">
              <View className="absolute top-0 left-0 w-full h-1/2 bg-gray-100" />
            </View>
          </View>

          {/* Red Box containing the Login Form (Centered) */}
          <Animated.View 
            style={[
              animatedCardStyle,
              {
                shadowColor: "transparent",
              }
            ]}
            className="bg-[#373737] rounded-2xl p-6 w-[85%] z-20"
          >
            <Text className="text-[#fdfefe] font-black text-3xl tracking-tighter leading-none mb-1">
              {APP_NAME.toUpperCase()}
            </Text>
            <Text className="text-[#fdfefe]/90 text-[10px] font-bold uppercase tracking-widest mb-5">
              Login Credentials
            </Text>

            {/* Error Banner */}
            {error && (
              <View className="bg-[#fdfefe] rounded-2xl p-4 mb-4">
                <Text className="text-[#ee4e43] text-xs font-bold uppercase tracking-wider">
                  Auth Error
                </Text>
                <Text className="text-[#373737] text-xs mt-1 leading-relaxed">
                  {error}
                </Text>
              </View>
            )}

            {/* Inputs */}
            <View>
              <View className="mb-4">
                <Text className="text-[#fdfefe]/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                  Email Address
                </Text>
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) clearError();
                  }}
                  placeholder="name@domain.com"
                  placeholderTextColor="rgba(253, 254, 254, 0.4)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="bg-transparent border-b-2 border-[#ee4e43] py-2.5 text-[#fdfefe] text-base font-semibold"
                />
              </View>
              <View className="mb-5">
                <Text className="text-[#fdfefe]/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                  Password
                </Text>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) clearError();
                  }}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(253, 254, 254, 0.4)"
                  secureTextEntry
                  autoCapitalize="none"
                  className="bg-transparent border-b-2 border-[#ee4e43] py-2.5 text-[#fdfefe] text-base font-semibold"
                />
              </View>
            </View>

            {/* Authorize Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="bg-[#ee4e43] rounded-2xl py-4 items-center justify-center mt-2 flex-row"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fdfefe" />
              ) : (
                <Text className="text-[#fdfefe] font-bold text-xs uppercase tracking-widest">
                  LOGIN
                </Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              className="mt-3.5 py-1.5 items-center"
            >
              <Text className="text-[#fdfefe]/80 text-xs font-bold uppercase tracking-widest">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* 3. BOTTOM FOOTER */}
        <View className="px-6 pb-6 flex-row justify-between items-end">
          <View>
            <Text className="text-[#373737] font-black text-6xl tracking-tighter leading-none">
              {APP_NAME.toLowerCase()}.
            </Text>
          </View>
          
          {/* Red Square with Arrow Left Button (Go Back) */}
          <TouchableOpacity
            onPress={handleBack}
            className="bg-[#ee4e43] rounded-2xl w-14 h-14 items-center justify-center"
            style={{ shadowColor: "transparent" }}
          >
            <ArrowLeft stroke="#fdfefe" size={24} strokeWidth={3} />
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}
