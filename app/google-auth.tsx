import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useAuthStore } from "../src/store/auth-store";
import { Colors } from "../constants/colors";

export default function GoogleAuthCallback() {
  const url = Linking.useURL();
  const router = useRouter();
  const { loginWithGoogle } = useAuthStore();
  const [debugInfo, setDebugInfo] = useState<string>("Initializing callback...");
  const [errorInfo, setErrorInfo] = useState<string>("");

  useEffect(() => {
    const handleUrl = (incomingUrl: string) => {
      if (incomingUrl.includes("expo-development-client")) {
        setDebugInfo("Waiting for redirect URL from browser...");
        return;
      }

      setDebugInfo(`Received URL: ${incomingUrl}`);
      const hash = incomingUrl.split("#")[1];
      
      const getParam = (name: string) => {
        if (!hash) return null;
        const match = hash.match(new RegExp(`(^|&)${name}=([^&]*)(&|$)`));
        return match ? decodeURIComponent(match[2]) : null;
      };

      const token = getParam("access_token");
      if (token) {
        setDebugInfo(prev => `${prev}\nFound access token. Exchanging token...`);
        loginWithGoogle(token)
          .then((result) => {
            if (result?.requires2fa && result?.user?.id) {
              setDebugInfo(prev => `${prev}\n2FA verification required. Redirecting...`);
              router.replace({
                pathname: "/login",
                params: { requires2fa: "true", tempUserId: result.user.id }
              });
            } else {
              setDebugInfo(prev => `${prev}\nExchange successful! Redirecting...`);
              router.replace("/(tabs)/home");
            }
          })
          .catch((err) => {
            setErrorInfo(`Store login failed: ${err.message || String(err)}`);
            setDebugInfo(prev => `${prev}\nExchange failed.`);
          });
        return;
      }

      // Fallback to query parameters if redirect didn't use hash
      const { queryParams } = Linking.parse(incomingUrl);
      const queryToken = queryParams?.access_token as string;
      if (queryToken) {
        setDebugInfo(prev => `${prev}\nFound token in query params. Exchanging...`);
        loginWithGoogle(queryToken)
          .then((result) => {
            if (result?.requires2fa && result?.user?.id) {
              setDebugInfo(prev => `${prev}\n2FA verification required. Redirecting...`);
              router.replace({
                pathname: "/login",
                params: { requires2fa: "true", tempUserId: result.user.id }
              });
            } else {
              setDebugInfo(prev => `${prev}\nExchange successful! Redirecting...`);
              router.replace("/(tabs)/home");
            }
          })
          .catch((err) => {
            setErrorInfo(`Store login failed (query): ${err.message || String(err)}`);
            setDebugInfo(prev => `${prev}\nExchange failed.`);
          });
        return;
      }

      setDebugInfo(prev => `${prev}\nNo access_token found in URL hash or query params.`);
    };

    if (url) {
      handleUrl(url);
    } else {
      setDebugInfo("Waiting for redirect URL from browser...");
    }

    const subscription = Linking.addEventListener("url", (event) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [url]);

  return (
    <View 
      style={{ 
        flex: 1, 
        backgroundColor: Colors.background, 
        justifyContent: "center", 
        alignItems: "center",
        padding: 24
      }}
    >
      <ActivityIndicator size="large" color={Colors.backgroundDark} />
      <Text 
        style={{ 
          marginTop: 16, 
          color: Colors.textPrimary, 
          fontWeight: "700", 
          fontSize: 12, 
          letterSpacing: 2,
          marginBottom: 24
        }}
      >
        AUTHENTICATING WITH GOOGLE
      </Text>
    </View>
  );
}
