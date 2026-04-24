/**
 * PIN Setup Modal
 *
 * Modal for setting up a 4-digit PIN code for app security.
 */

import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { tapHaptic, confirmHaptic, errorHaptic, successHaptic } from '@/lib/haptics';
import { setPin } from '@/lib/auth-service';
import { Lock, Check, X } from 'lucide-react-native';
import useOnboardingStore from '@/lib/state/onboarding-store';
import useSettingsStore from '@/lib/state/settings-store';
import { getThemeColors } from '@/lib/theme';

interface PinSetupModalProps {
  visible: boolean;
  onComplete: () => void;
  onDismiss?: () => void;
}

export function PinSetupModal({ visible, onComplete, onDismiss }: PinSetupModalProps) {
  const [pin, setLocalPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const themeColors = getThemeColors(selectedTheme, isDarkMode);

  const handlePinChange = (value: string) => {
    // Only allow digits
    const sanitized = value.replace(/[^0-9]/g, '').slice(0, 4);

    if (step === 'create') {
      setLocalPin(sanitized);
      setError('');

      // Auto-advance when 4 digits entered
      if (sanitized.length === 4) {
        confirmHaptic();
        setTimeout(() => {
          setStep('confirm');
        }, 300);
      }
    } else {
      setConfirmPin(sanitized);
      setError('');

      // Auto-submit when 4 digits entered
      if (sanitized.length === 4) {
        setTimeout(() => {
          handleSubmit(sanitized);
        }, 300);
      }
    }
  };

  const handleSubmit = async (confirmValue: string) => {
    if (pin !== confirmValue) {
      setError('PINs do not match');
      errorHaptic();
      setConfirmPin('');
      return;
    }

    setIsSubmitting(true);
    try {
      await setPin(pin);
      successHaptic();
      onComplete();

      // Reset state
      setLocalPin('');
      setConfirmPin('');
      setStep('create');
      setError('');
    } catch (err) {
      setError('Failed to set PIN');
      errorHaptic();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    tapHaptic();
    setStep('create');
    setConfirmPin('');
    setError('');
  };

  const currentValue = step === 'create' ? pin : confirmPin;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <BlurView intensity={80} tint="dark" className="flex-1">
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-full max-w-sm rounded-3xl p-8 shadow-2xl" style={{ backgroundColor: isDarkMode ? '#1A1229' : '#FFFFFF' }}>
            {/* Close Button */}
            <Pressable
              onPress={() => {
                tapHaptic();
                onDismiss?.();
              }}
              disabled={isSubmitting}
              className="absolute top-4 right-4 p-2 active:opacity-70"
            >
              <X size={24} color={themeColors.primary} strokeWidth={2.5} />
            </Pressable>

            {/* Icon */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: `${themeColors.primary}20` }}>
                {step === 'confirm' ? (
                  <Check size={40} color={themeColors.primary} />
                ) : (
                  <Lock size={40} color={themeColors.primary} />
                )}
              </View>
            </View>

            {/* Title */}
            <Text className="text-2xl font-bold text-center mb-2" style={{ color: isDarkMode ? '#E8E0F5' : '#3B2463' }}>
              {step === 'create' ? 'Create Your PIN' : 'Confirm Your PIN'}
            </Text>

            {/* Subtitle */}
            <Text className="text-center mb-8" style={{ color: isDarkMode ? '#C4B5DC' : '#6B5B95' }}>
              {step === 'create'
                ? 'Enter a 4-digit PIN to secure your journal'
                : 'Re-enter your PIN to confirm'
              }
            </Text>

            {/* PIN Input */}
            <View className="mb-6">
              <TextInput
                value={currentValue}
                onChangeText={handlePinChange}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
                secureTextEntry
                className="hidden"
              />

              {/* PIN Dots Display */}
              <View className="flex-row justify-between">
                {[0, 1, 2, 3].map((index) => (
                  <View
                    key={index}
                    className="w-10 h-10 rounded-lg border-2 items-center justify-center"
                    style={{
                      backgroundColor: currentValue.length > index ? themeColors.primary : isDarkMode ? '#251A35' : `${themeColors.primary}15`,
                      borderColor: currentValue.length > index ? themeColors.primary : isDarkMode ? '#3D2E54' : `${themeColors.primary}30`,
                    }}
                  >
                    {currentValue.length > index && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Error Message */}
            {error !== '' && (
              <Text className="text-red-600 text-center mb-4 font-medium">
                {error}
              </Text>
            )}

            {/* Back Button (only on confirm step) */}
            {step === 'confirm' && !isSubmitting && (
              <Pressable
                onPress={handleBack}
                className="py-3 px-6 rounded-2xl active:opacity-70 mb-4"
                style={{ backgroundColor: `${themeColors.primary}15` }}
              >
                <Text className="font-semibold text-center" style={{ color: isDarkMode ? '#E8E0F5' : '#3B2463' }}>
                  Go Back
                </Text>
              </Pressable>
            )}

            {/* Loading Indicator */}
            {isSubmitting && (
              <Text className="text-center font-medium" style={{ color: themeColors.primary }}>
                Setting up security...
              </Text>
            )}
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}
