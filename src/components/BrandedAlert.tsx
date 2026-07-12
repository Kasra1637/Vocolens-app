/**
 * Branded Alert Component
 *
 * Custom alert modal that matches the app's design system and theme colors.
 * Replaces standard React Native Alert.alert() with branded UI.
 */

import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { tapHaptic, successHaptic, errorHaptic } from '@/lib/haptics';
import { CheckCircle, WarningCircle } from 'phosphor-react-native';
import useOnboardingStore from '@/lib/state/onboarding-store';
import useSettingsStore from '@/lib/state/settings-store';
import { getThemeColors } from '@/lib/theme';

type AlertType = 'success' | 'error';

interface BrandedAlertProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
}

export function BrandedAlert({ visible, type, title, message, onClose }: BrandedAlertProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const themeColors = getThemeColors(selectedTheme, isDarkMode);

  const handleClose = () => {
    tapHaptic();
    onClose();
  };

  React.useEffect(() => {
    if (visible) {
      if (type === 'success') {
        successHaptic();
      } else {
        errorHaptic();
      }
    }
  }, [visible, type]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <BlurView intensity={80} tint="dark" className="flex-1">
        <View className="flex-1 items-center justify-center p-6">
          <View
            className="w-full max-w-sm rounded-3xl p-8 shadow-2xl"
            style={{
              backgroundColor: isDarkMode ? '#1A1229' : '#FFFFFF',
              shadowColor: themeColors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
            }}
          >
            {/* Icon */}
            <View className="items-center mb-6">
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{
                  backgroundColor: type === 'success'
                    ? `${themeColors.primary}20`
                    : isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'
                }}
              >
                {type === 'success' ? (
                  <CheckCircle size={40} color={themeColors.primary} weight="duotone" />
                ) : (
                  <WarningCircle size={40} color="#EF4444" weight="duotone" />
                )}
              </View>
            </View>

            {/* Title */}
            <Text
              className="text-2xl font-bold text-center mb-3"
              style={{ color: isDarkMode ? '#E8E0F5' : '#3B2463' }}
            >
              {title}
            </Text>

            {/* Message */}
            <Text
              className="text-center mb-8 leading-6"
              style={{ color: isDarkMode ? '#C4B5DC' : '#6B5B95' }}
            >
              {message}
            </Text>

            {/* OK Button */}
            <Pressable
              onPress={handleClose}
              className="py-4 px-6 rounded-2xl active:opacity-80"
              style={{ backgroundColor: themeColors.primary }}
            >
              <Text className="font-bold text-center text-lg text-white">
                OK
              </Text>
            </Pressable>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}
