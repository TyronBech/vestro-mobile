import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet, Keyboard } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming } from "react-native-reanimated";
import { Lock, Fingerprint, ShieldAlert, LogOut, ArrowRight, Eye, EyeOff } from "lucide-react-native";
import { useAuthStore } from "../store/auth-store";
import { useToastStore } from "../store/toast-store";
import { apiLogin, apiLoginWith2fa } from "../services/api/endpoints/auth";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import * as SecureStore from "expo-secure-store";
import { SECURE_STORE_KEYS, SECURE_STORE_OPTIONS } from "../services/api/config";

export default function SessionLockScreen() {
  const { user, logout, biometricUnlock } = useAuthStore();
  const toast = useToastStore();

  const isSubmittingRef = useRef(false);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requires2fa, setRequires2fa] = useState(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [hasBiometricKey, setHasBiometricKey] = useState(false);
  const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState<number>(0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Load initial rate limit from SecureStore on mount
  useEffect(() => {
    const checkRateLimit = async () => {
      try {
        const storedExpiresAt = await SecureStore.getItemAsync(
          SECURE_STORE_KEYS.RATE_LIMIT_EXPIRES_AT,
          SECURE_STORE_OPTIONS
        );
        if (storedExpiresAt) {
          const expiresAt = parseInt(storedExpiresAt, 10);
          const now = Date.now();
          if (expiresAt > now) {
            const timeLeft = Math.ceil((expiresAt - now) / 1000);
            setRateLimitTimeLeft(timeLeft);
          } else {
            await SecureStore.deleteItemAsync(
              SECURE_STORE_KEYS.RATE_LIMIT_EXPIRES_AT,
              SECURE_STORE_OPTIONS
            );
          }
        }
      } catch (e) {
        console.error("Error loading rate limit in SessionLockScreen:", e);
      }
    };
    checkRateLimit();
  }, []);

  // Countdown timer effect for rate limiting
  useEffect(() => {
    if (rateLimitTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setRateLimitTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          SecureStore.deleteItemAsync(
            SECURE_STORE_KEYS.RATE_LIMIT_EXPIRES_AT,
            SECURE_STORE_OPTIONS
          ).catch((e) => console.error("Error deleting rate limit from store:", e));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitTimeLeft]);

  // Card shake animation
  const shakeOffset = useSharedValue(0);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const triggerErrorEffects = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {}

    shakeOffset.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  }, [shakeOffset]);

  // Check biometric support
  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricSupported(hasHardware);
      setIsBiometricEnrolled(isEnrolled);

      // Check if biometric key is stored locally
      const storedKey = await SecureStore.getItemAsync(
        SECURE_STORE_KEYS.BIOMETRIC_KEY,
        SECURE_STORE_OPTIONS
      );
      const hasKey = !!storedKey;
      setHasBiometricKey(hasKey);

      // Auto trigger biometric scan if enabled in profile, enrolled on device, and key exists
      if (user?.biometricsEnabled && hasHardware && isEnrolled && hasKey) {
        // Short delay to let the screen mount fully
        const timer = setTimeout(() => {
          handleBiometricScan();
        }, 600);
        return () => clearTimeout(timer);
      }
    })();
  }, [user]);

  const handleBiometricScan = async () => {
    if (rateLimitTimeLeft > 0) return;
    if (!user?.biometricsEnabled || !isBiometricSupported || !isBiometricEnrolled || !hasBiometricKey) {
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to unlock Vestro",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setLoading(true);
        try {
          await biometricUnlock();
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
          toast.show("Welcome back!", "success");
        } catch (err: any) {
          console.error("Biometric unlock store error:", err);
          if (err.status === 429) {
            const expiresAt = Date.now() + 15 * 60 * 1000;
            await SecureStore.setItemAsync(
              SECURE_STORE_KEYS.RATE_LIMIT_EXPIRES_AT,
              expiresAt.toString(),
              SECURE_STORE_OPTIONS
            ).catch((e) => console.error("Error storing rate limit:", e));
            setRateLimitTimeLeft(900);
          } else {
            toast.show(err.message || "Invalid biometric key", "error");
            triggerErrorEffects();
          }
        } finally {
          setLoading(false);
        }
      } else {
        if (result.error !== "user_cancel" && result.error !== "app_cancel") {
          toast.show("Biometric authentication failed", "warning");
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch (e) {}
        }
      }
    } catch (error) {
      console.error("Biometrics local authentication error:", error);
    }
  };

  const handlePasswordUnlock = async () => {
    if (rateLimitTimeLeft > 0) return;
    if (!user?.email) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (!password.trim()) {
      toast.show("Password is required", "error");
      triggerErrorEffects();
      isSubmittingRef.current = false;
      return;
    }

    setLoading(true);
    try {
      if (requires2fa) {
        if (twoFactorCode.length !== 6) {
          toast.show("2FA code must be 6 digits", "error");
          triggerErrorEffects();
          setLoading(false);
          isSubmittingRef.current = false;
          return;
        }

        const response = await apiLoginWith2fa({
          userId: user.id,
          token: twoFactorCode,
        });

        const { token, user: updatedUser } = response.data;
        if (token) {
          await SecureStore.setItemAsync(
            SECURE_STORE_KEYS.ACCESS_TOKEN,
            token,
            SECURE_STORE_OPTIONS
          );
          await SecureStore.setItemAsync(
            SECURE_STORE_KEYS.USER_PROFILE,
            JSON.stringify(updatedUser),
            SECURE_STORE_OPTIONS
          );
          useAuthStore.setState({
            accessToken: token,
            user: updatedUser,
            isAuthenticated: true,
            isSessionLocked: false,
          });
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
          toast.show("Unlocked successfully!", "success");
        } else {
          throw new Error("Invalid code");
        }
      } else {
        const response = await apiLogin({
          email: user.email,
          password: password,
        });

        const { token, user: updatedUser, requires2fa: req2fa } = response.data;

        if (req2fa) {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch (e) {}
          setPassword("");
          setTwoFactorCode("");
          setRequires2fa(true);
          toast.show("2FA verification required", "warning");
        } else if (token) {
          await SecureStore.setItemAsync(
            SECURE_STORE_KEYS.ACCESS_TOKEN,
            token,
            SECURE_STORE_OPTIONS
          );
          await SecureStore.setItemAsync(
            SECURE_STORE_KEYS.USER_PROFILE,
            JSON.stringify(updatedUser),
            SECURE_STORE_OPTIONS
          );
          useAuthStore.setState({
            accessToken: token,
            user: updatedUser,
            isAuthenticated: true,
            isSessionLocked: false,
          });
          try {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
          toast.show("Welcome back!", "success");
        }
      }
    } catch (err: any) {
      console.error("Unlock failed:", err);
      if (err.status === 429) {
        const expiresAt = Date.now() + 15 * 60 * 1000;
        await SecureStore.setItemAsync(
          SECURE_STORE_KEYS.RATE_LIMIT_EXPIRES_AT,
          expiresAt.toString(),
          SECURE_STORE_OPTIONS
        ).catch((e) => console.error("Error storing rate limit:", e));
        setRateLimitTimeLeft(900);
      } else {
        toast.show(err.message || "Invalid credentials", "error");
        triggerErrorEffects();
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleLogout = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    await logout();
    setPassword("");
    setTwoFactorCode("");
    setRequires2fa(false);
    toast.show("Session disconnected", "info");
  };

  return (
    <View style={styles.overlay} className="absolute inset-0 z-50 bg-background items-center justify-center px-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : (keyboardVisible ? "padding" : undefined)}
        className="w-full max-w-sm items-center"
      >
        <Animated.View style={[styles.card, cardAnimatedStyle]} className="w-full border border-borderLight rounded-2xl bg-white p-6 items-center">
          {rateLimitTimeLeft > 0 && (
            <View 
              style={{ 
                position: "absolute", 
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0, 
                backgroundColor: Colors.backgroundDark, 
                zIndex: 50, 
                alignItems: "center", 
                justifyContent: "center", 
                padding: 24,
                borderRadius: 16,
              }}
            >
              <Lock size={32} stroke={Colors.actionPrimary} strokeWidth={2.5} className="mb-4" />
              <Text className="text-actionPrimary text-xs font-bold uppercase tracking-widest mt-3 mb-5">
                ACCESS LOCKOUT
              </Text>
              <Text className="text-background font-black text-4xl tracking-widest mb-3">
                {formatTime(rateLimitTimeLeft)}
              </Text>
              <Text className="text-background/60 text-[10px] uppercase font-bold tracking-wider text-center leading-relaxed">
                Too many unlock attempts. Please wait before trying again.
              </Text>
            </View>
          )}
          {/* Locked Header */}
          <View className="bg-backgroundDark rounded-2xl p-4 w-14 h-14 items-center justify-center mb-4">
            <Lock size={Sizes.iconLargeX} color={Colors.background} strokeWidth={2.5} />
          </View>

          <Text className="text-textPrimary font-black text-xl tracking-wider uppercase mb-1">
            Session Locked
          </Text>
          <Text className="text-textSecondary text-xs font-semibold mb-6 text-center">
            {user?.name || user?.email || "User Session"}
          </Text>

          {/* Biometrics Option */}
          {user?.biometricsEnabled && isBiometricSupported && isBiometricEnrolled && hasBiometricKey && !requires2fa && (
            <TouchableOpacity
              onPress={handleBiometricScan}
              disabled={loading}
              className="w-full flex-row items-center justify-center border border-borderLight rounded-2xl py-4 bg-backgroundLight mb-4"
            >
              <Fingerprint size={Sizes.iconMedium} color={Colors.actionPrimary} strokeWidth={2.5} className="mr-2" />
              <Text className="text-textPrimary font-bold text-xs uppercase tracking-wider">
                Scan Biometrics
              </Text>
            </TouchableOpacity>
          )}

          {/* Form Credentials */}
          <View className="w-full space-y-4">
            {!requires2fa ? (
              <View key="password-field" className="w-full">
                <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold mb-2">
                  Verify Password
                </Text>
                <View className="flex-row items-center border border-border rounded-2xl px-4 bg-backgroundLight">
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password to unlock"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPassword}
                    className="flex-1 py-3 text-textPrimary text-sm font-semibold"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                    {showPassword ? (
                      <EyeOff size={Sizes.iconXSmall} color={Colors.textSecondary} strokeWidth={2.5} />
                    ) : (
                      <Eye size={Sizes.iconXSmall} color={Colors.textSecondary} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                </View>
                {user?.biometricsEnabled && !hasBiometricKey && (
                  <View className="flex-row items-start mt-3 border border-gray-100 rounded-2xl p-3 bg-gray-50 w-full">
                    <ShieldAlert size={Sizes.iconExtraSmall} color={Colors.textSecondary} strokeWidth={2.5} className="mr-2 mt-0.5" />
                    <Text className="text-textSecondary text-[10px] font-semibold flex-1 leading-normal">
                      Biometrics is enabled on your account, but this device is not linked. Unlock with your password to link this device.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View key="2fa-field" className="w-full">
                <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold mb-2">
                  2FA Authenticator Code
                </Text>
                <View className="flex-row items-center border border-border rounded-2xl px-4 bg-backgroundLight">
                  <TextInput
                    value={twoFactorCode}
                    onChangeText={setTwoFactorCode}
                    placeholder="6-digit verification code"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    className="flex-1 py-3 text-textPrimary text-sm font-bold tracking-widest text-center"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={handlePasswordUnlock}
              disabled={loading}
              className="bg-backgroundDark rounded-2xl py-4 items-center justify-center flex-row w-full mt-2"
            >
              <Text className="text-background font-bold text-xs uppercase tracking-wider mr-2">
                {loading ? "Verifying..." : requires2fa ? "Verify & Unlock" : "Unlock App"}
              </Text>
              {!loading && <ArrowRight size={Sizes.iconExtraSmall} color={Colors.background} strokeWidth={2.5} />}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Disconnect Option */}
        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center mt-8 border border-borderLight rounded-2xl px-6 py-3 bg-background"
        >
          <LogOut size={Sizes.iconXSmall} color={Colors.actionPrimary} strokeWidth={2.5} className="mr-2" />
          <Text className="text-actionPrimary font-bold text-xs uppercase tracking-wider">
            Disconnect Session
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    shadowColor: "transparent",
    elevation: 0,
  },
});
