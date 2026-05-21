/**
 * Onboarding Flow Component
 *
 * Main container that manages the 20-screen onboarding flow.
 */

import React from 'react';
import { View } from 'react-native';
import useOnboardingStore from '@/lib/state/onboarding-store';
import { WelcomeScreen } from './WelcomeScreen';
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
import { NotificationPreferencesScreen } from './NotificationPreferencesScreen';
import { LanguageSelectionScreen } from './LanguageSelectionScreen';
import { PrivacyPermissionsScreen } from './PrivacyPermissionsScreen';
import { AccountPreparationScreen } from './AccountPreparationScreen';
import { FreeTrialPreviewScreen } from './FreeTrialPreviewScreen';
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
        return <NameCollectionScreen />;
      case 4:
        return <MoodSelectionScreen />;
      case 5:
        return <MoodFollowUpScreen />;
      case 6:
        return <MoodInsightScreen />;
      case 7:
        return <GoalSelectionScreen />;
      case 8:
        return <GoalBlockerScreen />;
      case 9:
        return <GoalInsightScreen />;
      case 10:
        return <ReflectionFeelingsScreen />;
      case 11:
        return <JournalingFrequencyInsightScreen />;
      case 12:
        return <NotificationPreferencesScreen />;
      case 13:
        return <LanguageSelectionScreen />;
      case 14:
        return <PrivacyPermissionsScreen />;
      case 15:
        return <AccountPreparationScreen />;
      case 16:
        return <FreeTrialPreviewScreen />;
      case 17:
        return <ReminderScreen />;
      case 18:
        return <PaywallScreen />;
      case 19:
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
export { NotificationPreferencesScreen } from './NotificationPreferencesScreen';
export { LanguageSelectionScreen } from './LanguageSelectionScreen';
export { PrivacyPermissionsScreen } from './PrivacyPermissionsScreen';
export { AccountPreparationScreen } from './AccountPreparationScreen';
export { FreeTrialPreviewScreen } from './FreeTrialPreviewScreen';
export { ReminderScreen } from './ReminderScreen';
export { PaywallScreen } from './PaywallScreen';
export { SetPinScreen } from './SetPinScreen';
export { BackButton } from './BackButton';
