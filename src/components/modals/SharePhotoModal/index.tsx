import React, { useEffect, useState } from 'react';
import { Image, Platform, Share, Text, TextInput, TouchableHighlight, View } from 'react-native';
import { Photo } from '@internxt/sdk/dist/photos';
import prettysize from 'prettysize';
import * as Unicons from '@iconscout/react-native-unicons';

import globalStyle from '../../../styles/global.style';
import { getColor, tailwind } from '../../../helpers/designSystem';
import BottomModal, { BottomModalProps } from '../BottomModal';
import strings from '../../../../assets/lang/strings';
import BaseButton from '../../BaseButton';
import { notify } from '../../../services/toast';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { layoutActions } from '../../../store/slices/layout';
import imageService from '../../../services/image';
import { items } from '@internxt/lib';
import { exists, pathToUri } from '../../../services/fileSystem';
import { photosSelectors, photosThunks } from '../../../store/slices/photos';
import LoadingSpinner from '../../LoadingSpinner';

interface SharePhotoModalProps extends BottomModalProps {
  data: Photo;
  preview: string;
}

function SharePhotoModal({ isOpen, onClosed, data, preview }: SharePhotoModalProps): JSX.Element {
  if (!data) {
    return <View></View>;
  }

  const [times, setTimes] = useState(10);
  const [url, setUrl] = useState('LINK');
  const dispatch = useAppDispatch();
  const photosDirectory = useAppSelector(photosSelectors.photosDirectory);
  const photoPath = photosDirectory + '/' + items.getItemDisplayName({ name: data.name, type: data.type });
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uri, setUri] = useState('');
  const onCancelButtonPressed = () => {
    onClosed();
  };
  const onShareButtonPressed = async () => {
    /*try {
      const result = await Share.share(
        Platform.OS === 'android'
          ? {
              title: strings.modals.share_photo_modal.nativeMesage,
              message: url,
            }
          : {
              url,
              message: strings.modals.share_photo_modal.nativeMesage,
            },
      );

      if (result.action === Share.sharedAction) {
        notify({ type: 'success', text: strings.messages.photoShared });
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }

      onClosed();
    } catch (err) {
      notify({ type: 'error', text: strings.errors.photoShared });
    } */

    await imageService.share(uri);
  };
  const onLessTimesButtonPressed = () => {
    if (times > 0) {
      setTimes(times - 1);
    }
  };
  const onMoreTimesButtonPressed = () => {
    setTimes(times + 1);
  };
  const onTimesTextChanged = (text: string) => {
    console.log('onTimesTextChanged e: ', text.replace(/[^0-9]/g, ''));
  };
  const onCopyLinkButtonPressed = () => {
    onClosed();
    dispatch(layoutActions.setIsLinkCopiedModalOpen(true));
  };
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

  useEffect(() => {
    exists(photoPath).then((value) => {
      if (value) {
        setUri(pathToUri(photoPath));
      } else {
        setIsLoading(true);
        dispatch(
          photosThunks.downloadPhotoThunk({
            fileId: data.fileId,
            options: {
              toPath: photoPath,
              downloadProgressCallback: (p) => {
                setProgress(p);
              },
              decryptionProgressCallback: (p) => undefined,
            },
          }),
        )
          .unwrap()
          .then((path) => {
            setUri(pathToUri(path));
            setIsLoading(false);
          });
      }
    });
  }, []);

  return (
    <BottomModal isOpen={isOpen} onClosed={onClosed} header={header}>
      <View style={tailwind('bg-neutral-10')}>
        {/* LIMIT */}
        {/* <View style={tailwind('my-6')}>
          <Text
            style={[
              tailwind('w-full text-center mb-2 text-base font-semibold text-neutral-500'),
              globalStyle.fontWeight.medium,
            ]}
          >
            {strings.modals.share_photo_modal.linkOpenLimit}
          </Text>

          <View style={tailwind('flex-row justify-center')}>
            <TouchableHighlight
              underlayColor={getColor('neutral-20')}
              style={[tailwind('mr-1 rounded-lg p-2 w-10 h-10 items-center justify-center bg-neutral-30')]}
              onPress={onLessTimesButtonPressed}
            >
              <Unicons.UilMinus color={getColor('neutral-500')} size={24} />
            </TouchableHighlight>

            <TextInput
              style={tailwind('bg-white w-32 text-center text-base text-neutral-500')}
              value={times.toString()}
              onChangeText={onTimesTextChanged}
              keyboardType="numeric"
            />

            <TouchableHighlight
              underlayColor={getColor('neutral-20')}
              style={[tailwind('ml-1 rounded-lg p-2 w-10 h-10 items-center justify-center bg-neutral-30')]}
              onPress={onMoreTimesButtonPressed}
            >
              <Unicons.UilPlus color={getColor('neutral-500')} size={24} />
            </TouchableHighlight>
          </View>
        </View>
        */}

        {/* LINK */}
        {/* <View style={tailwind('flex-row mb-9 justify-center items-center')}>
          <BaseButton
            title={
              <View style={tailwind('flex-row justify-center items-center')}>
                <Text style={tailwind('text-white text-lg mr-2')}>{strings.components.buttons.copyLink}</Text>
                <Unicons.UilLink color={getColor('white')} />
              </View>
            }
            type="accept"
            onPress={onCopyLinkButtonPressed}
          />
        </View>
        */}

        {/* !!! TMP CONTENT */}
        <View style={tailwind('flex-row items-center justify-center px-5 py-10')}>
          {isLoading ? (
            <>
              <LoadingSpinner size={20} style={tailwind('mr-2')} />
              <Text style={tailwind('text-base')}>
                {strings.formatString(strings.modals.share_photo_modal.decrypting, progress.toFixed(0))}
              </Text>
            </>
          ) : (
            <View style={tailwind('items-center')}>
              <Text style={tailwind('text-sm text-green-60 mb-2')}>{strings.modals.share_photo_modal.photoReady}</Text>
              <Text style={tailwind('text-base')}>{strings.modals.share_photo_modal.shareWithYourContacts}</Text>
            </View>
          )}
        </View>

        {/* ACTIONS */}
        <View style={tailwind('p-3 flex-row justify-center')}>
          <BaseButton
            title={strings.components.buttons.cancel}
            type="cancel"
            onPress={onCancelButtonPressed}
            style={tailwind('flex-1')}
          />

          <View style={tailwind('w-2')} />

          <BaseButton
            title={strings.components.buttons.share}
            type="accept"
            onPress={onShareButtonPressed}
            disabled={!uri || isLoading}
            style={tailwind('flex-1')}
          />
        </View>
      </View>
    </BottomModal>
  );
}

export default SharePhotoModal;
