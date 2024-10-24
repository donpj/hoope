import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");
const HEADER_HEIGHT = 40;
const POSTER_HEIGHT = height / 8;

interface CardHeaderProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  onAdd?: () => void;
  onMore?: () => void;
}

const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  children,
  onClose,
  onAdd,
  onMore,
}) => {
  console.log("CardHeader rendered with onClose:", onClose);
  console.log("onClose type:", typeof onClose);

  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, POSTER_HEIGHT - HEADER_HEIGHT],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
      height: HEADER_HEIGHT + insets.top,
      backgroundColor: `rgba(255, 255, 255, ${opacity})`,
      borderBottomWidth: 1,
      borderBottomColor: `rgba(0, 0, 0, ${opacity * 0.1})`,
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [
        POSTER_HEIGHT - HEADER_HEIGHT * 0.5,
        POSTER_HEIGHT + HEADER_HEIGHT * 0.7,
      ],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, headerStyle]} />
      <View style={[styles.topIcons, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => {
            console.log("Close button pressed in CardHeader");
            if (typeof onClose === "function") {
              console.log("Calling onClose function");
              onClose();
            } else {
              console.log("onClose is not a function:", onClose);
            }
          }}
          style={styles.iconButton}
        ></TouchableOpacity>
        <Animated.Text style={[styles.headerTitle, titleStyle]}>
          {title}
        </Animated.Text>
      </View>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: POSTER_HEIGHT }}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    justifyContent: "flex-end",
    //paddingBottom: 10,
  },
  headerTitle: {
    color: "black",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 0,
    marginTop: 1,
    flex: 1,
    textAlign: "left",
  },
  topIcons: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
    paddingHorizontal: 36,
  },
  rightIcons: {
    flexDirection: "row",
  },
  iconButton: {
    padding: 8,
  },
});

export default CardHeader;
