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
import { RefreshCw, AlertTriangle } from "lucide-react-native";
import FlatModal from "./flat-modal";
import * as Haptics from "expo-haptics";
import { useUIStore } from "../store/ui-store";
import { useToastStore } from "../store/toast-store";
import { recordManualSweep } from "../services/api/endpoints/sweep";
import { fetchCoreNetworks, CoreNetwork } from "../services/api/endpoints/core-networks";
import { Colors } from "../../constants/colors";

export default function SweepModal() {
  const {
    isSweepModalOpen,
    closeSweepModal,
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
  const [selectedCoreNetworkId, setSelectedCoreNetworkId] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(""); // "" means now, otherwise ISO string

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
    if (isSweepModalOpen) {
      loadCoreNetworks();
    }
  }, [isSweepModalOpen, networkUpdateTrigger]);

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

  const getPeriodOptions = () => {
    const options = [{ label: "Now (Default)", value: "" }];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString("en-US", { month: "short", year: "numeric" }).toUpperCase();
      // Use 15th of the month at noon local time
      const dateVal = new Date(d.getFullYear(), d.getMonth(), 15, 12, 0, 0);
      options.push({
        label,
        value: dateVal.toISOString(),
      });
    }
    // De-duplicate in case of timing edges
    return options.filter((item, idx, self) => self.findIndex(t => t.label === item.label) === idx);
  };

  const resetForm = () => {
    setAmountPesos("");
    setNotes("");
    setSelectedPeriod("");
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

    const res = await recordManualSweep({
      amount: amountCents,
      coreNetworkId: selectedCoreNetworkId,
      notes: notes.trim() || undefined,
      sweptAt: selectedPeriod || undefined,
    });

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toastStore.show("Sweep logged and balances updated!", "success");
      triggerBudgetUpdate();
      triggerNetworkUpdate();
      resetForm();
      closeSweepModal();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Failed to log sweep: " + res.error, "error");
    }
    setSaving(false);
  };

  const handleClose = () => {
    resetForm();
    closeSweepModal();
  };

  const switchToNetwork = () => {
    closeSweepModal();
    setTimeout(() => {
      useUIStore.getState().openCoreNetworkModal();
    }, 150);
  };

  return (
    <FlatModal
      visible={isSweepModalOpen}
      onClose={handleClose}
      title="Record Custom Sweep"
      headerIcon={<RefreshCw size={20} color={Colors.actionPrimary} strokeWidth={2.5} />}
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
                You must create a Core Network node in your routing tree before you can record sweeps.
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
              {/* Sweep Amount */}
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                  Sweep Amount (₱) *
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
                  placeholder="e.g. Skipped subscriptions this month"
                  placeholderTextColor={Colors.textMuted}
                  className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
                />
              </View>

              {/* Period Selection */}
              <View className="mt-3">
                <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                  Choose Sweep Month / Period
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                  {getPeriodOptions().map((opt) => {
                    const isSelected = selectedPeriod === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.label}
                        onPress={() => setSelectedPeriod(opt.value)}
                        className={`border rounded-xl px-3 py-2 mr-2 ${
                          isSelected ? "border-textPrimary bg-backgroundDark" : "border-border bg-backgroundLight"
                        }`}
                      >
                        <Text
                          style={{ color: isSelected ? Colors.background : Colors.textPrimary }}
                          className="text-[10px] font-black tracking-wider uppercase"
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
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
                    Log Sweep
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
