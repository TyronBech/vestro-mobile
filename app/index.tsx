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

const { width } = Dimensions.get("window");

export default function LandingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Reanimated values for Bottom Sheet / Info Modal
  const isSheetOpen = useSharedValue(false);
  const sheetTranslateY = useSharedValue(500);

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
      sheetTranslateY.value = withTiming(500, { duration: 350 });
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
        backgroundColor: "#fdfefe", 
        paddingTop: insets.top, 
        paddingBottom: Math.max(insets.bottom, 16) 
      }} 
      className="justify-between relative overflow-hidden"
    >
      
      {/* 1. TOP HEADER & METADATA */}
      <View className="px-6 pt-4">
        <View className="flex-row justify-between items-center mb-2">
          <PhilippinePeso size={15} strokeWidth={2.5} stroke="#373737" />
          <View className="flex-row items-center space-x-2">
            <Text className="text-xs font-bold text-[#373737] tracking-widest uppercase">EN</Text>
            <View className="w-1.5 h-1.5 ml-2 rounded-full bg-[#ee4e43]" />
          </View>
        </View>
        
        {/* Horizontal Divider Line */}
        <View className="h-[1px] bg-gray-100 w-full mb-2" />
        
        {/* Micro Labels */}
        <View className="flex-row justify-between mt-1.5">
          <Text className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
            DESIGN BY TYRON BECHAYDA
          </Text>
          <Text className="text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
            FREEDOM ENGINE V1.0.0
          </Text>
        </View>
      </View>

      {/* 2. MAIN CENTER HERO SECTION */}
      <View className="flex-1 items-center justify-center relative px-6">
        
        {/* Track indicator decoration on the right edge */}
        <View className="absolute right-6 top-1/2 flex-col items-center space-y-4 h-36">
          <Text className="relative text-[10px] top-[20%] font-bold text-gray-400 rotate-90 transform origin-left">
            11 / 12
          </Text>
          <View className="w-[2px] top-1/3 h-16 bg-gray-100 relative">
            <View className="absolute top-0 left-0 w-full h-1/2 bg-[#373737]" />
          </View>
        </View>

        {/* Overlapping Red Box Behind Dollar (positioned in the top-right) */}
        <View 
          className="absolute bg-[#ee4e43] rounded-2xl p-6 w-[70%] right-6 z-0"
          style={{
            shadowColor: "transparent", // strictly flat minimalism
            transform: [{ rotate: "3deg" }],
            top: "12%",
          }}
        >
          <Text className="text-[#fdfefe] font-black text-4xl tracking-tighter leading-none mb-1">
            {APP_NAME.toUpperCase()}
          </Text>
          <Text className="text-[#fdfefe]/90 text-xs font-bold uppercase tracking-widest mb-4">
            Financial tracker
          </Text>
          
          {/* Enter Button inside the block container */}
          <TouchableOpacity
            onPress={handleEnter}
            className="bg-[#373737] rounded-2xl py-3 px-4 items-center flex-row justify-center mt-2"
          >
            <Text className="text-[#fdfefe] font-black text-xs uppercase tracking-widest">
              LOGIN
            </Text>
          </TouchableOpacity>
        </View>

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
          <Text className="text-[#373737] text-xs font-bold text-center tracking-widest mb-1">That small money you got.</Text>
          <Text className="text-[#373737] text-xs font-bold text-center tracking-widest">Can compound into something bigger.</Text>
        </View>
      </View>

      {/* 3. BOTTOM FOOTER */}
      <View className="px-6 pb-6 flex-row justify-between items-end">
        <View>
          <Text className="text-[#373737] font-black text-6xl tracking-tighter leading-none">
            {APP_NAME.toLowerCase()}.
          </Text>
        </View>
        
        {/* Red Square with Arrow Down Button */}
        <TouchableOpacity
          onPress={toggleInfoSheet}
          className="bg-[#ee4e43] rounded-2xl w-14 h-14 items-center justify-center"
          style={{ shadowColor: "transparent" }}
        >
          <ArrowDown stroke="#fdfefe" size={24} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* 4. PREMIUM INFO SLIDING DRAWER */}
      <Animated.View 
        style={[styles.sheet, animatedSheetStyle]} 
        className="absolute bottom-12 left-0 right-0 bg-white rounded-3xl p-6 z-50 pb-8"
      >
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-row items-center space-x-2">
            <Shield stroke="#ee4e43" size={20} strokeWidth={2.5} />
            <Text className="text-[#373737] text-lg font-black ml-1 tracking-tight">
              {APP_NAME.toUpperCase()} SECURITY PROTOCOLS
            </Text>
          </View>
          <TouchableOpacity 
            onPress={toggleInfoSheet}
            className="p-1 rounded-full bg-[#373737]/50"
          >
            <X stroke="#fdfefe" size={18} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View className="space-y-4">
          <View className="flex-row items-start mb-4">
            <View className="bg-[#ee4e43]/20 rounded-xl p-2 mr-3">
              <View className="w-2 h-2 rounded-full bg-[#ee4e43]" />
            </View>
            <View className="flex-1">
              <Text className="text-[#373737] text-sm font-bold uppercase tracking-wider">
                15m Inactivity Lock
              </Text>
              <Text className="text-[#373737]/70 text-xs mt-0.5 leading-relaxed">
                App locks securely after 15 minutes of inactivity, requiring biometric or passcode verification.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start mb-4">
            <View className="bg-[#ee4e43]/20 rounded-xl p-2 mr-3">
              <View className="w-2 h-2 rounded-full bg-[#ee4e43]" />
            </View>
            <View className="flex-1">
              <Text className="text-[#373737] text-sm font-bold uppercase tracking-wider">
                Biometric Gate
              </Text>
              <Text className="text-[#373737]/70 text-xs mt-0.5 leading-relaxed">
                Biometric credentials are encrypted and stored in the secure enclave, never on public servers.
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <View className="bg-[#ee4e43]/20 rounded-xl p-2 mr-3">
              <View className="w-2 h-2 rounded-full bg-[#ee4e43]" />
            </View>
            <View className="flex-1">
              <Text className="text-[#373737] text-sm font-bold uppercase tracking-wider">
                Panic Mode (Shake-to-Lock)
              </Text>
              <Text className="text-[#373737]/70 text-xs mt-0.5 leading-relaxed">
                A sudden physical shake of the mobile device immediately invalidates the active session and locks all entry.
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
