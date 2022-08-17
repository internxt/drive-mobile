import React, { useEffect, useState } from 'react';
import { View, Text, Share, TouchableOpacity, TouchableHighlight, ActivityIndicator } from 'react-native';
import prettysize from 'prettysize';
import { setString } from 'expo-clipboard';

import { getHeaders } from '../../../helpers/headers';
import strings from '../../../../assets/lang/strings';
import { generateShareLink } from '../../../@inxt-js/services/share';
import { getFileTypeIcon } from '../../../helpers';
import { generateFileKey, Network } from '../../../lib/network';
import globalStyle from '../../../styles/global';
import asyncStorage from '../../../services/AsyncStorageService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { uiActions } from '../../../store/slices/ui';
import BottomModal from '../BottomModal';
import { constants } from '@internxt-mobile/services/common';
import { NotificationType } from '../../../types';
import notificationsService from '../../../services/NotificationsService';
import { Copy, Minus, Plus } from 'phosphor-react-native';
import { useTailwind } from 'tailwind-rn';
import useGetColor from '../../../hooks/useColor';

function ShareFilesModal(): JSX.Element {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const dispatch = useAppDispatch();
  const { showShareModal } = useAppSelector((state) => state.ui);
  const { focusedItem } = useAppSelector((state) => state.drive);
  const [isOpen, setIsOpen] = useState(showShareModal);
  const [link, setLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState('10');
  const getLink = async (fileId: string, views: number) => {
    const tokenLink = await getFileToken(fileId, views);
    const url = `${constants.REACT_NATIVE_DRIVE_API_URL}/s/file/${tokenLink}`;

    setLink(url);
  };
  const shareFile = async () => {
    await Share.share({
      title: strings.modals.ShareModal.title,
      message: strings.formatString(strings.modals.ShareModal.message, link) as string,
    });
  };
  const getFileToken = async (fileId: string, views: number) => {
    const { bucket, mnemonic, userId, email } = await asyncStorage.getUser();
    const network = new Network(email, userId, mnemonic);
    const { index } = await network.getFileInfo(bucket, fileId);
    const fileToken = await network.createFileToken(bucket, fileId, 'PULL');
    const fileEncryptionKey = await generateFileKey(mnemonic, bucket, Buffer.from(index, 'hex'));

    const generatedLink = await generateShareLink(await getHeaders(), fileId, {
      bucket,
      fileToken,
      isFolder: false,
      views,
      encryptionKey: fileEncryptionKey.toString('hex'),
    });

    setLink(generatedLink);
    return generatedLink;
  };
  const onClosed = () => {
    dispatch(uiActions.setShowShareModal(false));
    setLink('');
    setIsOpen(false);
    setIsLoading(true);
    setInputValue('10');
  };
  const FileIcon = getFileTypeIcon(focusedItem?.type || '');
  const header = (
    <View style={tailwind('flex-row')}>
      <View style={tailwind('mr-3')}>
        <FileIcon width={40} height={40} />
      </View>

      <View style={tailwind('flex-shrink w-full')}>
        <Text
          numberOfLines={1}
          ellipsizeMode="middle"
          style={[tailwind('text-base text-neutral-500'), globalStyle.fontWeight.medium]}
        >
          {focusedItem?.name}
          {focusedItem?.type ? '.' + focusedItem.type : ''}
        </Text>
        <Text style={tailwind('text-xs text-neutral-100')}>
          {prettysize(focusedItem?.size || 0)}
          <Text style={globalStyle.fontWeight.bold}> · </Text>Updated{' '}
          {new Date(focusedItem?.updatedAt || 0).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
    </View>
  );
  const onShareButtonPressed = () => {
    shareFile();
    dispatch(uiActions.setShowShareModal(false));
  };

  useEffect(() => {
    setIsOpen(showShareModal);

    if (showShareModal && focusedItem) {
      focusedItem.fileId && getLink(focusedItem.fileId, parseInt(inputValue)).then(() => setIsLoading(false));
    }
  }, [showShareModal]);

  useEffect(() => {
    if (!showShareModal) {
      return;
    }
    setIsLoading(true);
    const delay = setTimeout(() => {
      focusedItem &&
        focusedItem?.fileId &&
        getLink(focusedItem.fileId, parseInt(inputValue)).then(() => setIsLoading(false));
    }, 1000);

    return () => {
      clearTimeout(delay);
    };
  }, [inputValue]);

  return (
    <BottomModal isOpen={isOpen} onClosed={onClosed} header={header}>
      <View style={tailwind('bg-neutral-10 px-3 py-8 flex-grow items-center justify-center')}>
        <Text style={[tailwind('text-xl text-neutral-500 text-center mb-2'), globalStyle.fontWeight.medium]}>
          Share link open limit
        </Text>
        <View style={tailwind('flex-row items-stretch justify-center mb-6 w-48')}>
          <TouchableHighlight
            underlayColor={getColor('text-blue-70')}
            disabled={inputValue === '1'}
            onPress={() => {
              const newValue = Math.max(parseInt(inputValue, 10) - 1, 1) || 1;

              setInputValue(newValue.toFixed(0));
            }}
            style={[
              tailwind('bg-blue-60 w-12 h-12 rounded-l-xl justify-center items-center'),
              inputValue === '1' && tailwind('bg-neutral-30'),
            ]}
          >
            <Minus color="white" size={26} />
          </TouchableHighlight>
          <View style={tailwind('bg-white justify-center')}>
            <View style={tailwind('text-xl mx-8 flex-row items-center')}>
              <Text style={[tailwind('text-xl text-neutral-500'), globalStyle.fontWeight.medium]}>
                {inputValue} times
              </Text>
            </View>
          </View>
          <TouchableHighlight
            underlayColor={getColor('text-blue-70')}
            disabled={inputValue === '100'}
            onPress={() => {
              const newValue = Math.min(parseInt(inputValue, 10) + 1, 100) || 1;

              setInputValue(newValue.toFixed(0));
            }}
            style={[
              tailwind('bg-blue-60 w-12 h-12 rounded-r-xl justify-center items-center'),
              inputValue === '100' && tailwind('bg-neutral-30'),
            ]}
          >
            <Plus color="white" size={26} />
          </TouchableHighlight>
        </View>

        <View
          style={[
            tailwind('items-center'),
            {
              shadowColor: '#000',
              shadowOpacity: 0.04,
              shadowRadius: 8,
              shadowOffset: {
                height: 4,
                width: 0,
              },
            },
            isLoading && tailwind('opacity-50'),
          ]}
        >
          <View style={tailwind('bg-white rounded-xl p-2')}>
            <TouchableOpacity
              disabled={isLoading}
              onPress={() => {
                if (!isLoading) {
                  setString(link);
                  notificationsService.show({
                    type: NotificationType.Success,
                    text1: strings.messages.linkCopied,
                  });
                }
              }}
              style={tailwind('flex-row items-center')}
            >
              <Text
                style={[
                  tailwind('text-xl mx-3'),
                  isLoading ? tailwind('text-neutral-80') : tailwind('text-blue-60'),
                  globalStyle.fontWeight.medium,
                ]}
              >
                {isLoading ? 'Generating share link' : 'Copy share link'}
              </Text>
              {isLoading ? <ActivityIndicator /> : <Copy color={getColor('text-blue-60')} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={tailwind('flex-row justify-between bg-neutral-10 p-3')}>
        <TouchableHighlight
          underlayColor={getColor('text-neutral-30')}
          style={tailwind('bg-neutral-20 rounded-lg py-2 flex-grow items-center justify-center')}
          onPress={() => {
            dispatch(uiActions.setShowShareModal(false));
          }}
          disabled={isLoading}
        >
          <Text style={[tailwind('text-lg text-neutral-300'), globalStyle.fontWeight.medium]}>
            {strings.buttons.cancel}
          </Text>
        </TouchableHighlight>

        <View style={tailwind('px-1')}></View>

        <TouchableHighlight
          underlayColor={getColor('text-blue-70')}
          style={[
            tailwind('bg-blue-60 rounded-lg py-2 flex-grow items-center justify-center'),
            isLoading && tailwind('bg-blue-30'),
          ]}
          onPress={onShareButtonPressed}
          disabled={isLoading}
        >
          <Text style={[tailwind('text-lg text-white'), globalStyle.fontWeight.medium]}>
            {strings.modals.ShareModal.share}
          </Text>
        </TouchableHighlight>
      </View>
    </BottomModal>
  );
}

export default ShareFilesModal;
