import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useState,
} from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";
import { Task } from "@/types/enums";
import ListItem from "./ListItem";

// Minimal Task type for dragging
type DraggableTask = Pick<Task, "id" | "title">;

type DraggingContext = {
  draggingTask: DraggableTask | null;
  setDraggingTask: (task: DraggableTask, y: number) => void;
  dragY: SharedValue<number>;
  dragOffsetY: SharedValue<number>;
};

const DraggingContext = createContext<DraggingContext>({
  setDraggingTask: () => {},
  draggingTask: null,
  dragY: useSharedValue(0),
  dragOffsetY: useSharedValue(0),
});

const TaskDragArea = ({
  children,
  updateItemPosition,
}: PropsWithChildren<{
  updateItemPosition: (id: number, y: number) => void;
}>) => {
  const [draggingTask, setDraggingTask] = useState<DraggableTask | null>(null);
  const dragY = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);
  const { width } = useWindowDimensions();

  const setDraggingTaskAndPosition = (task: DraggableTask, y: number) => {
    setDraggingTask(task);
    dragY.value = y;
    dragOffsetY.value = y - dragY.value;
  };

  const gesture = Gesture.Pan()
    .onStart(() => {
      // Handle gesture start if needed
    })
    .onUpdate((e) => {
      dragY.value = e.absoluteY - dragOffsetY.value;
    })
    .onFinalize(() => {
      if (draggingTask !== null) {
        runOnJS(updateItemPosition)(draggingTask.id, dragY.value);
        runOnJS(setDraggingTask)(null);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    top: dragY.value,
  }));

  return (
    <DraggingContext.Provider
      value={{
        setDraggingTask: setDraggingTaskAndPosition,
        dragY,
        draggingTask,
        dragOffsetY,
      }}
    >
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill}>
          {children}
          {draggingTask !== null && (
            <Animated.View
              style={[
                animatedStyle,
                {
                  position: "absolute",
                  left: 20,
                  width: width - 40,
                  transform: [{ rotateZ: "3deg" }],
                },
              ]}
            >
              <ListItem item={draggingTask} drag={() => {}} isActive={true} />
            </Animated.View>
          )}
        </View>
      </GestureDetector>
    </DraggingContext.Provider>
  );
};

export default TaskDragArea;

export const useDraggingContext = () => useContext(DraggingContext);
