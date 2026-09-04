import { createContext, useContext } from 'react';
import { BackfilledThumbnailRefs } from 'src/services/photos/PhotoThumbnailBackfillService';

export interface PreviewThumbnailBackfillContextType {
  onThumbnailBackfilled: (itemId: string, refs: BackfilledThumbnailRefs) => void;
}

export const PreviewThumbnailBackfillContext = createContext<PreviewThumbnailBackfillContextType | undefined>(
  undefined,
);

export const usePreviewThumbnailBackfillContext = (): PreviewThumbnailBackfillContextType => {
  const context = useContext(PreviewThumbnailBackfillContext);
  if (!context) {
    throw new Error(
      'usePreviewThumbnailBackfillContext must be used within a PreviewThumbnailBackfillContext.Provider',
    );
  }
  return context;
};
