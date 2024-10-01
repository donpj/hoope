import React from "react";
import { View, Text, FlatList } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function RevolutAccounts() {
  const { accounts } = useLocalSearchParams();
  const accountsData = JSON.parse(accounts as string);

  return (
    <View>
      <Text>Your Revolut Accounts</Text>
      <FlatList
        data={accountsData.Data.Account}
        keyExtractor={(item) => item.AccountId}
        renderItem={({ item }) => (
          <View>
            <Text>Account ID: {item.AccountId}</Text>
            <Text>Currency: {item.Currency}</Text>
            <Text>Type: {item.AccountType}</Text>
          </View>
        )}
      />
    </View>
  );
}
