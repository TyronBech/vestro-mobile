import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Sliders, AlertTriangle } from "lucide-react-native";
import FlatModal from "./flat-modal";
import * as Haptics from "expo-haptics";
import { useUIStore } from "../store/ui-store";
import { useToastStore } from "../store/toast-store";
import { getBudgetConfig, updateBudgetSalary } from "../services/api/endpoints/analytics";
import { Colors } from "../../constants/colors";

export default function BudgetConfigModal() {
  const { isBudgetModalOpen, closeBudgetModal, triggerBudgetUpdate } = useUIStore();
  const toastStore = useToastStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [needs, setNeeds] = useState("50");
  const [wants, setWants] = useState("30");
  const [savings, setSavings] = useState("10");
  const [investments, setInvestments] = useState("10");
  
  // Preserving existing netSalary
  const [netSalary, setNetSalary] = useState(2500000); // default to 25k PHP in cents

  useEffect(() => {
    if (isBudgetModalOpen) {
      loadConfig();
    }
  }, [isBudgetModalOpen]);

  const loadConfig = async () => {
    setLoading(true);
    const res = await getBudgetConfig();
    if (res.ok && res.value) {
      setNeeds((res.value.needsRate * 100).toString());
      setWants((res.value.wantsRate * 100).toString());
      setSavings((res.value.savingsRate * 100).toString());
      setInvestments((res.value.investmentsRate * 100).toString());
      setNetSalary(res.value.netSalary);
    } else if (!res.ok) {
      console.warn("Failed to load budget config, using defaults:", res.error);
    }
    setLoading(false);
  };

  const valNeeds = parseFloat(needs) || 0;
  const valWants = parseFloat(wants) || 0;
  const valSavings = parseFloat(savings) || 0;
  const valInvestments = parseFloat(investments) || 0;
  
  const total = valNeeds + valWants + valSavings + valInvestments;
  const isTotalValid = Math.abs(total - 100) < 0.01;
  const wantsExceeded = valWants > 30;

  const handleSave = async () => {
    if (saving) return;
    // 1. Validation for negative values
    if (valNeeds < 0 || valWants < 0 || valSavings < 0 || valInvestments < 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Allocation rates cannot be negative.", "error");
      return;
    }

    // 2. Validation for sum to 100%
    if (!isTotalValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Total allocation must equal exactly 100%.", "error");
      return;
    }

    setSaving(true);
    
    // Save backend rates in decimal format
    const res = await updateBudgetSalary(
      netSalary,
      valNeeds / 100,
      valWants / 100,
      valSavings / 100,
      valInvestments / 100
    );

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toastStore.show("Budget configuration updated successfully!", "success");
      triggerBudgetUpdate();
      closeBudgetModal();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Failed to update config: " + res.error, "error");
    }
    setSaving(false);
  };

  return (
    <FlatModal
      visible={isBudgetModalOpen}
      onClose={closeBudgetModal}
      title="Modify Budget Split"
      headerIcon={<Sliders size={20} color={Colors.actionPrimary} strokeWidth={2.5} />}
    >
      {loading ? (
        <View className="py-10 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
          {/* Wants Limit Warnings (Financial Literacy Warning Box) */}
          {wantsExceeded && (
            <View className="border-2 border-warning/30 bg-warning/5 rounded-2xl p-4 mb-4 flex-row items-start">
              <AlertTriangle size={18} color={Colors.warning} style={{ marginRight: 10, marginTop: 1 }} strokeWidth={2.5} />
              <View className="flex-1">
                <Text className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: Colors.warning }}>
                  Financial Literacy Warning
                </Text>
                <Text className="text-textSecondary text-[11px] font-bold leading-relaxed">
                  Setting wants to more than 30% is not a responsible budgeting practice. High discretionary allocations limit your capability to compound savings and secure your financial future.
                </Text>
              </View>
            </View>
          )}

          {/* Form Fields */}
          <View className="space-y-4">
            {/* Needs */}
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Needs Allocation (%)
              </Text>
              <TextInput
                value={needs}
                onChangeText={setNeeds}
                keyboardType="numeric"
                placeholder="e.g. 50"
                className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
              />
            </View>

            {/* Wants */}
            <View className="mt-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Wants Allocation (%)
              </Text>
              <TextInput
                value={wants}
                onChangeText={setWants}
                keyboardType="numeric"
                placeholder="e.g. 30"
                className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
              />
            </View>

            {/* Savings */}
            <View className="mt-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Savings Allocation (%)
              </Text>
              <TextInput
                value={savings}
                onChangeText={setSavings}
                keyboardType="numeric"
                placeholder="e.g. 10"
                className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
              />
            </View>

            {/* Investments */}
            <View className="mt-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Investments Allocation (%)
              </Text>
              <TextInput
                value={investments}
                onChangeText={setInvestments}
                keyboardType="numeric"
                placeholder="e.g. 10"
                className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
              />
            </View>
          </View>

          {/* Total Allocations & Warnings */}
          <View className="mt-6 pt-4 border-t border-borderLight flex-row justify-between items-center">
            <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary">
              Status Check
            </Text>
            <View className="flex-row items-center">
              <Text
                style={{ color: isTotalValid ? Colors.success : Colors.error }}
                className="text-xs font-black uppercase tracking-wider"
              >
                Total: {total.toFixed(0)}% {isTotalValid ? "✓" : "(!)"}
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <View className="mt-6 flex-row space-x-3">
            <TouchableOpacity
              onPress={closeBudgetModal}
              className="flex-1 items-center justify-center border border-border bg-backgroundLight rounded-2xl py-3"
            >
              <Text className="text-textSecondary font-black uppercase tracking-widest text-xs">
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className="flex-1 items-center justify-center rounded-2xl py-3 ml-3"
              style={{ backgroundColor: Colors.actionPrimary }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Text className="text-background font-black uppercase tracking-widest text-xs">
                  Save Split
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </FlatModal>
  );
}
