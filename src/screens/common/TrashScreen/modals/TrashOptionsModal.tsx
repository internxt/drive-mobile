import { time } from '@internxt-mobile/services/common/time';
import { DriveListItem } from '@internxt-mobile/types/drive';
import strings from 'assets/lang/strings';
import { ClockCounterClockwise, Trash } from 'phosphor-react-native';
import prettysize from 'prettysize';
import React from 'react';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
import BottomModalOption from 'src/components/BottomModalOption';
import BottomModal from 'src/components/modals/BottomModal';
import { FolderIcon, getFileTypeIcon } from 'src/helpers';
import { useTailwind } from 'tailwind-rn';

export interface TrashOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreDriveItem: (item: DriveListItem) => void;
  onDeleteDriveItem: (item: DriveListItem) => void;
  item?: DriveListItem;
}

export const TrashOptionsModal: React.FC<TrashOptionsModalProps> = (props) => {
  const tailwind = useTailwind();

  const isFolder = props.item?.data.type ? false : true;
  const getUpdatedAt = () => {
    if (!props.item?.data.createdAt) return;
    // eslint-disable-next-line quotes
    return time.getFormattedDate(props.item?.data?.createdAt, time.formats.dateAtTime);
  };

  const FileIcon = getFileTypeIcon(props.item?.data.type || '');

  const options = [
    {
      icon: <ClockCounterClockwise size={20} color={tailwind('text-gray-100').color as string} />,
      textStyle: tailwind('text-gray-100'),
      label: strings.components.file_and_folder_options.restore,
      onPress: () => props.item && props.onRestoreDriveItem(props.item),
    },
    {
      icon: <Trash size={20} color={tailwind('text-red-dark').color as string} />,
      textStyle: tailwind('text-red-dark'),
      label: strings.components.file_and_folder_options.deletePermanently,
      onPress: () => props.item && props.onDeleteDriveItem(props.item),
    },
  ];
  const header = (
    <View style={tailwind('flex-row')}>
      <View style={tailwind('mr-3')}>
        {isFolder ? <FolderIcon width={40} height={40} /> : <FileIcon width={40} height={40} />}
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <AppText medium ellipsizeMode="middle" style={tailwind('text-base text-gray-100')}>
          {props.item?.data.name}
          {props.item?.data.type ? '.' + props.item?.data.type : ''}
        </AppText>
        <View style={tailwind('flex flex-row items-center')}>
          <AppText style={tailwind('text-xs text-gray-60')}>
            {!isFolder && <>{prettysize(props.item?.data.size || 0)}</>}
          </AppText>
          {!isFolder && <View style={[tailwind('bg-gray-60 rounded-full mx-1.5'), { width: 3, height: 3 }]} />}
          <AppText style={tailwind('text-xs text-gray-60')}>{getUpdatedAt()}</AppText>
        </View>
      </View>
    </View>
  );
  return (
    <BottomModal header={header} isOpen={props.isOpen} onClosed={props.onClose}>
      <View>
        {options.map((opt, index) => {
          return (
            <BottomModalOption
              key={index}
              leftSlot={opt.icon}
              rightSlot={
                <View style={tailwind('flex-grow items-center justify-center flex-row')}>
                  <AppText style={[tailwind('text-lg text-neutral-500'), opt.textStyle]}>{opt.label}</AppText>
                </View>
              }
              hideBorderBottom={index === options.length - 1}
              onPress={opt.onPress}
            />
          );
        })}
      </View>
    </BottomModal>
  );
};
