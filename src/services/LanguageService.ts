import strings from 'assets/lang/strings';

import * as Localization from 'expo-localization';
import { Settings } from 'luxon';
import { AsyncStorageKey, Language, NotificationType } from 'src/types';
import asyncStorageService from './AsyncStorageService';
import notificationsService from './NotificationsService';
class LanguageService {
  constructor() {
    this.initialize();
  }
  private async initialize() {
    const savedLanguage = await asyncStorageService.getItem(AsyncStorageKey.Language);

    if (savedLanguage) {
      strings.setLanguage(savedLanguage);
      Settings.defaultLocale = savedLanguage;
    } else {
      const deviceLocale = Localization.getLocales()[0]?.languageCode;
      const detectedLanguage = deviceLocale === 'es' ? Language.Spanish : Language.English;
      strings.setLanguage(detectedLanguage);
      Settings.defaultLocale = detectedLanguage;
    }
  }

  public async setLanguage(language: Language) {
    await asyncStorageService.saveItem(AsyncStorageKey.Language, language);
    strings.setLanguage(language);

    Settings.defaultLocale = language ?? strings.getLanguage();
    notificationsService.show({ text1: strings.modals.Language.info, type: NotificationType.Info });
  }
}

export default new LanguageService();
