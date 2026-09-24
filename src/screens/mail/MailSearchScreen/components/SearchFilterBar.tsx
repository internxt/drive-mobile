import { CaretDownIcon, XIcon } from 'phosphor-react-native';
import { ScrollView, StyleSheet } from 'react-native';
import { useTailwind } from 'tailwind-rn';

import { SearchCriteria } from '@internxt-mobile/services/mail/mailSearch';
import strings from '../../../../../assets/lang/strings';
import FilterChip from '../../../../components/FilterChip';
import { EmailFieldType, ToggleField } from '../hooks/useSearchFilters';

const EMAIL_FIELDS: EmailFieldType[] = ['from', 'to'];
const TOGGLE_FIELDS: ToggleField[] = ['hasAttachment', 'isUnread'];

const describeEmails = (label: string, emails: string[]): string => {
  const [firstEmail, ...otherEmails] = emails;
  const summary = otherEmails.length
    ? strings.formatString(strings.screens.mail.search.filters.moreEmails, firstEmail, otherEmails.length)
    : firstEmail;
  return strings.formatString(strings.screens.mail.search.filters.emailsSummary, label, summary) as string;
};

export const SearchFilterBar = ({
  searchCriteria,
  expandedEmailSearchInput,
  onOpenEmailSearchInput,
  onClearEmailSearchInput,
  onToggleFilter,
}: {
  searchCriteria: SearchCriteria;
  expandedEmailSearchInput?: EmailFieldType;
  onOpenEmailSearchInput: (field: EmailFieldType) => void;
  onClearEmailSearchInput: (field: EmailFieldType) => void;
  onToggleFilter: (field: ToggleField) => void;
}): JSX.Element => {
  const tailwind = useTailwind();
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
