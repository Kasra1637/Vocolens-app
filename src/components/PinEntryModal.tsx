/**
 * PIN Entry Modal
 *
 * Modal for entering PIN to unlock the app.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { tapHaptic, successHaptic, errorHaptic } from '@/lib/haptics';
import { verifyPin } from '@/lib/auth-service';
import { Lock, Delete, X } from 'lucide-react-native';
import useOnboardingStore from '@/lib/state/onboarding-store';
import useSettingsStore from '@/lib/state/settings-store';
import { getThemeColors } from '@/lib/theme';

interface PinEntryModalProps {
  visible: boolean;
  onSuccess: () => void;
  onDismiss?: () => void;
}

export function PinEntryModal({ visible, onSuccess, onDismiss }: PinEntryModalProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const themeColors = getThemeColors(selectedTheme, isDarkMode);

  useEffect(() => {
    // Reset when modal becomes visible
    if (visible) {
      setPin('');
      setError('');
    }
  }, [visible]);

  const handleNumberPress = async (num: number) => {
    if (pin.length >= 4) return;

    tapHaptic();
    const newPin = pin + num.toString();
    setPin(newPin);
    setError('');

    // Auto-verify when 4 digits entered
    if (newPin.length === 4) {
      setIsVerifying(true);
      const isValid = await verifyPin(newPin);

      if (isValid) {
        successHaptic();
        onSuccess();
        setPin('');
      } else {
        setError('Incorrect PIN');
        errorHaptic();
        setPin('');
      }
      setIsVerifying(false);
    }
  };

  const handleDelete = () => {
    if (pin.length === 0) return;
    tapHaptic();
    setPin(pin.slice(0, -1));
    setError('');
  };

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
              className="absolute top-4 right-4 p-2 active:opacity-70"
            >
              <X size={24} color={themeColors.primary} strokeWidth={2.5} />
            </Pressable>

            {/* Icon */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 rounded-full items-center justify-center" style={{ backgroundColor: `${themeColors.primary}20` }}>
                <Lock size={40} color={themeColors.primary} />
              </View>
            </View>

            {/* Title */}
            <Text className="text-2xl font-bold text-center mb-2" style={{ color: isDarkMode ? '#E8E0F5' : '#3B2463' }}>
              Enter Your PIN
            </Text>

            {/* Subtitle */}
            <Text className="text-center mb-8" style={{ color: isDarkMode ? '#C4B5DC' : '#6B5B95' }}>
              Please enter your 4-digit PIN to access your journal
            </Text>

            {/* PIN Dots Display */}
            <View className="flex-row justify-between mb-6">
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  className="w-10 h-10 rounded-lg border-2 items-center justify-center"
                  style={{
                    backgroundColor: pin.length > index ? themeColors.primary : isDarkMode ? '#251A35' : `${themeColors.primary}15`,
                    borderColor: pin.length > index ? themeColors.primary : isDarkMode ? '#3D2E54' : `${themeColors.primary}30`,
                  }}
                >
                  {pin.length > index && (
                    <View className="w-2 h-2 rounded-full bg-white" />
                  )}
                </View>
              ))}
            </View>

            {/* Error Message */}
            {error !== '' && (
              <Text className="text-red-600 text-center mb-6 font-medium">
                {error}
              </Text>
            )}

            {/* Loading Indicator */}
            {isVerifying && (
              <Text className="text-center mb-6 font-medium" style={{ color: themeColors.primary }}>
                Verifying...
              </Text>
            )}

            {/* Number Pad — standard phone layout */}
            <View style={{ gap: 10 }}>
              {/* Row 1: 1 2 3 */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[1, 2, 3].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => handleNumberPress(num)}
                    disabled={isVerifying}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 64,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: pressed
                        ? `${themeColors.primary}30`
                        : `${themeColors.primary}15`,
                    })}
                  >
                    <Text style={{ fontSize: 26, fontFamily: 'Inter_700Bold', color: isDarkMode ? '#E8E0F5' : '#3B2463' }}>
                      {num}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Row 2: 4 5 6 */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[4, 5, 6].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => handleNumberPress(num)}
                    disabled={isVerifying}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 64,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: pressed
                        ? `${themeColors.primary}30`
                        : `${themeColors.primary}15`,
                    })}
                  >
                    <Text style={{ fontSize: 26, fontFamily: 'Inter_700Bold', color: isDarkMode ? '#E8E0F5' : '#3B2463' }}>
                      {num}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Row 3: 7 8 9 */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[7, 8, 9].map((num) => (
                  <Pressable
                    key={num}
                    onPress={() => handleNumberPress(num)}
                    disabled={isVerifying}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 64,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: pressed
                        ? `${themeColors.primary}30`
                        : `${themeColors.primary}15`,
                    })}
                  >
                    <Text style={{ fontSize: 26, fontFamily: 'Inter_700Bold', color: isDarkMode ? '#E8E0F5' : '#3B2463' }}>
                      {num}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Row 4: [spacer] 0 [backspace] */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* Empty spacer — transparent, non-interactive */}
                <View style={{ flex: 1, height: 64 }} />

                {/* 0 */}
                <Pressable
                  onPress={() => handleNumberPress(0)}
                  disabled={isVerifying}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 64,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pressed
                      ? `${themeColors.primary}30`
                      : `${themeColors.primary}15`,
                  })}
                >
                  <Text style={{ fontSize: 26, fontFamily: 'Inter_700Bold', color: isDarkMode ? '#E8E0F5' : '#3B2463' }}>
                    0
                  </Text>
                </Pressable>

                {/* Backspace */}
                <Pressable
                  onPress={handleDelete}
                  disabled={isVerifying || pin.length === 0}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 64,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: pressed
                      ? `${themeColors.primary}30`
                      : `${themeColors.primary}15`,
                    opacity: pin.length === 0 ? 0.35 : 1,
                  })}
                >
                  <Delete size={24} color={themeColors.primary} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}
