import React, { useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { ArrowDown, Shield, X, PhilippinePeso } from "lucide-react-native";
import { APP_NAME } from "../src/services/api/config";
import Card from "../src/components/card";
import { Colors } from "../constants/colors";
import { Strings } from "../constants/string";
import { Sizes } from "../constants/sizes";

const { width } = Dimensions.get("window");

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Reanimated values for Bottom Sheet / Info Modal
  const isSheetOpen = useSharedValue(false);
  const sheetTranslateY = useSharedValue<number>(Sizes.sheetTranslateYClosed);

  const handleEnter = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    router.push("/login");
  };

  const toggleInfoSheet = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    
    if (isSheetOpen.value) {
      sheetTranslateY.value = withTiming(Sizes.sheetTranslateYClosed, { duration: 350 });
      isSheetOpen.value = false;
    } else {
      sheetTranslateY.value = withTiming(0, { duration: 350 });
      isSheetOpen.value = true;
    }
  };

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: sheetTranslateY.value }],
    };
  });

  return (
    <View 
      style={{ 
        flex: 1, 
        backgroundColor: Colors.background, 
        paddingTop: insets.top, 
        paddingBottom: Math.max(insets.bottom, Sizes.safeAreaBottomMin) 
      }} 
      className="justify-between relative overflow-hidden"
    >
      
      {/* 1. TOP HEADER & METADATA */}
      <View className="px-6 pt-4">
        <View className="flex-row justify-between items-center mb-2">
          <PhilippinePeso size={Sizes.iconMini} strokeWidth={Sizes.strokeMedium} stroke={Colors.textPrimary} />
          <View className="flex-row items-center space-x-2">
            <Text className="text-xs font-bold text-textPrimary tracking-widest uppercase">{Strings.languageCode}</Text>
            <View 
              style={{ width: Sizes.headerDotSize, height: Sizes.headerDotSize, borderRadius: Sizes.headerDotSize / 2 }} 
              className="ml-2 rounded-full bg-actionPrimary" 
            />
          </View>
        </View>
        
        {/* Horizontal Divider Line */}
        <View style={{ height: Sizes.dividerHeight }} className="bg-gray-100 w-full mb-2" />
        
        {/* Micro Labels */}
        <View className="flex-row justify-between mt-1.5">
          <Text className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
            {Strings.designerCredit}
          </Text>
          <Text className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
            {Strings.engineVersion}
          </Text>
        </View>
      </View>

      {/* 2. MAIN CENTER HERO SECTION */}
      <View className="flex-1 items-center justify-center relative px-6">
        
        {/* Track indicator decoration on the right edge */}
        <View className="absolute right-6 top-1/2 flex-col items-center space-y-4 h-36">
          <Text className="relative text-[10px] top-[20%] font-bold text-gray-400 rotate-90 transform origin-left">
            {Strings.pageIndicator}
          </Text>
          <View className="w-[2px] top-1/3 h-16 bg-gray-100 relative">
            <View className="absolute top-0 left-0 w-full h-1/2 bg-backgroundDark" />
          </View>
        </View>

        {/* Overlapping Red Box Behind Dollar (positioned in the top-right) */}
        <Card
          title={APP_NAME}
          subtitle={Strings.landingSubtitle}
          variant="accent"
          className="absolute right-6 z-0"
          titleClassName="text-4xl"
          subtitleClassName="text-xs mb-4"
          style={{
            transform: [{ rotate: "3deg" }],
            top: "12%",
            width: Sizes.cardWidthLanding
          }}
        >
          {/* Enter Button inside the block container */}
          <TouchableOpacity
            onPress={handleEnter}
            className="bg-backgroundDark rounded-2xl py-3 px-4 items-center flex-row justify-center mt-2"
          >
            <Text className="text-background font-black text-xs uppercase tracking-widest">
              {Strings.loginButtonText}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* 3D Dollar Asset Image (static, in front of the red box) */}
        <View pointerEvents="none" className="z-10" style={{ transform: [{ translateY: 20 }] }}>
          <Image
            source={require("../assets/Dollar.png")}
            style={{
              width: width * 0.72,
              height: width * 0.72,
            }}
            resizeMode="contain"
          />
        </View>
        {/* Money growth tag line */}
        <View className="flex-col mt-5 items-center justify-center">
          <Text className="text-textPrimary text-xs font-bold text-center tracking-widest mb-1">{Strings.taglineLine1}</Text>
          <Text className="text-textPrimary text-xs font-bold text-center tracking-widest">{Strings.taglineLine2}</Text>
        </View>
      </View>

      {/* 3. BOTTOM FOOTER */}
      <View className="px-6 pb-6 flex-row justify-between items-end">
        <View>
          <Text className="text-textPrimary font-black text-6xl tracking-tighter leading-none">
            {APP_NAME.toLowerCase()}.
          </Text>
        </View>
        
        {/* Red Square with Arrow Down Button */}
        <TouchableOpacity
          onPress={toggleInfoSheet}
          className="bg-actionPrimary rounded-2xl items-center justify-center"
          style={{ 
            width: Sizes.bottomButtonSize, 
            height: Sizes.bottomButtonSize,
            shadowColor: "transparent" 
          }}
        >
          <ArrowDown stroke={Colors.background} size={Sizes.iconLarge} strokeWidth={Sizes.strokeThick} />
        </TouchableOpacity>
      </View>

      {/* 4. PREMIUM INFO SLIDING DRAWER */}
      <Animated.View 
        style={[styles.sheet, animatedSheetStyle]} 
        className="absolute bottom-12 left-0 right-0 bg-white rounded-3xl p-6 z-50 pb-8"
      >
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center space-x-2">
            <Shield stroke={Colors.actionPrimary} size={Sizes.iconMedium} strokeWidth={Sizes.strokeMedium} />
            <Text className="text-textPrimary text-lg font-black ml-1 tracking-tight">
              {APP_NAME.toUpperCase()}{Strings.securityProtocolsSuffix}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={toggleInfoSheet}
            className="p-1 rounded-full bg-backgroundDark/50"
          >
            <X stroke={Colors.background} size={Sizes.iconSmall} strokeWidth={Sizes.strokeMedium} />
          </TouchableOpacity>
        </View>

        <View className="space-y-4">
          <View className="flex-row items-start mb-4">
            <View className="bg-actionPrimary/20 rounded-xl p-2 mr-3">
              <View 
                style={{ width: Sizes.securityDotSize, height: Sizes.securityDotSize }} 
                className="rounded-full bg-actionPrimary" 
              />
            </View>
            <View className="flex-1">
              <Text className="text-textPrimary text-sm font-bold uppercase tracking-wider">
                {Strings.securityInactivityTitle}
              </Text>
              <Text className="text-textPrimary/70 text-xs mt-0.5 leading-relaxed">
                {Strings.securityInactivityDesc}
              </Text>
            </View>
          </View>

          <View className="flex-row items-start mb-4">
            <View className="bg-actionPrimary/20 rounded-xl p-2 mr-3">
              <View 
                style={{ width: Sizes.securityDotSize, height: Sizes.securityDotSize }} 
                className="rounded-full bg-actionPrimary" 
              />
            </View>
            <View className="flex-1">
              <Text className="text-textPrimary text-sm font-bold uppercase tracking-wider">
                {Strings.securityBiometricTitle}
              </Text>
              <Text className="text-textPrimary/70 text-xs mt-0.5 leading-relaxed">
                {Strings.securityBiometricDesc}
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="bg-actionPrimary/20 rounded-xl p-2 mr-3">
              <View 
                style={{ width: Sizes.securityDotSize, height: Sizes.securityDotSize }} 
                className="rounded-full bg-actionPrimary" 
              />
            </View>
            <View className="flex-1">
              <Text className="text-textPrimary text-sm font-bold uppercase tracking-wider">
                {Strings.securityPanicTitle}
              </Text>
              <Text className="text-textPrimary/70 text-xs mt-0.5 leading-relaxed">
                {Strings.securityPanicDesc}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    shadowColor: "transparent",
    elevation: 0,
  },
});
