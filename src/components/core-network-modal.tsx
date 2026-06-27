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
import { ChartNetwork, AlertTriangle } from "lucide-react-native";
import FlatModal from "./flat-modal";
import * as Haptics from "expo-haptics";
import { useUIStore } from "../store/ui-store";
import { useToastStore } from "../store/toast-store";
import { createCoreNetwork, updateCoreNetwork, fetchCoreNetworks, CoreNetwork, CoreNetworkType } from "../services/api/endpoints/core-networks";
import { fetchMacroAssets, MacroAsset } from "../services/api/endpoints/macro-assets";
import { Colors } from "../../constants/colors";

const CORE_NETWORK_TYPES: CoreNetworkType[] = [
  "PAYCHECK",
  "EMERGENCY_FUND",
  "RENT",
  "WANTS_SANDBOX",
  "INVESTMENTS",
  "INSURANCE",
  "CREDIT_BUFFER",
  "PERSONAL_GOAL",
  "SAVINGS_VAULT",
  "CREDIT_CARD",
  "UTILITIES",
];

export default function CoreNetworkModal() {
  const {
    isCoreNetworkModalOpen,
    closeCoreNetworkModal,
    openMacroAssetModal,
    triggerNetworkUpdate,
    networkUpdateTrigger,
    editingCoreNetwork,
  } = useUIStore();
  
  const toastStore = useToastStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [macroAssets, setMacroAssets] = useState<MacroAsset[]>([]);
  const [networkNodes, setNetworkNodes] = useState<CoreNetwork[]>([]);

  // Form states
  const [selectedMacroAssetId, setSelectedMacroAssetId] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [percentage, setPercentage] = useState("");
  const [selectedType, setSelectedType] = useState<CoreNetworkType | null>(null);

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
    if (isCoreNetworkModalOpen) {
      if (editingCoreNetwork) {
        setName(editingCoreNetwork.name);
        setDescription(editingCoreNetwork.description || "");
        setPercentage(editingCoreNetwork.percentage.toString());
        setSelectedParentId(editingCoreNetwork.parentId);
        setSelectedMacroAssetId(editingCoreNetwork.macroAssetId);
        setSelectedType(editingCoreNetwork.type);
        loadFormData(editingCoreNetwork.macroAssetId);
      } else {
        loadFormData();
      }
    }
  }, [isCoreNetworkModalOpen, networkUpdateTrigger, editingCoreNetwork]);

  const loadFormData = async (defaultAssetId?: string) => {
    setLoading(true);
    const [assetsRes, networkRes] = await Promise.all([
      fetchMacroAssets(),
      fetchCoreNetworks(),
    ]);

    if (assetsRes.ok) {
      setMacroAssets(assetsRes.value);
      if (assetsRes.value.length > 0 && !defaultAssetId && !selectedMacroAssetId) {
        setSelectedMacroAssetId(assetsRes.value[0]!.id);
      } else if (defaultAssetId) {
        setSelectedMacroAssetId(defaultAssetId);
      }
    }
    if (networkRes.ok) {
      // Exclude the current node itself from selector choices when editing to prevent cyclic parenting
      const nodes = editingCoreNetwork
        ? networkRes.value.filter((n) => n.id !== editingCoreNetwork.id)
        : networkRes.value;
      setNetworkNodes(nodes);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setPercentage("");
    setSelectedParentId(null);
    setSelectedType(null);
    if (macroAssets.length > 0) {
      setSelectedMacroAssetId(macroAssets[0]!.id);
    } else {
      setSelectedMacroAssetId("");
    }
  };

  const handleSave = async () => {
    if (!selectedMacroAssetId) {
      triggerErrorEffects();
      toastStore.show("Macro Asset selection is required.", "error");
      return;
    }
    if (!name.trim()) {
      triggerErrorEffects();
      toastStore.show("Name is required.", "error");
      return;
    }

    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      triggerErrorEffects();
      toastStore.show("Percentage must be a number between 0 and 100.", "error");
      return;
    }

    // Limit check: children sum must not exceed parent's absolute percentage (matching backend)
    let maxAllowed = 100;
    let allocatedSum = 0;
    if (selectedParentId) {
      const parentNode = networkNodes.find((n) => n.id === selectedParentId);
      if (!parentNode) {
        triggerErrorEffects();
        toastStore.show("Selected parent node not found.", "error");
        return;
      }
      maxAllowed = parentNode.percentage; // Limit is the parent's absolute percentage
      const siblings = networkNodes.filter(
        (n) => n.parentId === selectedParentId && (!editingCoreNetwork || n.id !== editingCoreNetwork.id)
      );
      allocatedSum = siblings.reduce((sum, n) => sum + n.percentage, 0);
    } else {
      const roots = networkNodes.filter(
        (n) => n.parentId === null && (!editingCoreNetwork || n.id !== editingCoreNetwork.id)
      );
      allocatedSum = roots.reduce((sum, n) => sum + n.percentage, 0);
    }

    if (allocatedSum + pct > maxAllowed) {
      triggerErrorEffects();
      toastStore.show(
        `Allocation exceeds limit. Max remaining available is ${maxAllowed - allocatedSum}%.`,
        "error"
      );
      return;
    }

    setSaving(true);
    let res;
    if (editingCoreNetwork) {
      res = await updateCoreNetwork(editingCoreNetwork.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        percentage: pct,
        type: selectedType,
      });
    } else {
      res = await createCoreNetwork({
        macroAssetId: selectedMacroAssetId,
        parentId: selectedParentId,
        name: name.trim(),
        description: description.trim() || undefined,
        percentage: pct,
        type: selectedType,
      });
    }

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toastStore.show("Core Network Node created successfully!", "success");
      triggerNetworkUpdate();
      resetForm();
      closeCoreNetworkModal();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show(res.error || "Failed to create core network node", "error");
    }
    setSaving(false);
  };

  const handleClose = () => {
    resetForm();
    closeCoreNetworkModal();
  };

  const switchToMacroAsset = () => {
    closeCoreNetworkModal();
    setTimeout(() => {
      openMacroAssetModal();
    }, 150);
  };

  return (
    <FlatModal
      visible={isCoreNetworkModalOpen}
      onClose={handleClose}
      title={editingCoreNetwork ? "Edit Network Node" : "Add Network Node"}
      headerIcon={<ChartNetwork size={20} color={Colors.actionPrimary} strokeWidth={2.5} />}
    >
      {loading ? (
        <View className="py-10 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
        </View>
      ) : macroAssets.length === 0 ? (
        <View className="py-6 items-center">
          <View className="border-2 border-warning/30 bg-warning/5 rounded-2xl p-4 mb-6 flex-row items-start">
            <AlertTriangle size={18} color={Colors.warning} style={{ marginRight: 10, marginTop: 1 }} strokeWidth={2.5} />
            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: Colors.warning }}>
                No Macro Assets Found
              </Text>
              <Text className="text-textSecondary text-[11px] font-bold leading-relaxed">
                Every network routing node must link to a Macro Asset (Bank Bucket). Please create a Macro Asset bucket first.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={switchToMacroAsset}
            className="w-full items-center justify-center rounded-2xl py-3"
            style={{ backgroundColor: Colors.actionPrimary }}
          >
            <Text className="text-background font-black uppercase tracking-widest text-xs">
              Create Macro Asset
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={animatedStyle}>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
          <View className="space-y-4">
            {/* Macro Asset Selector */}
            <View>
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Select Bank Bucket (Macro Asset) *
              </Text>
              {editingCoreNetwork ? (
                <View className="border border-borderLight rounded-xl px-4 py-3 bg-backgroundLight/50 flex-row items-center">
                  <View
                    className="w-2.5 h-2.5 rounded-full mr-2"
                    style={{ backgroundColor: macroAssets.find((a) => a.id === selectedMacroAssetId)?.colorCode || Colors.textSecondary }}
                  />
                  <Text className="text-xs font-bold text-textPrimary uppercase">
                    {macroAssets.find((a) => a.id === selectedMacroAssetId)?.bankName || "Unknown Bank"} - {macroAssets.find((a) => a.id === selectedMacroAssetId)?.purpose || ""}
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                  {macroAssets.map((asset) => {
                    const isSelected = selectedMacroAssetId === asset.id;
                    return (
                      <TouchableOpacity
                        key={asset.id}
                        onPress={() => setSelectedMacroAssetId(asset.id)}
                        className={`border rounded-xl px-3 py-2 mr-2 flex-row items-center ${
                          isSelected ? "border-textPrimary bg-backgroundDark" : "border-border bg-backgroundLight"
                        }`}
                      >
                        <View
                          className="w-2.5 h-2.5 rounded-full mr-2"
                          style={{ backgroundColor: asset.colorCode || Colors.textSecondary }}
                        />
                        <Text
                          style={{ color: isSelected ? Colors.background : Colors.textPrimary }}
                          className="text-xs font-bold"
                        >
                          {asset.bankName} - {asset.purpose}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Parent Node Selector */}
            <View className="mt-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Parent Routing Node (Tree Structure)
              </Text>
              {editingCoreNetwork ? (
                <View className="border border-borderLight rounded-xl px-4 py-3 bg-backgroundLight/50">
                  <Text className="text-xs font-bold text-textPrimary uppercase">
                    {selectedParentId 
                      ? networkNodes.find((n) => n.id === selectedParentId)?.name || "Parent Node"
                      : "Root Node (None)"}
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
                  <TouchableOpacity
                    onPress={() => setSelectedParentId(null)}
                    className={`border rounded-xl px-3.5 py-2.5 mr-2 ${
                      selectedParentId === null ? "border-textPrimary bg-backgroundDark" : "border-border bg-backgroundLight"
                    }`}
                  >
                    <Text
                      style={{ color: selectedParentId === null ? Colors.background : Colors.textPrimary }}
                      className="text-xs font-black uppercase tracking-wider"
                    >
                      Root Node (None)
                    </Text>
                    {(() => {
                      const roots = networkNodes.filter((n) => n.parentId === null);
                      const allocatedPct = roots.reduce((sum, n) => sum + n.percentage, 0);
                      const remainingPct = 100 - allocatedPct;
                      return (
                        <Text
                          style={{ color: selectedParentId === null ? `${Colors.background}b0` : Colors.textSecondary }}
                          className="text-[9px] mt-0.5 font-bold"
                        >
                          Allocated: {allocatedPct}% / 100% (Avail: {remainingPct}%)
                        </Text>
                      );
                    })()}
                  </TouchableOpacity>
                  {networkNodes.map((node) => {
                    const isSelected = selectedParentId === node.id;
                    const asset = macroAssets.find((a) => a.id === node.macroAssetId);
                    const bankName = asset ? asset.bankName : "Unknown Bank";
                    
                    // Calculate child allocation of this node
                    const children = networkNodes.filter((n) => n.parentId === node.id);
                    const allocatedPct = children.reduce((sum, n) => sum + n.percentage, 0);
                    const limit = node.percentage;
                    const remainingPct = limit - allocatedPct;
                    
                    return (
                      <TouchableOpacity
                        key={node.id}
                        onPress={() => setSelectedParentId(node.id)}
                        className={`border rounded-xl px-3.5 py-2.5 mr-2 ${
                          isSelected ? "border-textPrimary bg-backgroundDark" : "border-border bg-backgroundLight"
                        }`}
                      >
                        <Text
                          style={{ color: isSelected ? Colors.background : Colors.textPrimary }}
                          className="text-xs font-black"
                        >
                          {bankName} • {node.name}
                        </Text>
                        <Text
                          style={{ color: isSelected ? `${Colors.background}b0` : Colors.textSecondary }}
                          className="text-[9px] mt-0.5 font-bold"
                        >
                          Allocated: {allocatedPct}% / {limit}% (Avail: {remainingPct}%)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Node Name */}
            <View className="mt-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Node Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Salary Router, Emergency Split"
                placeholderTextColor={Colors.textMuted}
                className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
              />
            </View>

            {/* Description */}
            <View className="mt-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Description (Optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Distributes monthly pay"
                placeholderTextColor={Colors.textMuted}
                className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
              />
            </View>

            {/* Percentage Allocation */}
            <View className="mt-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Allocation Percentage (0 - 100%) *
              </Text>
              <TextInput
                value={percentage}
                onChangeText={setPercentage}
                keyboardType="numeric"
                placeholder="e.g. 50"
                placeholderTextColor={Colors.textMuted}
                className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
              />
            </View>

            {/* Node Type Pill Selection */}
            <View className="mt-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
                Core Network Node Type
              </Text>
              <View className="flex-row flex-wrap mt-1">
                {CORE_NETWORK_TYPES.map((type) => {
                  const isSelected = selectedType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setSelectedType(type)}
                      className={`border rounded-full px-3 py-1.5 mr-2 mb-2 ${
                        isSelected ? "border-textPrimary bg-actionPrimary" : "border-border bg-backgroundLight"
                      }`}
                    >
                      <Text
                        style={{ color: isSelected ? Colors.background : Colors.textPrimary }}
                        className="text-[10px] font-black tracking-wider uppercase"
                      >
                        {type.replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Save Button */}
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
                  {editingCoreNetwork ? "Update Node" : "Create Node"}
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
