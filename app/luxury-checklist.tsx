import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  Laptop,
  Gamepad2,
  Smartphone,
  Shirt,
  Utensils,
  Tag,
  ShieldCheck,
  Calendar,
  DollarSign,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { useLuxuryItems } from '../src/hooks/useLuxuryItems';
import { fetchCoreNetworks, CoreNetwork } from '../src/services/api/endpoints/core-networks';
import FlatModal from '../src/components/flat-modal';
import { LuxuryCategory, LuxuryPriority, LuxuryStatus, LuxuryItem } from '../src/types';

export default function LuxuryChecklistScreen() {
  const router = useRouter();
  const {
    activeWishlistItems,
    purchasedItems,
    cancelledItems,
    loading,
    addItem,
    updateItem,
    markPurchased,
    markCancelled,
    removeItem,
    metrics,
  } = useLuxuryItems();

  // Tab & Category Filtering
  const [selectedTab, setSelectedTab] = useState<'WISHLIST' | 'PURCHASED' | 'CANCELLED'>('WISHLIST');
  const [selectedCategory, setSelectedCategory] = useState<LuxuryCategory | 'ALL'>('ALL');

  // Core Networks list for CashFlow creation
  const [coreNetworks, setCoreNetworks] = useState<CoreNetwork[]>([]);

  useEffect(() => {
    fetchCoreNetworks().then((res) => {
      if (res.ok) setCoreNetworks(res.value);
    });
  }, []);

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LuxuryItem | null>(null);

  // Form Fields for Add/Edit
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<LuxuryCategory>('TECH');
  const [formPrice, setFormPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<LuxuryPriority>('MEDIUM');
  const [formStatus, setFormStatus] = useState<LuxuryStatus>('WISHLIST');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Purchase Modal State
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchasingItem, setPurchasingItem] = useState<LuxuryItem | null>(null);
  const [actualPriceInput, setActualPriceInput] = useState('');
  const [recordCashFlow, setRecordCashFlow] = useState(true);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string>('');

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellingItem, setCancellingItem] = useState<LuxuryItem | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  // Open Add/Edit Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormCategory('TECH');
    setFormPrice('');
    setFormDescription('');
    setFormPriority('MEDIUM');
    setFormStatus('WISHLIST');
    setFormTargetDate('');
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (item: LuxuryItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormPrice((item.priceCents / 100).toString());
    setFormDescription(item.description || '');
    setFormPriority(item.priority);
    setFormStatus(item.status);
    setFormTargetDate(item.targetDate ? item.targetDate.split('T')[0] : '');
    setIsAddEditModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitAddEdit = async () => {
    if (!formName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', 'Please enter a name for the luxury item.');
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Validation Error', 'Please enter a valid price greater than 0.');
      return;
    }

    setIsSubmitting(true);
    let success = false;

    if (editingItem) {
      success = await updateItem(editingItem.id, {
        name: formName.trim(),
        category: formCategory,
        price: priceNum,
        description: formDescription.trim() || null,
        priority: formPriority,
        status: formStatus,
        targetDate: formTargetDate ? formTargetDate : null,
      });
    } else {
      success = await addItem({
        name: formName.trim(),
        category: formCategory,
        price: priceNum,
        description: formDescription.trim() || undefined,
        priority: formPriority,
        status: formStatus,
        targetDate: formTargetDate ? formTargetDate : undefined,
      });
    }

    setIsSubmitting(false);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsAddEditModalOpen(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save luxury item.');
    }
  };

  // Open Purchase Modal
  const handleOpenPurchaseModal = (item: LuxuryItem) => {
    setPurchasingItem(item);
    setActualPriceInput((item.priceCents / 100).toString());
    setRecordCashFlow(true);

    // Default to Wants Sandbox or first network
    const wantsNetwork = coreNetworks.find((n) => n.name.toLowerCase().includes('want') || n.type === 'WANTS_SANDBOX');
    setSelectedNetworkId(wantsNetwork ? wantsNetwork.id : coreNetworks[0]?.id || '');
    setIsPurchaseModalOpen(true);
  };

  // Submit Purchase
  const handleSubmitPurchase = async () => {
    if (!purchasingItem) return;

    const actualPriceNum = parseFloat(actualPriceInput);
    if (isNaN(actualPriceNum) || actualPriceNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price.');
      return;
    }

    if (recordCashFlow && !selectedNetworkId) {
      Alert.alert('Validation Error', 'Please select a Core Network account to record the outflow.');
      return;
    }

    setIsSubmitting(true);

    const res = await markPurchased(purchasingItem.id, {
      actualPrice: actualPriceNum,
      createCashFlow: recordCashFlow
        ? {
            coreNetworkId: selectedNetworkId,
            notes: `Luxury Purchase: ${purchasingItem.name}`,
          }
        : undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsPurchaseModalOpen(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Purchase Failed', res.error || 'Failed to complete purchase.');
    }
  };

  // Open Cancel Modal
  const handleOpenCancelModal = (item: LuxuryItem) => {
    setCancellingItem(item);
    setCancelReasonInput('');
    setIsCancelModalOpen(true);
  };

  // Submit Cancel
  const handleSubmitCancel = async () => {
    if (!cancellingItem) return;

    setIsSubmitting(true);

    const res = await markCancelled(cancellingItem.id, {
      cancelReason: cancelReasonInput.trim() || 'Avoided impulse purchase',
    });

    setIsSubmitting(false);

    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsCancelModalOpen(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Action Failed', res.error || 'Failed to cancel item.');
    }
  };

  // Confirm Delete
  const handleDeleteItem = (item: LuxuryItem) => {
    Alert.alert(
      'Delete Luxury Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await removeItem(item.id);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  // Category Icon & Label mapping
  const getCategoryDetails = (category: LuxuryCategory) => {
    switch (category) {
      case 'TECH':
        return { icon: <Laptop size={14} color={Colors.actionPrimary} strokeWidth={2.5} />, label: 'Tech & Hardware' };
      case 'GAMING':
        return { icon: <Gamepad2 size={14} color={Colors.actionPrimary} strokeWidth={2.5} />, label: 'Gaming' };
      case 'GADGETS':
        return { icon: <Smartphone size={14} color={Colors.actionPrimary} strokeWidth={2.5} />, label: 'Mobile & Gadgets' };
      case 'APPAREL':
        return { icon: <Shirt size={14} color={Colors.actionPrimary} strokeWidth={2.5} />, label: 'Apparel & Shoes' };
      case 'DINING':
        return { icon: <Utensils size={14} color={Colors.actionPrimary} strokeWidth={2.5} />, label: 'Luxury Dining' };
      case 'LIFESTYLE':
        return { icon: <Sparkles size={14} color={Colors.actionPrimary} strokeWidth={2.5} />, label: 'Lifestyle' };
      default:
        return { icon: <Tag size={14} color={Colors.actionPrimary} strokeWidth={2.5} />, label: 'Other' };
    }
  };

  const formatCurrency = (cents: number) => {
    return `₱${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filtering items by Tab & Category
  const getFilteredItems = () => {
    let tabItems: LuxuryItem[] = [];
    if (selectedTab === 'WISHLIST') tabItems = activeWishlistItems;
    else if (selectedTab === 'PURCHASED') tabItems = purchasedItems;
    else if (selectedTab === 'CANCELLED') tabItems = cancelledItems;

    if (selectedCategory !== 'ALL') {
      tabItems = tabItems.filter((i) => i.category === selectedCategory);
    }
    return tabItems;
  };

  const filteredItems = getFilteredItems();

  return (
    <View className="flex-1 bg-background dark:bg-backgroundDark pt-12">
      {/* Top Header Navigation */}
      <View className="px-5 py-2 flex-row justify-between items-center mb-5">
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl"
        >
          <ArrowLeft size={20} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-base font-black text-textPrimary dark:text-white uppercase tracking-wider">
            LUXURY WISHLIST
          </Text>
          <Text className="text-[10px] font-medium text-textMuted uppercase tracking-wider mt-0.5">
            Target Wants & Impulse Shield
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleOpenAddModal();
          }}
          className="p-2.5 bg-actionPrimary rounded-xl"
        >
          <Plus size={20} color={Colors.white} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Metric Overview Cards */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border-2 border-border dark:border-borderLight">
            <Text className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
              TARGET WISHLIST
            </Text>
            <Text className="text-base font-black text-textPrimary dark:text-white mt-1.5">
              {formatCurrency(metrics.totalWishlistCents)}
            </Text>
            <Text className="text-[10px] font-medium text-textMuted mt-1">
              {metrics.wishlistCount} planned item{metrics.wishlistCount !== 1 ? 's' : ''}
            </Text>
          </View>

          <View className="flex-1 bg-emerald-500/10 p-4 rounded-2xl border-2 border-emerald-500/30">
            <View className="flex-row items-center gap-1.5">
              <ShieldCheck size={14} color={Colors.successAlt} strokeWidth={2.5} />
              <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                MONEY SAVED
              </Text>
            </View>
            <Text className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
              {formatCurrency(metrics.totalMoneySavedCents)}
            </Text>
            <Text className="text-[10px] font-medium text-emerald-600/80 dark:text-emerald-400/80 mt-1">
              {metrics.cancelledCount} avoided impulse{metrics.cancelledCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Segmented Status Tabs */}
        <View className="flex-row gap-1 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl mb-5">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('WISHLIST');
            }}
            className={`flex-1 py-3 rounded-xl items-center ${
              selectedTab === 'WISHLIST' ? 'bg-white dark:bg-gray-700' : ''
            }`}
          >
            <Text
              className={`text-xs font-black uppercase tracking-wider ${
                selectedTab === 'WISHLIST' ? 'text-actionPrimary' : 'text-textMuted'
              }`}
            >
              WISHLIST ({metrics.wishlistCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('PURCHASED');
            }}
            className={`flex-1 py-3 rounded-xl items-center ${
              selectedTab === 'PURCHASED' ? 'bg-white dark:bg-gray-700' : ''
            }`}
          >
            <Text
              className={`text-xs font-black uppercase tracking-wider ${
                selectedTab === 'PURCHASED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-textMuted'
              }`}
            >
              BOUGHT ({metrics.purchasedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedTab('CANCELLED');
            }}
            className={`flex-1 py-3 rounded-xl items-center ${
              selectedTab === 'CANCELLED' ? 'bg-white dark:bg-gray-700' : ''
            }`}
          >
            <Text
              className={`text-xs font-black uppercase tracking-wider ${
                selectedTab === 'CANCELLED' ? 'text-textPrimary dark:text-white' : 'text-textMuted'
              }`}
            >
              SAVED ({metrics.cancelledCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Pills Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-6 py-1"
          contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingVertical: 2 }}
        >
          {(['ALL', 'TECH', 'GADGETS', 'GAMING', 'APPAREL', 'DINING', 'LIFESTYLE', 'OTHER'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(cat);
              }}
              className={`px-4 py-2.5 rounded-xl border ${
                selectedCategory === cat
                  ? 'bg-textPrimary dark:bg-white border-textPrimary dark:border-white'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
              }`}
            >
              <Text
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  selectedCategory === cat ? 'text-white dark:text-textPrimary' : 'text-textMuted'
                }`}
              >
                {cat === 'ALL' ? 'ALL CATEGORIES' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Item List */}
        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color={Colors.actionPrimary} />
          </View>
        ) : filteredItems.length === 0 ? (
          <View className="py-12 items-center bg-gray-50 dark:bg-gray-800/40 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 px-6">
            <Sparkles size={32} color={Colors.textMuted} strokeWidth={1.5} />
            <Text className="text-sm font-bold text-textPrimary dark:text-white mt-3 text-center uppercase tracking-wider">
              NO ITEMS FOUND
            </Text>
            <Text className="text-xs font-medium text-textMuted mt-1 text-center">
              {selectedTab === 'WISHLIST'
                ? 'Your wishlist is clear! Tap the + button to add target luxuries.'
                : selectedTab === 'PURCHASED'
                ? 'No luxury items marked as purchased yet.'
                : 'No cancelled impulse items recorded.'}
            </Text>
          </View>
        ) : (
          <View className="gap-y-4 mb-10">
            {filteredItems.map((item) => {
              const catDetails = getCategoryDetails(item.category);
              return (
                <View
                  key={item.id}
                  className="bg-background dark:bg-backgroundDark border-2 border-border dark:border-borderLight rounded-2xl p-5"
                >
                  {/* Category Tag & Priority Badge */}
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl">
                      {catDetails.icon}
                      <Text className="text-[10px] font-bold text-textPrimary dark:text-white uppercase tracking-wider">
                        {catDetails.label}
                      </Text>
                    </View>

                    <View
                      className={`px-2.5 py-1 rounded-lg ${
                        item.priority === 'HIGH'
                          ? 'bg-red-500/10 border border-red-500/30'
                          : item.priority === 'MEDIUM'
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : 'bg-gray-500/10 border border-gray-500/30'
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-bold uppercase tracking-wider ${
                          item.priority === 'HIGH'
                            ? 'text-red-500'
                            : item.priority === 'MEDIUM'
                            ? 'text-amber-500'
                            : 'text-gray-500'
                        }`}
                      >
                        {item.priority} PRIORITY
                      </Text>
                    </View>
                  </View>

                  {/* Name & Price */}
                  <View className="flex-row justify-between items-start mb-2.5">
                    <Text className="text-base font-black text-textPrimary dark:text-white flex-1 mr-3">
                      {item.name}
                    </Text>
                    <Text className="text-base font-black text-actionPrimary">
                      {formatCurrency(item.priceCents)}
                    </Text>
                  </View>

                  {/* Description / Reason */}
                  {item.description ? (
                    <View className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl mb-3.5 border border-gray-200 dark:border-gray-700">
                      <Text className="text-xs font-medium text-textSecondary dark:text-gray-300 italic">
                        "{item.description}"
                      </Text>
                    </View>
                  ) : null}

                  {/* Timestamps & Linked CashFlow Info */}
                  <View className="flex-row flex-wrap items-center gap-2.5 mb-3.5">
                    {item.targetDate && item.status === 'WISHLIST' ? (
                      <View className="flex-row items-center gap-1 bg-gray-100 dark:bg-gray-800/80 px-2.5 py-1 rounded-lg">
                        <Calendar size={12} color={Colors.textMuted} />
                        <Text className="text-[10px] font-medium text-textMuted">
                          Target: {new Date(item.targetDate).toLocaleDateString()}
                        </Text>
                      </View>
                    ) : null}

                    {item.purchasedAt ? (
                      <View className="flex-row items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 size={12} color={Colors.successAlt} />
                        <Text className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          Bought: {new Date(item.purchasedAt).toLocaleDateString()}
                        </Text>
                      </View>
                    ) : null}

                    {item.cancelledAt ? (
                      <View className="flex-row items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                        <ShieldCheck size={12} color={Colors.textMuted} />
                        <Text className="text-[10px] font-bold text-textMuted">
                          Avoided: {new Date(item.cancelledAt).toLocaleDateString()}
                        </Text>
                      </View>
                    ) : null}

                    {item.cashFlow ? (
                      <View className="flex-row items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                        <DollarSign size={10} color={Colors.successAlt} />
                        <Text className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          Linked CashFlow ({item.cashFlow.coreNetwork?.name || 'Network'})
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Cancel Reason display */}
                  {item.status === 'CANCELLED' && item.cancelReason ? (
                    <View className="bg-emerald-500/10 p-3 rounded-xl mb-3.5 border border-emerald-500/20">
                      <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        Money Saved Notes: <Text className="font-normal italic">{item.cancelReason}</Text>
                      </Text>
                    </View>
                  ) : null}

                  {/* Actions Footer */}
                  <View className="flex-row justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800 mt-1">
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          handleOpenEditModal(item);
                        }}
                        className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl"
                      >
                        <Edit2 size={14} color={Colors.textPrimary} strokeWidth={2} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          handleDeleteItem(item);
                        }}
                        className="p-2 bg-red-500/10 rounded-xl"
                      >
                        <Trash2 size={14} color={Colors.error} strokeWidth={2} />
                      </TouchableOpacity>
                    </View>

                    {item.status === 'WISHLIST' || item.status === 'SAVING' ? (
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            handleOpenCancelModal(item);
                          }}
                          className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl flex-row items-center gap-1.5"
                        >
                          <XCircle size={12} color={Colors.textMuted} strokeWidth={2.5} />
                          <Text className="text-[10px] font-bold text-textMuted uppercase tracking-wider">
                            CANCEL
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            handleOpenPurchaseModal(item);
                          }}
                          className="px-3.5 py-2 bg-emerald-600 rounded-xl flex-row items-center gap-1.5"
                        >
                          <CheckCircle2 size={12} color={Colors.white} strokeWidth={2.5} />
                          <Text className="text-[10px] font-bold color-white uppercase tracking-wider">
                            MARK BOUGHT
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 1. Add / Edit Luxury Item Modal */}
      <FlatModal
        visible={isAddEditModalOpen}
        onClose={() => setIsAddEditModalOpen(false)}
        title={editingItem ? 'EDIT LUXURY TARGET' : 'NEW LUXURY TARGET'}
        headerIcon={<Sparkles size={20} color={Colors.actionPrimary} />}
      >
        <ScrollView className="max-h-[480px]">
          <View className="gap-y-4 pb-2">
            <View>
              <Text className="text-xs font-bold text-textPrimary dark:text-white uppercase mb-1.5">
                ITEM NAME *
              </Text>
              <TextInput
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. DDR5 RAM, PS5 Pro, Shoes"
                placeholderTextColor={Colors.textMuted}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-xs text-textPrimary dark:text-white font-medium"
              />
            </View>

            <View>
              <Text className="text-xs font-bold text-textPrimary dark:text-white uppercase mb-2">
                CATEGORY
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="py-1"
                contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingVertical: 2 }}
              >
                {(['TECH', 'GADGETS', 'GAMING', 'APPAREL', 'DINING', 'LIFESTYLE', 'OTHER'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setFormCategory(cat)}
                    className={`px-4 py-2.5 rounded-xl border ${
                      formCategory === cat
                        ? 'bg-actionPrimary border-actionPrimary'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-[9px] font-bold uppercase tracking-wider ${
                        formCategory === cat ? 'color-white' : 'text-textMuted'
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View>
              <Text className="text-xs font-bold text-textPrimary dark:text-white uppercase mb-1.5">
                ESTIMATED PRICE (₱) *
              </Text>
              <TextInput
                value={formPrice}
                onChangeText={setFormPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-xs text-textPrimary dark:text-white font-black"
              />
            </View>

            <View>
              <Text className="text-xs font-bold text-textPrimary dark:text-white uppercase mb-2">
                PRIORITY
              </Text>
              <View className="flex-row gap-2.5 py-1">
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map((prio) => (
                  <TouchableOpacity
                    key={prio}
                    onPress={() => setFormPriority(prio)}
                    className={`flex-1 py-2.5 px-1 rounded-xl border items-center justify-center ${
                      formPriority === prio
                        ? 'bg-textPrimary dark:bg-white border-textPrimary dark:border-white'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        formPriority === prio ? 'text-white dark:text-textPrimary' : 'text-textMuted'
                      }`}
                    >
                      {prio}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <Text className="text-xs font-bold text-textPrimary dark:text-white uppercase mb-2">
                STATUS
              </Text>
              <View className="flex-row gap-2 py-1">
                {(['WISHLIST', 'SAVING', 'PURCHASED', 'CANCELLED'] as const).map((stat) => (
                  <TouchableOpacity
                    key={stat}
                    onPress={() => setFormStatus(stat)}
                    className={`flex-1 py-2.5 px-1 rounded-xl border items-center justify-center ${
                      formStatus === stat
                        ? 'bg-textPrimary dark:bg-white border-textPrimary dark:border-white'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Text
                      className={`text-[8px] font-bold uppercase tracking-wider ${
                        formStatus === stat ? 'text-white dark:text-textPrimary' : 'text-textMuted'
                      }`}
                    >
                      {stat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View>
              <Text className="text-xs font-bold text-textPrimary dark:text-white uppercase mb-1.5">
                REASON TO BUY / DESCRIPTION
              </Text>
              <TextInput
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={3}
                placeholder="Why do you want to buy this luxury? (e.g. Needed for 4K video rendering & multi-tasking)"
                placeholderTextColor={Colors.textMuted}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-xs text-textPrimary dark:text-white font-medium min-h-[70px]"
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmitAddEdit}
              disabled={isSubmitting}
              className="bg-actionPrimary py-3.5 rounded-xl items-center mt-3 active:opacity-90"
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text className="text-xs font-black color-white uppercase tracking-wider">
                  {editingItem ? 'SAVE CHANGES' : 'CREATE LUXURY TARGET'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </FlatModal>

      {/* 2. Purchase & CashFlow Link Modal */}
      <FlatModal
        visible={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        title="MARK AS PURCHASED"
        headerIcon={<CheckCircle2 size={20} color={Colors.successAlt} />}
      >
        {purchasingItem && (
          <View className="gap-y-4 pb-2">
            <Text className="text-base font-black text-textPrimary dark:text-white">
              {purchasingItem.name}
            </Text>

            <View>
              <Text className="text-xs font-bold text-textPrimary dark:text-white uppercase mb-1.5">
                ACTUAL PURCHASE PRICE (₱)
              </Text>
              <TextInput
                value={actualPriceInput}
                onChangeText={setActualPriceInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-sm text-textPrimary dark:text-white font-black"
              />
            </View>

            {/* Toggle CashFlow Link */}
            <View className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 gap-y-3">
              <View className="flex-row justify-between items-center">
                <View className="flex-1 mr-3">
                  <Text className="text-xs font-black text-textPrimary dark:text-white uppercase">
                    RECORD OUTFLOW IN CASHFLOW
                  </Text>
                  <Text className="text-[10px] font-medium text-textMuted mt-0.5">
                    Deducts balance from selected account node
                  </Text>
                </View>
                <Switch
                  value={recordCashFlow}
                  onValueChange={setRecordCashFlow}
                  trackColor={{ false: '#767577', true: Colors.successAlt }}
                />
              </View>

              {recordCashFlow && (
                <View>
                  <Text className="text-[10px] font-bold text-textMuted uppercase mb-2">
                    SELECT CORE NETWORK ACCOUNT
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="py-1"
                    contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingVertical: 2 }}
                  >
                    {coreNetworks.map((net) => (
                      <TouchableOpacity
                        key={net.id}
                        onPress={() => setSelectedNetworkId(net.id)}
                        className={`px-4 py-2.5 rounded-xl border ${
                          selectedNetworkId === net.id
                            ? 'bg-emerald-600 border-emerald-600'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            selectedNetworkId === net.id ? 'color-white' : 'text-textPrimary dark:text-white'
                          }`}
                        >
                          {net.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={handleSubmitPurchase}
              disabled={isSubmitting}
              className="bg-emerald-600 py-3.5 rounded-xl items-center mt-3 active:opacity-90"
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text className="text-xs font-black color-white uppercase tracking-wider">
                  CONFIRM PURCHASE
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </FlatModal>

      {/* 3. Cancel / Avoided Impulse Modal */}
      <FlatModal
        visible={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="AVOID IMPULSE & SAVE"
        headerIcon={<ShieldCheck size={20} color={Colors.successAlt} />}
      >
        {cancellingItem && (
          <View className="gap-y-4 pb-2">
            <View className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/20">
              <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                🎉 Great decision! Cancelling this item saves {formatCurrency(cancellingItem.priceCents)} in your pocket.
              </Text>
            </View>

            <View>
              <Text className="text-xs font-bold text-textPrimary dark:text-white uppercase mb-1.5">
                REASON FOR SKIPPING (OPTIONAL)
              </Text>
              <TextInput
                value={cancelReasonInput}
                onChangeText={setCancelReasonInput}
                multiline
                numberOfLines={2}
                placeholder="e.g. Impulse passed after 48h reflection, money kept in savings!"
                placeholderTextColor={Colors.textMuted}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-xs text-textPrimary dark:text-white font-medium min-h-[60px]"
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmitCancel}
              disabled={isSubmitting}
              className="bg-textPrimary dark:bg-white py-3.5 rounded-xl items-center mt-3 active:opacity-90"
            >
              {isSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text className="text-xs font-black color-white dark:text-textPrimary uppercase tracking-wider">
                  CONFIRM MONEY SAVED
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </FlatModal>
    </View>
  );
}
