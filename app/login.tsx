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
import Card from "../src/components/card";
import { Colors } from "../constants/colors";
import { Strings } from "../constants/string";
import { Sizes } from "../constants/sizes";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading, error, clearError } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState<string>(Strings.defaultEmail);
  const [password, setPassword] = useState<string>(Strings.defaultPassword);

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
      useAuthStore.setState({ error: Strings.validationEmailPassword });
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
      Strings.resetPasswordTitle,
      Strings.resetPasswordMessage,
      [{ text: Strings.ok }]
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
          backgroundColor: Colors.background, 
          paddingTop: insets.top, 
          paddingBottom: Math.max(insets.bottom, Sizes.safeAreaBottomMin) 
        }} 
        className="justify-between relative overflow-hidden"
      >
        
        {/* 1. TOP HEADER & METADATA */}
        <View className="px-6 pt-4">
          <View className="flex-row justify-between items-center mb-2">
            <PhilippinePeso size={Sizes.iconMini} strokeWidth={Sizes.strokeMedium} stroke={Colors.textPrimary} />
            <View className="flex-row items-center space-x-2">
              <Text className="text-xs font-bold text-textPrimary tracking-widest uppercase">{Strings.languageCode}</Text>
              <View 
                style={{ width: Sizes.headerDotSize, height: Sizes.headerDotSize, borderRadius: Sizes.headerDotSize / 2 }} 
                className="ml-2 rounded-full bg-actionPrimary" 
              />
            </View>
          </View>
          
          {/* Horizontal Divider Line */}
          <View style={{ height: Sizes.dividerHeight }} className="bg-gray-100 w-full mb-2" />
          
          {/* Micro Labels */}
          <View className="flex-row justify-between mt-1.5">
            <Text className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
              {Strings.designerCredit}
            </Text>
            <Text className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
              {Strings.engineVersion}
            </Text>
          </View>
        </View>

        {/* 2. MAIN CENTER HERO SECTION */}
        <View className="flex-1 items-center justify-center relative px-6">
          
          {/* Track indicator decoration on the right edge */}
          <View className="absolute right-6 top-1/2 flex-col items-center space-y-4 h-36">
            <Text className="relative text-[10px] top-[20%] font-bold text-gray-400 rotate-90 transform origin-left">
              {Strings.pageIndicator}
            </Text>
            <View className="w-[2px] top-1/3 h-16 bg-backgroundDark relative">
              <View className="absolute top-0 left-0 w-full h-1/2 bg-gray-100" />
            </View>
          </View>

          {/* Red Box containing the Login Form (Centered) */}
          <Card
            title={APP_NAME}
            subtitle={Strings.loginSubtitle}
            variant="dark"
            style={[animatedCardStyle, { width: Sizes.cardWidthLogin }]}
            className="z-20"
          >
            {/* Error Banner */}
            {error && (
              <View className="bg-background rounded-2xl p-4 mb-4">
                <Text className="text-actionPrimary text-xs font-bold uppercase tracking-wider">
                  {Strings.authErrorTitle}
                </Text>
                <Text className="text-textPrimary text-xs mt-1 leading-relaxed">
                  {error}
                </Text>
              </View>
            )}

            {/* Inputs */}
            <View>
              <View className="mb-4">
                <Text className="text-background/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                  {Strings.emailLabel}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) clearError();
                  }}
                  placeholder={Strings.emailPlaceholder}
                  placeholderTextColor="rgba(253, 254, 254, 0.4)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="bg-transparent border-b-2 border-actionPrimary py-2.5 text-background text-base font-semibold"
                />
              </View>
              <View className="mb-5">
                <Text className="text-background/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                  {Strings.passwordLabel}
                </Text>
                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) clearError();
                  }}
                  placeholder={Strings.passwordPlaceholder}
                  placeholderTextColor="rgba(253, 254, 254, 0.4)"
                  secureTextEntry
                  autoCapitalize="none"
                  className="bg-transparent border-b-2 border-actionPrimary py-2.5 text-background text-base font-semibold"
                />
              </View>
            </View>

            {/* Authorize Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              className="bg-actionPrimary rounded-2xl py-4 items-center justify-center mt-2 flex-row"
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Text className="text-background font-bold text-xs uppercase tracking-widest">
                  {Strings.loginButtonText}
                </Text>
              )}
            </TouchableOpacity>

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              className="mt-3.5 py-1.5 items-center"
            >
              <Text className="text-background/80 text-xs font-bold uppercase tracking-widest">
                {Strings.forgotPasswordButtonText}
              </Text>
            </TouchableOpacity>
          </Card>
        </View>

        {/* 3. BOTTOM FOOTER */}
        <View className="px-6 pb-6 flex-row justify-between items-end">
          <View>
            <Text className="text-textPrimary font-black text-6xl tracking-tighter leading-none">
              {APP_NAME.toLowerCase()}.
            </Text>
          </View>
          
          {/* Red Square with Arrow Left Button (Go Back) */}
          <TouchableOpacity
            onPress={handleBack}
            className="bg-actionPrimary rounded-2xl items-center justify-center"
            style={{ 
              width: Sizes.bottomButtonSize, 
              height: Sizes.bottomButtonSize,
              shadowColor: "transparent" 
            }}
          >
            <ArrowLeft stroke={Colors.background} size={Sizes.iconLarge} strokeWidth={Sizes.strokeThick} />
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}
