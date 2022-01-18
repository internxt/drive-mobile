import React from 'react';
import { Image, Text, View } from 'react-native';
import prettysize from 'prettysize';
import { Photo } from '@internxt/sdk/dist/photos';

import globalStyle from '../../../styles/global.style';
import { tailwind } from '../../../helpers/designSystem';
import BottomModal, { BottomModalProps } from '../BottomModal';
import BottomModalOption from '../../BottomModalOption';
import strings from '../../../../assets/lang/strings';
import moment from 'moment';

interface PhotosPreviewInfoModalProps extends BottomModalProps {
  data: Photo;
  preview: string;
}

function PhotosPreviewInfoModal({ isOpen, onClosed, data, preview }: PhotosPreviewInfoModalProps): JSX.Element {
  const header = (
    <>
      <View style={tailwind('mr-3')}>
        <Image style={tailwind('bg-black w-10 h-10')} source={{ uri: preview }} />
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
          {strings.generic.updated +
            ' ' +
            new Date(data.updatedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
        </Text>
      </View>
    </>
  );
  const dimensionsText = `${data.width} x ${data.height}`;
  const createdAtText = moment(data.createdAt).format('LL');
  const updatedAtText = moment(data.updatedAt).format('LL');

  return (
    <BottomModal isOpen={isOpen} onClosed={onClosed} header={header}>
      <View style={tailwind('bg-neutral-10 p-4 flex-grow')}>
        <View style={tailwind('rounded-xl bg-white')}>
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>
                  {strings.modals.photos_preview_info_modal.options.name}
                </Text>
              </View>
            }
            rightSlot={
              <Text numberOfLines={1} ellipsizeMode="middle" style={tailwind('text-sm text-neutral-100')}>
                {data.name}
              </Text>
            }
          />
        </View>

        <View style={tailwind('rounded-xl bg-white')}>
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>
                  {strings.modals.photos_preview_info_modal.options.uploaded}
                </Text>
              </View>
            }
            rightSlot={<Text style={tailwind('text-sm text-neutral-100')}>{createdAtText}</Text>}
          />
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>
                  {strings.modals.photos_preview_info_modal.options.modified}
                </Text>
              </View>
            }
            rightSlot={<Text style={tailwind('text-sm text-neutral-100')}>{updatedAtText}</Text>}
          />
        </View>

        <View style={tailwind('bg-white rounded-xl mt-4')}>
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>
                  {strings.modals.photos_preview_info_modal.options.size}
                </Text>
              </View>
            }
            rightSlot={<Text style={tailwind('text-sm text-neutral-100')}>{prettysize(data.size)}</Text>}
          />
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>
                  {strings.modals.photos_preview_info_modal.options.dimensions}
                </Text>
              </View>
            }
            rightSlot={<Text style={tailwind('text-sm text-neutral-100')}>{dimensionsText}</Text>}
          />
          <BottomModalOption
            leftSlot={
              <View style={tailwind('flex-grow')}>
                <Text style={tailwind('text-lg text-neutral-500')}>
                  {strings.modals.photos_preview_info_modal.options.format}
                </Text>
              </View>
            }
            rightSlot={<Text style={tailwind('text-sm text-neutral-100')}>{data.type.toUpperCase()}</Text>}
          />
        </View>
      </View>
    </BottomModal>
  );
}

export default PhotosPreviewInfoModal;
