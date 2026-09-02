/**
 * Branded Alert Component
 *
 * Custom alert modal for success / error / warning notices.
 *
 * Design intent
 * ─────────────
 * This shares ONE visual language with {@link ConfirmDialog} so every popup
 * in the app — confirmations and notices alike — looks like it belongs to the
 * same family:
 *   - Dark scrim backdrop (not a blur), theme-gradient card with a 2px white
 *     hairline border and 24px radius.
 *   - A 64px icon circle tinted with the accent color at low opacity, with a
 *     white glyph rendered at weight="regular" (the app-wide icon philosophy).
 *   - White title (Inter_700Bold) + translucent-white message.
 *   - Glass pill buttons of equal visual weight.
 *
 * Accent color follows the ConfirmDialog convention: theme primary for
 * success/warning (recoverable, calm), and a muted desaturated red for errors
 * — never alarm-bright.
 */

import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { tapHaptic, successHaptic, errorHaptic } from '@/lib/haptics';
import { CheckCircle, Warning, WarningCircle } from 'phosphor-react-native';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import useSettingsStore from '@/lib/state/settings-store';
import { getThemeColors } from '@/lib/theme';
import { hexToRgba } from '@/lib/glass';

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

  // Errors use a muted, desaturated red — matching ConfirmDialog's "severe"
  // tone. Success/warning use the calm theme primary.
  const accentColor = type === 'error' ? '#C05050' : themeColors.primary;

  const IconComponent =
    type === 'success' ? CheckCircle : type === 'warning' ? Warning : WarningCircle;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            backgroundColor: THEME_COLORS[selectedTheme].backgroundGradient[1],
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.20)',
            overflow: 'hidden',
          }}
        >
          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                backgroundColor: hexToRgba(accentColor, 0.20),
                borderWidth: 1,
                borderColor: hexToRgba(accentColor, 0.30),
              }}
            >
              <IconComponent size={32} color="#FFFFFF" weight="regular" />
            </View>

            {/* Title */}
            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                color: '#FFFFFF',
                fontSize: 22,
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              {title}
            </Text>

            {/* Message */}
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: 15,
                textAlign: 'center',
                lineHeight: 22,
              }}
            >
              {message}
            </Text>
          </View>

          {/* Action buttons — equal visual weight glass pills, matching
              ConfirmDialog. */}
          <View style={{ gap: 12 }}>
            {secondaryLabel && onSecondary && (
              <Pressable
                onPress={handleSecondary}
                style={{
                  borderRadius: 999,
                  paddingVertical: 14,
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.18)',
                  borderWidth: 1.5,
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                }}
              >
                <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 14 }}>
                  {secondaryLabel}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleClose}
              style={{
                borderRadius: 999,
                paddingVertical: 14,
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.35)',
              }}
            >
              <Text style={{ fontFamily: 'Inter_600SemiBold', color: '#FFFFFF', fontSize: 14 }}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
