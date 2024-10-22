import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
} from "react-native";
import { Colors } from "@/constants/Colors";
import { DefaultTheme } from "@react-navigation/native";

interface FullScreenModalProps {
  isVisible: boolean;
  onClose: () => void;
  listName: string;
  onChangeListName: (name: string) => void;
  onUpdateList: () => void;
  onDeleteList: () => void;
}

const FullScreenModal: React.FC<FullScreenModalProps> = ({
  isVisible,
  onClose,
  listName,
  onChangeListName,
  onUpdateList,
  onDeleteList,
}) => {
  if (!isVisible) return null;

  return (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
          <Text style={styles.modalLabel}>List name</Text>
          <TextInput
            style={styles.modalInput}
            value={listName}
            onChangeText={onChangeListName}
            returnKeyType="done"
            onEndEditing={onUpdateList}
          />
        </View>
        <TouchableOpacity onPress={onDeleteList} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>Delete List</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: DefaultTheme.colors.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 16,
  },
  cancelButton: {
    color: Colors.primary,
    fontSize: 16,
  },
  modalBody: {
    marginBottom: 16,
  },
  modalLabel: {
    color: Colors.grey,
    fontSize: 12,
    marginBottom: 5,
  },
  modalInput: {
    fontSize: 16,
    color: Colors.fontDark,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 8,
  },
  deleteBtn: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  deleteBtnText: {
    color: Colors.danger,
    fontSize: 16,
  },
});

export default FullScreenModal;
