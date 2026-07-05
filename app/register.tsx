import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Keyboard,
} from "react-native";
import { StatusBar } from "expo-status-bar";
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

export default function RegisterScreen() {
  const router = useRouter();
  const { signup, loading, error, clearError } = useAuthStore();
  const insets = useSafeAreaInsets();

  const isSubmittingRef = useRef(false);

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // Reanimated shared value for card shake & keyboard offset
  const shakeOffset = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);

  // Animated style for card (combining rotation and translation)
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: "0deg" },
      { translateX: shakeOffset.value },
      { translateY: keyboardOffset.value }
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

  // Keyboard avoidance effect: translate only the card when typing
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      keyboardOffset.value = withTiming(-110, { duration: 250 });
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      keyboardOffset.value = withTiming(0, { duration: 250 });
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardOffset]);

  const handleRegister = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // Validation checks
    if (!name.trim()) {
      useAuthStore.setState({ error: Strings.validationNameRequired });
      triggerErrorEffects();
      isSubmittingRef.current = false;
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      useAuthStore.setState({ error: Strings.validationEmailRequired });
      triggerErrorEffects();
      isSubmittingRef.current = false;
      return;
    }

    if (!password || password.length < 8) {
      useAuthStore.setState({ error: Strings.validationPasswordLength });
      triggerErrorEffects();
      isSubmittingRef.current = false;
      return;
    }

    if (password !== confirmPassword) {
      useAuthStore.setState({ error: Strings.validationPasswordsMatch });
      triggerErrorEffects();
      isSubmittingRef.current = false;
      return;
    }

    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password: password,
      });
      
    } catch (err: any) {
      triggerErrorEffects();
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleBackToLogin = () => {
    clearError();
    router.replace("/login");
  };

  const handleBack = () => {
    clearError();
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
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

          {/* Form Card */}
          <Card
            title={APP_NAME}
            subtitle={Strings.registerSubtitle}
            variant="dark"
            style={[animatedCardStyle, { width: Sizes.cardWidthLogin }]}
            className="z-20 relative overflow-hidden"
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
              {/* Full Name */}
              <View className="mb-3">
                <Text className="text-background/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                  {Strings.nameLabel}
                </Text>
                <TextInput
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (error) clearError();
                  }}
                  placeholder={Strings.namePlaceholder}
                  placeholderTextColor="rgba(253, 254, 254, 0.4)"
                  autoCapitalize="words"
                  className="bg-transparent border-b-2 border-actionPrimary py-2 text-background text-base font-semibold"
                />
              </View>

              {/* Email */}
              <View className="mb-3">
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
                  className="bg-transparent border-b-2 border-actionPrimary py-2 text-background text-base font-semibold"
                />
              </View>

              {/* Password */}
              <View className="mb-3">
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
                  className="bg-transparent border-b-2 border-actionPrimary py-2 text-background text-base font-semibold"
                />
              </View>

              {/* Confirm Password */}
              <View className="mb-4">
                <Text className="text-background/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                  {Strings.confirmPasswordLabel}
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (error) clearError();
                  }}
                  placeholder={Strings.confirmPasswordPlaceholder}
                  placeholderTextColor="rgba(253, 254, 254, 0.4)"
                  secureTextEntry
                  autoCapitalize="none"
                  className="bg-transparent border-b-2 border-actionPrimary py-2 text-background text-base font-semibold"
                />
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              className="bg-actionPrimary rounded-2xl py-4 items-center justify-center mt-2 flex-row"
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Text className="text-background font-bold text-xs uppercase tracking-widest">
                  {Strings.registerButtonText}
                </Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <TouchableOpacity
              onPress={handleBackToLogin}
              className="mt-4 py-1.5 items-center"
            >
              <Text className="text-background/80 text-xs font-bold uppercase tracking-widest">
                {Strings.loginLinkText}
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
    </View>
  );
}
