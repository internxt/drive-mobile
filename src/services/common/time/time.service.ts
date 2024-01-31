import strings from 'assets/lang/strings';
import { DateTime, Settings } from 'luxon';

export type TimeInput = Date | number | string;
/**
 * Provides an easy layer library and platform independent to work consistently
 * with time utilities such dates
 */
export class TimeService {
  public formats = {
    dateAtTime: `dd LLL yyyy '${strings.generic.atTime}' HH:mm`,
    dateAtTimeLong: `dd LLLL yyyy '${strings.generic.atTime}' HH:mm`,
    shortDate: 'dd/LL/yyyy',
    duration: 'mm:ss',
  };

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
  getFormattedDate(input: TimeInput, format: string) {
    const dateTime = this.getDateTime(input);
    return dateTime.toFormat(format, { locale: Settings.defaultLocale });
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
