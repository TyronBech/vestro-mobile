import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useUIStore } from "../../src/store/ui-store";
import { fetchCoreNetworks, CoreNetwork, deleteCoreNetwork } from "../../src/services/api/endpoints/core-networks";
import { fetchMacroAssets, MacroAsset } from "../../src/services/api/endpoints/macro-assets";
import { Colors } from "../../constants/colors";
import { useToastStore } from "../../src/store/toast-store";

// Helper component to dynamically determine and apply the aspect ratio of the bank banner image
function NodeAssetIcon({ url, colorCode }: { url: string | null; colorCode: string | null }) {
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (url) {
      Image.getSize(
        url,
        (width, height) => {
          if (height > 0) setAspectRatio(width / height);
        },
        () => setError(true),
      );
    }
  }, [url]);

  if (!url || error) {
    return (
      <View
        className="w-2 h-2 rounded-full mr-1.5"
        style={{ backgroundColor: colorCode || Colors.textSecondary }}
      />
    );
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ height: 16, aspectRatio: aspectRatio || 3, marginRight: 8, borderRadius: 2 }}
      resizeMode="contain"
      onError={() => setError(true)}
    />
  );
}

export default function NetworkScreen() {
  const insets = useSafeAreaInsets();
  const { openCoreNetworkModal, networkUpdateTrigger } = useUIStore();
  const toastStore = useToastStore();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [macroAssets, setMacroAssets] = useState<MacroAsset[]>([]);
  const [networkNodes, setNetworkNodes] = useState<CoreNetwork[]>([]);

  // Map for fast lookups
  const [assetsMap, setAssetsMap] = useState<Record<string, MacroAsset>>({});

  const loadData = async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setLoading(true);
    const [assetsRes, networkRes] = await Promise.all([
      fetchMacroAssets(),
      fetchCoreNetworks(),
    ]);

    if (assetsRes.ok) {
      setMacroAssets(assetsRes.value);
      const map: Record<string, MacroAsset> = {};
      assetsRes.value.forEach((asset) => {
        map[asset.id] = asset;
      });
      setAssetsMap(map);
    } else {
      toastStore.show("Failed to load bank buckets.", "error");
    }

    if (networkRes.ok) {
      setNetworkNodes(networkRes.value);
    } else {
      toastStore.show("Failed to load routing network.", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [networkUpdateTrigger]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    try {
      await loadData(false);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    } catch (err) {
      console.error("Network screen refresh failed:", err);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (e) {}
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenAddModal = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    openCoreNetworkModal();
  };

  const handleDeleteNode = async (id: string) => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}
    
    // For simplicity, directly delete node or show confirmation
    const res = await deleteCoreNetwork(id);
    if (res.ok) {
      toastStore.show("Node deleted successfully.", "success");
      loadData(false);
    } else {
      toastStore.show(res.error || "Failed to delete node.", "error");
    }
  };

  const handleEditNode = async (node: CoreNetwork) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    openCoreNetworkModal(node);
  };

  // Helper: Format cents to PHP
  const formatCurrency = (cents: number) => {
    const php = cents / 100;
    return `₱${php.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Group nodes by parentId
  const getChildren = (parentId: string | null) => {
    return networkNodes.filter((node) => node.parentId === parentId);
  };

  // Build the tree nodes recursively with high-contrast minimalist styles and branch lines
  const renderNodeTree = (node: CoreNetwork, depth = 0) => {
    const parentAsset = assetsMap[node.macroAssetId];
    const children = getChildren(node.id);
    const hasChildren = children.length > 0;

    return (
      <View key={node.id} className="mb-3">
        {/* Node Row (Branch line + Card) */}
        <View className="flex-row items-center">
          {depth > 0 && (
            <View 
              style={{ 
                width: 16, 
                height: 2, 
                backgroundColor: Colors.border, 
                marginRight: 6 
              }} 
            />
          )}
          
          {/* Node Card */}
          <View className="flex-1 border border-border rounded-2xl p-4 bg-backgroundLight flex-row items-center justify-between">
            <View className="flex-1">
              {/* Associated Asset indicator */}
              {parentAsset && (
                <View className="flex-row items-center mb-1.5">
                  <NodeAssetIcon url={parentAsset.iconUrl} colorCode={parentAsset.colorCode} />
                </View>
              )}

              {/* Title / Description */}
              <Text className="text-sm font-black text-textPrimary uppercase tracking-wide">
                {node.name}
              </Text>
              {node.description ? (
                <Text className="text-[11px] text-textSecondary mt-0.5 font-bold">
                  {node.description}
                </Text>
              ) : null}

              {/* Stats row */}
              <View className="flex-row items-center mt-3 space-x-4">
                <View className="bg-background rounded-lg px-2 py-1 border border-borderLight">
                  <Text className="text-[9px] font-black text-textSecondary uppercase tracking-widest">
                    Alloc: {node.percentage}%
                  </Text>
                </View>
                <Text className="text-xs font-black text-actionPrimary">
                  {formatCurrency(node.balance)}
                </Text>
              </View>
            </View>

            {/* Right Side: Type Badge & Actions */}
            <View className="items-end justify-between pl-2" style={{ minHeight: 60 }}>
              {node.type ? (
                <View className="bg-backgroundDark px-2 py-0.5 rounded-full mb-3">
                  <Text className="text-[8px] font-black text-background uppercase tracking-widest">
                    {node.type.replace("_", " ")}
                  </Text>
                </View>
              ) : (
                <View className="h-4" />
              )}

              {/* Actions row */}
              <View className="flex-row items-center space-x-2">
                <TouchableOpacity onPress={() => handleEditNode(node)} className="px-1 py-0.5">
                  <Text className="text-[10px] font-black text-textSecondary uppercase tracking-wider">
                    Edit
                  </Text>
                </TouchableOpacity>
                <Text className="text-[8px] text-border font-bold">|</Text>
                <TouchableOpacity onPress={() => handleDeleteNode(node.id)} className="px-1 py-0.5">
                  <Text className="text-[10px] font-black text-error uppercase tracking-wider">
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Children indent and tree line */}
        {hasChildren && (
          <View 
            style={{ 
              marginLeft: depth === 0 ? 12 : 30, // Indents children container to line up with parent card
              borderLeftWidth: 2, 
              borderLeftColor: Colors.border, 
              marginTop: 4,
              marginBottom: 4,
            }}
          >
            {children.map((child) => renderNodeTree(child, depth + 1))}
          </View>
        )}
      </View>
    );
  };

  const rootNodes = getChildren(null);

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
        <View className="flex-row justify-center items-center mb-8 mt-4">
          <View>
            <Text className="text-3xl font-black text-center tracking-widest text-textPrimary">
              NETWORK
            </Text>
            <Text className="text-xs uppercase tracking-widest text-center text-gray-400 mt-1">
              Routing & Allocations
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color={Colors.actionPrimary} />
          </View>
        ) : networkNodes.length === 0 ? (
          /* Empty state visual node representation */
          <View className="flex-1 justify-center py-6">
            <TouchableOpacity
              onPress={handleOpenAddModal}
              activeOpacity={0.8}
              style={styles.emptyNodeCard}
              className="border-2 border-dashed border-border rounded-2xl p-6 bg-backgroundLight/50 items-center justify-center"
            >
              <View className="w-12 h-12 rounded-full bg-backgroundDark/5 items-center justify-center mb-4">
                <Plus size={24} stroke={Colors.textPrimary} strokeWidth={3} />
              </View>
              
              <Text className="text-sm font-black text-textPrimary uppercase tracking-wider text-center">
                Configure Core Network
              </Text>
              
              <Text className="text-xs font-bold text-textSecondary text-center leading-relaxed mt-2 max-w-[280px]">
                Create your routing network tree to distribute your cash inflows into designated bank buckets. Define payroll routers, emergency splits, and utility buckets.
              </Text>

              <View className="flex-row items-center mt-6 bg-actionPrimary rounded-xl px-4 py-2 border border-borderLight">
                <Text className="text-[10px] font-black text-background uppercase tracking-widest mr-2">
                  Create First Node
                </Text>
                <ArrowRight size={12} stroke={Colors.background} strokeWidth={3} />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          /* Render the Trees starting from root nodes */
          <View className="space-y-4">
            {rootNodes.map((root) => renderNodeTree(root))}
            {/* If there are orphans or children without parent in filtered tree, show them as roots */}
            {networkNodes
              .filter((node) => node.parentId !== null && !networkNodes.some((parent) => parent.id === node.parentId))
              .map((orphan) => renderNodeTree(orphan))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyNodeCard: {
    minHeight: 280,
  },
});
