/**
 * Onboarding Flow Component
 *
 * Main container that manages the 25-screen onboarding flow.
 *
 * Flow rhythm: every question screen is followed by an Insight screen that
 * reflects the answer back. Keep that alternation — stacking two questions
 * in a row is what makes the funnel start to feel like a form.
 *
 * IMPORTANT: the step map below is the source of truth for two other things
 * that must be kept in sync whenever a screen is added or removed:
 *   1. `nextStep()`'s upper clamp in lib/state/onboarding-store.ts — must be
 *      the LAST index here (currently 24).
 *   2. Every screen's `<ProgressBar totalSteps={...} />` — must be the TOTAL
 *      number of screens here (currently 25). A mismatch makes the bar jump
 *      backwards mid-flow.
 *
 * Step map:
 *  0  WelcomeScreen
 *  1  NDValueScreen1  — "Sound Familiar"
 *  2  NDValueScreen2  — "Speak, we listen"
 *  3  ThemeSelectionScreen
 *  4  PersonalizePermissionScreen
 *  5  NameCollectionScreen
 *  6  MoodSelectionScreen
 *  7  MoodFollowUpScreen
 *  8  MoodInsightScreen
 *  9  GoalSelectionScreen
 *  10 GoalInsightScreen
 *  11 ReflectionFeelingsScreen
 *  12 JournalingFrequencyInsightScreen
 *  13 SelfAwarenessScreen
 *  14 SelfAwarenessInsightScreen
 *  15 ProcessingStyleScreen
 *  16 ProcessingStyleInsightScreen
 *  17 AppFeelingScreen
 *  18 NotificationPreferencesScreen
 *  19 PrivacyPermissionsScreen
 *  20 AccountPreparationScreen
 *  21 FreeTrialPreviewScreen
 *  22 ReminderScreen
 *  23 PaywallScreen
 *  24 BiometricSetupScreen
 *
 * Not in the flow: GoalBlockerScreen (see the note in the switch below).
 */

import React from 'react';
import { View } from 'react-native';
import useOnboardingStore from '@/lib/state/onboarding-store';
import { WelcomeScreen } from './WelcomeScreen';
import { NDValueScreen1 } from './NDValueScreen1';
import { NDValueScreen2 } from './NDValueScreen2';
import { ThemeSelectionScreen } from './ThemeSelectionScreen';
import { PersonalizePermissionScreen } from './PersonalizePermissionScreen';
import { NameCollectionScreen } from './NameCollectionScreen';
import { MoodSelectionScreen } from './MoodSelectionScreen';
import { MoodFollowUpScreen } from './MoodFollowUpScreen';
import { MoodInsightScreen } from './MoodInsightScreen';
import { GoalSelectionScreen } from './GoalSelectionScreen';
import { GoalBlockerScreen } from './GoalBlockerScreen';
import { GoalInsightScreen } from './GoalInsightScreen';
import { ReflectionFeelingsScreen } from './ReflectionFeelingsScreen';
import { JournalingFrequencyInsightScreen } from './JournalingFrequencyInsightScreen';
import { SelfAwarenessScreen } from './SelfAwarenessScreen';
import { SelfAwarenessInsightScreen } from './SelfAwarenessInsightScreen';
import { ProcessingStyleScreen } from './ProcessingStyleScreen';
import { ProcessingStyleInsightScreen } from './ProcessingStyleInsightScreen';
import { AppFeelingScreen } from './AppFeelingScreen';
import { NotificationPreferencesScreen } from './NotificationPreferencesScreen';
import { PrivacyPermissionsScreen } from './PrivacyPermissionsScreen';
import { AccountPreparationScreen } from './AccountPreparationScreen';
import { FreeTrialPreviewScreen } from './FreeTrialPreviewScreen';
import { ReminderScreen } from './ReminderScreen';
import { PaywallScreen } from './PaywallScreen';
import { BiometricSetupScreen } from './BiometricSetupScreen';

