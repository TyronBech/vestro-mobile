import React, { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from "react-native";
import { X } from "lucide-react-native";
import { Colors } from "../../constants/colors";

import Toast from "./toast";

interface FlatModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  headerIcon?: React.ReactNode;
  children: React.ReactNode;
}

export default function FlatModal({
  visible,
  onClose,
  title,
  headerIcon,
  children,
}: FlatModalProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : (keyboardVisible ? "padding" : undefined)}
          style={styles.keyboardView}
          pointerEvents="box-none"
        >
          <Pressable style={styles.modalContent} className="border-2 border-border bg-background rounded-2xl p-6">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <View className="flex-row items-center flex-1 mr-2">
                {headerIcon && <View style={{ marginRight: 8 }}>{headerIcon}</View>}
                <Text className="text-lg font-black text-textPrimary uppercase tracking-wider flex-shrink" numberOfLines={1}>
                  {title}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1">
                <X size={20} color={Colors.textMuted} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {children}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
      <Toast />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(55, 55, 55, 0.4)", // flat backdrop tint
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  keyboardView: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    shadowColor: "transparent",
    elevation: 0,
  },
});
