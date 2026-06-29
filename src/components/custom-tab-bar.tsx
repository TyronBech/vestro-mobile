import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  Home,
  BarChart3,
  ChartNetwork,
  CircleUserRound,
  Plus,
  PlusCircle,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  RefreshCw,
  DollarSign,
  CreditCard as CreditCardIcon,
} from "lucide-react-native";
import { Colors } from "../../constants/colors";
import { useUIStore } from "../store/ui-store";
import { fetchCreditCards } from "../services/api/endpoints/credit-cards";

const UserIcon = ({ color, filled }: { color: string; filled: boolean }) => {
  if (filled) {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Circle cx="12" cy="7" r="4" fill={color} />
        <Path d="M12 14c-4.4 0-8 2-8 6v1h16v-1c0-4-3.6-6-8-6z" fill={color} />
      </Svg>
    );
  } else {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2.5" />
        <Path
          d="M4 21v-1c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6v1"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </Svg>
    );
  }
};

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const animationProgress = useSharedValue(0);

  const TAB_BAR_HEIGHT = 64 + insets.bottom;

  useEffect(() => {
    animationProgress.value = withSpring(isOpen ? 1 : 0, {
      damping: 445,
      stiffness: 125,
    });
  }, [isOpen]);

  const toggleMenu = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    setIsOpen(!isOpen);
  };

  const handleBudgetConfigPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    setIsOpen(false);
    useUIStore.getState().openBudgetModal();
  };

  const handleMacroAssetPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    setIsOpen(false);
    useUIStore.getState().openMacroAssetModal();
  };

  const handleCoreNetworkPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    setIsOpen(false);
    useUIStore.getState().openCoreNetworkModal();
  };

  const handleSweepPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    setIsOpen(false);
    useUIStore.getState().openSweepModal();
  };

  const handleCashFlowPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    setIsOpen(false);
    useUIStore.getState().openCashFlowModal();
  };

  const handleCreditCardPress = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }

    // Close the bubble menu first to maintain clean transitions
    setIsOpen(false);

    // Open modal. Since editingCreditCard is null, it defaults to the custom CHOOSE view inside the modal.
    useUIStore.getState().openCreditCardModal(null);
  };

  // Animated styles for the fanned-out bubble menu (Pascal's triangle layout)
  // Bubble 1 (Left): Budget Config (-75, -75)
  const bubble1Style = useAnimatedStyle(() => {
    const x = -75 * animationProgress.value;
    const y = -75 * animationProgress.value;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: animationProgress.value },
      ],
      opacity: animationProgress.value,
    };
  });

  // Bubble 2 (Center): Macro Asset (0, -105)
  const bubble2Style = useAnimatedStyle(() => {
    const x = 0 * animationProgress.value;
    const y = -105 * animationProgress.value;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: animationProgress.value },
      ],
      opacity: animationProgress.value,
    };
  });

  // Bubble 3 (Right): Network (75, -75)
  const bubble3Style = useAnimatedStyle(() => {
    const x = 75 * animationProgress.value;
    const y = -75 * animationProgress.value;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: animationProgress.value },
      ],
      opacity: animationProgress.value,
    };
  });

  // Bubble 4 (Sweep - on top, between Config and Macro Asset): (-58.5, -152)
  const bubble4Style = useAnimatedStyle(() => {
    const x = -58.5 * animationProgress.value;
    const y = -152 * animationProgress.value;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: animationProgress.value },
      ],
      opacity: animationProgress.value,
    };
  });

  // Bubble 5 (Cash Flow - on top, between Macro Asset and Network): (58.5, -152)
  const bubble5Style = useAnimatedStyle(() => {
    const x = 58.5 * animationProgress.value;
    const y = -152 * animationProgress.value;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: animationProgress.value },
      ],
      opacity: animationProgress.value,
    };
  });

  // Bubble 6 (Credit Card - centered on top above Macro Asset): (0, -195)
  const bubble6Style = useAnimatedStyle(() => {
    const x = 0 * animationProgress.value;
    const y = -195 * animationProgress.value;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: animationProgress.value },
      ],
      opacity: animationProgress.value,
    };
  });

  // Rotate center button '+' when open
  const plusIconStyle = useAnimatedStyle(() => {
    const rotation = `${animationProgress.value * 45}deg`;
    return {
      transform: [{ rotate: rotation }],
    };
  });

  return (
    <View
      style={
        isOpen
          ? styles.fullContainer
          : [styles.floatingContainer, { height: TAB_BAR_HEIGHT }]
      }
      pointerEvents="box-none"
    >
      {/* Backdrop backdrop that dims screen and closes menu when pressed */}
      {isOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setIsOpen(false)}
          className="bg-backgroundDark/20"
        />
      )}

      {/* Bubble Menu Buttons (Fanning Out in Arc) */}
      <View
        style={{
          position: "absolute",
          bottom: 32 + insets.bottom,
          left: "50%",
          width: 0,
          height: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
        pointerEvents="box-none"
      >
        {/* Bubble 1: Modify Budget Configuration */}
        <Animated.View
          style={[styles.bubbleWrapper, bubble1Style]}
          pointerEvents={isOpen ? "auto" : "none"}
        >
          <TouchableOpacity
            onPress={handleBudgetConfigPress}
            className="w-12 h-12 rounded-full items-center justify-center border border-border"
            style={{ backgroundColor: Colors.backgroundDark }}
          >
            <Sliders size={20} stroke={Colors.background} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text
            style={styles.bubbleText}
            className="font-black text-[9px] uppercase tracking-wider mt-1 text-center"
          >
            Budget Config
          </Text>
        </Animated.View>

        {/* Bubble 2: Add Macro Asset */}
        <Animated.View
          style={[styles.bubbleWrapper, bubble2Style]}
          pointerEvents={isOpen ? "auto" : "none"}
        >
          <TouchableOpacity
            onPress={handleMacroAssetPress}
            className="w-12 h-12 rounded-full items-center justify-center border border-border"
            style={{ backgroundColor: Colors.actionPrimary }}
          >
            <ArrowUpRight
              size={20}
              stroke={Colors.background}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          <Text
            style={styles.bubbleText}
            className="font-black text-[9px] uppercase tracking-wider mt-1 text-center"
          >
            Macro Asset
          </Text>
        </Animated.View>

        {/* Bubble 3: Add Network */}
        <Animated.View
          style={[styles.bubbleWrapper, bubble3Style]}
          pointerEvents={isOpen ? "auto" : "none"}
        >
          <TouchableOpacity
            onPress={handleCoreNetworkPress}
            className="w-12 h-12 rounded-full items-center justify-center border border-border"
            style={{ backgroundColor: Colors.backgroundDark }}
          >
            <ChartNetwork
              size={20}
              stroke={Colors.background}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          <Text
            style={styles.bubbleText}
            className="font-black text-[9px] uppercase tracking-wider mt-1 text-center"
          >
            Network
          </Text>
        </Animated.View>

        {/* Bubble 4: Custom Sweep */}
        <Animated.View
          style={[styles.bubbleWrapper, bubble4Style]}
          pointerEvents={isOpen ? "auto" : "none"}
        >
          <TouchableOpacity
            onPress={handleSweepPress}
            className="w-12 h-12 rounded-full items-center justify-center border border-border"
            style={{ backgroundColor: Colors.actionPrimary }}
          >
            <RefreshCw size={20} stroke={Colors.background} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text
            style={styles.bubbleText}
            className="font-black text-[9px] uppercase tracking-wider mt-1 text-center"
          >
            Sweep
          </Text>
        </Animated.View>

        {/* Bubble 5: Cash Flow / Activity */}
        <Animated.View
          style={[styles.bubbleWrapper, bubble5Style]}
          pointerEvents={isOpen ? "auto" : "none"}
        >
          <TouchableOpacity
            onPress={handleCashFlowPress}
            className="w-12 h-12 rounded-full items-center justify-center border border-border"
            style={{ backgroundColor: Colors.actionPrimary }}
          >
            <DollarSign
              size={20}
              stroke={Colors.background}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          <Text
            style={styles.bubbleText}
            className="font-black text-[9px] uppercase tracking-wider mt-1 text-center"
          >
            Log Activity
          </Text>
        </Animated.View>

        {/* Bubble 6: Credit Card */}
        <Animated.View
          style={[styles.bubbleWrapper, bubble6Style]}
          pointerEvents={isOpen ? "auto" : "none"}
        >
          <TouchableOpacity
            onPress={handleCreditCardPress}
            className="w-12 h-12 rounded-full items-center justify-center border border-border"
            style={{ backgroundColor: Colors.backgroundDark }}
          >
            <CreditCardIcon
              size={20}
              stroke={Colors.background}
              strokeWidth={2.5}
            />
          </TouchableOpacity>
          <Text
            style={styles.bubbleText}
            className="font-black text-[9px] uppercase tracking-wider mt-1 text-center"
          >
            Credit Card
          </Text>
        </Animated.View>
      </View>

      {/* Full-Width Tab Bar */}
      <View
        style={[
          styles.tabBarCapsule,
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 64 + insets.bottom,
            paddingBottom: insets.bottom,
          },
        ]}
        className="flex-row items-center justify-between bg-background border-t border-borderLight px-5"
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const isFocused = state.index === index;

          const onPress = async () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (route.name === "add-transaction") {
              toggleMenu();
              return;
            }

            if (isOpen) {
              setIsOpen(false);
            }

            if (!isFocused && !event.defaultPrevented) {
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch (e) {
                console.log("Haptics ignored:", e);
              }
              navigation.navigate(route.name, route.params);
            }
          };

          // Render Center Action Button (Add Transaction)
          if (route.name === "add-transaction") {
            return (
              <View
                key={route.key}
                className="items-center justify-center flex-1"
              >
                <TouchableOpacity
                  onPress={onPress}
                  className="w-16 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.actionPrimary }}
                >
                  <Animated.View style={plusIconStyle}>
                    <Plus
                      size={24}
                      stroke={Colors.background}
                      strokeWidth={3}
                    />
                  </Animated.View>
                </TouchableOpacity>
              </View>
            );
          }

          // Render regular tab items
          const getIcon = (color: string, filled: boolean) => {
            switch (route.name) {
              case "home":
                return (
                  <Home
                    size={20}
                    stroke={color}
                    strokeWidth={2.5}
                    fill="transparent"
                  />
                );
              case "analytics":
                return (
                  <BarChart3
                    size={20}
                    stroke={color}
                    strokeWidth={2.5}
                    fill="transparent"
                  />
                );
              case "network":
                return (
                  <ChartNetwork
                    size={20}
                    stroke={color}
                    strokeWidth={2.5}
                    fill="transparent"
                  />
                );
              case "profile":
                return (
                  <CircleUserRound
                    size={20}
                    stroke={color}
                    strokeWidth={2.5}
                    fill="transparent"
                  />
                );
              default:
                return null;
            }
          };

          const label = options.title ?? route.name;
          const activeColor = Colors.textPrimary;
          const inactiveColor = Colors.textMuted;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              className="items-center justify-center flex-1 h-full"
            >
              {getIcon(isFocused ? activeColor : inactiveColor, isFocused)}
              <Text
                style={{ color: isFocused ? activeColor : inactiveColor }}
                className={`text-[9px] mt-1 uppercase tracking-widest ${
                  isFocused ? "font-black" : "font-bold"
                }`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  fullContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  tabBarCapsule: {
    shadowColor: "transparent",
    elevation: 0,
  },
  bubbleWrapper: {
    position: "absolute",
    width: 100,
    height: 80,
    left: -50,
    top: -40,
    alignItems: "center",
    justifyContent: "center",
  },
  bubbleText: {
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});
