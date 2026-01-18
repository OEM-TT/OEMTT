/**
 * Navigation types for Expo Router
 */

export type RootStackParamList = {
  '(tabs)': undefined;
  '(auth)/login': undefined;
  '(auth)/verify-magic-link': { token: string };
  '(auth)/welcome': undefined;
  '(modals)/context-builder': { unitId?: string };
  '(modals)/answer': { questionId: string };
  '(modals)/manual-picker': { modelId: string };
  '(modals)/feedback': { questionId: string; manualId?: string };
  '(modals)/add-unit': undefined;
  '(modals)/unit-details': { unitId: string };
  '(modals)/subscription': undefined;
  '(modals)/oem-details': { oemId: string };
};

export type TabsParamList = {
  index: undefined;
  library: undefined;
  discover: undefined;
  profile: undefined;
};
