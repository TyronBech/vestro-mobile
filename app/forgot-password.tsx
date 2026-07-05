import React, { useState, useEffect, useCallback, useRef } from "react";
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword, resetPassword, loading, error, clearError } = useAuthStore();
  const insets = useSafeAreaInsets();

  const isSubmittingRef = useRef(false);

  const [phase, setPhase] = useState<1 | 2>(1);
  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  // Reanimated shared value for card shake
  const shakeOffset = useSharedValue(0);

  // Animated style for card
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

  const handleRequestOtp = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!email.trim()) {
      useAuthStore.setState({ error: "Please enter your email address." });
      triggerErrorEffects();
      isSubmittingRef.current = false;
      return;
    }

    try {
      await forgotPassword(email.trim());
      
      Alert.alert(
        "OTP Code Sent",
        "If the email is registered, a 6-digit OTP code has been sent. Please check your email (or terminal console).",
        [
          {
            text: "OK",
            onPress: () => {
              clearError();
              setPhase(2);
            },
          },
        ]
      );
    } catch (err) {
      // Error is caught in auth-store
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleResetPassword = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      useAuthStore.setState({ error: "All fields are required." });
      triggerErrorEffects();
      isSubmittingRef.current = false;
      return;
    }

    if (otp.trim().length !== 6) {
      useAuthStore.setState({ error: "OTP code must be exactly 6 digits." });
      triggerErrorEffects();
      isSubmittingRef.current = false;
      return;
    }

    if (newPassword !== confirmPassword) {
      useAuthStore.setState({ error: "Passwords do not match." });
      triggerErrorEffects();
      isSubmittingRef.current = false;
      return;
    }

    if (newPassword.length < 8) {
      useAuthStore.setState({ error: "Password must be at least 8 characters." });
      triggerErrorEffects();
      isSubmittingRef.current = false;
      return;
    }

    try {
      await resetPassword(email.trim(), otp.trim(), newPassword.trim());

      Alert.alert(
        "Success",
        "Your password has been successfully reset. Please log in with your new password.",
        [
          {
            text: "OK",
            onPress: () => {
              clearError();
              router.replace("/login");
            },
          },
        ]
      );
    } catch (err) {
      // Error is caught in auth-store
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleBack = () => {
    clearError();
    if (phase === 2) {
      setPhase(1);
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
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
          
          <Card
            title={APP_NAME}
            subtitle={phase === 1 ? "REQUEST RESET" : "RESET PASSWORD"}
            variant="dark"
            style={[animatedCardStyle, { width: Sizes.cardWidthLogin }]}
            className="z-20"
          >
            {/* Error Banner */}
            {error && (
              <View className="bg-background rounded-2xl p-4 mb-4">
                <Text className="text-actionPrimary text-xs font-bold uppercase tracking-wider">
                  ERROR
                </Text>
                <Text className="text-textPrimary text-xs mt-1 leading-relaxed">
                  {error}
                </Text>
              </View>
            )}

            {phase === 1 ? (
              /* Phase 1: Request OTP */
              <View>
                <View className="mb-5">
                  <Text className="text-background/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                    Email Address
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

                <TouchableOpacity
                  onPress={handleRequestOtp}
                  disabled={loading}
                  className="bg-actionPrimary rounded-2xl py-4 items-center justify-center mt-2 flex-row"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <Text className="text-background font-bold text-xs uppercase tracking-widest">
                      SEND OTP CODE
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Phase 2: Enter OTP & New Password */
              <View>
                <View className="mb-4">
                  <Text className="text-background/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                    6-Digit OTP Code
                  </Text>
                  <TextInput
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text);
                      if (error) clearError();
                    }}
                    placeholder="123456"
                    placeholderTextColor="rgba(253, 254, 254, 0.4)"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="bg-transparent border-b-2 border-actionPrimary py-2.5 text-background text-base font-semibold"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-background/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                    New Password
                  </Text>
                  <TextInput
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (error) clearError();
                    }}
                    placeholder={Strings.passwordPlaceholder}
                    placeholderTextColor="rgba(253, 254, 254, 0.4)"
                    secureTextEntry
                    autoCapitalize="none"
                    className="bg-transparent border-b-2 border-actionPrimary py-2.5 text-background text-base font-semibold"
                  />
                </View>

                <View className="mb-5">
                  <Text className="text-background/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                    Confirm New Password
                  </Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (error) clearError();
                    }}
                    placeholder={Strings.passwordPlaceholder}
                    placeholderTextColor="rgba(253, 254, 254, 0.4)"
                    secureTextEntry
                    autoCapitalize="none"
                    className="bg-transparent border-b-2 border-actionPrimary py-2.5 text-background text-base font-semibold"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={loading}
                  className="bg-actionPrimary rounded-2xl py-4 items-center justify-center mt-2 flex-row"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <Text className="text-background font-bold text-xs uppercase tracking-widest">
                      RESET PASSWORD
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
