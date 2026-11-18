import React, { ReactNode, useContext } from 'react';

import { SharedFile } from './types';

type KeepFilesUntilSignIn = (files: SharedFile[]) => void;

const AndroidShareSignInContext = React.createContext<KeepFilesUntilSignIn | undefined>(undefined);

export const AndroidShareSignInProvider = ({
  keepFilesUntilSignIn,
  children,
}: {
  keepFilesUntilSignIn: KeepFilesUntilSignIn;
  children: ReactNode;
}) => (
  <AndroidShareSignInContext.Provider value={keepFilesUntilSignIn}>{children}</AndroidShareSignInContext.Provider>
);

/** Returns the function that keeps the shared files to reopen the share screen with them after signing in. */
export const useKeepFilesUntilSignIn = (): KeepFilesUntilSignIn => {
  const keepFilesUntilSignIn = useContext(AndroidShareSignInContext);
  if (!keepFilesUntilSignIn) {
    throw new Error('useKeepFilesUntilSignIn must be used within an AndroidShareSignInProvider');
  }
  return keepFilesUntilSignIn;
};
