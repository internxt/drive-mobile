import { time } from '@internxt-mobile/services/common/time';
import { DriveListItem } from '@internxt-mobile/types/drive/item';
import strings from 'assets/lang/strings';
import { ClockCounterClockwise, Trash } from 'phosphor-react-native';
import prettysize from 'prettysize';
import React from 'react';
import { View } from 'react-native';
import AppText from 'src/components/AppText';
import BottomModalOption from 'src/components/BottomModalOption';
import BottomModal from 'src/components/modals/BottomModal';
import { FolderIcon, getFileTypeIcon } from 'src/helpers';
import useGetColor from 'src/hooks/useColor';

export interface TrashOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreDriveItem: (item: DriveListItem) => void;
  onDeleteDriveItem: (item: DriveListItem) => void;
  item?: DriveListItem;
}

export const TrashOptionsModal: React.FC<TrashOptionsModalProps> = (props) => {
  const getColor = useGetColor();

  const isFolder = props.item?.data.type ? false : true;
  const getUpdatedAt = () => {
    if (!props.item?.data.createdAt) return;
    // eslint-disable-next-line quotes
    return time.getFormattedDate(props.item?.data?.createdAt, time.formats.dateAtTime);
  };

  const FileIcon = getFileTypeIcon(props.item?.data.type || '');

  const options = [
    {
      icon: <ClockCounterClockwise size={20} color={getColor('text-gray-80')} />,
      textStyle: { color: getColor('text-gray-100') },
      label: strings.components.file_and_folder_options.restore,
      onPress: () => props.item && props.onRestoreDriveItem(props.item),
    },
    {
      icon: <Trash size={20} color={getColor('text-red')} />,
      textStyle: { color: getColor('text-red') },
      label: strings.components.file_and_folder_options.deletePermanently,
      onPress: () => props.item && props.onDeleteDriveItem(props.item),
    },
  ];

  const header = (
    <View className="flex-row">
      <View className="mr-3">
        {isFolder ? <FolderIcon width={40} height={40} /> : <FileIcon width={40} height={40} />}
      </View>

      <View className="flex-shrink w-full">
        <AppText medium ellipsizeMode="middle" className="text-base" style={{ color: getColor('text-gray-100') }}>
          {props.item?.data.name}
          {props.item?.data.type ? '.' + props.item?.data.type : ''}
        </AppText>
        <View className="flex flex-row items-center">
          <AppText className="text-xs" style={{ color: getColor('text-gray-60') }}>
            {!isFolder && <>{prettysize(props.item?.data.size || 0)}</>}
          </AppText>
          {!isFolder && (
            <View
              className="rounded-full mx-1.5"
              style={{
                width: 3,
                height: 3,
                backgroundColor: getColor('bg-gray-60'),
              }}
            />
          )}
          <AppText className="text-xs" style={{ color: getColor('text-gray-60') }}>
            {getUpdatedAt()}
          </AppText>
        </View>
      </View>
    </View>
  );

  return (
    <BottomModal
      header={header}
      isOpen={props.isOpen}
      onClosed={props.onClose}
      style={{ backgroundColor: getColor('bg-surface') }}
    >
      <View>
        {options.map((opt, index) => {
          return (
            <BottomModalOption
              key={index}
              leftSlot={opt.icon}
              rightSlot={
                <View className="flex-grow items-center justify-center flex-row">
                  <AppText className="text-lg" style={opt.textStyle}>
                    {opt.label}
                  </AppText>
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
