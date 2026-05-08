import { View, Text } from "react-native";
import { EmotionType } from "@/lib/types";

interface EmotionBreakdownCardProps {
  emotions: EmotionType[];
}

export default function EmotionBreakdownCard({ emotions }: EmotionBreakdownCardProps) {
  return (
    <View className="p-4">
      <Text className="text-white">Emotions: {emotions.join(", ")}</Text>
    </View>
  );
}