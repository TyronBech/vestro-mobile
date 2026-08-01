import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import {
  Sparkles,
  Plus,
  ChevronRight,
  ShieldCheck,
  Tag,
  Laptop,
  Gamepad2,
  Smartphone,
  Shirt,
  Utensils,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import { useLuxuryItems } from "../hooks/useLuxuryItems";
import { LuxuryCategory } from "../types";

interface LuxuryWishlistWidgetProps {
  onOpenAddModal: () => void;
}

export function LuxuryWishlistWidget({
  onOpenAddModal,
}: LuxuryWishlistWidgetProps) {
  const router = useRouter();
  const { activeWishlistItems, metrics, loading } = useLuxuryItems();

  const getCategoryIcon = (category: LuxuryCategory) => {
    switch (category) {
      case "TECH":
        return (
          <Laptop
            size={14}
            color={Colors.actionPrimary}
            strokeWidth={Sizes.strokeMedium}
          />
        );
      case "GAMING":
        return (
          <Gamepad2
            size={14}
            color={Colors.actionPrimary}
            strokeWidth={Sizes.strokeMedium}
          />
        );
      case "GADGETS":
        return (
          <Smartphone
            size={14}
            color={Colors.actionPrimary}
            strokeWidth={Sizes.strokeMedium}
          />
        );
      case "APPAREL":
        return (
          <Shirt
            size={14}
            color={Colors.actionPrimary}
            strokeWidth={Sizes.strokeMedium}
          />
        );
      case "DINING":
        return (
          <Utensils
            size={14}
            color={Colors.actionPrimary}
            strokeWidth={Sizes.strokeMedium}
          />
        );
      default:
        return (
          <Tag
            size={14}
            color={Colors.actionPrimary}
            strokeWidth={Sizes.strokeMedium}
          />
        );
    }
  };

  const formatCurrency = (cents: number) => {
    return `₱${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <View className="bg-background dark:bg-backgroundDark border-2 border-border dark:border-borderLight rounded-2xl p-5 mb-6">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center gap-2.5">
          <View className="bg-actionPrimary/10 p-2.5 rounded-xl">
            <Sparkles
              size={Sizes.iconMedium}
              color={Colors.actionPrimary}
              strokeWidth={Sizes.strokeMedium}
            />
          </View>
          <View>
            <Text className="text-base font-black text-textPrimary dark:text-white uppercase tracking-wider">
              LUXURY WISHLIST
            </Text>
            <Text className="text-xs font-medium text-textMuted mt-0.5">
              Target Luxuries & Impulse Shield
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/luxury-checklist");
          }}
          className="flex-row items-center bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-xl gap-1"
        >
          <Text className="text-xs font-bold text-textPrimary dark:text-white uppercase">
            VIEW ALL
          </Text>
          <ChevronRight
            size={14}
            color={Colors.textPrimary}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>

      {/* Metrics Row */}
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
          <Text className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
            TOTAL TARGET COST
          </Text>
          <Text className="text-sm font-black text-textPrimary dark:text-white mt-1">
            {formatCurrency(metrics.totalWishlistCents)}
          </Text>
        </View>

        <View className="flex-1 bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20">
          <View className="flex-row items-center gap-1.5">
            <ShieldCheck
              size={12}
              color={Colors.successAlt}
              strokeWidth={2.5}
            />
            <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              IMPULSES SAVED
            </Text>
          </View>
          <Text className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(metrics.totalMoneySavedCents)}
          </Text>
        </View>
      </View>

      {/* Active Items Preview */}
      {loading ? (
        <View className="py-6 items-center">
          <ActivityIndicator size="small" color={Colors.actionPrimary} />
        </View>
      ) : activeWishlistItems.length === 0 ? (
        <View className="py-5 px-4 items-center bg-gray-50 dark:bg-gray-800/40 rounded-xl mb-4 border border-dashed border-gray-300 dark:border-gray-700">
          <Text className="text-xs font-medium text-textMuted text-center">
            No luxury targets planned yet. Add RAM, Phone, Gaming Console,
            Dining, etc.
          </Text>
        </View>
      ) : (
        <View className="gap-y-2.5 mb-4">
          {activeWishlistItems.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/luxury-checklist");
              }}
              className="flex-row justify-between items-center bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <View className="flex-row items-center gap-2.5 flex-1 mr-3">
                {getCategoryIcon(item.category)}
                <View className="flex-1">
                  <Text
                    className="text-xs font-bold text-textPrimary dark:text-white"
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text
                      className="text-[10px] font-medium text-textMuted mt-0.5"
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Text className="text-xs font-black text-actionPrimary">
                {formatCurrency(item.priceCents)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Action Button */}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onOpenAddModal();
        }}
        className="bg-actionPrimary py-3.5 px-4 rounded-xl flex-row justify-center items-center gap-2 active:opacity-90 mt-1"
      >
        <Plus size={16} color={Colors.white} strokeWidth={3} />
        <Text className="text-xs font-black color-white uppercase tracking-wider">
          ADD LUXURY ITEM
        </Text>
      </TouchableOpacity>
    </View>
  );
}
