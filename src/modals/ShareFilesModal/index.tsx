import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share, Platform, TextInput, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import Separator from '../../components/Separator';
import { layoutActions } from '../../redux/actions';
import { getHeaders } from '../../helpers/headers';
import { IFile, IFolder } from '../../components/FileList';
import { Reducers } from '../../redux/reducers/reducers';
import Clipboard from 'expo-clipboard'
import strings from '../../../assets/lang/strings';
import { generateShareLink } from '../../@inxt-js/services/share';
import { deviceStorage } from '../../helpers';
import { generateFileKey, Network } from '../../lib/network';

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

    if (props.layoutState.showShareModal && props.filesState.selectedFile) {
      setSelectedFile(props.filesState.selectedFile)
      setFileName(props.filesState.selectedFile.name)
      getLink(props.filesState.selectedFile, parseInt(inputValue)).then(() => setIsLoading(false))
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

  return (
    <Modal
      isOpen={isOpen}
      swipeArea={2}
      onClosed={() => {
        props.dispatch(layoutActions.closeShareModal())
        setLink('');
        setIsOpen(false)
        setIsLoading(true);
        setInputValue('10')
      }}
      position='bottom'
      style={styles.modalContainer}>
      <Text style={styles.title}>{filename}</Text>

      <Separator />

      <View>
        <Text style={styles.subtitle}>{strings.modals.share_modal.title}</Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.subtitle, styles.short]}>{strings.modals.share_modal.title2} </Text>
          <TextInput
            style={styles.input}
            keyboardType='numeric'
            placeholder='1'
            onChangeText={handleInputChange}
            value={inputValue}
            maxLength={6}
          />
        </View>
      </View>

      <View style={styles.shareContainer}>
        <View style={styles.linkContainer}>
          <TouchableWithoutFeedback disabled={isLoading} onPress={() => {
            if (!isLoading) {
              Clipboard.setString(link)
            }
          }}>
            <Text style={styles.link}>
              {!isLoading ? link : strings.modals.share_modal.loading}
            </Text>
          </TouchableWithoutFeedback>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button}
            onPress={() => { shareFile(selectedFile) }}
            disabled={isLoading}>
            <Text style={!isLoading ? styles.buttonText : styles.buttonTextLoading}>{strings.modals.share_modal.share}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonContainer: {
    borderColor: 'rgba(151, 151, 151, 0.2)',
    borderLeftWidth: 1,
    flex: 0.4,
    height: '100%',
    justifyContent: 'center'
  },
  buttonText: {
    color: '#4585f5',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 18
  },
  buttonTextLoading: {
    color: 'rgba(69, 133, 245, 0.7)',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 18
  },
  input: {
    backgroundColor: '#f2f2f2',
    color: '#737880',
    fontSize: 12,
    height: 37,
    paddingLeft: 10,
    width: '17%'
  },
  inputContainer: {
    alignItems: 'flex-end',
    flexDirection: 'row'
  },
  link: {
    color: '#737880',
    fontSize: 12,
    marginHorizontal: 4
  },
  linkContainer: {
    alignItems: 'center',
    flex: 0.8,
    justifyContent: 'center'
  },
  modalContainer: {
    height: 'auto',
    paddingTop: 20
  },
  shareContainer: {
    alignItems: 'center',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    borderWidth: 1,
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? wp('19') : wp('15'),
    marginTop: 12
  },
  short: {
    width: '70%'
  },
  subtitle: {
    color: '#737880',
    fontSize: 16,
    letterSpacing: 0.5,
    lineHeight: 25,
    marginLeft: wp('6')
  },
  title: {
    color: 'black',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 18,
    marginHorizontal: wp('6')
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(ShareFilesModal)