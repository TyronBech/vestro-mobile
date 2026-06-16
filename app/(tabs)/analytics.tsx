import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BarChart3, TrendingUp, TrendingDown, Wallet } from "lucide-react-native";
import { Colors } from "../../constants/colors";

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();

  // Mock financial values in cents (Cents Rule: ₱100.00 is stored as 10000)
  const totalIncome = 15000000; // ₱150,000.00
  const totalExpense = 8500000;  // ₱85,000.00
  const totalSavings = 6500000;  // ₱65,000.00

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(cents / 100);
  };

  const calculatePercentage = (part: number, total: number) => {
    return Math.round((part / total) * 100);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View className="items-center mb-8 mt-4">
          <Text className="text-3xl font-black tracking-widest text-textPrimary">
            ANALYTICS
          </Text>
          <Text className="text-xs uppercase tracking-widest text-gray-400 mt-1">
            Financial Performance
          </Text>
        </View>

        {/* Overview Row */}
        <View className="flex-row space-x-3 mb-6">
          <View className="flex-1 border border-borderLight rounded-2xl p-4 bg-background">
            <View className="flex-row items-center mb-2">
              <TrendingUp size={16} stroke={Colors.success} strokeWidth={2.5} />
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1.5">
                Income
              </Text>
            </View>
            <Text className="text-lg font-black text-textPrimary">
              {formatCurrency(totalIncome)}
            </Text>
          </View>

          <View className="flex-1 border border-borderLight rounded-2xl p-4 bg-background">
            <View className="flex-row items-center mb-2">
              <TrendingDown size={16} stroke={Colors.actionPrimary} strokeWidth={2.5} />
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1.5">
                Expenses
              </Text>
            </View>
            <Text className="text-lg font-black text-textPrimary">
              {formatCurrency(totalExpense)}
            </Text>
          </View>
        </View>

        {/* Savings Card */}
        <View className="border border-borderLight rounded-2xl p-6 bg-backgroundDark mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Wallet size={18} stroke={Colors.background} strokeWidth={2.5} />
              <Text className="text-background text-[11px] font-bold uppercase tracking-widest ml-2">
                Monthly Savings Rate
              </Text>
            </View>
            <Text className="text-background text-sm font-black">
              {calculatePercentage(totalSavings, totalIncome)}%
            </Text>
          </View>

          <Text className="text-background text-3xl font-black mb-4">
            {formatCurrency(totalSavings)}
          </Text>

          {/* Flat Progress Bar */}
          <View className="w-full h-3 bg-gray-600/50 rounded-full overflow-hidden">
            <View 
              style={{ width: `${calculatePercentage(totalSavings, totalIncome)}%` }} 
              className="h-full bg-actionPrimary"
            />
          </View>
        </View>

        {/* Breakdown Card */}
        <View className="border border-borderLight rounded-2xl p-6 bg-background">
          <View className="flex-row items-center mb-6">
            <BarChart3 size={18} stroke={Colors.textPrimary} strokeWidth={2.5} />
            <Text className="text-textPrimary text-xs font-bold uppercase tracking-widest ml-2">
              Expense Breakdown
            </Text>
          </View>

          {/* Categories */}
          <View className="space-y-4">
            {/* Category Item */}
            <View className="mb-4">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-textPrimary text-xs font-bold uppercase tracking-wider">Housing & Rent</Text>
                <Text className="text-textPrimary text-xs font-bold">{formatCurrency(3500000)} (41%)</Text>
              </View>
              <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <View style={{ width: '41%' }} className="h-full bg-textPrimary" />
              </View>
            </View>

            {/* Category Item */}
            <View className="mb-4">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-textPrimary text-xs font-bold uppercase tracking-wider">Food & Groceries</Text>
                <Text className="text-textPrimary text-xs font-bold">{formatCurrency(2500000)} (29%)</Text>
              </View>
              <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <View style={{ width: '29%' }} className="h-full bg-textPrimary" />
              </View>
            </View>

            {/* Category Item */}
            <View className="mb-2">
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-textPrimary text-xs font-bold uppercase tracking-wider">Transport & Travel</Text>
                <Text className="text-textPrimary text-xs font-bold">{formatCurrency(1500000)} (18%)</Text>
              </View>
              <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <View style={{ width: '18%' }} className="h-full bg-textPrimary" />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
