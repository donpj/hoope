import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Colors } from "@/constants/Colors";

const formatNumber = (num: number | string) => {
  return Number(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

interface AccountCardProps {
  account: any;
  balance: any;
  onPress: () => void;
}

export default function AccountCard({
  account,
  balance,
  onPress,
}: AccountCardProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.accountCard}>
      <View style={styles.accountInfo}>
        <Text style={styles.accountName}>
          {account.Nickname || account.AccountType}
        </Text>
        <Text style={styles.accountCurrency}>{account.Currency}</Text>
        {balance && (
          <Text style={styles.accountBalance}>
            Balance: {account.Currency} {formatNumber(balance.Amount.Amount)}
          </Text>
        )}
      </View>
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    backgroundColor: Colors.light,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: Colors.dark.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.dark.text,
  },
  accountCurrency: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 5,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    color: Colors.dark.text,
  },
  actionContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  actionButtonText: {
    color: Colors.light.text,
    fontWeight: "bold",
  },
});
