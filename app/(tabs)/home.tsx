import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import VisaIcon from '../../assets/svgs/visa.svg';

import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../src/store/auth-store";
import { fetchProfile } from "../../src/services/api/endpoints/profile";
import { apiClient } from "../../src/services/api/client";
import { Colors } from "../../constants/colors";
import { CreditCard, Eye, EyeOff, Bell, Activity, ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react-native";
import { useRouter } from "expo-router";
import { fetchMacroAssets, MacroAsset } from "../../src/services/api/endpoints/macro-assets";
import { MacroAssetStack } from "../../src/components/MacroAssetStack";
import { fetchCashFlows, CashFlow } from "../../src/services/api/endpoints/cash-flows";
import { useUIStore } from "../../src/store/ui-store";



export default function HomeTabScreen() {
  const { user, refreshProfile, isSessionLocked } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [showBalance, setShowBalance] = useState(true);
  const [macroAssets, setMacroAssets] = useState<MacroAsset[]>([]);
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const networkUpdateTrigger = useUIStore((state) => state.networkUpdateTrigger);
  const budgetUpdateTrigger = useUIStore((state) => state.budgetUpdateTrigger);

  // Calculate net worth dynamically by summing up live macro asset balances
  const balanceCents = macroAssets.reduce((sum, asset) => sum + asset.balance, 0); 
  const monthlyBudgetLimitCents = user?.spendingLimit ?? 5000000; 

  // Check backend server connectivity and fetch initial data
  const checkConnection = useCallback(async () => {
    setConnectionStatus("checking");
    try {
      if (useAuthStore.getState().isAuthenticated) {
        await refreshProfile();
        const assetsRes = await fetchMacroAssets();
        if (assetsRes.ok) {
          setMacroAssets(assetsRes.value);
        }
        const flowsRes = await fetchCashFlows();
        if (flowsRes.ok) {
          setCashFlows(flowsRes.value.slice(0, 5));
        }
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
  }, [refreshProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    try {
      if (useAuthStore.getState().isAuthenticated) {
        await refreshProfile();
        const assetsRes = await fetchMacroAssets();
        if (assetsRes.ok) {
          setMacroAssets(assetsRes.value);
        }
        const flowsRes = await fetchCashFlows();
        if (flowsRes.ok) {
          setCashFlows(flowsRes.value.slice(0, 5));
        }
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } catch (err) {
      console.error("Home screen refresh failed:", err);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {}
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile]);

  useEffect(() => {
    if (!isSessionLocked) {
      checkConnection();
    }
  }, [checkConnection, isSessionLocked, networkUpdateTrigger, budgetUpdateTrigger]);

  const displayAssets = macroAssets;
  const displayCashFlows = cashFlows;

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
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 64 }}
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
        {/* Header Title */}
        <View className="flex-row items-center justify-between mb-5">
          <View>
            <Text className="text-3xl font-black tracking-widest text-textPrimary">
              VESTRO
            </Text>
            <Text className="text-xs uppercase tracking-widest text-gray-400 mt-1">
              Flat Ledger System
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            className="w-10 h-10 rounded-full border border-borderLight bg-background items-center justify-center"
          >
            <Bell size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Net Worth Card (Debit Card Design) */}
        <View className="border border-borderLight rounded-2xl mb-4 relative overflow-hidden">
          {/* Flat Minimalist Gradient Background */}
          <Svg height="100%" width="100%" style={{ position: 'absolute' }}>
            <Defs>
              <LinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#575757" stopOpacity="1" />
                <Stop offset="1" stopColor="#141414" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#cardGrad)" />
          </Svg>

          <View className="p-6">
            {/* Top Row: Net Worth Label & Eye Icon */}
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                <CreditCard size={18} stroke={Colors.background} strokeWidth={2.5} />
                <Text className="text-background text-[11px] font-bold uppercase tracking-widest ml-2">
                  Net Worth
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

          {/* Balance */}
          <Text className="text-background text-4xl font-black mb-8 tracking-widest">
            {showBalance ? formatCurrency(balanceCents, user.currency) : "••••••••"}
          </Text>

            {/* Bottom Row: User Name & Visa Logo */}
            <View className="flex-row justify-between items-end mt-2">
              <View>
                <Text className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">
                  Cardholder
                </Text>
                <Text className="text-background text-sm font-bold uppercase tracking-widest">
                  {user.name || "User"}
                </Text>
              </View>
              <VisaIcon width={50} height={16} color={Colors.background} />
            </View>
          </View>
        </View>

        {/* Macro Assets Stack or Empty State */}
        {macroAssets.length === 0 ? (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/network')}
            className="border-2 border-dashed border-border rounded-2xl p-6 bg-backgroundLight/50 items-center justify-center mb-6"
            style={{ height: 200 }}
          >
            <View className="w-12 h-12 rounded-full bg-backgroundDark/5 items-center justify-center mb-3">
              <Plus size={24} stroke={Colors.textPrimary} strokeWidth={3} />
            </View>
            <Text className="text-sm font-black text-textPrimary uppercase tracking-wider text-center">
              Create Bank Bucket (Macro Asset)
            </Text>
            <Text className="text-xs font-bold text-textSecondary text-center leading-relaxed mt-1 max-w-[280px]">
              Add bank buckets like BPI, GCash, or Maya to track your funds and establish your routing network.
            </Text>
          </TouchableOpacity>
        ) : (
          <MacroAssetStack assets={displayAssets} showBalance={showBalance} />
        )}

        {/* Latest Activity Card */}
        <View className="border border-borderLight rounded-2xl p-6 bg-background mb-6">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <Activity size={18} stroke={Colors.textPrimary} strokeWidth={2.5} />
              <Text className="text-textPrimary text-xs font-bold uppercase tracking-widest ml-2">
                Latest Activity
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/analytics')}>
              <Text className="text-actionPrimary text-[10px] font-bold uppercase tracking-widest">
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {/* List of cash flows */}
          <View>
            {displayCashFlows.length === 0 ? (
              <View className="py-4 items-center justify-center">
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  No activity logged yet
                </Text>
              </View>
            ) : (
              displayCashFlows.map((flow, index) => {
                const isInflow = flow.type === 'INFLOW';
                return (
                  <View key={flow.id} className={`flex-row items-center justify-between ${index > 0 ? 'border-t border-gray-100 pt-4 mt-4' : ''}`}>
                    <View className="flex-row items-center flex-1 pr-4">
                      <View className={`w-10 h-10 rounded-xl items-center justify-center ${isInflow ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {isInflow ? (
                          <ArrowDownLeft size={18} stroke="#10b981" strokeWidth={2.5} />
                        ) : (
                          <ArrowUpRight size={18} stroke="#ee4e43" strokeWidth={2.5} />
                        )}
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-textPrimary font-semibold text-sm" numberOfLines={1}>
                          {flow.notes || (isInflow ? 'Inflow' : 'Outflow')}
                        </Text>
                        <Text className="text-gray-400 text-[10px] uppercase tracking-wider mt-0.5" numberOfLines={1}>
                          {flow.coreNetwork?.name || 'Vestro Network'}
                        </Text>
                      </View>
                    </View>

                    <Text className={`font-bold tracking-wider text-sm ${isInflow ? 'text-emerald-600' : 'text-actionPrimary'}`}>
                      {isInflow ? '+' : '-'}{formatCurrency(flow.amount)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
