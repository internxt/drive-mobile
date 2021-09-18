import React from 'react';
import { Text, View } from 'react-native'
import { tailwind } from '../../helpers/designSystem';
import EmptyDriveImage from '../../../assets/images/screens/empty-drive.svg'
import EmptyFolderImage from '../../../assets/images/screens/empty-folder.svg'
import { Reducers } from '../../redux/reducers/reducers';

interface EmptyFolderProps extends Reducers {
  isRoot: boolean
}

export function EmptyFolder(props: EmptyFolderProps): JSX.Element {
  return <View style={tailwind('flex items-center opacity-50')}>
    {props.isRoot ?
      <>
        <EmptyDriveImage width={150} height={150} />
        <Text style={tailwind('text-base text-base-color font-bold m-5 mb-1')}>Your drive is empty</Text>
        <Text style={tailwind('text-base text-base-color m-1')}>Try uploading a file or creating a folder</Text>
      </>
      :
      <>
        <EmptyFolderImage width={100} height={100} />
        <Text style={tailwind('text-base text-base-color font-bold m-5 mb-1')}>This folder is empty</Text>
        <Text style={tailwind('text-base text-base-color m-1')}>Try uploading a file or creating a folder</Text>
      </>}
  </View>;
}