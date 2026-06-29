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
      <View style={styles.container}>
        {/* Backdrop (closes modal on press) */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Modal content container */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : (keyboardVisible ? "padding" : undefined)}
          style={styles.keyboardView}
          pointerEvents="box-none"
        >
          {/* Modal Content */}
          <View style={styles.modalContent} className="border-2 border-border bg-background rounded-2xl p-6">
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
          </View>
        </KeyboardAvoidingView>
      </View>
      <Toast />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(55, 55, 55, 0.4)", // flat backdrop tint
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
