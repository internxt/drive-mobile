import strings from 'assets/lang/strings';
import { DateTime, Settings } from 'luxon';

export type TimeInput = Date | number | string;
/**
 * Provides an easy layer library and platform independent to work consistently
 * with time utilities such dates
 */
export class TimeService {
  get formats() {
    return {
      dateAtTime: `dd LLL yyyy '${strings.generic.atTime}' HH:mm`,
      dateAtTimeLong: `dd LLLL yyyy '${strings.generic.atTime}' HH:mm`,
      shortDate: 'dd/LL/yyyy',
      duration: 'mm:ss',
    };
  }

  /**
   * Sets a default global locale
   * @param locale The locale to set
   */
  static setLocale(locale: string) {
    Settings.defaultLocale = locale;
  }
  /**
   *
   * @param input Date to generate a formatted version from
   * @param format A valid format, see example
   *
   * @returns A string representation using the given format
   * @see https://moment.github.io/luxon/#/formatting?id=table-of-tokens
   * @example
   * yyyy ->  Full year such 2020
   * LLL  ->  Month abbreviation such Apr
   * dd   ->  Day of the month such 25
   * HH   ->  Hours of the date
   * mm   ->  Minutes of the date
   */
  getFormattedDate(input: TimeInput, format: string, lang?: string) {
    const dateTime = this.getDateTime(input);
    const resolvedLang = lang ?? strings.getLanguage();
    const date = new Date(input);

    // Workaround for Hermes (React Native JS engine) bug with locale-sensitive month tokens.
    //
    // Luxon resolves LLL/LLLL by calling Intl.DateTimeFormat(locale, { month, timeZone: 'UTC' })
    // and then extracting the month part via formatToParts(). On Hermes, formatToParts() is
    // broken for non-English locales on iOS — it returns null for the month field, causing luxon
    // to render the literal string "null" in the formatted date.
    //
    // See: https://github.com/facebook/hermes/issues/1172
    //
    // Fix: pre-resolve the month name ourselves using Intl.DateTimeFormat WITHOUT timeZone,
    // which works correctly in Hermes, and inject it as a luxon literal before luxon processes it.
    let resolvedFormat = format;
    if (resolvedFormat.includes('LLLL')) {
      try {
        const monthLong = new Intl.DateTimeFormat(resolvedLang, { month: 'long' }).format(date);
        resolvedFormat = resolvedFormat.replaceAll('LLLL', `'${monthLong}'`);
      } catch {
        // falls back to luxon default (English)
      }
    }
    if (resolvedFormat.includes('LLL')) {
      try {
        const monthShort = new Intl.DateTimeFormat(resolvedLang, { month: 'short' }).format(date);
        resolvedFormat = resolvedFormat.replaceAll('LLL', `'${monthShort}'`);
      } catch {
        // falls back to luxon default (English)
      }
    }

    return dateTime.toFormat(resolvedFormat);
  }

  /**
   * Creates a DateTime object
   *
   * @param input Input to create a datetime from
   * @returns A valid DateTime object
   */
  getDateTime(input: TimeInput) {
    return DateTime.fromJSDate(new Date(input));
  }

  fromSeconds(seconds: number) {
    return DateTime.fromSeconds(seconds);
  }
}

export const time = new TimeService();
