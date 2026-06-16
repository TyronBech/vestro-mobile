import React from "react";
import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Target, Award, ShieldAlert, Sparkles } from "lucide-react-native";
import { Colors } from "../../constants/colors";

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();

  // Mock Goal data following Cents Rule
  const goals = [
    {
      id: "1",
      title: "Emergency Fund",
      target: 30000000, // ₱300,000.00
      current: 18000000, // ₱180,000.00
      date: "DEC 2026",
      icon: ShieldAlert,
    },
    {
      id: "2",
      title: "Index Funds Portfolio",
      target: 50000000, // ₱500,000.00
      current: 25000000, // ₱250,000.00
      date: "JUN 2027",
      icon: Target,
    },
    {
      id: "3",
      title: "Tech Upgrade (Workstation)",
      target: 15000000, // ₱150,000.00
      current: 12000000, // ₱120,000.00
      date: "OCT 2026",
      icon: Sparkles,
    },
  ];

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(cents / 100);
  };

  const getPercent = (current: number, target: number) => {
    return Math.round((current / target) * 100);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-8 mt-4">
          <Text className="text-3xl font-black tracking-widest text-textPrimary">
            GOALS
          </Text>
          <Text className="text-xs uppercase tracking-widest text-gray-400 mt-1">
            Financial Targets
          </Text>
        </View>

        {/* Total Progress Summary */}
        <View className="border border-borderLight rounded-2xl p-6 bg-backgroundDark mb-6">
          <View className="flex-row items-center mb-3">
            <Award size={18} stroke={Colors.background} strokeWidth={2.5} />
            <Text className="text-background text-[11px] font-bold uppercase tracking-widest ml-2">
              Combined Milestones
            </Text>
          </View>
          <Text className="text-background text-3xl font-black mb-4">
            {formatCurrency(55000000)} {/* ₱550,000.00 cumulative */}
          </Text>
          <Text className="text-gray-400 text-xs uppercase tracking-wider">
            Total target of {formatCurrency(95000000)} (57% saved)
          </Text>
        </View>

        {/* Goals List */}
        <View className="space-y-4">
          {goals.map((goal) => {
            const IconComponent = goal.icon;
            const percent = getPercent(goal.current, goal.target);
            return (
              <View 
                key={goal.id} 
                className="border border-borderLight rounded-2xl p-5 bg-background mb-4"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center">
                    <View className="bg-backgroundDark/5 rounded-xl p-2 mr-3">
                      <IconComponent size={18} stroke={Colors.textPrimary} strokeWidth={2.5} />
                    </View>
                    <View>
                      <Text className="text-textPrimary text-sm font-bold uppercase tracking-wider">
                        {goal.title}
                      </Text>
                      <Text className="text-gray-400 text-[10px] uppercase tracking-widest font-semibold mt-0.5">
                        Target Date: {goal.date}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-textPrimary text-xs font-black">
                    {percent}%
                  </Text>
                </View>

                {/* Progress amounts */}
                <View className="flex-row justify-between items-end mb-2">
                  <Text className="text-[10px] uppercase font-bold text-gray-400">
                    Saved: {formatCurrency(goal.current)}
                  </Text>
                  <Text className="text-[10px] uppercase font-bold text-gray-500">
                    Goal: {formatCurrency(goal.target)}
                  </Text>
                </View>

                {/* Progress bar */}
                <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View 
                    style={{ width: `${percent}%` }} 
                    className="h-full bg-actionPrimary"
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
