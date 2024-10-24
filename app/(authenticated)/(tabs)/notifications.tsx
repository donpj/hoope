import React, { useRef, ReactNode, useCallback } from "react";
import {
  View,
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AnimatedHeaderScreenProps = {
  children: ReactNode;
  title?: string;
  leftIcon?: {
    name: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
  rightIcon?: {
    name: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
};

const colors = {
  background: "#000000",
  backgroundScrolled: "#1C1C1D",
  headerBorder: "#2C2C2E",
  borderColor: "#3A3A3C",
  text: "#FFFFFF",
  tint: "#4A90E2",
};

export default function AnimatedHeaderScreen({
  title,
  children,
  leftIcon,
  rightIcon,
}: AnimatedHeaderScreenProps) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const headerBackgroundColor = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [colors.background, colors.backgroundScrolled],
    extrapolate: "clamp",
  });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const headerBorderWidth = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, StyleSheet.hairlineWidth],
    extrapolate: "clamp",
  });

  const rightIconOpacity = rightIcon
    ? scrollY.interpolate({
        inputRange: [30, 50],
        outputRange: [0, 1],
        extrapolate: "clamp",
      })
    : 0;

  const rightIconTranslateY = rightIcon
    ? scrollY.interpolate({
        inputRange: [30, 50],
        outputRange: [10, 0],
        extrapolate: "clamp",
      })
    : 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitleAlign: "center",
          headerTitle: title,
          headerLeft: leftIcon
            ? () => (
                <Animated.View
                  style={{
                    opacity: rightIconOpacity,
                    transform: [{ translateY: rightIconTranslateY }],
                  }}
                >
                  <TouchableOpacity onPress={leftIcon.onPress}>
                    <Ionicons
                      name={leftIcon.name}
                      size={24}
                      color={colors.tint}
                      style={styles.leftIcon}
                    />
                  </TouchableOpacity>
                </Animated.View>
              )
            : undefined,
          headerRight: rightIcon
            ? () => (
                <Animated.View
                  style={{
                    opacity: rightIconOpacity,
                    transform: [{ translateY: rightIconTranslateY }],
                  }}
                >
                  <TouchableOpacity onPress={rightIcon.onPress}>
                    <Ionicons
                      name={rightIcon.name}
                      size={24}
                      color={colors.tint}
                      style={styles.rightIcon}
                    />
                  </TouchableOpacity>
                </Animated.View>
              )
            : undefined,
          headerBackground: () => (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.headerBackground,
                {
                  backgroundColor: headerBackgroundColor,
                  borderBottomColor: colors.borderColor,
                  borderBottomWidth: headerBorderWidth,
                },
              ]}
            />
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: insets.bottom },
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  headerBackground: {
    borderBottomWidth: 0,
  },
  leftIcon: {
    marginLeft: 16,
  },
  rightIcon: {
    marginRight: 16,
  },
});
