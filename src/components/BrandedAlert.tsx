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
import { CheckCircle, WarningCircle, Trash } from 'phosphor-react-native';
import useOnboardingStore from '@/lib/state/onboarding-store';
import useSettingsStore from '@/lib/state/settings-store';
import { getThemeColors } from '@/lib/theme';

type AlertType = 'success' | 'error' | 'warning';

interface BrandedAlertProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
  /** Label for the dismiss button. Defaults to "OK". */
  confirmLabel?: string;
  /**
   * Optional secondary action rendered above the dismiss button — used for
   * recoverable failures where the user should be offered a way forward
   * (e.g. "Try again" after a transcription failure) instead of only "OK".
   */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function BrandedAlert({
  visible,
  type,
  title,
  message,
  onClose,
  confirmLabel = 'OK',
  secondaryLabel,
  onSecondary,
}: BrandedAlertProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const themeColors = getThemeColors(selectedTheme, isDarkMode);

  const handleClose = () => {
    tapHaptic();
    onClose();
  };

  const handleSecondary = () => {
    tapHaptic();
    onSecondary?.();
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
                  backgroundColor: type === 'error'
                    ? isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'
                    : `${themeColors.primary}20`
                }}
              >
                {type === 'success' ? (
                  <CheckCircle size={40} color={themeColors.primary} weight="regular" />
                ) : type === 'warning' ? (
                  <Trash size={40} color={themeColors.primary} weight="regular" />
                ) : (
                  <WarningCircle size={40} color="#EF4444" weight="regular" />
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

            {/* Secondary action — only rendered when a recovery path exists */}
            {secondaryLabel && onSecondary && (
              <Pressable
                onPress={handleSecondary}
                className="py-4 px-6 rounded-2xl active:opacity-80 mb-3"
                style={{ backgroundColor: themeColors.primary }}
              >
                <Text className="font-bold text-center text-lg text-white">
                  {secondaryLabel}
                </Text>
              </Pressable>
            )}

            {/* Dismiss button — de-emphasised to a border when a secondary
                action is present, so the recovery path reads as primary. */}
            <Pressable
              onPress={handleClose}
              className="py-4 px-6 rounded-2xl active:opacity-80"
              style={
                secondaryLabel && onSecondary
                  ? {
                      backgroundColor: 'transparent',
                      borderWidth: 1.5,
                      borderColor: isDarkMode
                        ? 'rgba(196,181,220,0.35)'
                        : 'rgba(107,91,149,0.3)',
                    }
                  : { backgroundColor: themeColors.primary }
              }
            >
              <Text
                className="font-bold text-center text-lg"
                style={{
                  color:
                    secondaryLabel && onSecondary
                      ? isDarkMode
                        ? '#C4B5DC'
                        : '#6B5B95'
                      : '#FFFFFF',
                }}
              >
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}
