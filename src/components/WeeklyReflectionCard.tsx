import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { selectHaptic, tapHaptic } from "@/lib/haptics";
import {
  BookOpen,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Leaf,
  Star,
  Sunrise,
} from "lucide-react-native";
import { useWeeklyReflection } from "@/lib/hooks";
import { BorderRadius } from "@/lib/theme";
import { GlassLayers, hexToRgba } from "@/lib/glass";

interface WeeklyReflectionCardProps {
  primaryColor: string;
}

export function WeeklyReflectionCard({
  primaryColor,
}: WeeklyReflectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const scale = useSharedValue(1);

  const {
    data: reflection,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useWeeklyReflection(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handleRefresh = () => {
    selectHaptic();
    refetch();
  };

  const handleToggle = () => {
    tapHaptic();
    setExpanded((prev) => !prev);
  };

  const dominantColor = primaryColor;

  return (
    <Animated.View style={animatedStyle} className="mb-6">
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleToggle}
      >
        <View
          style={{
            borderRadius: BorderRadius.xxlarge,
            overflow: "hidden",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.2)",
            shadowColor: dominantColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: Platform.OS === "android" ? 0 : 6,
          }}
        >
          <GlassLayers primaryColor={dominantColor} borderRadius={BorderRadius.xxlarge} />
          {/* Subtle gradient overlay */}
          <LinearGradient
            colors={[`${dominantColor}18`, "rgba(255,255,255,0.0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          />
          <View style={{ padding: 20 }}>
            {/* Header Row */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <BookOpen size={18} color="#FFFFFF" strokeWidth={2} />
                <View>
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text
                      style={{
                        fontFamily: "Inter_700Bold",
                        fontSize: 15,
                        color: "#FFFFFF",
                        letterSpacing: 0.2,
                      }}
                    >
                      Weekly Reflection
                    </Text>
                    {(reflection as { isDemo?: boolean } | undefined)
                      ?.isDemo && (
                      <View
                        style={{
                          backgroundColor: "rgba(255, 193, 7, 0.25)",
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 8,
                            color: "#FFC107",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          Sample
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {reflection?.weekLabel ?? "This week's digest"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center" style={{ gap: 12 }}>
                <Pressable
                  onPress={handleRefresh}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {isFetching ? (
                    <ActivityIndicator
                      size="small"
                      color="rgba(255,255,255,0.7)"
                    />
                  ) : (
                    <RefreshCw
                      size={16}
                      color="rgba(255,255,255,0.6)"
                      strokeWidth={2}
                    />
                  )}
                </Pressable>
                {expanded ? (
                  <ChevronUp
                    size={18}
                    color="rgba(255,255,255,0.6)"
                    strokeWidth={2}
                  />
                ) : (
                  <ChevronDown
                    size={18}
                    color="rgba(255,255,255,0.6)"
                    strokeWidth={2}
                  />
                )}
              </View>
            </View>

            {/* Content */}
            {isLoading ? (
              <Animated.View
                entering={FadeIn.duration(400)}
                className="items-center py-4"
                style={{ gap: 10 }}
              >
                <ActivityIndicator size="small" color={dominantColor} />
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.6)",
                    textAlign: "center",
                  }}
                >
                  Crafting your weekly story...
                </Text>
              </Animated.View>
            ) : error ? (
              <Animated.View
                entering={FadeIn.duration(400)}
                className="items-center py-3"
              >
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.6)",
                    textAlign: "center",
                  }}
                >
                  Couldn't generate your reflection.
                </Text>
                <Pressable onPress={handleRefresh} className="mt-2">
                  <Text
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 13,
                      color: dominantColor,
                    }}
                  >
                    Try again
                  </Text>
                </Pressable>
              </Animated.View>
            ) : reflection ? (
              <Animated.View entering={FadeIn.duration(500)}>
                {/* Narrative Summary — always visible */}
                <Text
                  style={{
                    fontFamily: "Inter_400Regular",
                    fontSize: 14,
                    color: "rgba(255,255,255,0.92)",
                    lineHeight: 22,
                    marginBottom: 12,
                  }}
                >
                  {reflection.narrativeSummary}
                </Text>

                {/* Stats pills */}
                <View
                  className="flex-row flex-wrap"
                  style={{ gap: 8, marginBottom: 12 }}
                >
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 20,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.2)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 12,
                        color: "#FFFFFF",
                      }}
                    >
                      Based on {reflection.entryCount}{" "}
                      {reflection.entryCount === 1 ? "entry" : "entries"}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 20,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.2)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter_500Medium",
                        fontSize: 12,
                        color: "rgba(255,255,255,0.85)",
                        textTransform: "capitalize",
                      }}
                    >
                      {reflection.emotionalRange}
                    </Text>
                  </View>
                </View>

                {/* Expanded Content */}
                {expanded && (
                  <Animated.View
                    entering={FadeInDown.duration(300)}
                    style={{ gap: 14 }}
                  >
                    {/* Divider */}
                    <View
                      style={{
                        height: 1,
                        backgroundColor: "rgba(255,255,255,0.12)",
                        marginBottom: 2,
                      }}
                    />

                    {/* Emotional Journey */}
                    <View>
                      <View
                        className="flex-row items-center mb-2"
                        style={{ gap: 6 }}
                      >
                        <BookOpen size={13} color="#FFFFFF" strokeWidth={2.5} />
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 11,
                            color: "#FFFFFF",
                            letterSpacing: 1,
                            textTransform: "uppercase",
                          }}
                        >
                          Emotional Journey
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 13,
                          color: "rgba(255,255,255,0.85)",
                          lineHeight: 22,
                        }}
                      >
                        {reflection.emotionalJourney}
                      </Text>
                    </View>

                    {/* Key Themes */}
                    {reflection.keyThemes.length > 0 && (
                      <View>
                        <View
                          className="flex-row items-center mb-2"
                          style={{ gap: 6 }}
                        >
                          <Leaf size={13} color="#FFFFFF" strokeWidth={2.5} />
                          <Text
                            style={{
                              fontFamily: "Inter_700Bold",
                              fontSize: 11,
                              color: "#FFFFFF",
                              letterSpacing: 1,
                              textTransform: "uppercase",
                            }}
                          >
                            Key Themes
                          </Text>
                        </View>
                        <View className="flex-row flex-wrap" style={{ gap: 7 }}>
                          {reflection.keyThemes.map((theme, i) => (
                            <View
                              key={i}
                              style={{
                                paddingHorizontal: 11,
                                paddingVertical: 5,
                                borderRadius: 16,
                                backgroundColor: "rgba(255,255,255,0.1)",
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.18)",
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: "Inter_500Medium",
                                  fontSize: 12,
                                  color: "rgba(255,255,255,0.9)",
                                  textTransform: "capitalize",
                                }}
                              >
                                {theme}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Growth Moment */}
                    <View
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        backgroundColor: `${dominantColor}18`,
                        borderWidth: 1,
                        borderColor: `${dominantColor}35`,
                      }}
                    >
                      <View
                        className="flex-row items-center mb-2"
                        style={{ gap: 6 }}
                      >
                        <Star size={13} color="#FFFFFF" strokeWidth={2.5} />
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 11,
                            color: "#FFFFFF",
                            letterSpacing: 1,
                            textTransform: "uppercase",
                          }}
                        >
                          Highlight
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 13,
                          color: "rgba(255,255,255,0.9)",
                          lineHeight: 22,
                          fontStyle: "italic",
                        }}
                      >
                        "{reflection.growthMoment}"
                      </Text>
                    </View>

                    {/* Week Ahead */}
                    <View
                      style={{
                        padding: 14,
                        borderRadius: 16,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.12)",
                      }}
                    >
                      <View
                        className="flex-row items-center mb-2"
                        style={{ gap: 6 }}
                      >
                        <Sunrise
                          size={13}
                          color="rgba(255,255,255,0.7)"
                          strokeWidth={2.5}
                        />
                        <Text
                          style={{
                            fontFamily: "Inter_700Bold",
                            fontSize: 11,
                            color: "rgba(255,255,255,0.6)",
                            letterSpacing: 1,
                            textTransform: "uppercase",
                          }}
                        >
                          Looking Ahead
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: "Inter_400Regular",
                          fontSize: 13,
                          color: "rgba(255,255,255,0.8)",
                          lineHeight: 22,
                        }}
                      >
                        {reflection.weekAhead}
                      </Text>
                    </View>
                  </Animated.View>
                )}

                {/* Tap hint */}
                {!expanded && (
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      textAlign: "center",
                      marginTop: 4,
                    }}
                  >
                    Tap to read your full reflection
                  </Text>
                )}
              </Animated.View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
