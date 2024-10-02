import React from "react";
import { View, Text, FlatList } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function RevolutAccounts() {
  const { accounts } = useLocalSearchParams();
  console.log("Received accounts:", accounts);

  let accountsData;
  try {
    accountsData = accounts
      ? JSON.parse(accounts as string)
      : { Data: { Account: [] } };
  } catch (error) {
    console.error("Error parsing accounts data:", error);
    console.log("Raw accounts data:", accounts);
    accountsData = { Data: { Account: [] } };
  }

  return (
    <View>
      <Text>Your Revolut Accounts</Text>
      <FlatList
        data={accountsData?.Data?.Account || []}
        keyExtractor={(item) => item?.AccountId || Math.random().toString()}
        renderItem={({ item }) => (
          <View>
            <Text>Account ID: {item?.AccountId}</Text>
            <Text>Currency: {item?.Currency}</Text>
            <Text>Type: {item?.AccountType}</Text>
          </View>
        )}
      />
    </View>
  );
}
