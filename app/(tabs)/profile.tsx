import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Modal, TextInput, Switch, Clipboard, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, SharedValue } from "react-native-reanimated";
import { User, Mail, ShieldCheck, Edit3, Settings, ShieldAlert, Key, ClipboardCopy, X, Check, ArrowRight, ShieldCheck as ShieldIcon, Fingerprint, Camera } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from "../../src/store/auth-store";
import { useToastStore } from "../../src/store/toast-store";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { Strings } from "../../constants/string";
import { apiUpdateProfile } from "../../src/services/api/endpoints/profile";
import { apiEnableBiometrics, apiDisableBiometrics, apiGenerate2fa, apiEnable2fa, apiDisable2fa } from "../../src/services/api/endpoints/auth";
import { SECURE_STORE_KEYS, SECURE_STORE_OPTIONS } from "../../src/services/api/config";
import { uploadImageToSupabase } from "../../src/utils/upload";

export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const toast = useToastStore();

  const [refreshing, setRefreshing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editPanicMode, setEditPanicMode] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // 2FA registration fields
  const [totpSecret, setTotpSecret] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading2fa, setLoading2fa] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [hasLocalBiometricKey, setHasLocalBiometricKey] = useState(false);

  useEffect(() => {
    const checkLocalKey = async () => {
      const storedKey = await SecureStore.getItemAsync(
        SECURE_STORE_KEYS.BIOMETRIC_KEY,
        SECURE_STORE_OPTIONS
      );
      setHasLocalBiometricKey(!!storedKey);
    };
    checkLocalKey();
  }, [user]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Card/Modal shake offsets
  const editShakeOffset = useSharedValue(0);
  const twoFactorShakeOffset = useSharedValue(0);

  const editAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: editShakeOffset.value }],
  }));

  const twoFactorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: twoFactorShakeOffset.value }],
  }));

  // Trigger shake and error haptics
  const triggerShake = (offsetSharedValue: SharedValue<number>) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {}

    offsetSharedValue.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    try {
      await refreshProfile();
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } catch (err) {
      console.error("Profile screen refresh failed:", err);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {}
      toast.show("Failed to refresh profile", "error");
    } finally {
      setRefreshing(false);
    }
  }, [refreshProfile, toast]);

  // Open edit profile form
  const openEditModal = () => {
    if (!user) return;
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditLimit(user.spendingLimit !== undefined && user.spendingLimit !== null ? (user.spendingLimit / 100).toString() : "");
    setEditPanicMode(user.panicModeEnabled || false);
    setIsEditModalOpen(true);
  };

  // Submit profile changes
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.show(Strings.validationNameRequired, "error");
      triggerShake(editShakeOffset);
      return;
    }
    if (!editEmail.trim() || !editEmail.includes("@")) {
      toast.show(Strings.validationEmailRequired, "error");
      triggerShake(editShakeOffset);
      return;
    }

    setLoadingEdit(true);
    try {
      const limitVal = parseFloat(editLimit);
      const spendingLimitInCents = isNaN(limitVal) ? null : Math.round(limitVal * 100);

      const response = await apiUpdateProfile({
        name: editName,
        email: editEmail,
        spendingLimit: spendingLimitInCents,
        panicModeEnabled: editPanicMode,
      });

      await refreshProfile();
      setIsEditModalOpen(false);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      toast.show("Profile updated!", "success");
    } catch (err: any) {
      console.error("Failed to update profile", err);
      toast.show(err.message || "Failed to update profile", "error");
      triggerShake(editShakeOffset);
    } finally {
      setLoadingEdit(false);
    }
  };

  // Toggle biometric status
  const handleBiometricToggle = async (value: boolean) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    if (!value) {
      // Disabling Biometrics
      try {
        await apiDisableBiometrics();
        await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.BIOMETRIC_KEY, SECURE_STORE_OPTIONS);
        await refreshProfile();
        setHasLocalBiometricKey(false);
        toast.show("Biometrics disabled", "success");
      } catch (err: any) {
        toast.show(err.message || "Failed to disable biometrics", "error");
      }
    } else {
      // Enabling Biometrics
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        toast.show("Biometrics not set up or not supported on this device", "warning");
        return;
      }

      // Verify device biometric credentials before enabling on backend
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirm FaceID/Fingerprint to enable Vestro Biometrics",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

      if (result.success) {
        try {
          const response = await apiEnableBiometrics();
          const { biometricKey } = response.data;

          // Save the enclave key securely on device
          await SecureStore.setItemAsync(
            SECURE_STORE_KEYS.BIOMETRIC_KEY,
            biometricKey,
            SECURE_STORE_OPTIONS
          );

          await refreshProfile();
          setHasLocalBiometricKey(true);
          toast.show("Biometrics linked successfully!", "success");
        } catch (err: any) {
          toast.show(err.message || "Failed to enable biometrics", "error");
        }
      } else {
        toast.show("Biometrics verification failed", "warning");
      }
    }
  };

  // Toggle 2FA status
  const handle2faToggle = async (value: boolean) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}

    if (!value) {
      // Disable 2FA
      try {
        await apiDisable2fa();
        await refreshProfile();
        toast.show("2FA shield disabled", "success");
      } catch (err: any) {
        toast.show(err.message || "Failed to disable 2FA", "error");
      }
    } else {
      // Begin 2FA setup modal
      setTotpCode("");
      setLoading2fa(true);
      try {
        const response = await apiGenerate2fa();
        const { secret, otpauthUrl } = response.data;
        setTotpSecret(secret);
        setTotpUri(otpauthUrl);
        setIs2faModalOpen(true);
      } catch (err: any) {
        toast.show(err.message || "Failed to initiate 2FA", "error");
      } finally {
        setLoading2fa(false);
      }
    }
  };

  // Verify and enable 2FA
  const handleVerify2fa = async () => {
    if (totpCode.length !== 6) {
      toast.show("TOTP verification code must be 6 digits", "error");
      triggerShake(twoFactorShakeOffset);
      return;
    }

    setLoading2fa(true);
    try {
      if (!user) return;
      await apiEnable2fa({
        userId: user.id,
        token: totpCode,
      });

      await refreshProfile();
      setIs2faModalOpen(false);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
      toast.show("2FA Shield active!", "success");
    } catch (err: any) {
      toast.show(err.message || "Invalid verification code", "error");
      triggerShake(twoFactorShakeOffset);
    } finally {
      setLoading2fa(false);
    }
  };

  const handleCopySecret = () => {
    Clipboard.setString(totpSecret);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    toast.show("Secret key copied to clipboard", "success");
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.show(Strings.validationMediaPermissionRequired, "error");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        setUploadingAvatar(true);
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
        
        // 1. Upload to Supabase Storage
        const uploadedUrl = await uploadImageToSupabase(pickedUri);
        
        // 2. Update user profile on backend
        await apiUpdateProfile({ avatarUrl: uploadedUrl });
        
        // 3. Refresh profile state
        await refreshProfile();
        
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {}
        toast.show("Avatar updated successfully!", "success");
      }
    } catch (error: any) {
      console.error("Error updating avatar:", error);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {}
      toast.show(error.message || "Failed to update avatar.", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    await logout();
    toast.show("Logged out securely", "info");
  };

  const formatCurrency = (amountInCents: number, currencyCode?: string | null) => {
    const baseAmount = amountInCents / 100;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: currencyCode || "PHP",
    }).format(baseAmount);
  };

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }} className="items-center justify-center">
        <Text className="text-textPrimary font-bold text-sm tracking-wider uppercase">Loading profile...</Text>
      </View>
    );
  }

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
        {/* Header */}
        <View className="items-center mb-8 mt-4">
          <Text className="text-3xl font-black tracking-widest text-textPrimary uppercase">
            PROFILE
          </Text>
          <Text className="text-xs uppercase tracking-widest text-textMuted mt-1">
            Vestro Secure Account
          </Text>
        </View>

        {/* User Card */}
        <View className="border border-borderLight rounded-2xl p-5 bg-backgroundDark mb-6 flex-row items-center">
          {/* Avatar Area */}
          <TouchableOpacity
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
            activeOpacity={0.7}
            className="mr-4 relative w-16 h-16 rounded-2xl bg-white border border-borderLight overflow-hidden items-center justify-center"
          >
            {user.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <User size={24} color={Colors.backgroundDark} strokeWidth={2.5} />
            )}
            
            {/* Camera Overlay Icon */}
            <View className="absolute bottom-0 right-0 left-0 bg-black/55 py-1 items-center">
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Camera size={Sizes.iconTiny} color={Colors.background} strokeWidth={2.5} />
              )}
            </View>
          </TouchableOpacity>

          <View className="flex-1 justify-center">
            <Text className="text-background text-xl font-black tracking-wide">
              {user.name || "User"}
            </Text>
            <Text className="text-background/75 text-xs font-semibold mt-0.5">
              {user.email}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={openEditModal}
            className="bg-background/10 rounded-2xl p-3 items-center justify-center border border-background/20 ml-2"
          >
            <Edit3 size={Sizes.iconXSmall} color={Colors.background} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Profile Info Fields */}
        <View className="border border-borderLight rounded-2xl p-5 bg-background mb-6 space-y-4">
          <View className="flex-row items-center justify-between border-b border-borderLight pb-3 mb-3">
            <View className="flex-row items-center">
              <Mail size={16} color={Colors.textSecondary} strokeWidth={2.5} />
              <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold ml-2">
                Primary Email
              </Text>
            </View>
            <Text className="text-textPrimary text-xs font-bold">
              {user.email}
            </Text>
          </View>

          <View className="flex-row items-center justify-between border-b border-borderLight pb-3 mb-3">
            <View className="flex-row items-center">
              <Text className="text-textSecondary text-xs font-bold ml-1">₱</Text>
              <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold ml-3">
                Base Currency
              </Text>
            </View>
            <Text className="text-textPrimary text-xs font-bold uppercase">
              {user.currency || "PHP"}
            </Text>
          </View>

          <View className="flex-row items-center justify-between border-b border-borderLight pb-3 mb-3">
            <View className="flex-row items-center">
              <Settings size={16} color={Colors.textSecondary} strokeWidth={2.5} />
              <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold ml-2">
                Spending Limit
              </Text>
            </View>
            <Text className="text-textPrimary text-xs font-bold">
              {user.spendingLimit !== undefined && user.spendingLimit !== null
                ? formatCurrency(user.spendingLimit, user.currency)
                : "None set"}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <ShieldAlert size={16} color={Colors.textSecondary} strokeWidth={2.5} />
              <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold ml-2">
                Panic Mode
              </Text>
            </View>
            <Text className={`text-xs font-bold uppercase ${user.panicModeEnabled ? "text-actionPrimary" : "text-textMuted"}`}>
              {user.panicModeEnabled ? "Active (Shake-to-Lock)" : "Inactive"}
            </Text>
          </View>
        </View>

        {/* Security Settings Section */}
        <Text className="text-textSecondary text-xs uppercase tracking-widest font-black mb-3 ml-1">
          Security Layers
        </Text>
        <View className="border border-borderLight rounded-2xl p-5 bg-background mb-6 space-y-4">
          {/* Biometrics Toggle */}
          <View className="flex-row items-center justify-between border-b border-borderLight pb-4 mb-4">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center mb-1">
                <Fingerprint size={Sizes.iconXSmall} color={Colors.textPrimary} strokeWidth={2.5} />
                <Text className="text-textPrimary text-xs uppercase tracking-wider font-black ml-2">
                  Biometric Login
                </Text>
              </View>
              <Text className="text-textMuted text-[10px] font-semibold leading-relaxed">
                App lock session timeout prompts FaceID or Fingerprint.
              </Text>
            </View>
            <Switch
              value={!!user?.biometricsEnabled && hasLocalBiometricKey}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: Colors.border, true: Colors.backgroundDark }}
              thumbColor={(user?.biometricsEnabled && hasLocalBiometricKey) ? Colors.actionPrimary : Colors.background}
            />
          </View>

          {/* 2FA Toggle */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center mb-1">
                <Key size={Sizes.iconXSmall} color={Colors.textPrimary} strokeWidth={2.5} />
                <Text className="text-textPrimary text-xs uppercase tracking-wider font-black ml-2">
                  Two-Factor Auth (2FA)
                </Text>
              </View>
              <Text className="text-textMuted text-[10px] font-semibold leading-relaxed">
                Requires a 6-digit verification code from Google Authenticator on fallback logins.
              </Text>
            </View>
            <Switch
              value={user.is2FAEnabled}
              onValueChange={handle2faToggle}
              trackColor={{ false: Colors.border, true: Colors.backgroundDark }}
              thumbColor={user.is2FAEnabled ? Colors.actionPrimary : Colors.background}
            />
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-actionPrimary rounded-2xl py-4 items-center mt-4 border border-actionPrimaryDark"
        >
          <Text className="text-background font-bold text-xs uppercase tracking-widest">
            Disconnect Session
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <View style={styles.modalOverlay} className="flex-1 bg-black/40 justify-end pb-3">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : (keyboardVisible ? "padding" : undefined)}
            className="w-full"
          >
            <Animated.View style={[styles.modalContent, editAnimatedStyle]} className="bg-background border-t border-borderLight rounded-t-3xl p-6 pb-12">
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-textPrimary font-black text-lg tracking-wider uppercase">
                  Edit Profile
                </Text>
                <TouchableOpacity onPress={() => setIsEditModalOpen(false)} className="p-1">
                  <X size={20} color={Colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                {/* Form inputs */}
                <View className="space-y-4 mb-6">
                  <View className="pb-3">
                    <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold mb-2">
                      Name
                    </Text>
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Enter name"
                      placeholderTextColor={Colors.textMuted}
                      className="border border-border rounded-2xl px-4 py-3 text-textPrimary text-sm font-semibold bg-backgroundLight"
                    />
                  </View>

                  <View className="pb-3">
                    <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold mb-2">
                      Email Address
                    </Text>
                    <TextInput
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="Enter email"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="border border-border rounded-2xl px-4 py-3 text-textPrimary text-sm font-semibold bg-backgroundLight"
                    />
                  </View>

                  <View className="pb-3">
                    <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold mb-2">
                      Spending Limit (PHP)
                    </Text>
                    <TextInput
                      value={editLimit}
                      onChangeText={setEditLimit}
                      placeholder="None (Leave empty to disable)"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="numeric"
                      className="border border-border rounded-2xl px-4 py-3 text-textPrimary text-sm font-semibold bg-backgroundLight"
                    />
                  </View>

                  {/* Panic Mode Toggle inside Edit */}
                  <View className="flex-row items-center justify-between border border-border rounded-2xl p-4 bg-backgroundLight mt-2">
                    <View className="flex-1 mr-4">
                      <Text className="text-textPrimary text-xs uppercase tracking-wider font-bold mb-1">
                        Panic Mode
                      </Text>
                      <Text className="text-textMuted text-[10px] font-semibold leading-normal">
                        Instantly voids session and locks app when device is physically shaken.
                      </Text>
                    </View>
                    <Switch
                      value={editPanicMode}
                      onValueChange={setEditPanicMode}
                      trackColor={{ false: Colors.border, true: Colors.backgroundDark }}
                      thumbColor={editPanicMode ? Colors.actionPrimary : Colors.background}
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={loadingEdit}
                  className="bg-backgroundDark rounded-2xl py-4 items-center justify-center flex-row"
                >
                  <Text className="text-background font-bold text-xs uppercase tracking-wider mr-2">
                    {loadingEdit ? "Saving..." : "Save Configuration"}
                  </Text>
                  {!loadingEdit && <Check size={Sizes.iconExtraSmall} color={Colors.background} strokeWidth={2.5} />}
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Enable 2FA Modal */}
      <Modal
        visible={is2faModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIs2faModalOpen(false)}
      >
        <View style={styles.modalOverlay} className="flex-1 bg-black/40 justify-end">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : (keyboardVisible ? "padding" : undefined)}
            className="w-full"
          >
            <Animated.View style={[styles.modalContent, twoFactorAnimatedStyle]} className="bg-background border-t border-borderLight rounded-t-3xl p-6 pb-12">
              <View className="flex-row items-center justify-between mb-6">
                <View className="flex-row items-center">
                  <ShieldIcon size={Sizes.iconMedium} color={Colors.actionPrimary} strokeWidth={2.5} className="mr-2" />
                  <Text className="text-textPrimary font-black text-lg tracking-wider uppercase">
                    Setup 2FA Shield
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIs2faModalOpen(false)} className="p-1">
                  <X size={Sizes.iconMedium} color={Colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                <Text className="text-textSecondary text-[11px] font-semibold leading-relaxed mb-6">
                  1. Open Google Authenticator (or similar TOTP app).{"\n"}
                  2. Tap "+" and choose "Enter a setup key".{"\n"}
                  3. Input the secret key below. Account Name can be "Vestro".
                </Text>

                {/* Key Box */}
                <View className="border border-border rounded-2xl p-4 bg-backgroundLight flex-row items-center justify-between mb-6">
                  <View className="flex-1 mr-3">
                    <Text className="text-textMuted text-[9px] uppercase tracking-widest font-bold mb-1">
                      Google Authenticator Setup Key
                    </Text>
                    <Text className="text-textPrimary text-xs font-black tracking-widest select-all">
                      {totpSecret}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleCopySecret}
                    className="bg-backgroundDark rounded-2xl p-2 w-10 h-10 items-center justify-center"
                  >
                    <ClipboardCopy size={16} color={Colors.background} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>

                {/* Verification Form */}
                <View className="mb-6">
                  <Text className="text-textSecondary text-xs uppercase tracking-wider font-bold mb-2">
                    Verify 2FA Token Code
                  </Text>
                  <TextInput
                    value={totpCode}
                    onChangeText={setTotpCode}
                    placeholder="Enter the 6-digit code shown in app"
                    placeholderTextColor={Colors.textMuted}
                    maxLength={6}
                    keyboardType="number-pad"
                    className="border border-border rounded-2xl px-4 py-3 text-textPrimary text-sm font-bold tracking-widest text-center bg-backgroundLight"
                  />
                </View>

                {/* Submit */}
                <TouchableOpacity
                  onPress={handleVerify2fa}
                  disabled={loading2fa}
                  className="bg-backgroundDark rounded-2xl py-4 items-center justify-center flex-row"
                >
                  <Text className="text-background font-bold text-xs uppercase tracking-wider mr-2">
                    {loading2fa ? "Activating..." : "Enable 2FA Shield"}
                  </Text>
                  {!loading2fa && <ArrowRight size={14} color={Colors.background} strokeWidth={2.5} />}
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    // flat shadow / outline style
    shadowColor: "transparent",
    elevation: 0,
  },
});
