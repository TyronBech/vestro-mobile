import React, { useState, useMemo, useCallback } from "react";
import { View, Text, Dimensions, TouchableOpacity, Image } from "react-native";
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
import Svg, { Defs, Rect, RadialGradient, Stop } from "react-native-svg";
import { Colors } from "../../constants/colors";
import { Sizes } from "../../constants/sizes";
import {
  CreditCard as CardIcon,
  ShieldCheck,
  ShieldAlert,
  Shield,
} from "lucide-react-native";
import { CreditCard } from "../types";
import * as Haptics from "expo-haptics";
import { useUIStore } from "../store/ui-store";
import MastercardIcon from "../../assets/svgs/mastercard.svg";
import VisaIcon from "../../assets/svgs/visa.svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

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

function AssetIcon({ url }: { url: string | null | undefined }) {
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
    return <CardIcon size={Sizes.iconXSmall} color={Colors.background} strokeWidth={Sizes.strokeMedium} />;
  }

  return (
    <Image
      source={{ uri: url }}
      style={{ height: 16, aspectRatio: aspectRatio || 1, borderRadius: 2 }}
      resizeMode="contain"
      onError={() => setError(true)}
    />
  );
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
  onPressCard,
}: StackCardProps) {
  // Calculate utilization on the fly
  const effectiveSpend = card.unbilledSpend - card.midCyclePaid;
  const utilization =
    card.creditLimit > 0 ? (effectiveSpend / card.creditLimit) * 100 : 0;

  // Determine health status
  let status: "SAFE" | "WARNING" | "DANGER" = "SAFE";
  let statusColor: string = Colors.successAlt;
  let statusBg = "bg-emerald-500/10";
  let StatusIcon = ShieldCheck;

  if (utilization >= 50) {
    status = "DANGER";
    statusColor = Colors.actionPrimary;
    statusBg = "bg-red-500/10";
    StatusIcon = ShieldAlert;
  } else if (utilization >= 30) {
    status = "WARNING";
    statusColor = Colors.warningAlt;
    statusBg = "bg-amber-500/10";
    StatusIcon = Shield;
  }

  // Card gradient color - metallic gold for gold tier, amber for warning, dark charcoal for titanium/standard
  const primaryGradientColor =
    utilization >= 50
      ? Colors.actionPrimary
      : utilization >= 30
        ? Colors.warningAlt
        : card.creditLimit >= 10000000
          ? Colors.gold
          : Colors.backgroundDark;

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
        [-SCREEN_WIDTH, SCREEN_WIDTH],
        [-12, 12],
      );
      const rotateY = interpolate(
        translateY.value,
        [-SCREEN_WIDTH, SCREEN_WIDTH],
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
        { position: "absolute", width: "100%", height: 210 },
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => onPressCard(card)}
        className="w-full h-full border border-borderLight rounded-2xl overflow-hidden shadow-sm bg-background"
      >
        {/* Radial gradient background */}
        <Svg height="100%" width="100%" style={{ position: "absolute" }}>
          <Defs>
            <RadialGradient
              id={`ccGrad-${card.id}`}
              cx="100%"
              cy="100%"
              r="85%"
              fx="100%"
              fy="100%"
            >
              <Stop
                offset="0%"
                stopColor={primaryGradientColor}
                stopOpacity="1"
              />
              <Stop
                offset="40%"
                stopColor={primaryGradientColor}
                stopOpacity="0.85"
              />
              <Stop offset="100%" stopColor={Colors.darkStopEndAlt} stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill={`url(#ccGrad-${card.id})`}
          />
        </Svg>

        <View className="p-5 flex-1 justify-between">
          {/* Top Row: Card name and status badge */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <AssetIcon url={card.macroAsset?.iconUrl} />
              <Text className="text-background text-xs font-black uppercase tracking-widest ml-1.5">
                {card.cardName}
              </Text>
            </View>

            {/* Health Status Badge */}
            <View
              className={`flex-row items-center px-2 py-0.5 rounded-full ${statusBg}`}
            >
              <StatusIcon size={Sizes.iconTiny} color={statusColor} strokeWidth={Sizes.strokeThick} />
              <Text
                style={{ color: statusColor }}
                className="text-[8px] font-black uppercase tracking-wider ml-1"
              >
                {status} ({utilization.toFixed(0)}%)
              </Text>
            </View>
          </View>

          {/* Unbilled Spend / Balance */}
          <View className="mt-2">
            <Text className="text-gray-400 text-[9px] uppercase tracking-widest mb-0.5">
              Unbilled Spend
            </Text>
            <Text className="text-background text-3xl font-black tracking-widest">
              {showBalance ? formatCurrency(card.unbilledSpend) : "••••••••"}
            </Text>
            {card.midCyclePaid > 0 && showBalance && (
              <Text className="text-emerald-400 text-[9px] font-bold uppercase tracking-wider mt-0.5">
                Paid Early: {formatCurrency(card.midCyclePaid)}
              </Text>
            )}
          </View>

          {/* Bottom Row: Details and Mastercard logo */}
          <View className="flex-row justify-between items-end">
            <View className="flex-row flex-1 mr-4">
              <View>
                <Text className="text-gray-400 text-[8px] uppercase tracking-widest mb-0.5">
                  Limit
                </Text>
                <Text className="text-background text-[11px] font-black uppercase tracking-widest">
                  ₱{(card.creditLimit / 100).toLocaleString()}
                </Text>
              </View>
              <View className="ml-4">
                <Text className="text-gray-400 text-[8px] uppercase tracking-widest mb-0.5">
                  Cutoff / Due
                </Text>
                <Text className="text-background text-[11px] font-black uppercase tracking-widest">
                  Day {card.statementCutoffDay} / {card.paymentDueDay}
                </Text>
              </View>
            </View>
            {card.cardBrand === "VISA" ? (
              <VisaIcon width={50} height={16} color={Colors.background} />
            ) : (
              <MastercardIcon width={40} height={25} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface Props {
  cards: CreditCard[];
  showBalance: boolean;
}

export function CreditCardStack({ cards, showBalance }: Props) {
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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    // Open in edit mode
    useUIStore.getState().openCreditCardModal(card);
  };

  const panGesture = useMemo(() => {
    const cardCount = cards.length;

    return Gesture.Pan()
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

        const isSwipedLeft = currentX < -SWIPE_THRESHOLD;
        const isSwipedRight = currentX > SWIPE_THRESHOLD;
        const isSwipedUp = currentY < -SWIPE_THRESHOLD;
        const isSwipedDown = currentY > SWIPE_THRESHOLD;

        dragDirection.value = 0;

        if (isSwipedLeft || isSwipedRight || isSwipedUp || isSwipedDown) {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);

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
  }, [cards.length, syncReactState]);

  if (!cards || cards.length === 0) {
    return null;
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View
        className="relative w-full h-[230px] mb-6 items-center justify-center"
        style={{ zIndex: 9 }}
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
            onPressCard={onPressCard}
          />
        ))}
      </View>
    </GestureDetector>
  );
}
