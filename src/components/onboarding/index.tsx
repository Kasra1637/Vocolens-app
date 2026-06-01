/**
 * Onboarding Flow Component
 *
 * Main container that manages the 23-screen onboarding flow.
 *
 * Step map:
 *  0  WelcomeScreen
 *  1  NDValueScreen1  ← "The Hidden Struggle"
 *  2  NDValueScreen2  ← "Speak. Your AI does the rest."
 *  3  NDValueScreen3  ← "What clarity looks like"
 *  4  ThemeSelectionScreen
 *  5  PersonalizePermissionScreen
 *  6  NameCollectionScreen
 *  7  MoodSelectionScreen
 *  8  MoodFollowUpScreen
 *  9  MoodInsightScreen
 *  10 GoalSelectionScreen
 *  11 GoalBlockerScreen
 *  12 GoalInsightScreen
 *  13 ReflectionFeelingsScreen
 *  14 JournalingFrequencyInsightScreen
 *  15 NotificationPreferencesScreen
 *  16 LanguageSelectionScreen
 *  17 PrivacyPermissionsScreen
 *  18 AccountPreparationScreen
 *  19 FreeTrialPreviewScreen
 *  20 ReminderScreen
 *  21 PaywallScreen
 *  22 SetPinScreen
 */

import React from 'react';
import { View } from 'react-native';
import useOnboardingStore from '@/lib/state/onboarding-store';
import { WelcomeScreen } from './WelcomeScreen';
import { NDValueScreen1 } from './NDValueScreen1';
import { NDValueScreen2 } from './NDValueScreen2';
import { NDValueScreen3 } from './NDValueScreen3';
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
      case 0:  return <WelcomeScreen />;
      case 1:  return <NDValueScreen1 />;
      case 2:  return <NDValueScreen2 />;
      case 3:  return <NDValueScreen3 />;
      case 4:  return <ThemeSelectionScreen />;
      case 5:  return <PersonalizePermissionScreen />;
      case 6:  return <NameCollectionScreen />;
      case 7:  return <MoodSelectionScreen />;
      case 8:  return <MoodFollowUpScreen />;
      case 9:  return <MoodInsightScreen />;
      case 10: return <GoalSelectionScreen />;
      case 11: return <GoalBlockerScreen />;
      case 12: return <GoalInsightScreen />;
      case 13: return <ReflectionFeelingsScreen />;
      case 14: return <JournalingFrequencyInsightScreen />;
      case 15: return <NotificationPreferencesScreen />;
      case 16: return <LanguageSelectionScreen />;
      case 17: return <PrivacyPermissionsScreen />;
      case 18: return <AccountPreparationScreen />;
      case 19: return <FreeTrialPreviewScreen />;
      case 20: return <ReminderScreen />;
      case 21: return <PaywallScreen />;
      case 22: return <SetPinScreen />;
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
export { NDValueScreen3 } from './NDValueScreen3';
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
