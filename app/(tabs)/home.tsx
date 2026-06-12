import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../src/store/auth-store";
import { fetchProfile } from "../../src/services/api/endpoints/profile";
import { API_BASE_URL } from "../../src/services/api/config";
import { apiClient } from "../../src/services/api/client";

export default function HomeTabScreen() {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");

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

  const handleLogout = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    await logout();
  };

  // Format money from cents to base (e.g., 5000000 -> 50,000.00)
  const formatCurrency = (amountInCents: number, currencyCode: string) => {
    const baseAmount = amountInCents / 100;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: currencyCode,
    }).format(baseAmount);
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fdfefe", paddingTop: insets.top, paddingBottom: insets.bottom }} className="items-center justify-center">
        <Text className="text-[#373737] font-semibold text-sm">Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fdfefe", paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View className="items-center mb-8 mt-4">
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
            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1} ellipsizeMode="tail">
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

        {/* Authenticated Profile Card */}
        <View className="border border-gray-100 rounded-2xl p-6 bg-[#373737]">
          <Text className="text-[#fdfefe] text-xs font-bold uppercase tracking-widest mb-1">
            Authenticated Profile
          </Text>
          <Text className="text-[#fdfefe] text-2xl font-bold mb-4">
            {user.firstName} {user.lastName}
          </Text>

          <View className="border-t border-gray-600/40 pt-4 space-y-3">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-400 text-xs uppercase tracking-wider">
                Email Address
              </Text>
              <Text className="text-[#fdfefe] text-xs font-semibold">
                {user.email}
              </Text>
            </View>

            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-400 text-xs uppercase tracking-wider">
                Base Currency
              </Text>
              <Text className="text-[#fdfefe] text-xs font-semibold">
                {user.currency}
              </Text>
            </View>

            {user.spendingLimit !== undefined && (
              <View className="flex-row justify-between mb-2">
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
            className="mt-6 bg-[#ee4e43] rounded-2xl py-3.5 items-center"
          >
            <Text className="text-[#fdfefe] font-bold text-xs uppercase tracking-wider">
              Disconnect Session
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
