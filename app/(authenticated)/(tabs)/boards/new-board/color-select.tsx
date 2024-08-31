import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View, TouchableOpacity } from "react-native";

const COLORS = [
  "#F8F9FA",
  "#FFDEAD",
  "#E6E6FA",
  "#B0E0E6",
  "#AFEEEE",
  "#D8BFD8",
  "#FFFACD",
  "#D3FFCE",
  "#F0E68C",
  "#FADADD",
  "#C1E1C1",
  "#FFCCCB",
];
export const DEFAULT_COLOR = COLORS[0];

const Page = () => {
  const [selected, setSelected] = useState<string>(DEFAULT_COLOR);
  const router = useRouter();

  const onColorSelect = (color: string) => {
    setSelected(color);
    router.setParams({ bg: color });
  };

  return (
    <View
      style={{
        flexDirection: "row",
        flexGrow: 1,
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          style={{
            backgroundColor: color,
            height: 100,
            width: 100,
            margin: 5,
            borderRadius: 4,
            borderWidth: selected === color ? 2 : 0,
            borderColor: Colors.fontDark,
          }}
          onPress={() => onColorSelect(color)}
        />
      ))}
    </View>
  );
};
export default Page;
