import { CaretDownIcon, XIcon } from 'phosphor-react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import { DateFilter, SearchCriteria } from '@internxt-mobile/services/mail/mailSearch';
import strings from '../../../../../assets/lang/strings';
import FilterChip from '../../../../components/FilterChip';
import { time } from '../../../../services/common/time/time.service';
import { EmailFieldType, ToggleField } from '../hooks/useSearchFilters';

const EMAIL_FIELDS: EmailFieldType[] = ['from', 'to'];
const TOGGLE_FIELDS: ToggleField[] = ['hasAttachment', 'isUnread'];
const RANGE_DAY_FORMAT = 'd LLL';

const describeEmails = (label: string, emails: string[]): string => {
  const [firstEmail, ...otherEmails] = emails;
  const summary = otherEmails.length
    ? strings.formatString(strings.screens.mail.search.filters.moreEmails, firstEmail, otherEmails.length)
    : firstEmail;
  return strings.formatString(strings.screens.mail.search.filters.emailsSummary, label, summary) as string;
};

const describeDate = (date: DateFilter): string => {
  const { filters } = strings.screens.mail.search;
  if (date.preset === 'anyDate') {
    return filters.date;
  }
  if (date.preset === 'customRange') {
    return strings.formatString(
      filters.dateRangeSummary,
      time.getFormattedDate(date.startDate, RANGE_DAY_FORMAT),
      time.getFormattedDate(date.endDate, RANGE_DAY_FORMAT),
    ) as string;
  }
  return filters.datePresets[date.preset];
};

export const SearchFilterBar = ({
  searchCriteria,
  expandedEmailSearchInput,
  onOpenEmailSearchInput,
  onClearEmailSearchInput,
  onOpenDateFilter,
  onClearDateFilter,
  onToggleFilter,
}: {
  searchCriteria: SearchCriteria;
  expandedEmailSearchInput?: EmailFieldType;
  onOpenEmailSearchInput: (field: EmailFieldType) => void;
  onClearEmailSearchInput: (field: EmailFieldType) => void;
  onOpenDateFilter: () => void;
  onClearDateFilter: () => void;
  onToggleFilter: (field: ToggleField) => void;
}): JSX.Element => {
  const tailwind = useTailwind();
  const hasDate = searchCriteria.date.preset !== 'anyDate';
  const filterLabels = {
    from: strings.screens.mail.search.filters.from,
    to: strings.screens.mail.search.filters.to,
    hasAttachment: strings.screens.mail.search.filters.hasAttachment,
    isUnread: strings.screens.mail.search.filters.unread,
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.filterRow}
      contentContainerStyle={tailwind('px-4 pb-2')}
    >
      {EMAIL_FIELDS.map((field) => {
        const emails = searchCriteria[field];
        const hasEmails = emails.length > 0;
        return (
          <FilterChip
            key={field}
            style={tailwind('mr-2')}
            label={hasEmails ? describeEmails(filterLabels[field], emails) : filterLabels[field]}
            active={hasEmails || expandedEmailSearchInput === field}
            trailingIcon={hasEmails ? XIcon : CaretDownIcon}
            onPress={() => onOpenEmailSearchInput(field)}
            onTrailingIconPress={hasEmails ? () => onClearEmailSearchInput(field) : undefined}
          />
        );
      })}
      <FilterChip
        style={tailwind('mr-2')}
        label={describeDate(searchCriteria.date)}
        active={hasDate}
        trailingIcon={hasDate ? XIcon : CaretDownIcon}
        onPress={onOpenDateFilter}
        onTrailingIconPress={hasDate ? onClearDateFilter : undefined}
      />
      {TOGGLE_FIELDS.map((field) => (
        <FilterChip
          key={field}
          style={tailwind('mr-2')}
          label={filterLabels[field]}
          active={searchCriteria[field]}
          onPress={() => onToggleFilter(field)}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  filterRow: { flexGrow: 0 },
});
