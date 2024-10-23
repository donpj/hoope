import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import * as DropdownMenu from "zeego/dropdown-menu";

interface CurrencyDropdownProps {
  selectedCurrency: string;
  onSelectCurrency: (currency: string) => void;
}

const CurrencyDropdown: React.FC<CurrencyDropdownProps> = ({
  selectedCurrency,
  onSelectCurrency,
}) => {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <TouchableOpacity style={styles.dropdownTrigger}>
          <Text>{selectedCurrency}</Text>
        </TouchableOpacity>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        <DropdownMenu.Group>
          <DropdownMenu.Item key="USD" onSelect={() => onSelectCurrency("USD")}>
            <DropdownMenu.ItemTitle>USD</DropdownMenu.ItemTitle>
          </DropdownMenu.Item>
          <DropdownMenu.Item key="EUR" onSelect={() => onSelectCurrency("EUR")}>
            <DropdownMenu.ItemTitle>EUR</DropdownMenu.ItemTitle>
          </DropdownMenu.Item>
          <DropdownMenu.Item key="GBP" onSelect={() => onSelectCurrency("GBP")}>
            <DropdownMenu.ItemTitle>GBP</DropdownMenu.ItemTitle>
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

const styles = StyleSheet.create({
  dropdownTrigger: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
});

export default CurrencyDropdown;
