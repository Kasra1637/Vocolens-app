/**
 * Onboarding Flow Component
 *
 * Main container that manages the 15-screen onboarding flow.
 */

import React from 'react';
import { View } from 'react-native';
import useOnboardingStore from '@/lib/state/onboarding-store';
import { WelcomeScreen } from './WelcomeScreen';
import { MoodSelectionScreen } from './MoodSelectionScreen';
import { MoodFollowUpScreen } from './MoodFollowUpScreen';
import { MoodInsightScreen } from './MoodInsightScreen';
import { GoalSelectionScreen } from './GoalSelectionScreen';
import { GoalBlockerScreen } from './GoalBlockerScreen';
import { GoalInsightScreen } from './GoalInsightScreen';
import { ReflectionFeelingsScreen } from './ReflectionFeelingsScreen';
import { JournalingFrequencyInsightScreen } from './JournalingFrequencyInsightScreen';
import { NotificationPreferencesScreen } from './NotificationPreferencesScreen';
import { LanguageSelectionScreen } from './LanguageSelectionScreen';
import { ThemeSelectionScreen } from './ThemeSelectionScreen';
import { PrivacyPermissionsScreen } from './PrivacyPermissionsScreen';
import { AccountPreparationScreen } from './AccountPreparationScreen';
import { FreeTrialPreviewScreen } from './FreeTrialPreviewScreen';
import { PersonalizePermissionScreen } from './PersonalizePermissionScreen';
import { ReminderScreen } from './ReminderScreen';
import { PaywallScreen } from './PaywallScreen';
import { SetPinScreen } from './SetPinScreen';

export function OnboardingFlow() {
  const currentStep = useOnboardingStore((s) => s.currentStep);

  const renderScreen = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeScreen />;
      case 1:
        return <ThemeSelectionScreen />;
      case 2:
        return <PersonalizePermissionScreen />;
      case 3:
        return <MoodSelectionScreen />;
      case 4:
        return <MoodFollowUpScreen />;
      case 5:
        return <MoodInsightScreen />;
      case 6:
        return <GoalSelectionScreen />;
      case 7:
        return <GoalBlockerScreen />;
      case 8:
        return <GoalInsightScreen />;
      case 9:
        return <ReflectionFeelingsScreen />;
      case 10:
        return <JournalingFrequencyInsightScreen />;
      case 11:
        return <NotificationPreferencesScreen />;
      case 12:
        return <LanguageSelectionScreen />;
      case 13:
        return <PrivacyPermissionsScreen />;
      case 14:
        return <AccountPreparationScreen />;
      case 15:
        return <FreeTrialPreviewScreen />;
      case 16:
        return <ReminderScreen />;
      case 17:
        return <PaywallScreen />;
      case 18:
        return <SetPinScreen />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <View className="flex-1">
      {renderScreen()}
    </View>
  );
}

export { WelcomeScreen } from './WelcomeScreen';
export { MoodSelectionScreen } from './MoodSelectionScreen';
export { MoodFollowUpScreen } from './MoodFollowUpScreen';
export { MoodInsightScreen } from './MoodInsightScreen';
export { GoalSelectionScreen } from './GoalSelectionScreen';
export { GoalBlockerScreen } from './GoalBlockerScreen';
export { GoalInsightScreen } from './GoalInsightScreen';
export { ReflectionFeelingsScreen } from './ReflectionFeelingsScreen';
export { JournalingFrequencyInsightScreen } from './JournalingFrequencyInsightScreen';
export { LanguageSelectionScreen } from './LanguageSelectionScreen';
export { NotificationPreferencesScreen } from './NotificationPreferencesScreen';
export { ThemeSelectionScreen } from './ThemeSelectionScreen';
export { PrivacyPermissionsScreen } from './PrivacyPermissionsScreen';
export { AccountPreparationScreen } from './AccountPreparationScreen';
export { FreeTrialPreviewScreen } from './FreeTrialPreviewScreen';
export { ReminderScreen } from './ReminderScreen';
export { PaywallScreen } from './PaywallScreen';
export { SetPinScreen } from './SetPinScreen';
export { PersonalizePermissionScreen } from './PersonalizePermissionScreen';
export { BackButton } from './BackButton';
