import { useState } from 'react';

import { EMPTY_SEARCH_CRITERIA, SearchCriteria, addEmailEntries } from '@internxt-mobile/services/mail/mailSearch';

export type EmailFieldType = 'from' | 'to';
export type ToggleField = 'hasAttachment' | 'isUnread';

type EmailsToSearch = { field: EmailFieldType; emails: string[]; pendingText: string };

const haveSameEmails = (firstEmails: string[], secondEmails: string[]): boolean =>
  firstEmails.length === secondEmails.length && firstEmails.every((email, index) => email === secondEmails[index]);

/**
 * Keeps the text sent and the filters of a search, and runs `search` with them each time they change.
 * The emails of the field being edited are applied when it is closed.
 */
export const useSearchFilters = (search: (searchCriteria: SearchCriteria) => void) => {
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>(EMPTY_SEARCH_CRITERIA);
  const [emailsToSearch, setEmailsToSearch] = useState<EmailsToSearch | null>(null);

  const searchWith = (changedSearchCriteria: SearchCriteria) => {
    setSearchCriteria(changedSearchCriteria);
    search(changedSearchCriteria);
  };

  const getSearchCriteriaWithEditedEmails = (): SearchCriteria =>
    emailsToSearch
      ? {
          ...searchCriteria,
          [emailsToSearch.field]: addEmailEntries(emailsToSearch.emails, emailsToSearch.pendingText),
        }
      : searchCriteria;

  const closeEmailSearchInput = () => {
    const editedSearchCriteria = getSearchCriteriaWithEditedEmails();
    setEmailsToSearch(null);
    if (
      emailsToSearch &&
      !haveSameEmails(editedSearchCriteria[emailsToSearch.field], searchCriteria[emailsToSearch.field])
    ) {
      searchWith(editedSearchCriteria);
    }
  };

  const submitText = (text: string) => {
    setEmailsToSearch(null);
    searchWith({ ...getSearchCriteriaWithEditedEmails(), text });
  };

  const clearText = () => {
    if (searchCriteria.text) {
      searchWith({ ...searchCriteria, text: '' });
    }
  };

  const toggleFilter = (field: ToggleField) => {
    setEmailsToSearch(null);
    const editedSearchCriteria = getSearchCriteriaWithEditedEmails();
    searchWith({ ...editedSearchCriteria, [field]: !editedSearchCriteria[field] });
  };

  const openEmailSearchInput = (field: EmailFieldType) => {
    if (emailsToSearch?.field === field) {
      closeEmailSearchInput();
      return;
    }
    closeEmailSearchInput();
    setEmailsToSearch({ field, emails: getSearchCriteriaWithEditedEmails()[field], pendingText: '' });
  };

  const clearEmailSearchInput = (field: EmailFieldType) => {
    setEmailsToSearch(null);
    searchWith({ ...getSearchCriteriaWithEditedEmails(), [field]: [] });
  };

  const changeEmailSearchInput = (changes: Partial<Omit<EmailsToSearch, 'field'>>) => {
    setEmailsToSearch((currentEmailsToSearch) =>
      currentEmailsToSearch ? { ...currentEmailsToSearch, ...changes } : currentEmailsToSearch,
    );
  };

  return {
    searchCriteria,
    emailsToSearch,
    submitText,
    clearText,
    toggleFilter,
    openEmailSearchInput,
    closeEmailSearchInput,
    clearEmailSearchInput,
    changeEmailSearchInput,
  };
};
