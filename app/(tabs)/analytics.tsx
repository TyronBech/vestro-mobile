import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LineChart, PieChart, BarChart } from "react-native-gifted-charts";
import {
  Shield,
  Home,
  Sparkles,
  TrendingUp,
  HeartHandshake,
  CreditCard,
  Target,
  Landmark,
  Zap,
  Coins,
  Save,
  RefreshCw,
  LucideIcon
} from "lucide-react-native";

import { Colors } from "../../constants/colors";
import { Strings } from "../../constants/string";
import { fetchAnalyticsData, updateBudgetSalary } from "../../src/services/api/endpoints/analytics";
import { AnalyticsData } from "../../src/types";
import { useUIStore } from "../../src/store/ui-store";
import { useToastStore } from "../../src/store/toast-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
import { useAuthStore } from "../../src/store/auth-store";
const containerPadding = 24;
const cardPadding = 20;
const chartWidth = SCREEN_WIDTH - containerPadding * 2 - cardPadding * 2;

// Icon mapping based on CoreNetworkType
const iconMap: Record<string, LucideIcon> = {
  EMERGENCY_FUND: Shield,
  RENT: Home,
  WANTS_SANDBOX: Sparkles,
  INVESTMENTS: TrendingUp,
  INSURANCE: HeartHandshake,
  CREDIT_BUFFER: CreditCard,
  PERSONAL_GOAL: Target,
  SAVINGS_VAULT: Landmark,
  CREDIT_CARD: CreditCard,
  UTILITIES: Zap,
  PAYCHECK: Coins,
};

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [savingSalary, setSavingSalary] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [inputSalary, setInputSalary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const budgetUpdateTrigger = useUIStore((state) => state.budgetUpdateTrigger);
  const toastStore = useToastStore();
  const { isSessionLocked } = useAuthStore();

  const loadData = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    setError(null);
    const result = await fetchAnalyticsData();
    if (result.ok) {
      setData(result.value);
      if (result.value.budgetConfig) {
        setInputSalary((result.value.budgetConfig.netSalary / 100).toString());
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    try {
      await loadData(false);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } catch (err) {
      console.error("Analytics screen refresh failed:", err);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {}
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  useEffect(() => {
    if (!isSessionLocked) {
      loadData();
    }
  }, [loadData, budgetUpdateTrigger, isSessionLocked]);

  const handleSaveSalary = async () => {
    const salaryPesos = parseFloat(inputSalary);
    if (isNaN(salaryPesos) || salaryPesos <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show(Strings.validationSalary, "error");
      return;
    }

    setSavingSalary(true);
    const salaryCents = Math.round(salaryPesos * 100);
    
    // Default to a 50/30/10/10 split if no config exists yet
    const needsRate = data?.budgetConfig?.needsRate ?? 0.5;
    const wantsRate = data?.budgetConfig?.wantsRate ?? 0.3;
    const savingsRate = data?.budgetConfig?.savingsRate ?? 0.1;
    const investmentsRate = data?.budgetConfig?.investmentsRate ?? 0.1;

    const result = await updateBudgetSalary(
      salaryCents,
      needsRate,
      wantsRate,
      savingsRate,
      investmentsRate
    );

    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toastStore.show("Salary updated successfully!", "success");
      const refreshed = await fetchAnalyticsData();
      if (refreshed.ok) {
        setData(refreshed.value);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Failed to update salary: " + result.error, "error");
    }
    setSavingSalary(false);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatShortCurrency = (label: string) => {
    const value = parseFloat(label);
    if (isNaN(value)) return label;
    if (value >= 1000) {
      return `₱${(value / 1000).toFixed(0)}k`;
    }
    return `₱${value}`;
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.actionPrimary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text className="text-sm font-bold text-error mb-4">Error loading analytics data: {error}</Text>
        <TouchableOpacity 
          onPress={() => loadData()}
          className="flex-row items-center bg-backgroundDark rounded-2xl px-6 py-3"
        >
          <RefreshCw size={16} stroke={Colors.background} style={{ marginRight: 8 }} />
          <Text className="text-background font-black uppercase tracking-widest text-xs">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Live calculator values
  const currentCalculatedSalary = parseFloat(inputSalary) || 0;
  const salaryCents = currentCalculatedSalary * 100;
  const needsRate = data.budgetConfig?.needsRate ?? 0.5;
  const wantsRate = data.budgetConfig?.wantsRate ?? 0.3;
  const savingsRate = data.budgetConfig?.savingsRate ?? 0.1;
  const investmentsRate = data.budgetConfig?.investmentsRate ?? 0.1;

  const calculatedNeeds = salaryCents * needsRate;
  const calculatedWants = salaryCents * wantsRate;
  const calculatedSavings = salaryCents * savingsRate;
  const calculatedInvestments = salaryCents * investmentsRate;

  // Format Net Worth data for LineChart (Blue Theme)
  const netWorthDataPoints = data.netWorthTrend.map((p) => ({
    value: Math.round(p.balance / 100),
    label: p.month.toUpperCase(),
  }));

  // Format Cashflow Inflows (Green) vs. Outflows (Red)
  const inflowDataPoints = data.cashFlowTrend.map((p) => ({
    value: Math.round(p.inflow / 100),
    label: p.month.toUpperCase(),
  }));

  const outflowDataPoints = data.cashFlowTrend.map((p) => ({
    value: Math.round(p.outflow / 100),
  }));

  // Format Monthly Sweep data for BarChart (Vestro Red/Accent Theme)
  const sweepDataPoints = data.sweepTrend?.map((p) => ({
    value: Math.round(p.amount / 100),
    label: p.month.toUpperCase(),
  })) ?? [];

  // Format Core Network Balances for PieChart
  const networkBalances = data.coreNetworkBalances.filter((n) => n.balance > 0);
  const totalBalance = networkBalances.reduce((sum, n) => sum + n.balance, 0);

  const pieData = networkBalances.map((node) => ({
    value: node.balance / 100,
    color: node.colorCode,
  }));

  // Dynamic spacing for responsive line charts
  const lineSpacing = (chartWidth - 55) / (data.netWorthTrend.length - 1);

  // Dynamic Date Range string
  const dateRangeStr = data.netWorthTrend.length > 0 
    ? `${data.netWorthTrend[0].month} - ${data.netWorthTrend[data.netWorthTrend.length - 1].month} ${new Date().getFullYear()}`
    : "";

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
        {/* Header Title */}
        <View className="items-center mb-6 mt-2">
          <Text className="text-3xl font-black tracking-widest text-textPrimary">
            ANALYTICS
          </Text>
          <Text className="text-xs uppercase tracking-widest text-gray-400 mt-1">
            Budget & Performance
          </Text>
        </View>

        {/* 1. Interactive Budget Config Calculator */}
        <View className="border border-borderLight rounded-2xl p-5 bg-background mb-6">
          <Text className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">
            Budget Simulator & Config
          </Text>

          <View className="flex-row items-center border border-border rounded-xl px-4 py-2 bg-backgroundLight mb-4">
            <Text className="text-sm font-bold text-textPrimary mr-2">₱</Text>
            <TextInput
              value={inputSalary}
              onChangeText={setInputSalary}
              placeholder="Enter monthly net salary"
              keyboardType="numeric"
              placeholderTextColor={Colors.textMuted}
              className="flex-1 text-sm font-bold text-textPrimary p-0"
            />
            {savingSalary ? (
              <ActivityIndicator size="small" color={Colors.actionPrimary} />
            ) : (
              <TouchableOpacity onPress={handleSaveSalary} style={{ padding: 4 }}>
                <Save size={18} stroke={Colors.actionPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
          </View>

          {/* Computed Breakdown Table */}
          <View className="space-y-3">
            <View className="flex-row justify-between items-center py-1.5 border-b border-borderLight">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-textPrimary mr-2" />
                <Text className="text-xs font-bold text-textSecondary">Needs ({Math.round(needsRate * 100)}%)</Text>
              </View>
              <Text className="text-xs font-black text-textPrimary">{formatCurrency(calculatedNeeds)}</Text>
            </View>

            <View className="flex-row justify-between items-center py-1.5 border-b border-borderLight">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-actionPrimary mr-2" />
                <Text className="text-xs font-bold text-textSecondary">Wants ({Math.round(wantsRate * 100)}%)</Text>
              </View>
              <Text className="text-xs font-black text-textPrimary">{formatCurrency(calculatedWants)}</Text>
            </View>

            <View className="flex-row justify-between items-center py-1.5 border-b border-borderLight">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-success mr-2" />
                <Text className="text-xs font-bold text-textSecondary">Savings ({Math.round(savingsRate * 100)}%)</Text>
              </View>
              <Text className="text-xs font-black text-textPrimary">{formatCurrency(calculatedSavings)}</Text>
            </View>

            <View className="flex-row justify-between items-center py-1.5">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-2" />
                <Text className="text-xs font-bold text-textSecondary">Investments ({Math.round(investmentsRate * 100)}%)</Text>
              </View>
              <Text className="text-xs font-black text-textPrimary">{formatCurrency(calculatedInvestments)}</Text>
            </View>
          </View>
        </View>

        {/* 2. Net Worth Growth Line Graph (Blue Premium Theme) */}
        <View className="border border-borderLight rounded-2xl p-5 bg-background mb-6">
          <View className="items-center mb-4">
            <Text className="text-sm font-black text-textPrimary">
              Net Worth Growth
            </Text>
            <Text className="text-[10px] font-bold text-gray-400 mt-0.5">
              {dateRangeStr}
            </Text>
          </View>

          <View className="items-center" style={{ marginLeft: -15 }}>
            <LineChart
              data={netWorthDataPoints}
              height={140}
              width={chartWidth}
              spacing={lineSpacing}
              initialSpacing={10}
              endSpacing={10}
              curved
              curvature={0.06}
              areaChart
              color={Colors.analyticsLine}
              thickness={2.5}
              startFillColor={Colors.analyticsLine}
              endFillColor={Colors.analyticsLine}
              startOpacity={0.25}
              endOpacity={0.01}
              rulesType="dashed"
              rulesColor={Colors.borderLight}
              noOfSections={3}
              yAxisColor="transparent"
              xAxisColor="transparent"
              yAxisLabelWidth={38}
              yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 8, fontWeight: "bold" }}
              xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: 8, fontWeight: "black" }}
              dataPointsColor={Colors.analyticsLine}
              dataPointsRadius={4}
              formatYLabel={formatShortCurrency}
              // Interactive Pointer/Tooltip Configuration
              pointerConfig={{
                pointerStripUptoDataPoint: true,
                pointerStripColor: Colors.analyticsLine,
                pointerStripWidth: 1.5,
                strokeDashArray: [2, 5],
                pointerColor: Colors.analyticsLine,
                radius: 5,
                pointerLabelWidth: 85,
                pointerLabelHeight: 35,
                pointerLabelComponent: (items: any) => {
                  if (!items || items.length === 0) return null;
                  return (
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: Colors.white,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: Colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: -25,
                        marginLeft: -10,
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: "900", color: Colors.textPrimary }}>
                        {formatCurrency(items[0].value * 100)}
                      </Text>
                    </View>
                  );
                },
              }}
            />
          </View>
        </View>

        {/* 3. Double Line Graph of Cash Flow (Green & Red Overlapping Theme) */}
        <View className="border border-borderLight rounded-2xl p-5 bg-background mb-6">
          <View className="items-center mb-4">
            <Text className="text-sm font-black text-textPrimary">
              Cashflow Trend
            </Text>
            <Text className="text-[10px] font-bold text-gray-400 mt-0.5">
              {dateRangeStr}
            </Text>
          </View>

          <View className="items-center" style={{ marginLeft: -15 }}>
            <LineChart
              data={inflowDataPoints}
              data2={outflowDataPoints}
              height={140}
              width={chartWidth}
              spacing={lineSpacing}
              initialSpacing={10}
              endSpacing={10}
              curved
              curvature={0.06}
              areaChart
              color1={Colors.success}
              color2={Colors.actionPrimary}
              thickness={2.5}
              // Overlapping opacity fills
              startFillColor1={Colors.success}
              endFillColor1={Colors.success}
              startOpacity1={0.25}
              endOpacity1={0.01}
              startFillColor2={Colors.actionPrimary}
              endFillColor2={Colors.actionPrimary}
              startOpacity2={0.25}
              endOpacity2={0.01}
              rulesType="dashed"
              rulesColor={Colors.borderLight}
              noOfSections={3}
              yAxisColor="transparent"
              xAxisColor="transparent"
              yAxisLabelWidth={38}
              yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 8, fontWeight: "bold" }}
              xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: 8, fontWeight: "black" }}
              dataPointsColor1={Colors.success}
              dataPointsColor2={Colors.actionPrimary}
              dataPointsRadius={3}
              formatYLabel={formatShortCurrency}
            />
          </View>

          {/* Centered Legend Indicators at the Bottom */}
          <View className="flex-row justify-center space-x-6 mt-4 border-t border-borderLight pt-4">
            <View className="flex-row items-center">
              <View className="w-2.5 h-2.5 bg-success rounded-full mr-2" />
              <Text className="text-[10px] font-black uppercase tracking-wider text-textSecondary">Inflow</Text>
            </View>
            <View className="flex-row items-center" style={{ marginLeft: 24 }}>
              <View className="w-2.5 h-2.5 bg-actionPrimary rounded-full mr-2" />
              <Text className="text-[10px] font-black uppercase tracking-wider text-textSecondary">Outflow</Text>
            </View>
          </View>
        </View>

        {/* 3.5. Monthly Sweep Bar Graph (Accent / Vestro Red Theme) */}
        <View className="border border-borderLight rounded-2xl p-5 bg-background mb-6">
          <View className="items-center mb-4">
            <Text className="text-sm font-black text-textPrimary">
              Monthly Sweep
            </Text>
            <Text className="text-[10px] font-bold text-gray-400 mt-0.5">
              {dateRangeStr}
            </Text>
          </View>

          <View className="items-center" style={{ marginLeft: -15 }}>
            {sweepDataPoints.length === 0 || sweepDataPoints.every(p => p.value === 0) ? (
              <View style={{ height: 140, justifyContent: 'center', alignItems: 'center' }}>
                <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  No Sweeps Recorded
                </Text>
              </View>
            ) : (
              <BarChart
                data={sweepDataPoints}
                height={140}
                width={chartWidth}
                barWidth={24}
                spacing={20}
                noOfSections={3}
                barBorderRadius={4}
                frontColor={Colors.actionPrimary}
                yAxisColor="transparent"
                xAxisColor="transparent"
                yAxisLabelWidth={38}
                yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 8, fontWeight: "bold" }}
                xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: 8, fontWeight: "black" }}
                formatYLabel={formatShortCurrency}
                // Interactive pointer config
                pointerConfig={{
                  pointerStripColor: Colors.actionPrimary,
                  pointerStripWidth: 1.5,
                  strokeDashArray: [2, 5],
                  pointerColor: Colors.actionPrimary,
                  radius: 5,
                  pointerLabelWidth: 85,
                  pointerLabelHeight: 35,
                  pointerLabelComponent: (items: any) => {
                    if (!items || items.length === 0) return null;
                    return (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          backgroundColor: Colors.white,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: Colors.border,
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: -25,
                          marginLeft: -10,
                        }}
                      >
                        <Text style={{ fontSize: 9, fontWeight: "900", color: Colors.textPrimary }}>
                          {formatCurrency(items[0].value * 100)}
                        </Text>
                      </View>
                    );
                  },
                }}
              />
            )}
          </View>
        </View>

        {/* 4. Doughnut Chart for Core Networks */}
        <View className="border border-borderLight rounded-2xl p-5 bg-background mb-6">
          <Text className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-4">
            Core Networks Allocation
          </Text>

          <View className="flex-row items-center justify-between">
            {/* Doughnut Chart */}
            <View className="w-[130px] h-[130px] justify-center items-center">
              {totalBalance === 0 ? (
                <View className="w-[120px] h-[120px] rounded-full border-[16px] border-borderLight justify-center items-center">
                  <Text className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    Total
                  </Text>
                  <Text className="text-xs font-black text-textPrimary mt-1">
                    ₱0
                  </Text>
                </View>
              ) : (
                <PieChart
                  data={pieData}
                  donut
                  radius={60}
                  innerRadius={44}
                  innerCircleColor={Colors.background}
                  centerLabelComponent={() => (
                    <View style={{ justifyContent: "center", alignItems: "center" }}>
                      <Text style={{ fontSize: 8, fontWeight: "bold", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Total
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: "900", color: Colors.textPrimary, marginTop: 2 }}>
                        {formatCurrency(totalBalance)}
                      </Text>
                    </View>
                  )}
                />
              )}
            </View>

            {/* Legend / Info */}
            <View className="flex-1 ml-4 space-y-3">
              {networkBalances.slice(0, 5).map((node) => {
                const IconComponent = iconMap[node.type] || Shield;
                return (
                  <View key={node.id} className="flex-row items-center justify-between" style={{ marginBottom: 6 }}>
                    <View className="flex-row items-center flex-1 mr-2">
                      <View 
                        style={{ backgroundColor: node.colorCode }} 
                        className="w-5 h-5 rounded-md items-center justify-center mr-2"
                      >
                        <IconComponent size={10} color={Colors.background} strokeWidth={2.5} />
                      </View>
                      <Text 
                        numberOfLines={1} 
                        className="text-[10px] font-bold text-textPrimary uppercase tracking-wider flex-1"
                      >
                        {node.name}
                      </Text>
                    </View>
                    <Text className="text-[10px] font-black text-textSecondary">
                      {formatCurrency(node.balance)}
                    </Text>
                  </View>
                );
              })}
              {networkBalances.length > 5 && (
                <Text className="text-[8px] text-gray-400 uppercase font-bold tracking-widest text-right mt-1">
                  + {networkBalances.length - 5} More Networks
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* 5. Two Cards Side by Side (Savings & Investments) */}
        <View className="flex-row space-x-3">
          <View className="flex-1 border border-borderLight rounded-2xl p-5 bg-backgroundDark">
            <View className="flex-row items-center mb-2">
              <Landmark size={14} stroke={Colors.background} strokeWidth={2.5} />
              <Text className="text-[9px] font-black text-background/80 uppercase tracking-widest ml-1.5">
                Total Savings
              </Text>
            </View>
            <Text className="text-base font-black text-background">
              {formatCurrency(data.totalSavings)}
            </Text>
          </View>

          <View className="flex-1 border border-borderLight rounded-2xl p-5 bg-actionPrimary" style={{ marginLeft: 8 }}>
            <View className="flex-row items-center mb-2">
              <TrendingUp size={14} stroke={Colors.background} strokeWidth={2.5} />
              <Text className="text-[9px] font-black text-background/80 uppercase tracking-widest ml-1.5">
                Investments
              </Text>
            </View>
            <Text className="text-base font-black text-background">
              {formatCurrency(data.totalInvestments)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
