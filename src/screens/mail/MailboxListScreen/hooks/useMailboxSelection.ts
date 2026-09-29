import { useCallback, useMemo, useState } from 'react';

/** The emails selected in a mailbox list. Emails no longer listed drop out of the selection. */
export const useMailboxSelection = (listedEmailIds: string[]) => {
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);

  const listedSelectedEmailIds = useMemo(() => {
    const listedEmailIdSet = new Set(listedEmailIds);
    return selectedEmailIds.filter((emailId) => listedEmailIdSet.has(emailId));
  }, [listedEmailIds, selectedEmailIds]);

  const toggleEmailSelection = useCallback(
    (emailId: string) => {
      const listedEmailIdSet = new Set(listedEmailIds);
      setSelectedEmailIds((emailIds) => {
        const stillListedEmailIds = emailIds.filter((selectedEmailId) => listedEmailIdSet.has(selectedEmailId));
        return stillListedEmailIds.includes(emailId)
          ? stillListedEmailIds.filter((selectedEmailId) => selectedEmailId !== emailId)
          : [...stillListedEmailIds, emailId];
      });
    },
    [listedEmailIds],
  );

  const selectAll = useCallback(() => setSelectedEmailIds(listedEmailIds), [listedEmailIds]);

  const clearSelection = useCallback(() => setSelectedEmailIds([]), []);

  return {
    selectedEmailIds: listedSelectedEmailIds,
    isSelecting: listedSelectedEmailIds.length > 0,
    areAllSelected: listedEmailIds.length > 0 && listedSelectedEmailIds.length === listedEmailIds.length,
    toggleEmailSelection,
    selectAll,
    clearSelection,
  };
};
