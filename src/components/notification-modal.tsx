import React, { useEffect, useState } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Bell, CheckCheck, HelpCircle, Code, ShieldAlert, Sparkles, PlusCircle } from "lucide-react-native";
import FlatModal from "./flat-modal";
import { useUIStore } from "../store/ui-store";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  testTriggerNotification,
} from "../services/api/endpoints/notification";
import { AppNotification } from "../types";
import { useToastStore } from "../store/toast-store";
import * as Haptics from "expo-haptics";

export default function NotificationModal() {
  const { isNotificationModalOpen, closeNotificationModal } = useUIStore();
  const { show: showToast } = useToastStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications();
      if (res.ok) {
        setNotifications(res.value);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isNotificationModalOpen) {
      loadNotifications();
    }
  }, [isNotificationModalOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await markNotificationAsRead(id);
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const res = await markAllNotificationsAsRead();
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        showToast("All marked as read", "success");
      }
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const triggerDevTest = async (type?: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await testTriggerNotification(type);
      if (res.ok) {
        showToast(res.value.message || "Test triggered successfully!", "success");
        // Reload notifications after a small delay to fetch the logged alert
        setTimeout(loadNotifications, 1000);
      }
    } catch (err) {
      console.error("Failed to trigger test notification:", err);
      showToast("Trigger failed", "error");
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <FlatModal
      visible={isNotificationModalOpen}
      onClose={closeNotificationModal}
      title="Alert Center"
      headerIcon={<Bell size={Sizes.iconHeader} color={Colors.textPrimary} />}
    >
      <View style={{ maxHeight: 450 }} className="w-full">
        {/* Actions bar */}
        {notifications.length > 0 && (
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs text-gray-400 font-bold uppercase">
              Inbox ({notifications.length})
            </Text>
            {hasUnread && (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                className="flex-row items-center"
              >
                <CheckCheck size={Sizes.iconExtraSmall} color={Colors.actionPrimary} />
                <Text className="text-xs font-semibold text-actionPrimary ml-1">
                  Mark all read
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {loading && notifications.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="small" color={Colors.actionPrimary} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 280 }}
            ListEmptyComponent={
              <View className="py-12 items-center justify-center border border-dashed border-gray-200 rounded-2xl">
                <Bell size={Sizes.iconLarge} color={Colors.placeholderLight} className="mb-2" />
                <Text className="text-sm font-semibold text-gray-400">
                  No notifications yet
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const date = new Date(item.sentAt);
              const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <TouchableOpacity
                  onPress={() => !item.isRead && handleMarkRead(item.id)}
                  activeOpacity={item.isRead ? 1 : 0.7}
                  className={`p-4 mb-2 border rounded-2xl flex-row items-start ${
                    item.isRead
                      ? "bg-background border-gray-100"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  {/* Unread Indicator */}
                  {!item.isRead && (
                    <View
                      className="w-2.5 h-2.5 rounded-full absolute top-4 right-4"
                      style={{ backgroundColor: Colors.actionPrimary }}
                    />
                  )}

                  <View className="flex-1 pr-4">
                    <Text className={`text-sm ${item.isRead ? "text-textSecondary font-bold" : "text-textPrimary font-black"}`}>
                      {item.title}
                    </Text>
                    <Text className="text-xs text-textMuted mt-1" style={{ lineHeight: 16 }}>
                      {item.body}
                    </Text>
                    <Text className="text-[10px] text-gray-400 mt-2">
                      {formattedDate} at {formattedTime}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Collapsible Developer Panel */}
        <View className="border-t border-gray-100 mt-4 pt-3">
          <TouchableOpacity
            onPress={() => setDevToolsOpen(!devToolsOpen)}
            className="flex-row justify-between items-center py-2"
          >
            <View className="flex-row items-center">
              <Code size={Sizes.iconExtraSmall} color={Colors.textIconMuted} />
              <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-2">
                Developer Simulation
              </Text>
            </View>
            <Text className="text-xs text-gray-400">{devToolsOpen ? "Hide" : "Show"}</Text>
          </TouchableOpacity>

          {devToolsOpen && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row mt-2 py-1"
            >
              <TouchableOpacity
                onPress={() => triggerDevTest("TEST")}
                className="bg-gray-800 px-3 py-2 rounded-2xl mr-2 flex-row items-center"
              >
                <Sparkles size={Sizes.iconSuperTiny} color={Colors.white} />
                <Text className="text-white text-xs font-bold ml-1.5">Direct Push</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => triggerDevTest("CREDIT_DUE")}
                className="bg-gray-800 px-3 py-2 rounded-2xl mr-2 flex-row items-center"
              >
                <ShieldAlert size={Sizes.iconSuperTiny} color={Colors.white} />
                <Text className="text-white text-xs font-bold ml-1.5">Credit Due</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => triggerDevTest("WANTS_SWEEP")}
                className="bg-gray-800 px-3 py-2 rounded-2xl mr-2 flex-row items-center"
              >
                <PlusCircle size={Sizes.iconSuperTiny} color={Colors.white} />
                <Text className="text-white text-xs font-bold ml-1.5">Sweep Warning</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => triggerDevTest("CASH_FLOW")}
                className="bg-gray-800 px-3 py-2 rounded-2xl mr-2 flex-row items-center"
              >
                <HelpCircle size={Sizes.iconSuperTiny} color={Colors.white} />
                <Text className="text-white text-xs font-bold ml-1.5">Flow Reminder</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </FlatModal>
  );
}
