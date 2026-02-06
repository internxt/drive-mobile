import strings from 'assets/lang/strings';

import { Settings } from 'luxon';
import { AsyncStorageKey, Language, NotificationType } from 'src/types';
import asyncStorageService from './AsyncStorageService';
import notificationsService from './NotificationsService';

class LanguageService {
  public async setLanguage(language: Language) {
    await asyncStorageService.saveItem(AsyncStorageKey.Language, language);
    strings.setLanguage(language);
    Settings.defaultLocale = language ?? strings.getLanguage();
    notificationsService.show({ text1: strings.modals.Language.info, type: NotificationType.Info });
  }
}

export default new LanguageService();
