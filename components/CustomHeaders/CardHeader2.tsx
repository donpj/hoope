import React from "react";
import { Colors } from "@/constants/Colors";
import { Entypo } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";

interface CardHeaderProps {
  cardName: string;
}

const CardHeader: React.FC<CardHeaderProps> = ({ cardName }) => {
  const { top } = useSafeAreaInsets();
  const router = useRouter();

  console.log("CardHeader rendering with cardName:", cardName);

  const handlePlusPress = () => {
    router.push("/payments/addBeneficiary");
  };

  return (
    <View style={[styles.headerContainer, { paddingTop: top }]}>
      <View style={styles.container}>
        <Text style={styles.cardName}>{cardName}</Text>
        <View style={styles.iconContainer}>
          <View style={styles.circle}>
            <Entypo name="calendar" size={20} color={Colors.light.text} />
          </View>
          <TouchableOpacity style={styles.circle} onPress={handlePlusPress}>
            <Entypo name="plus" size={26} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    //backgroundColor: "rgba(255, 255, 255, 0.8)",
    //borderBottomWidth: 1,
    //borderBottomColor: Colors.lightGray,
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  cardName: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.fontDark,
  },
  iconContainer: {
    flexDirection: "row",
    gap: 10,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 30,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  debugText: {
    fontSize: 10,
    color: "red",
  },
});

export default CardHeader;
