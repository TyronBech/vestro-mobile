import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Sliders, AlertTriangle, Plus, Trash2 } from "lucide-react-native";
import FlatModal from "./flat-modal";
import * as Haptics from "expo-haptics";
import { useUIStore } from "../store/ui-store";
import { useToastStore } from "../store/toast-store";
import {
  getBudgetConfigs,
  createBudgetConfigApi,
  updateBudgetConfigByIdApi,
  deleteBudgetConfigApi,
} from "../services/api/endpoints/analytics";
import { Colors } from "../../constants/colors";
import { BudgetConfig } from "../types";

export default function BudgetConfigModal() {
  const { isBudgetModalOpen, closeBudgetModal, triggerBudgetUpdate } = useUIStore();
  const toastStore = useToastStore();

  const isSubmittingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<BudgetConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);

  const [configName, setConfigName] = useState("Primary Job");
  const [netSalaryInput, setNetSalaryInput] = useState("25000");
  const [needs, setNeeds] = useState("50");
  const [wants, setWants] = useState("30");
  const [savings, setSavings] = useState("10");
  const [investments, setInvestments] = useState("10");

  useEffect(() => {
    if (isBudgetModalOpen) {
      loadConfigs();
    }
  }, [isBudgetModalOpen]);

  const loadConfigs = async () => {
    setLoading(true);
    const res = await getBudgetConfigs();
    if (res.ok && res.value && res.value.length > 0) {
      const sorted = [...res.value].sort((a, b) => {
        const aIsPrimary = a.name?.toLowerCase().includes('primary') ?? false;
        const bIsPrimary = b.name?.toLowerCase().includes('primary') ?? false;
        if (aIsPrimary && !bIsPrimary) return -1;
        if (!aIsPrimary && bIsPrimary) return 1;
        return (new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime());
      });
      setConfigs(sorted);
      selectConfig(sorted[0]);
    } else {
      setConfigs([]);
      startNewConfig(1);
    }
    setLoading(false);
  };

  const selectConfig = (cfg: BudgetConfig) => {
    setSelectedConfigId(cfg.id || null);
    setConfigName(cfg.name || "Primary Job");
    setNetSalaryInput((cfg.netSalary / 100).toString());
    setNeeds((cfg.needsRate * 100).toString());
    setWants((cfg.wantsRate * 100).toString());
    setSavings((cfg.savingsRate * 100).toString());
    setInvestments((cfg.investmentsRate * 100).toString());
  };

  const startNewConfig = (count?: number) => {
    const num = count ?? (configs.length + 1);
    setSelectedConfigId(null);
    setConfigName(`Job ${num}`);
    setNetSalaryInput("25000");
    setNeeds("50");
    setWants("30");
    setSavings("10");
    setInvestments("10");
  };

  const valNeeds = parseFloat(needs) || 0;
  const valWants = parseFloat(wants) || 0;
  const valSavings = parseFloat(savings) || 0;
  const valInvestments = parseFloat(investments) || 0;
  const salaryPesos = parseFloat(netSalaryInput) || 0;

  const total = valNeeds + valWants + valSavings + valInvestments;
  const isTotalValid = Math.abs(total - 100) < 0.01;
  const wantsExceeded = valWants > 30;

  const handleSave = async () => {
    if (isSubmittingRef.current || saving) return;
    isSubmittingRef.current = true;

    if (!configName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Budget configuration name is required.", "error");
      isSubmittingRef.current = false;
      return;
    }

    if (salaryPesos <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Monthly net salary must be positive.", "error");
      isSubmittingRef.current = false;
      return;
    }

    if (valNeeds < 0 || valWants < 0 || valSavings < 0 || valInvestments < 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Allocation rates cannot be negative.", "error");
      isSubmittingRef.current = false;
      return;
    }

    if (!isTotalValid) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Total allocation must equal exactly 100%.", "error");
      isSubmittingRef.current = false;
      return;
    }

    setSaving(true);
    const salaryCents = Math.round(salaryPesos * 100);

    let res;
    if (selectedConfigId) {
      res = await updateBudgetConfigByIdApi(selectedConfigId, {
        name: configName.trim(),
        netSalary: salaryCents,
        needsRate: valNeeds / 100,
        wantsRate: valWants / 100,
        savingsRate: valSavings / 100,
        investmentsRate: valInvestments / 100,
      });
    } else {
      res = await createBudgetConfigApi(
        configName.trim(),
        salaryCents,
        valNeeds / 100,
        valWants / 100,
        valSavings / 100,
        valInvestments / 100
      );
    }

    if (res.ok) {
      toastStore.show(
        selectedConfigId ? "Budget updated successfully!" : "New budget config added!",
        "success"
      );
      triggerBudgetUpdate();
      closeBudgetModal();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Failed to save budget config: " + res.error, "error");
    }

    setSaving(false);
    isSubmittingRef.current = false;
  };

  const handleDelete = async () => {
    if (!selectedConfigId || configs.length <= 1) return;
    setSaving(true);
    const res = await deleteBudgetConfigApi(selectedConfigId);
    if (res.ok) {
      toastStore.show("Budget configuration deleted.", "success");
      triggerBudgetUpdate();
      closeBudgetModal();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Failed to delete budget config: " + res.error, "error");
    }
    setSaving(false);
  };

  return (
    <FlatModal
      visible={isBudgetModalOpen}
      onClose={closeBudgetModal}
      title="Budget Configurations"
      headerIcon={<Sliders size={20} color={Colors.actionPrimary} strokeWidth={2.5} />}
    >
      {loading ? (
        <View className="py-10 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
          {/* Configuration Selector Pills & Add Budget Button */}
          <View className="mb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-2">
              Select or Add Budget
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
              {configs.map((cfg) => {
                const isSelected = selectedConfigId === cfg.id;
                return (
                  <TouchableOpacity
                    key={cfg.id}
                    onPress={() => selectConfig(cfg)}
                    className="mr-2 px-3.5 py-2 rounded-xl border flex-row items-center"
                    style={{
                      backgroundColor: isSelected ? Colors.textPrimary : Colors.backgroundLight,
                      borderColor: isSelected ? Colors.textPrimary : Colors.border,
                    }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: isSelected ? Colors.background : Colors.textPrimary }}
                    >
                      {cfg.name || "Primary Job"}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Add Budget Button */}
              <TouchableOpacity
                onPress={() => startNewConfig()}
                className="px-3.5 py-2 rounded-xl border flex-row items-center"
                style={{
                  backgroundColor: selectedConfigId === null ? Colors.actionPrimary : Colors.backgroundLight,
                  borderColor: selectedConfigId === null ? Colors.actionPrimary : Colors.actionPrimary,
                }}
              >
                <Plus
                  size={14}
                  color={selectedConfigId === null ? Colors.background : Colors.actionPrimary}
                  style={{ marginRight: 4 }}
                  strokeWidth={2.5}
                />
                <Text
                  className="text-xs font-black uppercase tracking-wider"
                  style={{
                    color: selectedConfigId === null ? Colors.background : Colors.actionPrimary,
                  }}
                >
                  Add Budget
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Wants Limit Warning Box */}
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
          <View className="space-y-3">
            {/* Job / Config Name */}
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Job / Budget Title
              </Text>
              <TextInput
                value={configName}
                onChangeText={setConfigName}
                placeholder="e.g. Primary Job, Freelance, Side Hustle"
                placeholderTextColor={Colors.textMuted}
                className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
              />
            </View>

            {/* Monthly Net Salary */}
            <View className="mt-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Monthly Net Salary (₱)
              </Text>
              <TextInput
                value={netSalaryInput}
                onChangeText={setNetSalaryInput}
                keyboardType="numeric"
                placeholder="e.g. 25000"
                placeholderTextColor={Colors.textMuted}
                className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
              />
            </View>

            {/* Needs */}
            <View className="mt-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Needs Allocation (%)
              </Text>
              <TextInput
                value={needs}
                onChangeText={setNeeds}
                keyboardType="numeric"
                placeholder="e.g. 50"
                placeholderTextColor={Colors.textMuted}
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
                placeholderTextColor={Colors.textMuted}
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
                placeholderTextColor={Colors.textMuted}
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
                placeholderTextColor={Colors.textMuted}
                className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
              />
            </View>
          </View>

          {/* Total Allocations Status Check */}
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

          {/* Action Buttons */}
          <View className="mt-6 flex-row items-center space-x-3">
            {selectedConfigId && configs.length > 1 && (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={saving}
                className="border border-error/30 bg-error/10 rounded-2xl p-3 mr-2 items-center justify-center"
              >
                <Trash2 size={18} color={Colors.error} strokeWidth={2} />
              </TouchableOpacity>
            )}

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
                  {selectedConfigId ? "Save Changes" : "Create Budget"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </FlatModal>
  );
}
