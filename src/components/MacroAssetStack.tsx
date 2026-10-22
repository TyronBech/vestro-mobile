import React, { useState, useMemo, useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
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
import { MacroAsset } from '../services/api/endpoints/macro-assets';
import {
  BankCardIdentity,
  BankCardSurface,
  CardAmount,
  CardHolder,
  CardNetwork,
  CardNumber,
  cardStyles,
} from './bank-card';
import { bankCardHeight, createBankCardTheme } from './bank-card-theme';

/** Smooth ease curve — no spring bounce anywhere */
const SMOOTH_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);
const TRANSITION_MS = 300;
const FADE_MS = 350;
const FADE_DELAY_MS = 100;

const MAX_VISIBLE = 4;
const Y_OFFSET_STEP = 8;
const SCALE_STEP = 0.03;

// ─── Helpers ──────────────────────────────────────────

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
  cardholderName?: string | null;
  cardHeight: number;
  screenWidth: number;
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
  cardholderName,
  cardHeight,
  screenWidth,
}: StackCardProps) {
  const theme = useMemo(
    () => createBankCardTheme(asset.colorCode, asset.bankName),
    [asset.colorCode, asset.bankName],
  );
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
        [-screenWidth, screenWidth],
        [-12, 12]
      );
      // up to 6 degrees max rotation when swiped vertically
      const rotateY = interpolate(
        translateY.value,
        [-screenWidth, screenWidth],
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
      style={[{ position: 'absolute', top: 0, width: '100%', height: cardHeight }, animatedStyle]}
    >
      <BankCardSurface theme={theme}>
        <View style={cardStyles.header}>
          <BankCardIdentity name={asset.bankName} iconUrl={asset.iconUrl} />
        </View>
        <CardAmount label="Balance" value={showBalance ? formatCurrency(asset.balance) : '••••••••'} />
        <CardNumber />
        <View style={cardStyles.footer}>
          <CardHolder name={cardholderName} />
          <CardNetwork brand={asset.cardBrand} />
        </View>
      </BankCardSurface>
    </Animated.View>
  );

  return cardView;
}

// ─── Stack Container ──────────────────────────────────

interface Props {
  assets: MacroAsset[];
  showBalance: boolean;
  cardholderName?: string | null;
}

export function MacroAssetStack({ assets, showBalance, cardholderName }: Props) {
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const cardHeight = bankCardHeight('standard', fontScale);
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
    const cardWidth = screenWidth - 48;
    const swipeThreshold = screenWidth * 0.25;
    const hitSlopX = -Math.round((cardWidth - 120) / 2);
    const hitSlopY = -Math.round((cardHeight - 120) / 2);

    return Gesture.Pan()
      .hitSlop({
        left: hitSlopX,
        right: hitSlopX,
        top: hitSlopY,
        bottom: hitSlopY,
      })
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

        const isSwipedLeft = currentX < -swipeThreshold;
        const isSwipedRight = currentX > swipeThreshold;
        const isSwipedUp = currentY < -swipeThreshold;
        const isSwipedDown = currentY > swipeThreshold;

        // Reset locked axis
        dragDirection.value = 0;

        if (isSwipedLeft || isSwipedRight || isSwipedUp || isSwipedDown) {
          // Continue in the swipe direction until off-screen
          const outX = isSwipedLeft
            ? -screenWidth * 1.5
            : isSwipedRight
              ? screenWidth * 1.5
              : currentX;
          const outY = isSwipedUp
            ? -screenWidth * 1.5
            : isSwipedDown
              ? screenWidth * 1.5
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
  }, [assets.length, syncReactState, screenWidth, cardHeight]);

  if (!assets || assets.length === 0) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View
        className="relative w-full mb-6 items-center justify-center"
        style={{ zIndex: 10, height: cardHeight + (Math.min(assets.length, MAX_VISIBLE) - 1) * Y_OFFSET_STEP }}
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
            cardholderName={cardholderName}
            cardHeight={cardHeight}
            screenWidth={screenWidth}
          />
        ))}
      </View>
    </GestureDetector>
  );
}
