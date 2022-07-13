export default class mockRNLocalization {
  _language = 'en';
  private props: Record<string, any> = {};
  constructor(props) {
    this.props = props;
    this._setLanguage(this._language);
  }

  _setLanguage(interfaceLanguage) {
    this._language = interfaceLanguage;
    if (this.props[interfaceLanguage]) {
      const localizedStrings: Record<string, string> = this.props[this._language];
      for (const key in localizedStrings) {
        if (localizedStrings[key]) {
          this[key] = localizedStrings[key];
        }
      }
    }
  }
}

jest.mock('react-native-localization', () => mockRNLocalization);
