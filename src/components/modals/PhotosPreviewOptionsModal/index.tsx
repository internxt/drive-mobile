import React from 'react';
import { Image, Text, View } from 'react-native';
import prettysize from 'prettysize';
import { Photo } from '@internxt/sdk/dist/photos';

import globalStyle from '../../../styles/global';
import BottomModal, { BottomModalProps } from '../BottomModal';
import BottomModalOption from '../../BottomModalOption';
import strings from '../../../../assets/lang/strings';
import { uiActions } from '../../../store/slices/ui';
import { useAppDispatch } from '../../../store/hooks';
import fileSystemService from '../../../services/FileSystemService';
import { items } from '@internxt/lib';
import { DownloadSimple, Info, Link, Trash } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';

interface PhotosPreviewOptionsModalProps extends BottomModalProps {
  data: Photo;
  preview: string;
  photoPath: string;
  isFullSizeLoading: boolean;
}

function PhotosPreviewOptionsModal({
  isOpen,
  onClosed,
  data,
  preview,
  photoPath,
  isFullSizeLoading,
}: PhotosPreviewOptionsModalProps): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const header = (
    <View style={tailwind('flex-row')}>
      <View style={tailwind('mr-3')}>
        <Image style={tailwind('bg-neutral-30 w-10 h-10')} source={{ uri: preview }} />
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={[tailwind('text-base text-neutral-500'), globalStyle.fontWeight.medium]}
        >
          {items.getItemDisplayName(data)}
        </Text>
        <Text style={tailwind('text-xs text-neutral-100')}>
          <>
            {prettysize(data.size)}
            <Text style={globalStyle.fontWeight.bold}> · </Text>
          </>
          {strings.generic.updated +
            ' ' +
            new Date(data.updatedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
        </Text>
      </View>
    </View>
  );
  const onInfoButtonPressed = () => {
    dispatch(uiActions.setIsPhotosPreviewInfoModalOpen(true));
    onClosed();
  };
  const onShareButtonPressed = () => {
    dispatch(uiActions.setIsSharePhotoModalOpen(true));
  };
  const onDownloadButtonPressed = () => {
    fileSystemService.showFileViewer(fileSystemService.pathToUri(photoPath), {
      displayName: items.getItemDisplayName(data),
    });
  };
  const onMoveToTrashButtonPressed = () => {
    dispatch(uiActions.setIsDeletePhotosModalOpen(true));
  };

  return (
    <BottomModal isOpen={isOpen} onClosed={onClosed} header={header}>
      <View style={tailwind('bg-neutral-10 p-4 flex-grow')}>
        <View style={tailwind('bg-white')}>
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.buttons.info}</Text>
              </View>
            }
            rightSlot={<Info size={20} color={getColor('text-neutral-500')} />}
            onPress={onInfoButtonPressed}
          />
          <BottomModalOption
            disabled={isFullSizeLoading}
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.buttons.share}</Text>
              </View>
            }
            rightSlot={<Link size={20} color={getColor('text-neutral-500')} />}
            onPress={onShareButtonPressed}
          />
          <BottomModalOption
            disabled={isFullSizeLoading}
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.buttons.download}</Text>
              </View>
            }
            rightSlot={<DownloadSimple size={20} color={getColor('text-neutral-500')} />}
            onPress={onDownloadButtonPressed}
          />
        </View>

        <View style={tailwind('bg-white rounded-xl mt-4')}>
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-red-60')}>{strings.buttons.moveToThrash}</Text>
              </View>
            }
            rightSlot={<Trash size={20} color={getColor('text-red-60')} />}
            onPress={onMoveToTrashButtonPressed}
          />
        </View>
      </View>
    </BottomModal>
  );
}

export default PhotosPreviewOptionsModal;
