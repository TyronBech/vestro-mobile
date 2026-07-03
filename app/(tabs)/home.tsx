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
import MastercardIcon from '../../assets/svgs/mastercard.svg';

import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../src/store/auth-store";
import { fetchProfile } from "../../src/services/api/endpoints/profile";
import { apiClient } from "../../src/services/api/client";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { CreditCard as CardIcon, Eye, EyeOff, Bell, Activity, ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react-native";
import { useRouter } from "expo-router";
import { fetchMacroAssets, MacroAsset } from "../../src/services/api/endpoints/macro-assets";
import { MacroAssetStack } from "../../src/components/MacroAssetStack";
import { fetchCashFlows, CashFlow } from "../../src/services/api/endpoints/cash-flows";
import { useUIStore } from "../../src/store/ui-store";
import { fetchCreditCards, CreditCard } from "../../src/services/api/endpoints/credit-cards";
import { CreditCardStack } from "../../src/components/CreditCardStack";
import { fetchNotifications } from "../../src/services/api/endpoints/notification";
import FlatModal from "../../src/components/flat-modal";



export default function HomeTabScreen() {
  const { user, refreshProfile, isSessionLocked, isAuthenticated } = useAuthStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "disconnected"
  >("checking");
  const [showBalance, setShowBalance] = useState(true);
  const [macroAssets, setMacroAssets] = useState<MacroAsset[]>([]);
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [netWorthCardBrand, setNetWorthCardBrand] = useState<'VISA' | 'MASTERCARD'>('VISA');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const networkUpdateTrigger = useUIStore((state) => state.networkUpdateTrigger);
  const budgetUpdateTrigger = useUIStore((state) => state.budgetUpdateTrigger);
  const openNotificationModal = useUIStore((state) => state.openNotificationModal);
  const isNotificationModalOpen = useUIStore((state) => state.isNotificationModalOpen);

  const loadUnreadCount = useCallback(async () => {
    if (!useAuthStore.getState().isAuthenticated) return;
    try {
      const res = await fetchNotifications();
      if (res.ok) {
        const count = res.value.filter((n) => !n.isRead).length;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error("Failed to load notification count:", err);
    }
  }, []);

  useEffect(() => {
    if (!isNotificationModalOpen && isAuthenticated) {
      loadUnreadCount();
    }
  }, [isNotificationModalOpen, isAuthenticated, loadUnreadCount]);

  // Calculate net worth dynamically by summing up live macro asset balances
  const balanceCents = macroAssets.reduce((sum, asset) => sum + asset.balance, 0); 
  const monthlyBudgetLimitCents = user?.spendingLimit ?? 5000000; 

  // Check backend server connectivity and fetch initial data
  const checkConnection = useCallback(async () => {
    setConnectionStatus("checking");
    try {
      if (useAuthStore.getState().isAuthenticated) {
        await refreshProfile();
        await loadUnreadCount();
        const assetsRes = await fetchMacroAssets();
        if (assetsRes.ok) {
          setMacroAssets(assetsRes.value);
        }
        const cardsRes = await fetchCreditCards();
        if (cardsRes.ok) {
          setCreditCards(cardsRes.value);
        }
        const flowsRes = await fetchCashFlows();
        if (flowsRes.ok) {
          setCashFlows(flowsRes.value);
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
  }, [refreshProfile, loadUnreadCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    try {
      if (useAuthStore.getState().isAuthenticated) {
        await refreshProfile();
        await loadUnreadCount();
        const assetsRes = await fetchMacroAssets();
        if (assetsRes.ok) {
          setMacroAssets(assetsRes.value);
        }
        const cardsRes = await fetchCreditCards();
        if (cardsRes.ok) {
          setCreditCards(cardsRes.value);
        }
        const flowsRes = await fetchCashFlows();
        if (flowsRes.ok) {
          setCashFlows(flowsRes.value);
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
  }, [refreshProfile, loadUnreadCount]);

  useEffect(() => {
    if (!isSessionLocked) {
      checkConnection();
    }
  }, [checkConnection, isSessionLocked, networkUpdateTrigger, budgetUpdateTrigger]);

  const displayAssets = macroAssets;
  const displayCashFlows = cashFlows.slice(0, 5);

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
            onPress={async () => {
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (e) {}
              openNotificationModal();
            }}
            className="w-10 h-10 rounded-full border border-borderLight bg-background items-center justify-center relative"
          >
            <Bell size={20} color={Colors.textPrimary} />
            {unreadCount > 0 && (
              <View 
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full items-center justify-center px-1 border border-background"
                style={{ backgroundColor: Colors.actionPrimary }}
              >
                <Text className="text-[10px] font-black text-white text-center">
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Net Worth Card (Debit Card Design) */}
        <View className="border border-borderLight rounded-2xl mb-4 relative overflow-hidden">
          {/* Flat Minimalist Gradient Background */}
          <Svg height="100%" width="100%" style={{ position: 'absolute' }}>
            <Defs>
              <LinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={Colors.darkStopStart} stopOpacity="1" />
                <Stop offset="1" stopColor={Colors.darkStopEndHome} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#cardGrad)" />
          </Svg>

          <View className="p-6">
            {/* Top Row: Net Worth Label & Eye Icon */}
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center">
                <CardIcon size={18} stroke={Colors.background} strokeWidth={2.5} />
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

            {/* Bottom Row: User Name & Visa/Mastercard Logo (Tap to Toggle) */}
            <View className="flex-row justify-between items-end mt-2">
              <View>
                <Text className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">
                  Cardholder
                </Text>
                <Text className="text-background text-sm font-bold uppercase tracking-widest">
                  {user.name || "User"}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={async () => {
                  try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  } catch (e) {}
                  setNetWorthCardBrand(prev => prev === 'VISA' ? 'MASTERCARD' : 'VISA');
                }}
              >
                {netWorthCardBrand === 'VISA' ? (
                  <VisaIcon width={50} height={16} color={Colors.background} />
                ) : (
                  <MastercardIcon width={40} height={25} />
                )}
              </TouchableOpacity>
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

        {/* Credit Card Stack Section */}
        {creditCards.length === 0 ? (
          <TouchableOpacity
            onPress={() => useUIStore.getState().openCreditCardModal()}
            className="border-2 border-dashed border-border rounded-2xl p-6 bg-backgroundLight/50 items-center justify-center mb-6"
            style={{ height: 210 }}
          >
            <View className="w-12 h-12 rounded-full bg-backgroundDark/5 items-center justify-center mb-3">
              <Plus size={24} stroke={Colors.textPrimary} strokeWidth={3} />
            </View>
            <Text className="text-sm font-black text-textPrimary uppercase tracking-wider text-center">
              Add Credit Card
            </Text>
            <Text className="text-xs font-bold text-textSecondary text-center leading-relaxed mt-1 max-w-[280px]">
              Set up your credit cards to manage unbilled limits, cutoff alerts, and automated cash buffers.
            </Text>
          </TouchableOpacity>
        ) : (
          <CreditCardStack cards={creditCards} showBalance={showBalance} />
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
            <TouchableOpacity onPress={() => setIsActivityModalOpen(true)}>
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
                          <ArrowDownLeft size={Sizes.iconSmall} stroke={Colors.successAlt} strokeWidth={Sizes.strokeMedium} />
                        ) : (
                          <ArrowUpRight size={Sizes.iconSmall} stroke={Colors.actionPrimary} strokeWidth={Sizes.strokeMedium} />
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

      {/* Latest Activity Modal (Last 90 Days) */}
      <FlatModal
        visible={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="Latest Activity (90 Days)"
        headerIcon={<Activity size={20} color={Colors.actionPrimary} strokeWidth={2.5} />}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 16 }}>
          {(() => {
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            const filteredFlows = cashFlows.filter(flow => {
              const flowDate = new Date(flow.createdAt);
              return flowDate >= ninetyDaysAgo;
            });

            if (filteredFlows.length === 0) {
              return (
                <View className="py-8 items-center justify-center">
                  <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
                    No activity logged in the last 90 days
                  </Text>
                </View>
              );
            }

            return filteredFlows.map((flow, index) => {
              const isInflow = flow.type === 'INFLOW';
              const flowDate = new Date(flow.createdAt);
              const formattedDate = flowDate.toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <View key={flow.id} className={`flex-row items-center justify-between ${index > 0 ? 'border-t border-gray-100 pt-4 mt-4' : ''}`}>
                  <View className="flex-row items-center flex-1 pr-4">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${isInflow ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {isInflow ? (
                        <ArrowDownLeft size={Sizes.iconSmall} stroke={Colors.successAlt} strokeWidth={Sizes.strokeMedium} />
                      ) : (
                        <ArrowUpRight size={Sizes.iconSmall} stroke={Colors.actionPrimary} strokeWidth={Sizes.strokeMedium} />
                      )}
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-textPrimary font-semibold text-sm" numberOfLines={1}>
                        {flow.notes || (isInflow ? 'Inflow' : 'Outflow')}
                      </Text>
                      <View className="flex-row items-center mt-0.5">
                        <Text className="text-gray-400 text-[9px] uppercase tracking-wider" numberOfLines={1}>
                          {flow.coreNetwork?.name || 'Vestro Network'}
                        </Text>
                        <Text className="text-gray-300 text-[9px] mx-1">•</Text>
                        <Text className="text-gray-400 text-[9px] uppercase tracking-wider" numberOfLines={1}>
                          {formattedDate}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text className={`font-bold tracking-wider text-sm ${isInflow ? 'text-emerald-600' : 'text-actionPrimary'}`}>
                    {isInflow ? '+' : '-'}{formatCurrency(flow.amount)}
                  </Text>
                </View>
              );
            });
          })()}
        </ScrollView>
      </FlatModal>
    </View>
  );
}
