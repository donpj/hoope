import React, { createContext, useContext, useState, useCallback } from "react";
import { Animated } from "react-native";

export type DragData = {
  type: "card" | "list";
  id: string;
  listId?: string;
};

interface DragndropContextType {
  data?: DragData;
  pos: {
    x: Animated.Value;
    y: Animated.Value;
  };
  dropPos?: {
    x: number;
    y: number;
  };
  dragging: boolean;
  onDragStart: (data: DragData) => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
}

const DragndropContext = createContext<DragndropContextType>(
  {} as DragndropContextType
);

export const DragndropProvider: React.FC = ({ children }) => {
  const [data, setData] = useState<DragData>();
  const [dragging, setDragging] = useState(false);
  const [dropPos, setDropPos] = useState<{ x: number; y: number }>();
  const pos = React.useRef({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
  }).current;

  const onDragStart = useCallback((data: DragData) => {
    setData(data);
    setDragging(true);
  }, []);

  const onDragEnd = useCallback((pos: { x: number; y: number }) => {
    setDropPos(pos);
    setDragging(false);
  }, []);

  return (
    <DragndropContext.Provider
      value={{ data, pos, dropPos, dragging, onDragStart, onDragEnd }}
    >
      {children}
    </DragndropContext.Provider>
  );
};

export const useDragndrop = () => useContext(DragndropContext);
