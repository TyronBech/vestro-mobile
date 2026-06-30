import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Dimensions, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  interpolate,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, Rect, RadialGradient, Stop } from 'react-native-svg';
import { Colors } from '../../constants/colors';
import { Sizes } from '../../constants/sizes';
import { CreditCard } from 'lucide-react-native';
import { MacroAsset } from '../services/api/endpoints/macro-assets';
import * as Haptics from 'expo-haptics';
import MastercardIcon from '../../assets/svgs/mastercard.svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

/** Smooth ease curve — no spring bounce anywhere */
const SMOOTH_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
const TRANSITION_MS = 300;
const FADE_MS = 350;
const FADE_DELAY_MS = 100;

const MAX_VISIBLE = 4;
const Y_OFFSET_STEP = 8;
const SCALE_STEP = 0.03;

// ─── Helpers ──────────────────────────────────────────

function AssetIcon({ url }: { url: string | null }) {
  const [error, setError] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);

  React.useEffect(() => {
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
    return <CreditCard size={Sizes.iconSmall} stroke={Colors.background} strokeWidth={Sizes.strokeMedium} />;
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ height: 18, aspectRatio: aspectRatio || 1 }}
      resizeMode="contain"
      onError={() => setError(true)}
    />
  );
}

/**
 * Format cents to PHP currency string.
 * Kept outside components to avoid re-creation on every render.
 */
function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amountInCents / 100);
}

// ─── Individual Stack Card ────────────────────────────
// Extracted so each card owns its own `useAnimatedStyle` hook
// (calling hooks inside .map() violates React's rules of hooks).

interface StackCardProps {
  asset: MacroAsset;
  cardIndex: number;
  totalCards: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  transitionProgress: SharedValue<number>;
  backCardOpacity: SharedValue<number>;
  topIndexShared: SharedValue<number>;
  showBalance: boolean;
}

