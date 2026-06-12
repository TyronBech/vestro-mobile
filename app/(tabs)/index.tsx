import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useAuthStore } from "../../src/store/auth-store";
import { fetchProfile } from "../../src/services/api/endpoints/profile";
import { API_BASE_URL } from "../../src/services/api/config";
import { apiClient } from "../../src/services/api/client";

export default function HomeTabScreen() {
  const { user, loading, error, isAuthenticated, login, logout, clearError } =
    useAuthStore();

  const [email, setEmail] = useState("tyron.bechayda@vestro.app");
  const [password, setPassword] = useState("Password123!");
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");

  // Reanimated shared value for card shake
  const shakeOffset = useSharedValue(0);

  // Animated style for card
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  // Trigger shake animation & haptic feedback on error
  const triggerErrorEffects = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
      (e: any) => console.log("Haptics ignored:", e)
    );
    shakeOffset.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  }, [shakeOffset]);

  // Check backend server connectivity
  const checkConnection = useCallback(async () => {
    setConnectionStatus("checking");
    try {
      if (useAuthStore.getState().isAuthenticated) {
        await fetchProfile();
      } else {
        await apiClient("/auth/login");
      }
      setConnectionStatus("connected");
    } catch (err: any) {
      // If we get a 401 response, it means the API is reachable but we aren't logged in
      if (err.kind === "http" && err.status === 401) {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("disconnected");
      }
    }
  }, []);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Handle errors
  useEffect(() => {
    if (error) {
      triggerErrorEffects();
    }
  }, [error, triggerErrorEffects]);

  const handleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (!email.trim() || !password.trim()) {
      useAuthStore.setState({ error: "Please enter both email and password." });
      return;
    }

    try {
      await login({ email: email.trim(), password: password.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
      // Re-run connection status check to verify authenticated calls work
      checkConnection();
    } catch (err) {
      // Handled by store error state
    }
  };

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await logout();
    checkConnection();
  };

  const fillCredentials = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setEmail("tyron.bechayda@vestro.app");
    setPassword("Password123!");
    clearError();
  };

  // Format money from cents to base (e.g., 5000000 -> 50,000.00)
  const formatCurrency = (amountInCents: number, currencyCode: string) => {
    const baseAmount = amountInCents / 100;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: currencyCode,
    }).format(baseAmount);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#fdfefe]"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View className="items-center mb-8">
          <Text className="text-3xl font-black tracking-widest text-[#373737]">
            VESTRO
          </Text>
          <Text className="text-xs uppercase tracking-widest text-gray-400 mt-1">
            Flat Ledger System
          </Text>
        </View>

        {/* API Connection Banner */}
        <View className="mb-6 border border-gray-100 rounded-2xl p-4 bg-[#fdfefe] flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-xs font-bold text-[#373737] uppercase tracking-wider">
              API Connection
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5 numberOfLines={1} ellipsizeMode='tail'">
              {API_BASE_URL}
            </Text>
          </View>
          <TouchableOpacity
            onPress={checkConnection}
            className="flex-row items-center px-3 py-1.5 rounded-full border border-gray-100 bg-[#fdfefe]"
          >
            <View
              className={`w-2.5 h-2.5 rounded-full mr-2 ${
                connectionStatus === "connected"
                  ? "bg-emerald-500"
                  : connectionStatus === "disconnected"
                  ? "bg-[#ee4e43]"
                  : "bg-amber-400"
              }`}
            />
            <Text className="text-xs font-bold text-[#373737] capitalize">
              {connectionStatus === "checking" ? "Checking..." : connectionStatus}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Card Container */}
        <Animated.View style={animatedCardStyle}>
          {isAuthenticated && user ? (
            /* Logged In View */
            <View className="border border-gray-100 rounded-2xl p-6 bg-[#373737]">
              <Text className="text-[#fdfefe] text-xs font-bold uppercase tracking-widest mb-1">
                Authenticated Profile
              </Text>
              <Text className="text-[#fdfefe] text-2xl font-bold mb-4">
                {user.firstName} {user.lastName}
              </Text>

              <View className="border-t border-gray-600/40 pt-4 space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-gray-400 text-xs uppercase tracking-wider">
                    Email Address
                  </Text>
                  <Text className="text-[#fdfefe] text-xs font-semibold">
                    {user.email}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-gray-400 text-xs uppercase tracking-wider">
                    Base Currency
                  </Text>
                  <Text className="text-[#fdfefe] text-xs font-semibold">
                    {user.currency}
                  </Text>
                </View>

                {user.spendingLimit !== undefined && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-400 text-xs uppercase tracking-wider">
                      Spending Limit
                    </Text>
                    <Text className="text-[#fdfefe] text-xs font-semibold">
                      {formatCurrency(user.spendingLimit, user.currency)}
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-between">
                  <Text className="text-gray-400 text-xs uppercase tracking-wider">
                    Security Layer
                  </Text>
                  <Text className="text-[#fdfefe] text-xs font-semibold">
                    {user.twoFactorEnabled ? "2FA + " : ""}JWT Authorized
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleLogout}
                className="mt-6 bg-[#ee4e43] rounded-2xl py-3 items-center"
              >
                <Text className="text-[#fdfefe] font-bold text-xs uppercase tracking-wider">
                  Disconnect Session
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Login Form View */
            <View className="border border-gray-100 rounded-2xl p-6 bg-[#fdfefe]">
              <Text className="text-[#373737] text-lg font-extrabold mb-4">
                Backend Authorization
              </Text>

              {/* Error Output */}
              {error && (
                <View className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
                  <Text className="text-[#ee4e43] text-xs font-bold uppercase tracking-wider">
                    Request Failure
                  </Text>
                  <Text className="text-red-700 text-xs mt-1 leading-relaxed">
                    {error}
                  </Text>
                </View>
              )}

              <View className="space-y-4">
                <View>
                  <Text className="text-[#373737] text-xs font-bold uppercase tracking-wider mb-2">
                    Email Address
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (error) clearError();
                    }}
                    placeholder="name@domain.com"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="border border-gray-100 rounded-2xl px-4 py-3 text-[#373737] text-sm bg-gray-50/50"
                  />
                </View>

                <View className="mt-4">
                  <Text className="text-[#373737] text-xs font-bold uppercase tracking-wider mb-2">
                    Security Key (Password)
                  </Text>
                  <TextInput
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (error) clearError();
                    }}
                    placeholder="Enter security key"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry
                    autoCapitalize="none"
                    className="border border-gray-100 rounded-2xl px-4 py-3 text-[#373737] text-sm bg-gray-50/50"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className="mt-6 bg-[#373737] rounded-2xl py-3.5 items-center flex-row justify-center"
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fdfefe" />
                ) : (
                  <Text className="text-[#fdfefe] font-bold text-xs uppercase tracking-widest">
                    Authorize Device
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={fillCredentials}
                className="mt-3 py-2 items-center"
              >
                <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider">
                  Fill Seed Account
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
