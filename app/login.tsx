import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ArrowLeft, PhilippinePeso, Lock } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import Svg, { Path } from "react-native-svg";
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../src/store/auth-store";
import { APP_NAME, SECURE_STORE_KEYS, SECURE_STORE_OPTIONS } from "../src/services/api/config";
import { supabase } from "../src/services/supabase";
import Card from "../src/components/card";
import StartEngineCard from "../src/components/start-engine-card";
import { Colors } from "../constants/colors";
import { Strings } from "../constants/string";
import { Sizes } from "../constants/sizes";

// Handle OAuth redirects in browser sessions
WebBrowser.maybeCompleteAuthSession();

const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </Svg>
);

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const { requires2fa: paramRequires2fa, tempUserId: paramTempUserId } = useLocalSearchParams<{ requires2fa?: string; tempUserId?: string }>();
  const { login, loginWithGoogle, loginWith2fa, loading, error, clearError } = useAuthStore();
  const insets = useSafeAreaInsets();

  const isSubmittingRef = useRef(false);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rateLimitTimeLeft, setRateLimitTimeLeft] = useState<number>(0);
  const [requires2fa, setRequires2fa] = useState<boolean>(false);
  const [twoFactorCode, setTwoFactorCode] = useState<string>("");
  const [tempUserId, setTempUserId] = useState<string>("");

  useEffect(() => {
    if (paramRequires2fa === "true" && paramTempUserId) {
      setRequires2fa(true);
      setTempUserId(paramTempUserId);
      router.setParams({ requires2fa: undefined, tempUserId: undefined });
    }
  }, [paramRequires2fa, paramTempUserId]);

  // Reanimated shared value for card shake
  const shakeOffset = useSharedValue(0);

  // Load initial rate limit from SecureStore on mount
  useEffect(() => {
    const checkRateLimit = async () => {
      try {
        const storedExpiresAt = await SecureStore.getItemAsync(
          SECURE_STORE_KEYS.RATE_LIMIT_EXPIRES_AT,
          SECURE_STORE_OPTIONS
        );
        if (storedExpiresAt) {
          const expiresAt = parseInt(storedExpiresAt, 10);
          const now = Date.now();
          if (expiresAt > now) {
            const timeLeft = Math.ceil((expiresAt - now) / 1000);
            setRateLimitTimeLeft(timeLeft);
          } else {
            await SecureStore.deleteItemAsync(
              SECURE_STORE_KEYS.RATE_LIMIT_EXPIRES_AT,
              SECURE_STORE_OPTIONS
            );
          }
        }
      } catch (e) {
        console.error("Error loading rate limit from SecureStore:", e);
      }
    };
    checkRateLimit();
  }, []);

  // Countdown timer effect for rate limiting
  useEffect(() => {
    if (rateLimitTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setRateLimitTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          SecureStore.deleteItemAsync(
            SECURE_STORE_KEYS.RATE_LIMIT_EXPIRES_AT,
            SECURE_STORE_OPTIONS
          ).catch((e) => console.error("Error deleting rate limit from store:", e));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitTimeLeft]);

  // Clear authentication error when rate limit ends
  useEffect(() => {
    if (rateLimitTimeLeft === 0) {
      clearError();
    }
  }, [rateLimitTimeLeft, clearError]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Animated style for card (combining rotation and translation)
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: "0deg" },
      { translateX: shakeOffset.value }
    ],
  }));

  // Trigger shake animation & haptic feedback on error
  const triggerErrorEffects = useCallback(() => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (e) {
      console.log("Haptics ignored:", e);
    }
    
    shakeOffset.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  }, [shakeOffset]);

  // Handle errors triggered from store
  useEffect(() => {
    if (error) {
      triggerErrorEffects();
    }
  }, [error, triggerErrorEffects]);

  const handleLogin = async () => {
    if (rateLimitTimeLeft > 0) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (requires2fa) {
      if (twoFactorCode.length !== 6) {
        useAuthStore.setState({ error: "2FA code must be 6 digits" });
        triggerErrorEffects();
        isSubmittingRef.current = false;
        return;
      }
      try {
        await loginWith2fa({ userId: tempUserId, token: twoFactorCode });
      } catch (err: any) {
        triggerErrorEffects();
      } finally {
        isSubmittingRef.current = false;
      }
      return;
    }

    if (!email.trim() || !password.trim()) {
      useAuthStore.setState({ error: Strings.validationEmailPassword });
      triggerErrorEffects();
      isSubmittingRef.current = false;
      return;
    }

    try {
      const result = await login({ email: email.trim(), password: password.trim() });
      if (result?.requires2fa && result?.user?.id) {
        setTempUserId(result.user.id);
        setRequires2fa(true);
        setTwoFactorCode("");
      }
    } catch (err: any) {
      if (err.status === 429) {
        const expiresAt = Date.now() + 15 * 60 * 1000;
        await SecureStore.setItemAsync(
          SECURE_STORE_KEYS.RATE_LIMIT_EXPIRES_AT,
          expiresAt.toString(),
          SECURE_STORE_OPTIONS
        ).catch((e) => console.error("Error storing rate limit:", e));
        setRateLimitTimeLeft(900); // 15 minutes lockout
      } else {
        triggerErrorEffects();
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleGoogleLogin = async () => {
    if (rateLimitTimeLeft > 0) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      const redirectUrl = Linking.createURL("google-auth");
      console.log("[Google OAuth] Generated redirectUrl:", redirectUrl);
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) {
        throw oauthError;
      }

      if (!data?.url) {
        throw new Error("No authorization URL returned from Supabase.");
      }

      console.log("[Google OAuth] Opening WebBrowser with data.url:", data.url);
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      console.log("[Google OAuth] WebBrowser result:", result);

      if (result.type === "success" && result.url) {
        const hash = result.url.split("#")[1];
        if (!hash) {
          throw new Error("No token returned in callback URL.");
        }
        
        const getParam = (name: string) => {
          const match = hash.match(new RegExp(`(^|&)${name}=([^&]*)(&|$)`));
          return match ? decodeURIComponent(match[2]) : null;
        };

        const supabaseToken = getParam("access_token");
        if (!supabaseToken) {
          throw new Error("Access token not found in callback hash.");
        }

        const googleLoginResult = await loginWithGoogle(supabaseToken);

        if (googleLoginResult?.requires2fa && googleLoginResult?.user?.id) {
          setTempUserId(googleLoginResult.user.id);
          setRequires2fa(true);
          setTwoFactorCode("");
        }
      } else if (result.type === "cancel") {
        // Flow cancelled by user
      } else {
        throw new Error(Strings.googleLoginError);
      }
    } catch (err: any) {
      console.error("Google OAuth error:", err);
      if (err.status === 429) {
        const expiresAt = Date.now() + 15 * 60 * 1000;
        await SecureStore.setItemAsync(
          SECURE_STORE_KEYS.RATE_LIMIT_EXPIRES_AT,
          expiresAt.toString(),
          SECURE_STORE_OPTIONS
        ).catch((e) => console.error("Error storing rate limit:", e));
        setRateLimitTimeLeft(900); // 15 minutes lockout
      } else {
        useAuthStore.setState({ error: err.message || Strings.googleLoginError });
        triggerErrorEffects();
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleForgotPassword = () => {
    clearError();
    router.push("/forgot-password");
  };

  const handleBack = () => {
    clearError();
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <StatusBar style="dark" />
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
            <View className="w-[2px] top-1/3 h-16 bg-backgroundDark relative">
              <View className="absolute top-0 left-0 w-full h-1/2 bg-gray-100" />
            </View>
          </View>

          {/* Red Box containing the Login Form (Centered) */}
          <Card
            title={APP_NAME}
            subtitle={Strings.loginSubtitle}
            variant="dark"
            style={[animatedCardStyle, { width: Sizes.cardWidthLogin }]}
            className="z-20 relative overflow-hidden"
          >
            {rateLimitTimeLeft > 0 && (
              <View 
                style={{ 
                  position: "absolute", 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  backgroundColor: Colors.backgroundDark, 
                  zIndex: 50, 
                  alignItems: "center", 
                  justifyContent: "center", 
                  padding: 24,
                }}
              >
                <Lock size={32} stroke={Colors.actionPrimary} strokeWidth={Sizes.strokeThick} className="mb-4" />
                <Text className="text-actionPrimary text-xs font-bold uppercase tracking-widest mt-3 mb-5">
                  ACCESS LOCKOUT
                </Text>
                <Text className="text-background font-black text-4xl tracking-widest mb-3">
                  {formatTime(rateLimitTimeLeft)}
                </Text>
                <Text className="text-background/60 text-[10px] uppercase font-bold tracking-wider text-center leading-relaxed">
                  Too many login attempts. Please wait before trying again.
                </Text>
              </View>
            )}

            {/* Error Banner */}
            {error && (
              <View className="bg-background rounded-2xl p-4 mb-4">
                <Text className="text-actionPrimary text-xs font-bold uppercase tracking-wider">
                  {Strings.authErrorTitle}
                </Text>
                <Text className="text-textPrimary text-xs mt-1 leading-relaxed">
                  {error}
                </Text>
              </View>
            )}

            {!requires2fa ? (
              <>
                {/* Inputs */}
                <View>
                  <View className="mb-4">
                    <Text className="text-background/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                      {Strings.emailLabel}
                    </Text>
                    <TextInput
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        if (error) clearError();
                      }}
                      placeholder={Strings.emailPlaceholder}
                      placeholderTextColor="rgba(253, 254, 254, 0.4)"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      className="bg-transparent border-b-2 border-actionPrimary py-2.5 text-background text-base font-semibold"
                    />
                  </View>
                  <View className="mb-5">
                    <Text className="text-background/80 text-[10px] font-bold uppercase tracking-wider mb-1 ml-1">
                      {Strings.passwordLabel}
                    </Text>
                    <TextInput
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (error) clearError();
                      }}
                      placeholder={Strings.passwordPlaceholder}
                      placeholderTextColor="rgba(253, 254, 254, 0.4)"
                      secureTextEntry
                      autoCapitalize="none"
                      className="bg-transparent border-b-2 border-actionPrimary py-2.5 text-background text-base font-semibold"
                    />
                  </View>
                </View>

                {/* Authorize Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading}
                  className="bg-actionPrimary rounded-2xl py-4 items-center justify-center mt-2 flex-row"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <Text className="text-background font-bold text-xs uppercase tracking-widest">
                      {Strings.loginButtonText}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Divider OR */}
                <View className="flex-row items-center my-4">
                  <View 
                    className="flex-1 h-[1px]" 
                    style={{ backgroundColor: "rgba(253, 254, 254, 0.2)" }} 
                  />
                  <Text 
                    className="mx-4 text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: "rgba(253, 254, 254, 0.5)" }}
                  >
                    OR
                  </Text>
                  <View 
                    className="flex-1 h-[1px]" 
                    style={{ backgroundColor: "rgba(253, 254, 254, 0.2)" }} 
                  />
                </View>

                {/* Google Login Button */}
                <TouchableOpacity
                  onPress={handleGoogleLogin}
                  disabled={loading}
                  className="rounded-2xl py-4 items-center justify-center flex-row"
                  style={{ backgroundColor: Colors.background }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.textPrimary} />
                  ) : (
                    <>
                      <GoogleIcon size={16} />
                      <Text 
                        className="font-bold text-xs uppercase tracking-widest ml-3"
                        style={{ color: Colors.textPrimary }}
                      >
                        {Strings.googleLoginButtonText}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Forgot Password Link */}
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  className="mt-3.5 py-1.5 items-center"
                >
                  <Text className="text-background/80 text-xs font-bold uppercase tracking-widest">
                    {Strings.forgotPasswordButtonText}
                  </Text>
                </TouchableOpacity>

                {/* Register Link */}
                <TouchableOpacity
                  onPress={() => {
                    clearError();
                    router.push("/register");
                  }}
                  className="mt-2 py-1 items-center"
                >
                  <Text className="text-background/90 text-xs font-bold uppercase tracking-widest border-b border-background/40 pb-0.5">
                    {Strings.registerLinkText}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* 2FA input field */}
                <View className="mb-6">
                  <Text className="text-background/80 text-[10px] font-bold uppercase tracking-wider mb-2 ml-1">
                    2FA Authenticator Code
                  </Text>
                  <TextInput
                    value={twoFactorCode}
                    onChangeText={(text) => {
                      setTwoFactorCode(text);
                      if (error) clearError();
                    }}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="rgba(253, 254, 254, 0.4)"
                    keyboardType="number-pad"
                    maxLength={6}
                    className="bg-transparent border-b-2 border-actionPrimary py-2.5 text-background text-base font-bold tracking-widest text-center"
                    autoCapitalize="none"
                  />
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading}
                  className="bg-actionPrimary rounded-2xl py-4 items-center justify-center mt-2 flex-row w-full"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.background} />
                  ) : (
                    <Text className="text-background font-bold text-xs uppercase tracking-widest">
                      Verify & Login
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Go Back Button */}
                <TouchableOpacity
                  onPress={() => {
                    setRequires2fa(false);
                    setTwoFactorCode("");
                    clearError();
                  }}
                  disabled={loading}
                  className="mt-4 py-2 items-center"
                >
                  <Text className="text-background/80 text-xs font-bold uppercase tracking-widest">
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
          <StartEngineCard style={{ width: Sizes.cardWidthLogin }} />
        </View>

        {/* 3. BOTTOM FOOTER */}
        <View className="px-6 pb-6 flex-row justify-between items-end">
          <View>
            <Text className="text-textPrimary font-black text-6xl tracking-tighter leading-none">
              {APP_NAME.toLowerCase()}.
            </Text>
          </View>
          
          {/* Red Square with Arrow Left Button (Go Back) */}
          <TouchableOpacity
            onPress={handleBack}
            className="bg-actionPrimary rounded-2xl items-center justify-center"
            style={{ 
              width: Sizes.bottomButtonSize, 
              height: Sizes.bottomButtonSize,
              shadowColor: "transparent" 
            }}
          >
            <ArrowLeft stroke={Colors.background} size={Sizes.iconLarge} strokeWidth={Sizes.strokeThick} />
          </TouchableOpacity>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}
