import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { DollarSign, AlertTriangle, ArrowDownLeft, ArrowUpRight } from "lucide-react-native";
import FlatModal from "./flat-modal";
import * as Haptics from "expo-haptics";
import { useUIStore } from "../store/ui-store";
import { useToastStore } from "../store/toast-store";
import { createCashFlow } from "../services/api/endpoints/cash-flows";
import { fetchCoreNetworks, CoreNetwork } from "../services/api/endpoints/core-networks";
import { Colors } from "../../constants/colors";

export default function CashFlowModal() {
  const {
    isCashFlowModalOpen,
    closeCashFlowModal,
    triggerBudgetUpdate,
    triggerNetworkUpdate,
    networkUpdateTrigger,
  } = useUIStore();

  const toastStore = useToastStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coreNetworks, setCoreNetworks] = useState<CoreNetwork[]>([]);

  // Form states
  const [amountPesos, setAmountPesos] = useState("");
  const [type, setType] = useState<"INFLOW" | "OUTFLOW">("INFLOW");
  const [selectedCoreNetworkId, setSelectedCoreNetworkId] = useState("");
  const [notes, setNotes] = useState("");

  // Shake animation shared value
  const shakeOffset = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const triggerErrorEffects = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {}

    shakeOffset.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  useEffect(() => {
    if (isCashFlowModalOpen) {
      loadCoreNetworks();
    }
  }, [isCashFlowModalOpen, networkUpdateTrigger]);

  const loadCoreNetworks = async () => {
    setLoading(true);
    const res = await fetchCoreNetworks();
    if (res.ok) {
      setCoreNetworks(res.value);
      if (res.value.length > 0) {
        setSelectedCoreNetworkId(res.value[0]!.id);
      }
    }
    setLoading(false);
  };

  const resetForm = () => {
    setAmountPesos("");
    setType("INFLOW");
    setNotes("");
    if (coreNetworks.length > 0) {
      setSelectedCoreNetworkId(coreNetworks[0]!.id);
    } else {
      setSelectedCoreNetworkId("");
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const amt = parseFloat(amountPesos);
    if (isNaN(amt) || amt <= 0) {
      triggerErrorEffects();
      toastStore.show("Amount must be a positive number.", "error");
      return;
    }

    if (!selectedCoreNetworkId) {
      triggerErrorEffects();
      toastStore.show("Core Network selection is required.", "error");
      return;
    }

    setSaving(true);
    const amountCents = Math.round(amt * 100);

    const res = await createCashFlow({
      amount: amountCents,
      coreNetworkId: selectedCoreNetworkId,
      type,
      notes: notes.trim() || undefined,
    });

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toastStore.show(
        `Logged ${type === "INFLOW" ? "inflow" : "outflow"} & updated network!`,
        "success"
      );
      triggerBudgetUpdate();
      triggerNetworkUpdate();
      resetForm();
      closeCashFlowModal();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Failed to log activity: " + res.error, "error");
    }
    setSaving(false);
  };

  const handleClose = () => {
    resetForm();
    closeCashFlowModal();
  };

  const switchToNetwork = () => {
    closeCashFlowModal();
    setTimeout(() => {
      useUIStore.getState().openCoreNetworkModal();
    }, 150);
  };

  return (
    <FlatModal
      visible={isCashFlowModalOpen}
      onClose={handleClose}
      title="Log Activity"
      headerIcon={<DollarSign size={20} color={Colors.actionPrimary} strokeWidth={2.5} />}
    >
      {loading ? (
        <View className="py-10 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
        </View>
      ) : coreNetworks.length === 0 ? (
        <View className="py-6 items-center">
          <View className="border-2 border-warning/30 bg-warning/5 rounded-2xl p-4 mb-6 flex-row items-start">
            <AlertTriangle size={18} color={Colors.warning} style={{ marginRight: 10, marginTop: 1 }} strokeWidth={2.5} />
            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: Colors.warning }}>
                No Core Networks Found
              </Text>
              <Text className="text-textSecondary text-[11px] font-bold leading-relaxed">
                You must create a Core Network node in your routing tree before you can log activity.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={switchToNetwork}
            className="w-full items-center justify-center rounded-2xl py-3"
            style={{ backgroundColor: Colors.actionPrimary }}
          >
            <Text className="text-background font-black uppercase tracking-widest text-xs">
              Create Network Node
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={animatedStyle}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
            <View className="space-y-4">
              
              {/* Inflow / Outflow Switcher */}
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-2">
                  Transaction Type
                </Text>
                <View className="flex-row border border-border rounded-xl p-1 bg-backgroundLight">
                  <TouchableOpacity
                    onPress={() => setType("INFLOW")}
                    className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${
                      type === "INFLOW" ? "bg-emerald-600" : "bg-transparent"
                    }`}
                  >
                    <ArrowDownLeft
                      size={14}
                      color={type === "INFLOW" ? Colors.background : "#10b981"}
                      style={{ marginRight: 6 }}
                      strokeWidth={3}
                    />
                    <Text
                      className="text-xs font-black uppercase tracking-wider"
                      style={{ color: type === "INFLOW" ? Colors.background : "#10b981" }}
                    >
                      Inflow
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setType("OUTFLOW")}
                    className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ml-1 ${
                      type === "OUTFLOW" ? "bg-actionPrimary" : "bg-transparent"
                    }`}
                  >
                    <ArrowUpRight
                      size={14}
                      color={type === "OUTFLOW" ? Colors.background : Colors.actionPrimary}
                      style={{ marginRight: 6 }}
                      strokeWidth={3}
                    />
                    <Text
                      className="text-xs font-black uppercase tracking-wider"
                      style={{ color: type === "OUTFLOW" ? Colors.background : Colors.actionPrimary }}
                    >
                      Outflow
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount */}
              <View className="mt-3">
                <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                  Amount (₱) *
                </Text>
                <TextInput
                  value={amountPesos}
                  onChangeText={setAmountPesos}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
                />
              </View>

              {/* Core Network Selector */}
              <View className="mt-3">
                <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                  Select Target Routing Node (Core Network) *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1 mb-2">
                  {coreNetworks.map((node) => {
                    const isSelected = selectedCoreNetworkId === node.id;
                    return (
                      <TouchableOpacity
                        key={node.id}
                        onPress={() => setSelectedCoreNetworkId(node.id)}
                        className={`border rounded-xl px-3.5 py-2.5 mr-2 ${
                          isSelected ? "border-textPrimary bg-backgroundDark" : "border-border bg-backgroundLight"
                        }`}
                      >
                        <Text
                          style={{ color: isSelected ? Colors.background : Colors.textPrimary }}
                          className="text-xs font-black"
                        >
                          {node.name}
                        </Text>
                        <Text
                          style={{ color: isSelected ? `${Colors.background}b0` : Colors.textSecondary }}
                          className="text-[9px] mt-0.5 font-bold uppercase"
                        >
                          Type: {node.type?.replace("_", " ") || "NONE"} • Balance: ₱{(node.balance / 100).toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Notes */}
              <View className="mt-3">
                <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                  Notes / Context (Optional)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Payroll credit or grocery bill"
                  placeholderTextColor={Colors.textMuted}
                  className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
                />
              </View>
            </View>

            {/* Actions */}
            <View className="mt-6 flex-row space-x-3">
              <TouchableOpacity
                onPress={handleClose}
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
                    Log Activity
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      )}
    </FlatModal>
  );
}
