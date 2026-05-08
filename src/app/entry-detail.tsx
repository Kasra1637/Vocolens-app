import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams();
  return (
    <View className="flex-1 items-center justify-center">
      <Text>Entry: {id}</Text>
    </View>
  );
}