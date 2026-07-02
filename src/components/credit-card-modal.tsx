import React, { useState, useEffect, useRef } from "react";
import { generateUUID } from "../utils/uuid";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  CreditCard as CardIcon,
  Plus,
  Sliders,
  Trash2,
  Landmark,
  DollarSign,
  AlertTriangle,
  RotateCcw,
} from "lucide-react-native";
import FlatModal from "./flat-modal";
import * as Haptics from "expo-haptics";
import { useUIStore } from "../store/ui-store";
import { useToastStore } from "../store/toast-store";
import {
  fetchCreditCards,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
  recordSpend,
  recordMidCyclePayment,
  resetCreditCard,
} from "../services/api/endpoints/credit-cards";
import {
  fetchMacroAssets,
  MacroAsset,
} from "../services/api/endpoints/macro-assets";
import { CreditCard } from "../types";
import { Colors } from "../../constants/colors";

export default function CreditCardModal() {
  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef(generateUUID());
  const {
    isCreditCardModalOpen,
    closeCreditCardModal,
    editingCreditCard,
    triggerNetworkUpdate,
    networkUpdateTrigger,
  } = useUIStore();

  const toastStore = useToastStore();

  // Mode: "ADD" or "MANAGE" or "CHOOSE"
  const [activeTab, setActiveTab] = useState<"ADD" | "MANAGE" | "CHOOSE">(
    "CHOOSE",
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [macroAssets, setMacroAssets] = useState<MacroAsset[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);

  // Selected card for editing/managing
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);

  // Custom confirmation state for resetting the billing cycle
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Form fields for Add/Edit
  const [cardName, setCardName] = useState("");
  const [creditLimitPesos, setCreditLimitPesos] = useState("");
  const [cutoffDay, setCutoffDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [selectedMacroAssetId, setSelectedMacroAssetId] = useState<
    string | null
  >(null);

  // Quick transaction fields
  const [spendAmountPesos, setSpendAmountPesos] = useState("");
  const [paymentAmountPesos, setPaymentAmountPesos] = useState("");

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
      withTiming(0, { duration: 60 }),
    );
  };

  // Load macro assets and credit cards
  const loadData = async (currentSelection?: CreditCard | null) => {
    setLoading(true);
    const [assetsRes, cardsRes] = await Promise.all([
      fetchMacroAssets(),
      fetchCreditCards(),
    ]);

    if (assetsRes.ok) {
      setMacroAssets(assetsRes.value);
    }
    if (cardsRes.ok) {
      setCreditCards(cardsRes.value);
      // Auto-select first card if we are in manage mode and have cards
      if (cardsRes.value.length > 0) {
        const selectionToUse =
          currentSelection !== undefined ? currentSelection : selectedCard;
        // If there's already a selection, update it with fresh data, otherwise select the first
        const updatedSelected = selectionToUse
          ? cardsRes.value.find((c) => c.id === selectionToUse.id) ||
            cardsRes.value[0]
          : cardsRes.value[0];
        setSelectedCard(updatedSelected || null);
      } else {
        setSelectedCard(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isCreditCardModalOpen) {
      idempotencyKeyRef.current = generateUUID();
      if (editingCreditCard) {
        setActiveTab("MANAGE");
        setSelectedCard(editingCreditCard);
        loadData(editingCreditCard);
      } else {
        setActiveTab("CHOOSE");
        setSelectedCard(null);
        loadData(null);
      }
    }
  }, [isCreditCardModalOpen, editingCreditCard, networkUpdateTrigger]);

  // When selected card changes, populate editing fields
  useEffect(() => {
    if (selectedCard && activeTab === "MANAGE") {
      setCardName(selectedCard.cardName);
      setCreditLimitPesos((selectedCard.creditLimit / 100).toString());
      setCutoffDay(selectedCard.statementCutoffDay.toString());
      setDueDay(selectedCard.paymentDueDay.toString());
      setSelectedMacroAssetId(selectedCard.macroAssetId);
    } else if (activeTab === "ADD") {
      // Clear fields for adding new
      setCardName("");
      setCreditLimitPesos("");
      setCutoffDay("");
      setDueDay("");
      setSelectedMacroAssetId(null);
    }
    setSpendAmountPesos("");
    setPaymentAmountPesos("");
    setShowResetConfirm(false);
  }, [selectedCard, activeTab]);

  const resetForm = () => {
    setCardName("");
    setCreditLimitPesos("");
    setCutoffDay("");
    setDueDay("");
    setSelectedMacroAssetId(null);
    setSpendAmountPesos("");
    setPaymentAmountPesos("");
    setActiveTab("CHOOSE");
    setSelectedCard(null);
    setShowResetConfirm(false);
  };

  const handleClose = () => {
    resetForm();
    closeCreditCardModal();
  };

  // Add Card action
  const handleAddCard = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    if (saving) {
      isSubmittingRef.current = false;
      return;
    }

    if (!cardName.trim()) {
      triggerErrorEffects();
      toastStore.show("Card Name is required.", "error");
      isSubmittingRef.current = false;
      return;
    }

    const limit = parseFloat(creditLimitPesos);
    if (isNaN(limit) || limit <= 0) {
      triggerErrorEffects();
      toastStore.show("Credit Limit must be a positive number.", "error");
      isSubmittingRef.current = false;
      return;
    }

    const cutDay = parseInt(cutoffDay);
    if (isNaN(cutDay) || cutDay < 1 || cutDay > 31) {
      triggerErrorEffects();
      toastStore.show(
        "Statement Cutoff Day must be between 1 and 31.",
        "error",
      );
      isSubmittingRef.current = false;
      return;
    }

    const due = parseInt(dueDay);
    if (isNaN(due) || due < 1 || due > 31) {
      triggerErrorEffects();
      toastStore.show("Payment Due Day must be between 1 and 31.", "error");
      isSubmittingRef.current = false;
      return;
    }

    setSaving(true);
    const limitCents = Math.round(limit * 100);

    const res = await createCreditCard({
      cardName: cardName.trim(),
      creditLimit: limitCents,
      statementCutoffDay: cutDay,
      paymentDueDay: due,
      macroAssetId: selectedMacroAssetId,
    }, idempotencyKeyRef.current);

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      toastStore.show("Credit Card added successfully!", "success");
      triggerNetworkUpdate();
      resetForm();
      closeCreditCardModal();
    } else {
      triggerErrorEffects();
      toastStore.show(res.error || "Failed to create credit card", "error");
    }
    setSaving(false);
    isSubmittingRef.current = false;
  };

  // Update Card action
  const handleUpdateCard = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    if (saving || !selectedCard) {
      isSubmittingRef.current = false;
      return;
    }

    if (!cardName.trim()) {
      triggerErrorEffects();
      toastStore.show("Card Name is required.", "error");
      isSubmittingRef.current = false;
      return;
    }

    const limit = parseFloat(creditLimitPesos);
    if (isNaN(limit) || limit <= 0) {
      triggerErrorEffects();
      toastStore.show("Credit Limit must be a positive number.", "error");
      isSubmittingRef.current = false;
      return;
    }

    const cutDay = parseInt(cutoffDay);
    if (isNaN(cutDay) || cutDay < 1 || cutDay > 31) {
      triggerErrorEffects();
      toastStore.show(
        "Statement Cutoff Day must be between 1 and 31.",
        "error",
      );
      isSubmittingRef.current = false;
      return;
    }

    const due = parseInt(dueDay);
    if (isNaN(due) || due < 1 || due > 31) {
      triggerErrorEffects();
      toastStore.show("Payment Due Day must be between 1 and 31.", "error");
      isSubmittingRef.current = false;
      return;
    }

    setSaving(true);
    const limitCents = Math.round(limit * 100);

    const res = await updateCreditCard(selectedCard.id, {
      cardName: cardName.trim(),
      creditLimit: limitCents,
      statementCutoffDay: cutDay,
      paymentDueDay: due,
      macroAssetId: selectedMacroAssetId,
    }, idempotencyKeyRef.current);

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      toastStore.show("Credit Card updated successfully!", "success");
      triggerNetworkUpdate();
      loadData(); // reload
    } else {
      triggerErrorEffects();
      toastStore.show(res.error || "Failed to update credit card", "error");
    }
    setSaving(false);
    isSubmittingRef.current = false;
  };

  // Delete Card action
  const handleDeleteCard = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    if (saving || !selectedCard) {
      isSubmittingRef.current = false;
      return;
    }

    setSaving(true);
    const res = await deleteCreditCard(selectedCard.id, idempotencyKeyRef.current);

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      toastStore.show("Credit Card deleted successfully!", "success");
      triggerNetworkUpdate();

      // Reset selected card and maybe tabs
      setSelectedCard(null);
      loadData();
    } else {
      triggerErrorEffects();
      toastStore.show(res.error || "Failed to delete credit card", "error");
    }
    setSaving(false);
    isSubmittingRef.current = false;
  };

  // Record Spend Action
  const handleRecordSpend = async () => {
    if (!selectedCard) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    if (saving) {
      isSubmittingRef.current = false;
      return;
    }

    const spendAmt = parseFloat(spendAmountPesos);
    if (isNaN(spendAmt) || spendAmt <= 0) {
      triggerErrorEffects();
      toastStore.show("Spend amount must be a positive number.", "error");
      isSubmittingRef.current = false;
      return;
    }

    const spendCents = Math.round(spendAmt * 100);
    const effectiveSpend =
      selectedCard.unbilledSpend - selectedCard.midCyclePaid;
    const availableSpendCents = selectedCard.creditLimit - effectiveSpend;

    if (spendCents > availableSpendCents) {
      triggerErrorEffects();
      toastStore.show(
        `Spend amount exceeds your available credit limit (₱${(availableSpendCents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}).`,
        "error",
      );
      isSubmittingRef.current = false;
      return;
    }

    const projectedSpend = effectiveSpend + spendCents;
    const projectedUtil =
      selectedCard.creditLimit > 0
        ? (projectedSpend / selectedCard.creditLimit) * 100
        : 0;

    setSaving(true);
    const res = await recordSpend(selectedCard.id, spendCents, idempotencyKeyRef.current);

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );

      let toastMsg = "Spend recorded successfully!";
      let toastType: "success" | "warning" = "success";

      if (projectedUtil >= 50) {
        toastMsg = `Spend logged! Warning: Utilization is at ${projectedUtil.toFixed(0)}% (exceeds 50% danger limit).`;
        toastType = "warning";
      } else if (projectedUtil >= 30) {
        toastMsg = `Spend logged! Notice: Utilization is at ${projectedUtil.toFixed(0)}% (exceeds 30% warning limit).`;
        toastType = "warning";
      }

      toastStore.show(toastMsg, toastType);
      setSpendAmountPesos("");
      triggerNetworkUpdate();
      loadData();
      idempotencyKeyRef.current = generateUUID(); // refresh key on success
    } else {
      triggerErrorEffects();
      toastStore.show(res.error || "Failed to record spend", "error");
    }
    setSaving(false);
    isSubmittingRef.current = false;
  };

  // Record Mid Cycle Payment Action
  const handleRecordPayment = async () => {
    if (!selectedCard) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    if (saving) {
      isSubmittingRef.current = false;
      return;
    }

    const payAmt = parseFloat(paymentAmountPesos);
    if (isNaN(payAmt) || payAmt <= 0) {
      triggerErrorEffects();
      toastStore.show("Payment amount must be a positive number.", "error");
      isSubmittingRef.current = false;
      return;
    }

    const payCents = Math.round(payAmt * 100);
    const effectiveSpend =
      selectedCard.unbilledSpend - selectedCard.midCyclePaid;

    if (payCents > effectiveSpend) {
      triggerErrorEffects();
      toastStore.show(
        `Payment amount cannot exceed your unpaid balance (₱${(effectiveSpend / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}).`,
        "error",
      );
      isSubmittingRef.current = false;
      return;
    }

    setSaving(true);
    const res = await recordMidCyclePayment(selectedCard.id, payCents, idempotencyKeyRef.current);

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      toastStore.show("Payment recorded successfully!", "success");
      setPaymentAmountPesos("");
      triggerNetworkUpdate();
      loadData();
      idempotencyKeyRef.current = generateUUID(); // refresh key on success
    } else {
      triggerErrorEffects();
      toastStore.show(res.error || "Failed to record payment", "error");
    }
    setSaving(false);
    isSubmittingRef.current = false;
  };

  // Reset Billing Cycle Action
  const handleResetCard = () => {
    setShowResetConfirm(true);
  };

  const executeResetCard = async () => {
    if (!selectedCard) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    if (saving) {
      isSubmittingRef.current = false;
      return;
    }

    setSaving(true);
    const res = await resetCreditCard(selectedCard.id, idempotencyKeyRef.current);
    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      toastStore.show("Billing cycle reset successfully!", "success");
      setShowResetConfirm(false);
      triggerNetworkUpdate();
      loadData();
      idempotencyKeyRef.current = generateUUID(); // refresh key on success
    } else {
      triggerErrorEffects();
      toastStore.show(res.error || "Failed to reset credit card", "error");
    }
    setSaving(false);
    isSubmittingRef.current = false;
  };

  return (
    <FlatModal
      visible={isCreditCardModalOpen}
      onClose={handleClose}
      title="Credit Cards"
      headerIcon={
        <CardIcon size={20} color={Colors.actionPrimary} strokeWidth={2.5} />
      }
    >
      {loading ? (
        <View className="py-10 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
        </View>
      ) : (
        <Animated.View style={animatedStyle} className="w-full">
          {/* Custom Tab Switcher */}
          {creditCards.length > 0 && activeTab !== "CHOOSE" && (
            <View className="flex-row border border-border rounded-xl p-1 bg-backgroundLight mb-4">
              <TouchableOpacity
                onPress={() => setActiveTab("ADD")}
                className={`flex-1 py-2 rounded-lg items-center justify-center ${
                  activeTab === "ADD" ? "bg-backgroundDark" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-xs font-black uppercase tracking-wider ${
                    activeTab === "ADD"
                      ? "text-background"
                      : "text-textSecondary"
                  }`}
                >
                  Add Card
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab("MANAGE")}
                className={`flex-1 py-2 rounded-lg items-center justify-center ${
                  activeTab === "MANAGE"
                    ? "bg-backgroundDark"
                    : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-xs font-black uppercase tracking-wider ${
                    activeTab === "MANAGE"
                      ? "text-background"
                      : "text-textSecondary"
                  }`}
                >
                  Manage Cards ({creditCards.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 450 }}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            overScrollMode="never"
          >
            {activeTab === "CHOOSE" && (
              <View className="space-y-4 py-2">
                <Text className="text-textSecondary text-[10px] font-black uppercase tracking-widest text-center mb-4">
                  Select Option to Proceed
                </Text>

                {/* Option 1: Add Card */}
                <TouchableOpacity
                  onPress={() => setActiveTab("ADD")}
                  className="border border-border rounded-2xl p-5 bg-backgroundLight/50 items-center justify-center flex-row mb-3"
                >
                  <Plus
                    size={18}
                    color={Colors.actionPrimary}
                    style={{ marginRight: 10 }}
                    strokeWidth={3}
                  />
                  <Text className="text-xs font-black text-textPrimary uppercase tracking-widest">
                    Add Credit Card
                  </Text>
                </TouchableOpacity>

                {/* Option 2: Edit Card */}
                <TouchableOpacity
                  onPress={() => {
                    if (creditCards.length === 0) {
                      triggerErrorEffects();
                      toastStore.show(
                        "Please add a credit card first.",
                        "error",
                      );
                      return;
                    }
                    setActiveTab("MANAGE");
                  }}
                  className="border border-border rounded-2xl p-5 bg-backgroundLight/50 items-center justify-center flex-row mb-3"
                >
                  <Sliders
                    size={18}
                    color={Colors.textPrimary}
                    style={{ marginRight: 10 }}
                    strokeWidth={2.5}
                  />
                  <Text className="text-xs font-black text-textPrimary uppercase tracking-widest">
                    Edit Existing Card
                  </Text>
                </TouchableOpacity>

                {/* Warning message if they have no cards and edit is clicked */}
                {creditCards.length === 0 && (
                  <View className="border-2 border-warning/30 bg-warning/5 rounded-2xl p-4 flex-row items-start mt-2">
                    <AlertTriangle
                      size={18}
                      color={Colors.warning}
                      style={{ marginRight: 10, marginTop: 1 }}
                      strokeWidth={2.5}
                    />
                    <View className="flex-1">
                      <Text
                        className="text-[10px] font-black uppercase tracking-wider mb-1"
                        style={{ color: Colors.warning }}
                      >
                        No Credit Cards Found
                      </Text>
                      <Text className="text-textSecondary text-[11px] font-bold leading-relaxed">
                        You must create a Credit Card before you can manage or
                        edit one.
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {activeTab !== "CHOOSE" && (
              <TouchableOpacity
                onPress={() => {
                  if (editingCreditCard) {
                    useUIStore.getState().openCreditCardModal(null);
                  }
                  setActiveTab("CHOOSE");
                }}
                className="mb-4 self-start"
              >
                <Text className="text-[10px] font-black uppercase tracking-widest text-actionPrimary">
                  ← Back to Menu
                </Text>
              </TouchableOpacity>
            )}

            {activeTab === "MANAGE" &&
              creditCards.length > 0 &&
              selectedCard && (
                <View className="mb-4">
                  {/* Horizontal Card List Picker */}
                  <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-2">
                    Select Card to Manage
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row py-1 mb-2"
                  >
                    {creditCards.map((card) => {
                      const isSelected = selectedCard.id === card.id;
                      return (
                        <TouchableOpacity
                          key={card.id}
                          onPress={() => setSelectedCard(card)}
                          className={`border rounded-xl px-4 py-3 mr-2 ${
                            isSelected
                              ? "border-textPrimary bg-backgroundDark"
                              : "border-border bg-backgroundLight"
                          }`}
                        >
                          <Text
                            style={{
                              color: isSelected
                                ? Colors.background
                                : Colors.textPrimary,
                            }}
                            className="text-xs font-black"
                          >
                            {card.cardName}
                          </Text>
                          <Text
                            style={{
                              color: isSelected
                                ? `${Colors.background}b0`
                                : Colors.textSecondary,
                            }}
                            className="text-[9px] mt-0.5 font-bold uppercase"
                          >
                            Limit: ₱{(card.creditLimit / 100).toLocaleString()}{" "}
                            • Spend: ₱
                            {(card.unbilledSpend / 100).toLocaleString()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

            {activeTab !== "CHOOSE" && (
              <>
                <View className="space-y-4">
                  {/* Card Name */}
                  <View>
                    <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                      Card Name *
                    </Text>
                    <TextInput
                      value={cardName}
                      onChangeText={setCardName}
                      placeholder="e.g. UnionBank Rewards, BPI Blue"
                      placeholderTextColor={Colors.textMuted}
                      className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
                    />
                  </View>

                  {/* Credit Limit */}
                  <View className="mt-3">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                      Credit Limit (₱) *
                    </Text>
                    <TextInput
                      value={creditLimitPesos}
                      onChangeText={setCreditLimitPesos}
                      keyboardType="numeric"
                      placeholder="e.g. 50000"
                      placeholderTextColor={Colors.textMuted}
                      className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
                    />
                  </View>

                  {/* Due Date & Cutoff Dates */}
                  <View className="flex-row mt-3 space-x-3">
                    <View className="flex-1">
                      <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                        Cutoff Day (1-31) *
                      </Text>
                      <TextInput
                        value={cutoffDay}
                        onChangeText={setCutoffDay}
                        keyboardType="numeric"
                        placeholder="e.g. 15"
                        placeholderTextColor={Colors.textMuted}
                        className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
                      />
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                        Due Day (1-31) *
                      </Text>
                      <TextInput
                        value={dueDay}
                        onChangeText={setDueDay}
                        keyboardType="numeric"
                        placeholder="e.g. 5"
                        placeholderTextColor={Colors.textMuted}
                        className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
                      />
                    </View>
                  </View>

                  {/* Link to Macro Asset */}
                  <View className="mt-3">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                      Link to Cash Stash (Macro Asset)
                    </Text>
                    {macroAssets.length === 0 ? (
                      <Text className="text-[11px] font-semibold text-textSecondary italic py-2">
                        No macro assets created yet. Create one to link this
                        card.
                      </Text>
                    ) : (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        className="flex-row py-1 mb-2"
                      >
                        {/* None Option */}
                        <TouchableOpacity
                          onPress={() => setSelectedMacroAssetId(null)}
                          className={`border rounded-xl px-3 py-2.5 mr-2 items-center justify-center ${
                            selectedMacroAssetId === null
                              ? "border-textPrimary bg-backgroundDark"
                              : "border-border bg-backgroundLight"
                          }`}
                        >
                          <Text
                            style={{
                              color:
                                selectedMacroAssetId === null
                                  ? Colors.background
                                  : Colors.textPrimary,
                            }}
                            className="text-xs font-black uppercase tracking-wider"
                          >
                            Unlinked (None)
                          </Text>
                        </TouchableOpacity>

                        {macroAssets.map((asset) => {
                          const isSelected = selectedMacroAssetId === asset.id;
                          return (
                            <TouchableOpacity
                              key={asset.id}
                              onPress={() => setSelectedMacroAssetId(asset.id)}
                              className={`border rounded-xl px-3.5 py-2.5 mr-2 ${
                                isSelected
                                  ? "border-textPrimary bg-backgroundDark"
                                  : "border-border bg-backgroundLight"
                              }`}
                            >
                              <Text
                                style={{
                                  color: isSelected
                                    ? Colors.background
                                    : Colors.textPrimary,
                                }}
                                className="text-xs font-black"
                              >
                                {asset.bankName} - {asset.purpose}
                              </Text>
                              <Text
                                style={{
                                  color: isSelected
                                    ? `${Colors.background}b0`
                                    : Colors.textSecondary,
                                }}
                                className="text-[9px] mt-0.5 font-bold uppercase"
                              >
                                Stash Balance: ₱
                                {(asset.balance / 100).toLocaleString()}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  {/* Quick Transaction Updates (Only in MANAGE mode) */}
                  {activeTab === "MANAGE" && selectedCard && (
                    <View className="border-t border-borderLight pt-4 mt-4">
                      <Text className="text-[10px] font-black uppercase tracking-widest text-textPrimary mb-3">
                        Quick Transactions
                      </Text>

                      {/* Available Spend and Unpaid Balance Stats */}
                      <View className="flex-row justify-between items-center bg-backgroundLight p-3.5 rounded-xl border border-border mb-4">
                        <View>
                          <Text className="text-[8px] font-black uppercase tracking-widest text-textSecondary mb-0.5">
                            Available to Spend
                          </Text>
                          <Text className="text-xs font-black text-emerald-600">
                            ₱
                            {(
                              (selectedCard.creditLimit -
                                (selectedCard.unbilledSpend -
                                  selectedCard.midCyclePaid)) /
                              100
                            ).toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-[8px] font-black uppercase tracking-widest text-textSecondary mb-0.5">
                            Unpaid Balance
                          </Text>
                          <Text className="text-xs font-black text-textPrimary">
                            ₱
                            {(
                              (selectedCard.unbilledSpend -
                                selectedCard.midCyclePaid) /
                              100
                            ).toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })}
                          </Text>
                        </View>
                      </View>

                      {/* Record Spend */}
                      <View className="space-y-1.5 mb-4">
                        <View className="flex-row items-end space-x-2">
                          <View className="flex-1">
                            <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                              Spend Amount (₱)
                            </Text>
                            <TextInput
                              value={spendAmountPesos}
                              onChangeText={setSpendAmountPesos}
                              keyboardType="numeric"
                              placeholder="0.00"
                              placeholderTextColor={Colors.textMuted}
                              className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
                            />
                          </View>
                          <TouchableOpacity
                            onPress={handleRecordSpend}
                            disabled={saving}
                            className="rounded-xl px-4 py-3 ml-2 flex-row items-center justify-center"
                            style={{ backgroundColor: Colors.actionPrimary }}
                          >
                            <DollarSign
                              size={14}
                              color={Colors.background}
                              style={{ marginRight: 4 }}
                            />
                            <Text className="text-background text-xs font-black uppercase tracking-wider">
                              Log Spend
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {(() => {
                          const spendAmt = parseFloat(spendAmountPesos);
                          if (isNaN(spendAmt) || spendAmt <= 0) return null;
                          const spendCents = Math.round(spendAmt * 100);
                          const effectiveSpend =
                            selectedCard.unbilledSpend -
                            selectedCard.midCyclePaid;
                          const projectedSpend = effectiveSpend + spendCents;
                          const projectedUtil =
                            selectedCard.creditLimit > 0
                              ? (projectedSpend / selectedCard.creditLimit) *
                                100
                              : 0;

                          if (projectedUtil >= 50) {
                            return (
                              <Text className="text-[9px] font-bold text-red-500 uppercase tracking-wide mt-1">
                                ⚠️ Warning: Pushes utilization to{" "}
                                {projectedUtil.toFixed(0)}% (exceeds 50% danger
                                threshold)
                              </Text>
                            );
                          }
                          if (projectedUtil >= 30) {
                            return (
                              <Text className="text-[9px] font-bold text-amber-500 uppercase tracking-wide mt-1">
                                ⚠️ Notice: Pushes utilization to{" "}
                                {projectedUtil.toFixed(0)}% (exceeds 30% warning
                                threshold)
                              </Text>
                            );
                          }
                          return null;
                        })()}
                      </View>

                      {/* Record Mid-Cycle Payment */}
                      <View className="flex-row items-end space-x-2 mb-1">
                        <View className="flex-1">
                          <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                            Payment Amount (₱)
                          </Text>
                          <TextInput
                            value={paymentAmountPesos}
                            onChangeText={setPaymentAmountPesos}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={Colors.textMuted}
                            className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
                          />
                        </View>
                        <TouchableOpacity
                          onPress={handleRecordPayment}
                          disabled={saving}
                          className="rounded-xl px-4 py-3 ml-2 flex-row items-center justify-center bg-emerald-600"
                        >
                          <Landmark
                            size={14}
                            color={Colors.background}
                            style={{ marginRight: 4 }}
                          />
                          <Text className="text-background text-xs font-black uppercase tracking-wider">
                            Log Pay
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Reset Billing Cycle */}
                      {showResetConfirm ? (
                        <View className="border-2 border-t-2 border-error/30 bg-error/5 rounded-2xl p-2 mt-2 space-y-3">
                          <View className="flex-row items-start">
                            <AlertTriangle
                              size={16}
                              color={Colors.error}
                              style={{ marginRight: 10, marginTop: 1 }}
                              strokeWidth={2.5}
                            />
                            <View className="flex-1">
                              <Text className="text-[10px] font-black uppercase tracking-widest text-error mb-0.5">
                                Reset Billing Cycle?
                              </Text>
                              <Text className="text-[10px] text-textSecondary font-bold leading-normal">
                                This will wipe out all unbilled spend and early
                                payments for {selectedCard.cardName} back to
                                ₱0.00.
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row space-x-2.5 justify-end mt-2">
                            <TouchableOpacity
                              onPress={() => setShowResetConfirm(false)}
                              disabled={saving}
                              className="border border-border bg-backgroundLight rounded-xl px-3 py-1.5"
                            >
                              <Text className="text-[9px] font-black uppercase tracking-widest text-textSecondary">
                                Cancel
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={executeResetCard}
                              disabled={saving}
                              className="bg-error rounded-xl px-3 py-1.5 ml-2"
                            >
                              <Text className="text-background text-[9px] font-black uppercase tracking-widest">
                                Confirm Reset
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View className="border-t border-borderLight pt-4 mt-2 flex-row items-center justify-between">
                          <View className="flex-1 mr-4">
                            <Text className="text-[10px] font-black uppercase tracking-widest text-textPrimary mb-0.5">
                              New Billing Cycle
                            </Text>
                            <Text className="text-[9px] text-textSecondary font-bold leading-normal">
                              Reset unbilled spend and early payments to ₱0.00.
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={handleResetCard}
                            disabled={saving}
                            className="rounded-xl px-4 py-2.5 flex-row items-center justify-center bg-backgroundDark border border-border"
                          >
                            <RotateCcw
                              size={12}
                              color={Colors.background}
                              style={{ marginRight: 6 }}
                              strokeWidth={3}
                            />
                            <Text className="text-background text-xs font-black uppercase tracking-wider">
                              Reset
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View className="mt-3 flex-row space-x-3 border-t border-borderLight pt-2">
                  {activeTab === "MANAGE" && selectedCard ? (
                    <TouchableOpacity
                      onPress={handleUpdateCard}
                      disabled={saving}
                      className="flex-1 items-center justify-center rounded-2xl py-3"
                      style={{ backgroundColor: Colors.actionPrimary }}
                    >
                      {saving ? (
                        <ActivityIndicator
                          size="small"
                          color={Colors.background}
                        />
                      ) : (
                        <Text className="text-background font-black uppercase tracking-widest text-xs">
                          Save Changes
                        </Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={handleClose}
                        className="flex-1 items-center justify-center border border-border bg-backgroundLight rounded-2xl py-3"
                      >
                        <Text className="text-textSecondary font-black uppercase tracking-widest text-xs">
                          Cancel
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleAddCard}
                        disabled={saving}
                        className="flex-1 items-center justify-center rounded-2xl py-3 ml-3"
                        style={{ backgroundColor: Colors.actionPrimary }}
                      >
                        {saving ? (
                          <ActivityIndicator
                            size="small"
                            color={Colors.background}
                          />
                        ) : (
                          <Text className="text-background font-black uppercase tracking-widest text-xs">
                            Add Card
                          </Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </FlatModal>
  );
}
