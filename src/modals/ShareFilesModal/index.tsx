/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { View, Text, Share, TouchableOpacity, TouchableWithoutFeedback, TouchableHighlight, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modalbox';
import { connect } from 'react-redux';
import { layoutActions } from '../../redux/actions';
import { getHeaders } from '../../helpers/headers';
import { IFile, IFolder } from '../../components/FileList';
import { Reducers } from '../../redux/reducers/reducers';
import strings from '../../../assets/lang/strings';
import { generateShareLink } from '../../@inxt-js/services/share';
import { deviceStorage, getFileTypeIcon } from '../../helpers';
import { generateFileKey, Network } from '../../lib/network';
import { setString } from 'expo-clipboard'
import { notify } from '../../helpers/toast';
import { getColor, tailwind } from '../../helpers/designSystem';
import * as Unicons from '@iconscout/react-native-unicons'
import prettysize from 'prettysize';

function ShareFilesModal(props: Reducers) {
  const [isOpen, setIsOpen] = useState(props.layoutState.showShareModal)
  const [selectedFile, setSelectedFile] = useState<IFile & IFolder>()
  const [filename, setFileName] = useState('')
  const [link, setLink] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [inputValue, setInputValue] = useState('10')

  const handleInputChange = (e: string) => {
    setInputValue(e.replace(/[^0-9]/g, ''))
  }

  useEffect(() => {
    setIsOpen(props.layoutState.showShareModal === true)

    if (props.layoutState.showShareModal && props.filesState.focusedItem) {
      setSelectedFile(props.filesState.focusedItem)
      setFileName(props.filesState.focusedItem.name)
      getLink(props.filesState.focusedItem, parseInt(inputValue)).then(() => setIsLoading(false))
    }
  }, [props.layoutState.showShareModal])

  useEffect(() => {
    if (!props.layoutState.showShareModal) {
      return
    }
    setIsLoading(true)
    const delay = setTimeout(() => {
      getLink(selectedFile, parseInt(inputValue)).then(() => setIsLoading(false))
    }, 1000);

    return () => { clearTimeout(delay); }
  }, [inputValue])

  const getLink = async (file: any, views: number) => {
    const tokenLink = await getFileToken(file, views);

    const url = `${process.env.REACT_NATIVE_API_URL}/${tokenLink}`;

    setLink(url)
  }

  const shareFile = async (file: any) => {
    // Share link on native share system
    await Share.share({
      title: 'Internxt Drive file sharing',
      message: `Hello, \nHow are things going? I’m using Internxt Drive, a secure, simple and private cloud storage service https://internxt.com/drive \nI wanted to share a file (${file.name}) with you through this private link (${inputValue} total uses), no sign up required: ${link}`
    });
  };

  const getFileToken = async (file: IFile, views: number) => {
    const fileId = file.fileId;

    const { bucket, mnemonic, userId, email } = await deviceStorage.getUser();
    const network = new Network(email, userId, mnemonic);
    const { index } = await network.getFileInfo(bucket, fileId);
    const fileToken = await network.createFileToken(bucket, fileId, 'PULL');
    const fileEncryptionKey = await generateFileKey(mnemonic, bucket, Buffer.from(index, 'hex'));

    const generatedLink = await generateShareLink(await getHeaders(), fileId, {
      bucket,
      fileToken,
      isFolder: false,
      views,
      encryptionKey: fileEncryptionKey.toString('hex')
    });

    setLink(generatedLink);
    return generatedLink;
  };

  const FileIcon = getFileTypeIcon(selectedFile && selectedFile.type)

  return (
    <Modal
      position={'bottom'}
      style={tailwind('h-96 rounded-t-xl')}
      isOpen={isOpen}
      onClosed={async () => {
        props.dispatch(layoutActions.closeShareModal())
        setLink('');
        setIsOpen(false)
        setIsLoading(true);
        setInputValue('10')
      }}
      backButtonClose={true}
      backdropPressToClose={true}
      animationDuration={200}
    >

      <View style={tailwind('h-full rounded-xl')}>
        <View style={tailwind('flex-row bg-white px-4 py-3 rounded-t-xl items-center justify-between border-b border-neutral-20')}>

          <View style={tailwind('mr-2')}>
            <FileIcon width={32} height={32} />
          </View>

          <View style={tailwind('flex-shrink w-full')}>
            <Text numberOfLines={1} ellipsizeMode="middle">{filename}{selectedFile && selectedFile.type ? '.' + selectedFile.type : ''}</Text>
            <Text style={tailwind('text-xs text-neutral-100')}>{prettysize(selectedFile?.size)} <Text style={tailwind('font-bold')}>· </Text> Updated {new Date(selectedFile?.updatedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}</Text>
          </View>

          <View>
            <TouchableWithoutFeedback onPress={() => {
              props.dispatch(layoutActions.closeShareModal())
            }}>
              <View style={tailwind('bg-neutral-20 rounded-full p-1 ml-6')}>
                <Unicons.UilTimes color={'#B3BAC5'} size={25} />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </View>
        <View style={tailwind('bg-neutral-10 p-3 flex-grow items-center justify-center rounded-b-xl')}>
          <Text style={tailwind('text-xl font-bold text-neutral-500 text-center')}>Share link open limit</Text>

          <View style={tailwind('flex-row items-stretch justify-center my-5 w-48')}>
            <TouchableHighlight
              underlayColor={getColor('blue-70')}
              disabled={inputValue === '1'}
              onPress={() => {
                const newValue = Math.max(parseInt(inputValue, 10) - 1, 1) || 1;

                setInputValue(newValue.toFixed(0));
              }}
              style={[tailwind('bg-blue-60 p-3 rounded-bl-lg rounded-tl-lg justify-center'), inputValue === '1' && tailwind('bg-neutral-30')]}>
              <Unicons.UilMinus color="white" size={25} />
            </TouchableHighlight>
            <View style={tailwind('bg-white justify-center')}>
              <View style={tailwind('text-xl mx-6 flex-row items-center')}>
                <Text style={tailwind('text-xl')}>{inputValue} times</Text>
              </View>
            </View>
            <TouchableHighlight
              underlayColor={getColor('blue-70')}
              disabled={inputValue === '100'}
              onPress={() => {
                const newValue = Math.min(parseInt(inputValue, 10) + 1, 100) || 1;

                setInputValue(newValue.toFixed(0));
              }}
              style={[tailwind('bg-blue-60 p-3 rounded-br-lg rounded-tr-lg justify-center'), inputValue === '100' && tailwind('bg-neutral-30')]}>
              <Unicons.UilPlus color="white" size={25} />
            </TouchableHighlight>
          </View>

          <View style={[tailwind('items-center'), {
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowOffset: {
              height: 4,
              width: 0
            }
          }, isLoading && tailwind('opacity-50')]}>
            <View style={tailwind('bg-white rounded-xl p-2')}>
              <TouchableOpacity
                disabled={isLoading}
                onPress={() => {
                  if (!isLoading) {
                    setString(link);
                    notify({
                      type: 'success',
                      text: 'Link copied'
                    })
                    props.dispatch(layoutActions.closeShareModal())
                  }
                }}
                style={tailwind('flex-row items-center')}
              >
                <Text style={[tailwind('text-xl font-medium mx-3'), isLoading ? tailwind('text-neutral-80') : tailwind('text-blue-60')]}>
                  {isLoading ? 'Generating share link' : 'Copy share link'}
                </Text>
                {isLoading ? <ActivityIndicator /> : <Unicons.UilCopy color={getColor('blue-60')} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={tailwind('flex-row justify-between p-3 bg-neutral-10')}>

          <TouchableHighlight
            underlayColor={getColor('neutral-30')}
            style={tailwind('bg-neutral-20 rounded-md m-1 h-12 flex-grow items-center justify-center')}
            onPress={() => {
              props.dispatch(layoutActions.closeShareModal());
            }}
          >
            <Text style={tailwind('text-base font-bold text-neutral-300')}>{strings.generic.cancel}</Text>
          </TouchableHighlight>

          <TouchableHighlight
            underlayColor={getColor('blue-70')}
            style={[tailwind('bg-blue-60 rounded-md m-1 h-12 flex-grow items-center justify-center'), isLoading && tailwind('bg-blue-30')]}
            onPress={() => {
              shareFile(selectedFile)
              props.dispatch(layoutActions.closeShareModal());
            }}
            disabled={isLoading}>
            <Text style={tailwind('text-base font-bold text-white')}>{strings.modals.share_modal.share}</Text>
          </TouchableHighlight>

        </View>

      </View>
    </Modal>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(ShareFilesModal)