import React from "react";
import { Text, StyleProp, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { Colors } from "../../constants/colors";

interface CardProps {
  title: string;
  subtitle: string;
  variant?: "accent" | "dark";
  style?: StyleProp<ViewStyle>;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  children?: React.ReactNode;
}

export default function Card({
  title,
  subtitle,
  variant = "accent",
  style,
  className = "",
  titleClassName = "text-3xl",
  subtitleClassName = "text-[10px] mb-5",
  children,
}: CardProps) {
  const bgClass = variant === "accent" ? "bg-actionPrimary" : "bg-backgroundDark";
  
  return (
    <Animated.View
      style={[
        style,
        {
          shadowColor: "transparent", // strictly flat minimalism
        },
      ]}
      className={`${bgClass} rounded-2xl p-6 ${className}`}
    >
      <Text className={`text-background font-black tracking-tighter leading-none mb-1 ${titleClassName}`}>
        {title.toUpperCase()}
      </Text>
      <Text className={`text-background/90 font-bold uppercase tracking-widest ${subtitleClassName}`}>
        {subtitle}
      </Text>
      {children}
    </Animated.View>
  );
}
