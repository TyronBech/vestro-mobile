import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { Landmark, Camera, Trash2 } from "lucide-react-native";
import FlatModal from "./flat-modal";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useUIStore } from "../store/ui-store";
import { useToastStore } from "../store/toast-store";
import { createMacroAsset } from "../services/api/endpoints/macro-assets";
import { uploadImageToSupabase } from "../utils/upload";
import { Colors } from "../../constants/colors";

export default function MacroAssetModal() {
  const { isMacroAssetModalOpen, closeMacroAssetModal, triggerNetworkUpdate } = useUIStore();
  const toastStore = useToastStore();

  const [saving, setSaving] = useState(false);
  const [bankName, setBankName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [balance, setBalance] = useState("");
  const [targetGoal, setTargetGoal] = useState("");
  const [colorCode, setColorCode] = useState("#373737");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const resetForm = () => {
    setBankName("");
    setPurpose("");
    setBalance("");
    setTargetGoal("");
    setColorCode("#373737");
    setImageUri(null);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toastStore.show("Permission to access media library is required.", "error");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      toastStore.show("Failed to pick image.", "error");
    }
  };

  const handleSave = async () => {
    if (!bankName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Bank Name is required.", "error");
      return;
    }
    if (!purpose.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Purpose is required.", "error");
      return;
    }

    const numBalance = parseFloat(balance) || 0;
    if (numBalance < 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Balance cannot be negative.", "error");
      return;
    }

    const numTargetGoal = targetGoal.trim() ? parseFloat(targetGoal) : null;
    if (numTargetGoal !== null && numTargetGoal <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Target Goal must be greater than zero.", "error");
      return;
    }

    // Color code validation (must be valid 6-character hex code starting with #)
    const hexRegex = /^#[0-9a-fA-F]{6}$/;
    if (colorCode && !hexRegex.test(colorCode)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show("Color code must be a valid hex color (e.g. #373737).", "error");
      return;
    }

    setSaving(true);
    
    // 1. Upload to Supabase if local image uri exists
    let uploadedUrl: string | null = null;
    if (imageUri) {
      try {
        uploadedUrl = await uploadImageToSupabase(imageUri);
      } catch (err: any) {
        setSaving(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        toastStore.show(err.message || "Failed to upload icon image.", "error");
        return;
      }
    }

    // Convert inputs to cents (Cents Rule)
    const balanceInCents = Math.round(numBalance * 100);
    const targetGoalInCents = numTargetGoal !== null ? Math.round(numTargetGoal * 100) : null;

    const res = await createMacroAsset({
      bankName: bankName.trim(),
      purpose: purpose.trim(),
      balance: balanceInCents,
      targetGoal: targetGoalInCents,
      colorCode: colorCode.trim(),
      iconUrl: uploadedUrl,
    });

    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toastStore.show("Macro Asset added successfully!", "success");
      triggerNetworkUpdate();
      resetForm();
      closeMacroAssetModal();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      toastStore.show(res.error || "Failed to create macro asset", "error");
    }
    setSaving(false);
  };

  const handleClose = () => {
    resetForm();
    closeMacroAssetModal();
  };

  return (
    <FlatModal
      visible={isMacroAssetModalOpen}
      onClose={handleClose}
      title="Add Macro Asset"
      headerIcon={<Landmark size={20} color={Colors.actionPrimary} strokeWidth={2.5} />}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
        <View className="space-y-4">
          {/* Bank Name */}
          <View>
            <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
              Bank Name *
            </Text>
            <TextInput
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. BPI, LANDBANK, GCash"
              placeholderTextColor={Colors.textMuted}
              className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
            />
          </View>

          {/* Purpose */}
          <View className="mt-3">
            <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
              Purpose / Label *
            </Text>
            <TextInput
              value={purpose}
              onChangeText={setPurpose}
              placeholder="e.g. Emergency Fund, Payroll Catch"
              placeholderTextColor={Colors.textMuted}
              className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
            />
          </View>

          {/* Initial Balance */}
          <View className="mt-3">
            <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
              Initial Balance (₱)
            </Text>
            <TextInput
              value={balance}
              onChangeText={setBalance}
              keyboardType="numeric"
              placeholder="e.g. 50000"
              placeholderTextColor={Colors.textMuted}
              className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
            />
          </View>

          {/* Target Goal */}
          <View className="mt-3">
            <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
              Target Goal (₱, Optional)
            </Text>
            <TextInput
              value={targetGoal}
              onChangeText={setTargetGoal}
              keyboardType="numeric"
              placeholder="e.g. 150000"
              placeholderTextColor={Colors.textMuted}
              className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
            />
          </View>

          {/* Color Code */}
          <View className="mt-3">
            <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
              Color Code Hex (Optional)
            </Text>
            <TextInput
              value={colorCode}
              onChangeText={setColorCode}
              placeholder="e.g. #373737"
              placeholderTextColor={Colors.textMuted}
              className="border border-border rounded-xl px-4 py-2.5 text-sm font-bold text-textPrimary bg-backgroundLight"
            />
          </View>

          {/* Icon Image File Upload */}
          <View className="mt-3">
            <Text className="text-[10px] font-black uppercase tracking-widest text-textSecondary mb-1.5">
              Bucket Icon (Optional)
            </Text>
            {imageUri ? (
              <View className="border border-border rounded-xl p-3 bg-backgroundLight flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: 44, height: 44, borderRadius: 8, marginRight: 12 }}
                  />
                  <Text className="text-xs font-bold text-textPrimary uppercase tracking-wider max-w-[180px]" numberOfLines={1}>
                    Selected Icon
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setImageUri(null)}
                  className="bg-error/10 p-2 rounded-xl"
                >
                  <Trash2 size={16} color={Colors.error} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickImage}
                className="border-2 border-dashed border-border rounded-xl p-5 bg-backgroundLight/50 items-center justify-center flex-row"
              >
                <Camera size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} strokeWidth={2.5} />
                <Text className="text-xs font-black uppercase tracking-wider text-textSecondary">
                  Upload Icon Image
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action Buttons */}
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
                Add Asset
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </FlatModal>
  );
}
