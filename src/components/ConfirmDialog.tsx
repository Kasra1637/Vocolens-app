/**
 * ConfirmDialog
 *
 * The single, canonical confirmation dialog used across the whole app for
 * discard / delete / sign-out / reset actions.
 *
 * Design intent
 * ─────────────
 * Vocolens is a voice journaling app for emotional wellness — users are
 * often in a reflective or vulnerable state when they trigger one of these
 * dialogs (discarding a recording, deleting an entry, signing out). Borrowing
 * the harsh red / bold-warning-icon pattern from e-commerce or productivity
 * apps works against the calm experience the rest of the app builds.
 *
 * So this dialog:
 *   - Uses the theme's primary color for the icon circle by default — not
 *     alarm red — even for delete/discard actions. These are recoverable
 *     (re-record, entry still exists elsewhere) and don't need to spike
 *     anxiety.
 *   - Reserves a muted red only for `destructiveness="severe"` — genuinely
 *     permanent, high-stakes loss (e.g. wiping all app data). Even then the
 *     red is desaturated, not alarm-red.
 *   - Gives the safe/cancel action equal visual weight to the destructive
 *     one (both are glass pill buttons) rather than de-emphasizing it into
 *     a thin outline, so a distracted or upset user doesn't mis-tap.
 *   - Uses one consistent shape (rounded-3xl card, pill buttons,
 *     Inter_600SemiBold) everywhere it appears.
 */

import React from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { Warning, Trash, SignOut } from 'phosphor-react-native';
import useOnboardingStore, { THEME_COLORS } from '@/lib/state/onboarding-store';
import useSettingsStore from '@/lib/state/settings-store';
import { getThemeColors } from '@/lib/theme';
import { hexToRgba } from '@/lib/glass';
import { tapHaptic } from '@/lib/haptics';

type IconName = 'warning' | 'trash' | 'signOut';

// Loosely typed to avoid depending on phosphor-react-native's internal
// prop type export name, which has changed across versions.
const ICONS: Record<IconName, React.ComponentType<any>> = {
  warning: Warning,
  trash: Trash,
  signOut: SignOut,
};

export interface ConfirmDialogStep {
  title: string;
  message: string;
  /** Label for the destructive/primary action button on this step. */
  confirmLabel: string;
}

interface ConfirmDialogProps {
  visible: boolean;
  /** Single-step convenience props — ignored if `steps` is provided. */
  title?: string;
  message?: string;
  /**
   * Optional secondary line rendered below `message` in smaller, dimmer text
   * (12px, 55% opacity vs. the main message's 15px/75%) — for informational
   * asides that must stay visible but shouldn't visually compete with the
   * primary warning copy above it. e.g. "This does not cancel an active
   * Google Play subscription — manage or cancel that separately in the Play
   * Store" on the delete-account dialog: legally/functionally important, but
   * not the actual warning the user needs to weigh before confirming.
   */
  footnote?: string;
  confirmLabel?: string;
  /** Multi-step flow (e.g. reset-all-data's "are you sure?" second step). */
  steps?: ConfirmDialogStep[];
  currentStep?: number; // 0-indexed
  cancelLabel?: string;
  icon?: IconName;
  /**
   * "normal" (default) — theme primary color icon/accent. Used for
   * discard, delete entry, sign out, etc. These are recoverable actions.
   *
   * "severe" — muted/desaturated red icon/accent. Reserved for truly
   * permanent, whole-app data loss (Reset All Data).
   */
  destructiveness?: 'normal' | 'severe';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  footnote,
  confirmLabel = 'Confirm',
  steps,
  currentStep = 0,
  cancelLabel = 'Cancel',
  icon = 'warning',
  destructiveness = 'normal',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const selectedTheme = useOnboardingStore((s) => s.selectedTheme);
  const isDarkMode = useSettingsStore((s) => s.isDarkMode);
  const Colors = getThemeColors(selectedTheme, isDarkMode);

  const IconComponent = ICONS[icon];
  const isMultiStep = !!steps && steps.length > 1;
  const activeStep = isMultiStep ? steps![currentStep] : undefined;

  const displayTitle = activeStep?.title ?? title ?? '';
  const displayMessage = activeStep?.message ?? message ?? '';
  const displayConfirmLabel = activeStep?.confirmLabel ?? confirmLabel;

  // Severe actions get a muted, desaturated red — never alarm-bright.
  const accentColor = destructiveness === 'severe' ? '#C05050' : Colors.primary;

  const handleConfirm = () => {
    tapHaptic();
    onConfirm();
  };

  const handleCancel = () => {
    tapHaptic();
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
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
              {displayTitle}
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
              {displayMessage}
            </Text>

            {/* Footnote — deliberately smaller/dimmer than the message above
                it, so an informational aside (e.g. "this doesn't cancel your
                subscription") reads as a footnote, not as a second warning
                competing for the same attention as the primary message. */}
            {footnote ? (
              <Text
                style={{
                  color: 'rgba(255, 255, 255, 0.55)',
                  fontSize: 12,
                  textAlign: 'center',
                  lineHeight: 17,
                  marginTop: 10,
                }}
              >
                {footnote}
              </Text>
            ) : null}
          </View>

          {/* Step indicator — only rendered for multi-step flows */}
          {isMultiStep && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              {steps!.map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 32,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor:
                      i <= currentStep ? accentColor : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </View>
          )}

          {/* Action buttons — equal visual weight; the safe choice is never
              de-emphasized so a distracted user doesn't mis-tap. */}
          <View style={{ gap: 12 }}>
            <Pressable
              onPress={handleConfirm}
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
                {displayConfirmLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleCancel}
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
                {cancelLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