function StackCard({
  asset,
  cardIndex,
  totalCards,
  translateX,
  translateY,
  transitionProgress,
  backCardOpacity,
  topIndexShared,
  showBalance,
}: StackCardProps) {
  const animatedStyle = useAnimatedStyle(() => {
    // Compute relative position from the UI-thread shared value (zero gap).
    const rawRelative = (cardIndex - topIndexShared.value) % totalCards;
    const relativeIndex = rawRelative < 0 ? rawRelative + totalCards : rawRelative;
    const isTopCard = relativeIndex === 0;

    // Define the last visible card index (0-indexed)
    const lastVisibleIndex = Math.min(totalCards, MAX_VISIBLE) - 1;
    const isBackCard = relativeIndex === lastVisibleIndex;

    // ── Cards beyond the max visible stack: completely invisible ──
    if (relativeIndex > lastVisibleIndex) {
      return {
        transform: [
          { translateY: lastVisibleIndex * Y_OFFSET_STEP },
          { scale: 1 - lastVisibleIndex * SCALE_STEP }
        ],
        zIndex: 0,
        opacity: 0,
      };
    }

    // ── Top card: follows finger + eases in from second position ──
    if (isTopCard) {
      const entryScale = interpolate(transitionProgress.value, [0, 1], [1 - SCALE_STEP, 1]);
      const entryY = interpolate(transitionProgress.value, [0, 1], [Y_OFFSET_STEP, 0]);

      // Calculate rotation based on translateX and translateY
      // up to 12 degrees max rotation when swiped horizontally
      const rotateX = interpolate(
        translateX.value,
        [-SCREEN_WIDTH, SCREEN_WIDTH],
        [-12, 12]
      );
      // up to 6 degrees max rotation when swiped vertically
      const rotateY = interpolate(
        translateY.value,
        [-SCREEN_WIDTH, SCREEN_WIDTH],
        [-6, 6]
      );
      const rotation = `${rotateX + rotateY}deg`;

      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value + entryY },
          { rotate: rotation },
          { scale: entryScale },
        ],
        zIndex: totalCards,
        opacity: 1,
      };
    }

    // ── Underlying cards — completely static during drag ──
    // They only animate when transitionProgress changes (after exit).
    // This eliminates the "heartbeat" caused by reacting to drag progress.

    // Settled position for this relative index
    const scale = 1 - relativeIndex * SCALE_STEP;
    const yOffset = relativeIndex * Y_OFFSET_STEP;

    // ── Back card: fades in at rest position ──
    if (isBackCard) {
      return {
        transform: [{ translateY: yOffset }, { scale }],
        zIndex: totalCards - relativeIndex,
        opacity: backCardOpacity.value,
      };
    }

    // ── Middle cards: ease from old stacked position to new ──
    // Before the shift, this card was one level deeper (relativeIndex + 1).
    const oldScale = 1 - (relativeIndex + 1) * SCALE_STEP;
    const oldY = (relativeIndex + 1) * Y_OFFSET_STEP;

    const finalScale = interpolate(
      transitionProgress.value,
      [0, 1],
      [oldScale, scale],
    );
    const finalY = interpolate(
      transitionProgress.value,
      [0, 1],
      [oldY, yOffset],
    );

    return {
      transform: [{ translateY: finalY }, { scale: finalScale }],
      zIndex: totalCards - relativeIndex,
      opacity: 1,
    };
  });

  // ── Card visual content ──
  const cardView = (
    <Animated.View
      style={[{ position: 'absolute', width: '100%', height: 200 }, animatedStyle]}
    >
      <View className="w-full h-full border border-borderLight rounded-2xl overflow-hidden shadow-sm bg-background">
        {/* Radial gradient background */}
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
              <Stop offset="0%" stopColor={asset.colorCode || Colors.darkStopStart} stopOpacity="1" />
              <Stop offset="30%" stopColor={asset.colorCode || Colors.darkStopStart} stopOpacity="0.85" />
              <Stop offset="100%" stopColor={Colors.darkStopEnd} stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#cardGrad-${asset.id})`} />
        </Svg>

        <View className="p-6 flex-1 justify-between">
          {/* Top Row: Asset Icon */}
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

  return cardView;
}

// ─── Stack Container ──────────────────────────────────

interface Props {
  assets: MacroAsset[];
  showBalance: boolean;
}

