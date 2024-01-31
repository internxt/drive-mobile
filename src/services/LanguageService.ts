import strings from 'assets/lang/strings';
import { AsyncStorageKey, Language } from 'src/types';
import asyncStorageService from './AsyncStorageService';
import RNRestart from 'react-native-restart';
import { Settings } from 'luxon';
class LanguageService {
  constructor() {
    this.initialize();
  }
  private async initialize() {
    const language = await asyncStorageService.getItem(AsyncStorageKey.Language);

    Settings.defaultLocale = language ?? strings.getLanguage();

    language && strings.setLanguage(language);
  }

  public async setLanguage(language: Language) {
    await asyncStorageService.saveItem(AsyncStorageKey.Language, language);
    strings.setLanguage(language);

    Settings.defaultLocale = language ?? strings.getLanguage();
    RNRestart.Restart();
  }
}

export default new LanguageService();
