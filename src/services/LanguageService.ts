import strings from 'assets/lang/strings';
import { AsyncStorageKey, Language } from 'src/types';
import asyncStorageService from './AsyncStorageService';
import RNRestart from 'react-native-restart';

class LanguageService {
  public async initialize() {
    const language = await asyncStorageService.getItem(AsyncStorageKey.Language);
    language && strings.setLanguage(language);
  }

  public async setLanguage(language: Language) {
    await asyncStorageService.saveItem(AsyncStorageKey.Language, language);
    strings.setLanguage(language);

    RNRestart.Restart();
  }
}

const languageService = new LanguageService();
export default languageService;
