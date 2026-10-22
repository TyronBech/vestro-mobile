import React, { useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  interpolate,
  Easing,
  SharedValue,
} from "react-native-reanimated";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
} from "lucide-react-native";
import { CreditCard } from "../types";
import { useUIStore } from "../store/ui-store";
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

function formatCurrency(amountInCents: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amountInCents / 100);
}

interface StackCardProps {
  card: CreditCard;
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
  onPressCard: (card: CreditCard) => void;
}

function StackCard({
  card,
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
  onPressCard,
}: StackCardProps) {
  const theme = useMemo(
    () => createBankCardTheme(card.macroAsset?.colorCode, card.macroAsset?.bankName || card.cardName),
    [card.macroAsset?.colorCode, card.macroAsset?.bankName, card.cardName],
  );
  // Calculate utilization on the fly
  const effectiveSpend = card.unbilledSpend - card.midCyclePaid;
  const utilization =
    card.creditLimit > 0 ? (effectiveSpend / card.creditLimit) * 100 : 0;

  // Determine health status
  let status: "SAFE" | "WARNING" | "DANGER" = "SAFE";
  let statusColor: string = Colors.successAlt;
  let StatusIcon = ShieldCheck;

  if (utilization >= 50) {
    status = "DANGER";
    statusColor = Colors.actionPrimary;
    StatusIcon = ShieldAlert;
  } else if (utilization >= 30) {
    status = "WARNING";
    statusColor = Colors.warningAlt;
    StatusIcon = Shield;
  }

  const animatedStyle = useAnimatedStyle(() => {
    const rawRelative = (cardIndex - topIndexShared.value) % totalCards;
    const relativeIndex =
      rawRelative < 0 ? rawRelative + totalCards : rawRelative;
    const isTopCard = relativeIndex === 0;

    const lastVisibleIndex = Math.min(totalCards, MAX_VISIBLE) - 1;
    const isBackCard = relativeIndex === lastVisibleIndex;

    if (relativeIndex > lastVisibleIndex) {
      return {
        transform: [
          { translateY: lastVisibleIndex * Y_OFFSET_STEP },
          { scale: 1 - lastVisibleIndex * SCALE_STEP },
        ],
        zIndex: 0,
        opacity: 0,
      };
    }

    if (isTopCard) {
      const entryScale = interpolate(
        transitionProgress.value,
        [0, 1],
        [1 - SCALE_STEP, 1],
      );
      const entryY = interpolate(
        transitionProgress.value,
        [0, 1],
        [Y_OFFSET_STEP, 0],
      );

      const rotateX = interpolate(
        translateX.value,
        [-screenWidth, screenWidth],
        [-12, 12],
      );
      const rotateY = interpolate(
        translateY.value,
        [-screenWidth, screenWidth],
        [-6, 6],
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

    const scale = 1 - relativeIndex * SCALE_STEP;
    const yOffset = relativeIndex * Y_OFFSET_STEP;

    if (isBackCard) {
      return {
        transform: [{ translateY: yOffset }, { scale }],
        zIndex: totalCards - relativeIndex,
        opacity: backCardOpacity.value,
      };
    }

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

  return (
    <Animated.View
      style={[
        { position: "absolute", top: 0, width: "100%", height: cardHeight },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => onPressCard(card)}
        accessibilityRole="button"
        accessibilityHint="Edit credit card details"
        style={{ flex: 1 }}
      >
        <BankCardSurface theme={theme}>
          <View style={cardStyles.header}>
            <BankCardIdentity
              name={card.macroAsset?.bankName || card.cardName}
              iconUrl={card.macroAsset?.iconUrl}
            />
            <View style={[styles.statusBadge, { borderColor: `${statusColor}55` }]}>
              <StatusIcon size={Sizes.iconTiny} color={statusColor} strokeWidth={Sizes.strokeThick} />
              <Text style={[styles.statusText, { color: statusColor }]}>{status} {utilization.toFixed(0)}%</Text>
            </View>
          </View>
          <CardAmount
            label="Unbilled spend"
            value={showBalance ? formatCurrency(card.unbilledSpend) : '••••••••'}
            note={card.midCyclePaid > 0 && showBalance ? `Paid early: ${formatCurrency(card.midCyclePaid)}` : undefined}
          />
          <CardNumber />
          <View style={cardStyles.footer}>
            <CardHolder name={cardholderName} detail={card.cardName} />
            <CardNetwork brand={card.cardBrand} />
          </View>
          <View style={styles.details}>
            <View style={styles.limit}>
              <Text style={cardStyles.label}>Credit limit</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.detailValue}>{formatCurrency(card.creditLimit)}</Text>
            </View>
            <View style={styles.dates}>
              <Text style={cardStyles.label}>Cutoff / Due</Text>
              <Text numberOfLines={1} style={styles.detailValue}>Day {card.statementCutoffDay} / {card.paymentDueDay}</Text>
            </View>
          </View>
        </BankCardSurface>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface Props {
  cards: CreditCard[];
  showBalance: boolean;
  cardholderName?: string | null;
}

export function CreditCardStack({ cards, showBalance, cardholderName }: Props) {
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const cardHeight = bankCardHeight('credit', fontScale);
  const [topIndex, setTopIndex] = useState(0);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const transitionProgress = useSharedValue(1);
  const backCardOpacity = useSharedValue(1);
  const dragDirection = useSharedValue(0);
  const topIndexShared = useSharedValue(0);

  const syncReactState = useCallback(() => {
    setTopIndex((prev) => (prev + 1) % cards.length);
  }, [cards.length]);

  const onPressCard = (card: CreditCard) => {
    // Open in edit mode
    useUIStore.getState().openCreditCardModal(card);
  };

  const panGesture = useMemo(() => {
    const cardCount = cards.length;
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
        if (transitionProgress.value < 1) return;

        if (dragDirection.value === 0) {
          const dx = Math.abs(event.translationX);
          const dy = Math.abs(event.translationY);

          if (dx > 5 || dy > 5) {
            dragDirection.value = dx > dy ? 1 : 2;
          }
        }

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
        if (transitionProgress.value < 1) return;

        const currentX = translateX.value;
        const currentY = translateY.value;

        const isSwipedLeft = currentX < -swipeThreshold;
        const isSwipedRight = currentX > swipeThreshold;
        const isSwipedUp = currentY < -swipeThreshold;
        const isSwipedDown = currentY > swipeThreshold;

        dragDirection.value = 0;

        if (isSwipedLeft || isSwipedRight || isSwipedUp || isSwipedDown) {
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

          const mainAxisIsX = isSwipedLeft || isSwipedRight;

          const onAnimationComplete = (finished?: boolean) => {
            if (!finished) return;
            ("worklet");

            topIndexShared.value = (topIndexShared.value + 1) % cardCount;
            translateX.value = 0;
            translateY.value = 0;

            transitionProgress.value = 0;
            transitionProgress.value = withTiming(
              1,
              {
                duration: TRANSITION_MS,
                easing: SMOOTH_EASING,
              },
              () => {
                runOnJS(syncReactState)();
              },
            );

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
            translateX.value = withTiming(
              outX,
              {
                duration: TRANSITION_MS,
                easing: SMOOTH_EASING,
              },
              onAnimationComplete,
            );
            translateY.value = withTiming(outY, {
              duration: TRANSITION_MS,
              easing: SMOOTH_EASING,
            });
          } else {
            translateY.value = withTiming(
              outY,
              {
                duration: TRANSITION_MS,
                easing: SMOOTH_EASING,
              },
              onAnimationComplete,
            );
            translateX.value = withTiming(outX, {
              duration: TRANSITION_MS,
              easing: SMOOTH_EASING,
            });
          }
        } else {
          translateX.value = withTiming(0, {
            duration: 200,
            easing: SMOOTH_EASING,
          });
          translateY.value = withTiming(0, {
            duration: 200,
            easing: SMOOTH_EASING,
          });
        }
      });
  }, [cards.length, syncReactState, screenWidth, cardHeight]);

  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View
        className="relative w-full mb-6 items-center justify-center"
        style={{ zIndex: 9, height: cardHeight + (Math.min(cards.length, MAX_VISIBLE) - 1) * Y_OFFSET_STEP }}
      >
        {cards.map((card, index) => (
          <StackCard
            key={card.id}
            card={card}
            cardIndex={index}
            totalCards={cards.length}
            translateX={translateX}
            translateY={translateY}
            transitionProgress={transitionProgress}
            backCardOpacity={backCardOpacity}
            topIndexShared={topIndexShared}
            showBalance={showBalance}
            cardholderName={cardholderName}
            cardHeight={cardHeight}
            screenWidth={screenWidth}
            onPressCard={onPressCard}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderWidth: 1, borderRadius: 20, backgroundColor: '#0c111be6', flexShrink: 0 },
  statusText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.3 },
  details: { flexDirection: 'row', gap: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#ffffff1f' },
  limit: { flex: 1, minWidth: 0 },
  dates: { flexShrink: 0, alignItems: 'flex-end' },
  detailValue: { color: '#ffffff', fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'], marginTop: 4 },
});
