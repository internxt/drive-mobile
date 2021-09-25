/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import { View, Text, Share, TouchableOpacity, TouchableWithoutFeedback, TouchableHighlight } from 'react-native';
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
      position={'center'}
      swipeArea={20}
      style={tailwind('w-11/12 h-3/6 rounded-xl')}
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
        <View
          style={tailwind('flex-row bg-white p-3 rounded-t-xl items-center justify-between')}>

          <View style={tailwind('p-1')}>
            <FileIcon width={30} height={30} />
          </View>

          <View style={tailwind('flex-shrink')}>
            <Text numberOfLines={1}>{filename}{selectedFile && selectedFile.type ? '.' + selectedFile.type : ''}</Text>
          </View>

          <View>
            <TouchableWithoutFeedback onPress={() => {
              props.dispatch(layoutActions.closeShareModal())
            }}>
              <View style={tailwind('bg-neutral-20 rounded-full p-1')}>
                <Unicons.UilTimes color={'#B3BAC5'} size={25} />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </View>
        <View style={tailwind('bg-neutral-10 p-3 flex-grow justify-between rounded-b-xl')}>
          <Text style={tailwind('text-xl font-bold text-neutral-500 text-center')}>Share link open limit</Text>

          <View style={tailwind('flex-row items-stretch justify-center my-5')}>
            <TouchableHighlight
              underlayColor="#AAAAFF"
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
              underlayColor="#AAAAFF"
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
            shadowOpacity: 0.25,
            shadowRadius: 3,
            shadowOffset: {
              height: 3,
              width: 3
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
                  }
                }}
                style={tailwind('flex-row items-center')}
              >
                <Text style={tailwind('text-xl text-blue-60 font-bold mx-3')}>Copy share link</Text>
                <Unicons.UilCopy color={getColor('blue-60')} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={tailwind('flex-row justify-between')}>

            <TouchableOpacity
              style={tailwind('bg-neutral-20 rounded-md m-1 h-12 flex-grow items-center justify-center')}
              onPress={() => {
                props.dispatch(layoutActions.closeShareModal());
              }}
              disabled={isLoading}>
              <Text style={tailwind('text-base font-bold text-neutral-300')}>{strings.generic.cancel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tailwind('bg-blue-60 rounded-md m-1 h-12 flex-grow items-center justify-center')}
              onPress={() => { shareFile(selectedFile) }}
              disabled={isLoading}>
              <Text style={tailwind('text-base font-bold text-white')}>{strings.modals.share_modal.share}</Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </Modal>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(ShareFilesModal)