export function OnboardingFlow() {
  const currentStep = useOnboardingStore((s) => s.currentStep);

  const renderScreen = () => {
    switch (currentStep) {
      case 0:  return <WelcomeScreen />;
      case 1:  return <NDValueScreen1 />;
      case 2:  return <NDValueScreen2 />;
      case 3:  return <ThemeSelectionScreen />;
      case 4:  return <PersonalizePermissionScreen />;
      case 5:  return <NameCollectionScreen />;
      case 6:  return <MoodSelectionScreen />;
      case 7:  return <MoodFollowUpScreen />;
      case 8:  return <MoodInsightScreen />;
      case 9:  return <GoalSelectionScreen />;
      // NOTE: GoalBlockerScreen is intentionally NOT in this flow.
      // It asks a second question immediately after GoalSelectionScreen,
      // which breaks the question -> validation cadence the rest of the
      // funnel follows (every question is followed by an Insight screen that
      // reflects the answer back). Two questions back-to-back is where the
      // flow starts to feel like a form. The component is kept in the repo in
      // case that beat is ever wanted somewhere that preserves the rhythm.
      case 10: return <GoalInsightScreen />;
      case 11: return <ReflectionFeelingsScreen />;
      case 12: return <JournalingFrequencyInsightScreen />;
      case 13: return <SelfAwarenessScreen />;
      case 14: return <SelfAwarenessInsightScreen />;
      case 15: return <ProcessingStyleScreen />;
      case 16: return <ProcessingStyleInsightScreen />;
      case 17: return <AppFeelingScreen />;
      case 18: return <NotificationPreferencesScreen />;
      case 19: return <PrivacyPermissionsScreen />;
      case 20: return <AccountPreparationScreen />;
      case 21: return <FreeTrialPreviewScreen />;
      case 22: return <ReminderScreen />;
      case 23: return <PaywallScreen />;
      case 24: return <BiometricSetupScreen />;
      default: return <WelcomeScreen />;
    }
  };

  return (
    <View className="flex-1">
      {renderScreen()}
    </View>
  );
}

export { WelcomeScreen } from './WelcomeScreen';
export { NDValueScreen1 } from './NDValueScreen1';
export { NDValueScreen2 } from './NDValueScreen2';
export { ThemeSelectionScreen } from './ThemeSelectionScreen';
export { PersonalizePermissionScreen } from './PersonalizePermissionScreen';
export { NameCollectionScreen } from './NameCollectionScreen';
export { MoodSelectionScreen } from './MoodSelectionScreen';
export { MoodFollowUpScreen } from './MoodFollowUpScreen';
export { MoodInsightScreen } from './MoodInsightScreen';
export { GoalSelectionScreen } from './GoalSelectionScreen';
export { GoalBlockerScreen } from './GoalBlockerScreen';
export { GoalInsightScreen } from './GoalInsightScreen';
export { ReflectionFeelingsScreen } from './ReflectionFeelingsScreen';
export { JournalingFrequencyInsightScreen } from './JournalingFrequencyInsightScreen';
export { SelfAwarenessScreen } from './SelfAwarenessScreen';
export { SelfAwarenessInsightScreen } from './SelfAwarenessInsightScreen';
export { ProcessingStyleScreen } from './ProcessingStyleScreen';
export { ProcessingStyleInsightScreen } from './ProcessingStyleInsightScreen';
export { AppFeelingScreen } from './AppFeelingScreen';
export { NotificationPreferencesScreen } from './NotificationPreferencesScreen';
export { PrivacyPermissionsScreen } from './PrivacyPermissionsScreen';
export { AccountPreparationScreen } from './AccountPreparationScreen';
export { FreeTrialPreviewScreen } from './FreeTrialPreviewScreen';
export { ReminderScreen } from './ReminderScreen';
export { PaywallScreen } from './PaywallScreen';
export { BiometricSetupScreen } from './BiometricSetupScreen';
export { BackButton } from './BackButton';