export function MacroAssetStack({ assets, showBalance }: Props) {
  // React state — used only for GestureDetector binding (non-critical timing)
  const [topIndex, setTopIndex] = useState(0);

  // ── Shared values (UI thread, zero sync gap) ──
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const transitionProgress = useSharedValue(1);
  const backCardOpacity = useSharedValue(1);
  // Lock direction to single axis: 0 = none, 1 = X-axis, 2 = Y-axis
  const dragDirection = useSharedValue(0);

  // Source of truth for card positions — lives on the UI thread
  const topIndexShared = useSharedValue(0);

  /** Sync React state with the UI-thread shared value (for GestureDetector). */
  const syncReactState = useCallback(() => {
    setTopIndex((prev) => (prev + 1) % assets.length);
  }, [assets.length]);

  const panGesture = useMemo(() => {
    const cardCount = assets.length;

    return Gesture.Pan()
      .onStart(() => {
        dragDirection.value = 0;
      })
      .onUpdate((event) => {
        // Block gesture if a transition animation is still active
        if (transitionProgress.value < 1) return;

        // Determine axis direction if not set yet (using threshold of 5 pixels)
        if (dragDirection.value === 0) {
          const dx = Math.abs(event.translationX);
          const dy = Math.abs(event.translationY);

          if (dx > 5 || dy > 5) {
            dragDirection.value = dx > dy ? 1 : 2;
          }
        }

        // Restrict movement based on locked axis
        if (dragDirection.value === 1) {
          translateX.value = event.translationX;
          translateY.value = 0;
        } else if (dragDirection.value === 2) {
          translateX.value = 0;
          translateY.value = event.translationY;
        } else {
          translateX.value = event.translationX;
          translateY.value = event.translationY;
        }
      })
      .onEnd((event) => {
        // Block gesture if a transition animation is still active
        if (transitionProgress.value < 1) return;

        const currentX = translateX.value;
        const currentY = translateY.value;

        const isSwipedLeft = currentX < -SWIPE_THRESHOLD;
        const isSwipedRight = currentX > SWIPE_THRESHOLD;
        const isSwipedUp = currentY < -SWIPE_THRESHOLD;
        const isSwipedDown = currentY > SWIPE_THRESHOLD;

        // Reset locked axis
        dragDirection.value = 0;

        if (isSwipedLeft || isSwipedRight || isSwipedUp || isSwipedDown) {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);

          // Continue in the swipe direction until off-screen
          const outX = isSwipedLeft
            ? -SCREEN_WIDTH * 1.5
            : isSwipedRight
              ? SCREEN_WIDTH * 1.5
              : currentX;
          const outY = isSwipedUp
            ? -SCREEN_WIDTH * 1.5
            : isSwipedDown
              ? SCREEN_WIDTH * 1.5
              : currentY;

          // Determine which axis is the primary swipe axis to attach callback
          const mainAxisIsX = isSwipedLeft || isSwipedRight;

          const onAnimationComplete = (finished?: boolean) => {
            if (!finished) return;
            'worklet';

            // All below runs on the UI thread in a single frame — no flash.

            // Advance top index
            topIndexShared.value = (topIndexShared.value + 1) % cardCount;

            // Reset drag position
            translateX.value = 0;
            translateY.value = 0;

            // ── Phase 2: second card eases up to become first ──
            transitionProgress.value = 0;
            transitionProgress.value = withTiming(1, {
              duration: TRANSITION_MS,
              easing: SMOOTH_EASING,
            }, () => {
              // Sync React state only AFTER the transition animation is
              // fully complete — prevents a mid-animation re-render that
              // would cause a visible scale snap / heartbeat.
              runOnJS(syncReactState)();
            });

            // ── Phase 3: swiped card fades in at the back (delayed) ──
            backCardOpacity.value = 0;
            backCardOpacity.value = withDelay(
              FADE_DELAY_MS,
              withTiming(1, {
                duration: FADE_MS,
                easing: SMOOTH_EASING,
              }),
            );
          };

          if (mainAxisIsX) {
            translateX.value = withTiming(outX, {
              duration: TRANSITION_MS,
              easing: SMOOTH_EASING,
            }, onAnimationComplete);
            translateY.value = withTiming(outY, {
              duration: TRANSITION_MS,
              easing: SMOOTH_EASING,
            });
          } else {
            translateY.value = withTiming(outY, {
              duration: TRANSITION_MS,
              easing: SMOOTH_EASING,
            }, onAnimationComplete);
            translateX.value = withTiming(outX, {
              duration: TRANSITION_MS,
              easing: SMOOTH_EASING,
            });
          }
        } else {
          // Below threshold — glide back to center
          translateX.value = withTiming(0, { duration: 200, easing: SMOOTH_EASING });
          translateY.value = withTiming(0, { duration: 200, easing: SMOOTH_EASING });
        }
      });
  }, [assets.length, syncReactState]);

  if (!assets || assets.length === 0) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View
        className="relative w-full h-[220px] mb-6 items-center justify-center"
        style={{ zIndex: 10 }}
      >
        {assets.map((asset, index) => (
          <StackCard
            key={asset.id}
            asset={asset}
            cardIndex={index}
            totalCards={assets.length}
            translateX={translateX}
            translateY={translateY}
            transitionProgress={transitionProgress}
            backCardOpacity={backCardOpacity}
            topIndexShared={topIndexShared}
            showBalance={showBalance}
          />
        ))}
      </View>
    </GestureDetector>
  );
}
