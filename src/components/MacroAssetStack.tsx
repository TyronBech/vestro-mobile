import React, { useState, useMemo } from 'react';
import { View, Text, Dimensions, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { CreditCard } from 'lucide-react-native';
import { MacroAsset } from '../services/api/endpoints/macro-assets';
import * as Haptics from 'expo-haptics';
import MastercardIcon from '../../assets/svgs/mastercard.svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface Props {
  assets: MacroAsset[];
  showBalance: boolean;
}

function AssetIcon({ url }: { url: string | null }) {
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);

  React.useEffect(() => {
    if (url) {
      Image.getSize(
        url,
        (width, height) => {
          if (height > 0) {
            setAspectRatio(width / height);
          }
        },
        () => {
          setError(true);
        }
      );
    }
  }, [url]);

  if (!url || error) {
    return <CreditCard size={18} stroke={Colors.background} strokeWidth={2.5} />;
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ height: 18, aspectRatio: aspectRatio || 1, borderRadius: 4 }}
      resizeMode="contain"
      onError={() => setError(true)}
    />
  );
}

export function MacroAssetStack({ assets, showBalance }: Props) {
  const [topIndex, setTopIndex] = useState(0);

  // We only animate the top card's translation.
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const formatCurrency = (amountInCents: number) => {
    const baseAmount = amountInCents / 100;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(baseAmount);
  };

  const moveToBack = React.useCallback(() => {
    if (assets.length === 0) return;
    setTopIndex((prev) => (prev + 1) % assets.length);
    // Instantly reset the top card translation after it's moved to back
    translateX.value = 0;
    translateY.value = 0;
  }, [assets.length]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onUpdate((event) => {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      })
      .onEnd((event) => {
        const isSwipedLeft = event.translationX < -SWIPE_THRESHOLD;
        const isSwipedRight = event.translationX > SWIPE_THRESHOLD;
        const isSwipedUp = event.translationY < -SWIPE_THRESHOLD;
        const isSwipedDown = event.translationY > SWIPE_THRESHOLD;

        if (isSwipedLeft || isSwipedRight || isSwipedUp || isSwipedDown) {
          // Run haptic asynchronously
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);

          const outX = isSwipedLeft ? -SCREEN_WIDTH : isSwipedRight ? SCREEN_WIDTH : 0;
          const outY = isSwipedUp ? -SCREEN_WIDTH : isSwipedDown ? SCREEN_WIDTH : 0;

          translateX.value = withTiming(outX, { duration: 250 }, () => {
            runOnJS(moveToBack)();
          });
          translateY.value = withTiming(outY, { duration: 250 });
        } else {
          translateX.value = withSpring(0);
          translateY.value = withSpring(0);
        }
      });
  }, [assets.length, moveToBack]);

  if (!assets || assets.length === 0) {
    return null;
  }

  // To prevent index out of bounds if assets change
  const activeTopIndex = topIndex % assets.length;

  return (
    <View className="relative w-full h-[220px] mb-6 items-center justify-center">
      {assets.map((asset, index) => {
        // Calculate the relative index from the top card.
        // The top card has relativeIndex = 0, next is 1, etc.
        const relativeIndex = (index - activeTopIndex + assets.length) % assets.length;
        const isTopCard = relativeIndex === 0;

        const animatedStyle = useAnimatedStyle(() => {
          if (isTopCard) {
            return {
              transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: 1 },
              ],
              zIndex: assets.length,
            };
          }

          // For cards underneath, scale them down and shift them down slightly.
          // We can also animate them slightly up when the top card is being swiped.
          const swipeProgress = interpolate(
            Math.max(Math.abs(translateX.value), Math.abs(translateY.value)),
            [0, SWIPE_THRESHOLD],
            [0, 1],
            'clamp'
          );

          // Calculate visual hierarchy
          const targetIndex = relativeIndex - swipeProgress;
          const scale = 1 - targetIndex * 0.05;
          const yOffset = targetIndex * 15;

          return {
            transform: [
              { translateY: withSpring(yOffset, { damping: 15 }) },
              { scale: withSpring(scale, { damping: 15 }) },
            ],
            zIndex: assets.length - relativeIndex,
          };
        });

        const cardContent = (
          <Animated.View
            key={asset.id}
            style={[{ position: 'absolute', width: '100%', height: 200 }, animatedStyle]}
          >
            <View className="w-full h-full border border-borderLight rounded-2xl overflow-hidden shadow-sm bg-background">
              {/* Radial gradient centered at the bottom-right corner */}
              <Svg height="100%" width="100%" style={{ position: 'absolute' }}>
                <Defs>
                  <RadialGradient
                    id={`cardGrad-${asset.id}`}
                    cx="100%"
                    cy="100%"
                    r="85%"
                    fx="100%"
                    fy="100%"
                  >
                    <Stop offset="0%" stopColor={asset.colorCode || '#575757'} stopOpacity="1" />
                    <Stop offset="30%" stopColor={asset.colorCode || '#575757'} stopOpacity="0.85" />
                    <Stop offset="100%" stopColor="#1B1212" stopOpacity="1" />
                  </RadialGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="100%" fill={`url(#cardGrad-${asset.id})`} />
              </Svg>

              <View className="p-6 flex-1 justify-between">
                {/* Top Row: Asset Icon Only */}
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <AssetIcon url={asset.iconUrl} />
                  </View>
                </View>

                {/* Balance */}
                <Text className="text-background text-4xl font-black tracking-widest">
                  {showBalance ? formatCurrency(asset.balance) : '••••••••'}
                </Text>

                {/* Bottom Row: Purpose & Mastercard Logo */}
                <View className="flex-row justify-between items-end">
                  <View>
                    <Text className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">
                      Purpose
                    </Text>
                    <Text className="text-background text-sm font-bold uppercase tracking-widest">
                      {asset.purpose}
                    </Text>
                  </View>
                  <MastercardIcon width={45} height={28} />
                </View>
              </View>
            </View>
          </Animated.View>
        );

        if (isTopCard) {
          return (
            <GestureDetector key={asset.id} gesture={panGesture}>
              {cardContent}
            </GestureDetector>
          );
        }

        return cardContent;
      })}
    </View>
  );
}
