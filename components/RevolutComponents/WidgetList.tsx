import React from "react";
import { View } from "react-native";

import { MARGIN } from "./Config";
import Tile from "./Tile";
import SortableList from "./SortableList";

const tiles = [
  { id: "spent" },
  { id: "cashback" },
  { id: "recent" },
  { id: "cards" },
];

const WidgetList = () => {
  return (
    <View
      style={{
        paddingHorizontal: MARGIN,
        marginBottom: 80,
      }}
    >
      <SortableList
        editing={true}
        onDragEnd={(positions) =>
          console.log(JSON.stringify(positions, null, 2))
        }
      >
        {tiles.map((tile, index) => (
          <Tile
            key={tile.id + "-" + index}
            id={tile.id}
            onLongPress={() => true}
          />
        ))}
      </SortableList>
    </View>
  );
};

export default WidgetList;
