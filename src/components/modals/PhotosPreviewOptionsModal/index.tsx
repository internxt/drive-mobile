import React from 'react';
import { Image, Text, View } from 'react-native';
import prettysize from 'prettysize';
import { Photo } from '@internxt/sdk/dist/photos';
import * as Unicons from '@iconscout/react-native-unicons';

import globalStyle from '../../../styles/global.style';
import { getColor, tailwind } from '../../../helpers/designSystem';
import BottomModal, { BottomModalProps } from '../BottomModal';
import BottomModalOption from '../../BottomModalOption';
import strings from '../../../../assets/lang/strings';
import { layoutActions } from '../../../store/slices/layout';
import { useAppDispatch } from '../../../store/hooks';

function PhotosPreviewOptionsModal({ isOpen, onClosed, data }: BottomModalProps & { data: Photo }): JSX.Element {
  const dispatch = useAppDispatch();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const examplePhoto = require('../../../../assets/images/photos/example.png');
  const header = (
    <>
      <View style={tailwind('mr-3')}>
        <Image style={tailwind('bg-black w-10 h-10')} source={examplePhoto} />
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={[tailwind('text-base text-neutral-500'), globalStyle.fontWeight.medium]}
        >
          {data.name + '.' + data.type}
        </Text>
        <Text style={tailwind('text-xs text-neutral-100')}>
          <>
            {prettysize(data.size)}
            <Text style={globalStyle.fontWeight.bold}> · </Text>
          </>
          {'Updated '}
          {new Date(data.updatedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
    </>
  );
  const onInfoButtonPressed = () => {
    dispatch(layoutActions.setIsPhotosPreviewInfoModalOpen(true));
    onClosed();
  };
  const onShareButtonPressed = () => {
    dispatch(layoutActions.setIsSharePhotoModalOpen(true));
  };
  const onDownloadButtonPressed = () => {
    console.log('onDownloadButtonPressed');
  };
  const onMoveToTrashButtonPressed = () => {
    dispatch(layoutActions.setIsDeletePhotosModalOpen(true));
  };

  return (
    <BottomModal isOpen={isOpen} onClosed={onClosed} header={header}>
      <View style={tailwind('bg-neutral-10 p-4 flex-grow')}>
        <View style={tailwind('bg-white')}>
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.components.buttons.info}</Text>
              </View>
            }
            rightSlot={<Unicons.UilInfoCircle size={20} color={getColor('neutral-500')} />}
            onPress={onInfoButtonPressed}
          />
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.components.buttons.shareWithLink}</Text>
              </View>
            }
            rightSlot={<Unicons.UilLink size={20} color={getColor('neutral-500')} />}
            onPress={onShareButtonPressed}
          />
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>{strings.components.buttons.download}</Text>
              </View>
            }
            rightSlot={<Unicons.UilDownloadAlt size={20} color={getColor('neutral-500')} />}
            onPress={onDownloadButtonPressed}
          />
        </View>

        <View style={tailwind('bg-white rounded-xl mt-4')}>
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-red-60')}>{strings.components.buttons.moveToThrash}</Text>
              </View>
            }
            rightSlot={<Unicons.UilTrash size={20} color={getColor('red-60')} />}
            onPress={onMoveToTrashButtonPressed}
          />
        </View>
      </View>
    </BottomModal>
  );
}

export default PhotosPreviewOptionsModal;
