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
import { Colors } from "../../constants/colors";
import { CreditCard, Eye, EyeOff, Activity, ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";

export default function HomeTabScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [showBalance, setShowBalance] = useState(true);

  // Mock ledger data (Cents Rule: ₱425,000.00 is stored as 42500000)
  const balanceCents = 42500000; 
  const monthlyBudgetLimitCents = user?.spendingLimit ?? 5000000; 

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
      if (err.kind === "http" && err.status === 401) {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("disconnected");
      }
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const toggleBalanceVisibility = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    setShowBalance(!showBalance);
  };

  const formatCurrency = (amountInCents: number, currencyCode?: string | null) => {
    const baseAmount = amountInCents / 100;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: currencyCode || "PHP",
    }).format(baseAmount);
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }} className="items-center justify-center">
        <Text className="text-textPrimary font-semibold text-sm">Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View className="items-center mb-8 mt-4">
          <Text className="text-3xl font-black tracking-widest text-textPrimary">
            VESTRO
          </Text>
          <Text className="text-xs uppercase tracking-widest text-gray-400 mt-1">
            Flat Ledger System
          </Text>
        </View>

        {/* API Connection Banner */}
        <View className="mb-6 border border-borderLight rounded-2xl p-4 bg-background flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-xs font-bold text-textPrimary uppercase tracking-wider">
              API Connection
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1} ellipsizeMode="tail">
              {API_BASE_URL}
            </Text>
          </View>
          <TouchableOpacity
            onPress={checkConnection}
            className="flex-row items-center px-3 py-1.5 rounded-full border border-borderLight bg-background"
          >
            <View
              className={`w-2.5 h-2.5 rounded-full mr-2 ${
                connectionStatus === "connected"
                  ? "bg-emerald-500"
                  : connectionStatus === "disconnected"
                  ? "bg-actionPrimary"
                  : "bg-amber-400"
              }`}
            />
            <Text className="text-xs font-bold text-textPrimary capitalize">
              {connectionStatus === "checking" ? "Checking..." : connectionStatus}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View className="border border-borderLight rounded-2xl p-6 bg-backgroundDark mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <CreditCard size={18} stroke={Colors.background} strokeWidth={2.5} />
              <Text className="text-background text-[11px] font-bold uppercase tracking-widest ml-2">
                Available Balance
              </Text>
            </View>
            <TouchableOpacity onPress={toggleBalanceVisibility}>
              {showBalance ? (
                <Eye size={18} stroke={Colors.background} strokeWidth={2} />
              ) : (
                <EyeOff size={18} stroke={Colors.background} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-background text-3xl font-black mb-4">
            {showBalance ? formatCurrency(balanceCents, user.currency) : "••••••••"}
          </Text>

          <Text className="text-gray-400 text-xs uppercase tracking-wider">
            Spending Limit: {formatCurrency(monthlyBudgetLimitCents, user.currency)}
          </Text>
        </View>

        {/* Quick Insights Card */}
        <View className="border border-borderLight rounded-2xl p-6 bg-background mb-6">
          <View className="flex-row items-center mb-4">
            <Activity size={18} stroke={Colors.textPrimary} strokeWidth={2.5} />
            <Text className="text-textPrimary text-xs font-bold uppercase tracking-widest ml-2">
              Dashboard Insights
            </Text>
          </View>
          
          <Text className="text-textPrimary text-sm font-semibold mb-2">
            Welcome back, {user.name || "User"}!
          </Text>
          <Text className="text-gray-500 text-xs leading-relaxed mb-4">
            Your ledger is healthy. You have saved 57% of your target milestones. Go to Analytics to see detailed charts.
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/analytics")}
            className="flex-row items-center justify-between border-t border-gray-100 pt-3"
          >
            <Text className="text-actionPrimary text-xs font-bold uppercase tracking-wider">
              View Analytics
            </Text>
            <ArrowRight size={14} stroke={Colors.actionPrimary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
