import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../src/store/auth-store";
import { Colors } from "../../constants/colors";
import { User, Mail, DollarSign, ShieldCheck } from "lucide-react-native";

export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    await logout();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    try {
      await refreshProfile();
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } catch (err) {
      console.error("Profile screen refresh failed:", err);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {}
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.actionPrimary}
            colors={[Colors.actionPrimary]}
          />
        }
      >
        {/* Header */}
        <View className="items-center mb-8 mt-4">
          <Text className="text-3xl font-black tracking-widest text-textPrimary">
            PROFILE
          </Text>
          <Text className="text-xs uppercase tracking-widest text-gray-400 mt-1">
            User Account
          </Text>
        </View>

        {/* User Card */}
        <View className="border border-borderLight rounded-2xl p-6 bg-backgroundDark mb-6">
          <View className="bg-actionPrimary/20 rounded-2xl p-4 w-16 h-16 items-center justify-center mb-4">
            <User size={32} stroke={Colors.actionPrimary} strokeWidth={2.5} />
          </View>
          <Text className="text-background text-xs font-bold uppercase tracking-widest mb-1">
            Authenticated Profile
          </Text>
          <Text className="text-background text-2xl font-bold">
            {user.name || "User"}
          </Text>
        </View>

        {/* Profile Info Fields */}
        <View className="border border-borderLight rounded-2xl p-5 bg-background mb-6 space-y-4">
          <View className="flex-row items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <View className="flex-row items-center">
              <Mail size={16} stroke={Colors.textSecondary} strokeWidth={2.5} />
              <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold ml-2">
                Email Address
              </Text>
            </View>
            <Text className="text-textPrimary text-xs font-semibold">
              {user.email}
            </Text>
          </View>

          <View className="flex-row items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <View className="flex-row items-center">
              <DollarSign size={16} stroke={Colors.textSecondary} strokeWidth={2.5} />
              <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold ml-2">
                Base Currency
              </Text>
            </View>
            <Text className="text-textPrimary text-xs font-semibold">
              {user.currency || "PHP"}
            </Text>
          </View>

          {user.spendingLimit !== undefined && user.spendingLimit !== null && (
            <View className="flex-row items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <View className="flex-row items-center">
                <DollarSign size={16} stroke={Colors.textSecondary} strokeWidth={2.5} />
                <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold ml-2">
                  Spending Limit
                </Text>
              </View>
              <Text className="text-textPrimary text-xs font-semibold">
                {formatCurrency(user.spendingLimit, user.currency)}
              </Text>
            </View>
          )}

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <ShieldCheck size={16} stroke={Colors.textSecondary} strokeWidth={2.5} />
              <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold ml-2">
                Security Layer
              </Text>
            </View>
            <Text className="text-textPrimary text-xs font-semibold">
              {user.is2FAEnabled ? "2FA + " : ""}JWT Authorized
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-actionPrimary rounded-2xl py-4 items-center"
        >
          <Text className="text-background font-bold text-xs uppercase tracking-wider">
            Disconnect Session
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
