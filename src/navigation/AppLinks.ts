const SCHEME = 'internxt://';

export const AppLinks = {
  driveFolder: (folderUuid: string): string => `${SCHEME}tab-explorer/drive/folder/${folderUuid}`,
  signIn: (): string => `${SCHEME}sign-in`,
} as const;

export const AppPaths = {
  driveFolder: (folderUuid: string): string => `tab-explorer/drive/folder/${folderUuid}`,
  signIn: (): string => 'sign-in',
} as const;
