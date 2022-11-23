import { useContext } from 'react';
import { DriveContext, DriveContextType } from 'src/contexts/Drive/Drive.context';

export const useDrive = () => useContext(DriveContext) as DriveContextType;
