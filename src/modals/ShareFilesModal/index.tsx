import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share, TextInput, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import Separator from '../../components/Separator';
import { layoutActions } from '../../redux/actions';
import { getHeaders } from '../../helpers/headers';
import { IFile, IFolder } from '../../components/FileList';
import { Reducers } from '../../redux/reducers/reducers';
import strings from '../../../assets/lang/strings';
import { generateShareLink } from '../../@inxt-js/services/share';
import { deviceStorage, normalize } from '../../helpers';
import { generateFileKey, Network } from '../../lib/network';
import { setString } from 'expo-clipboard'

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
      position={'bottom'}
      swipeArea={20}
      style={styles.modalContainer}
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
      <View style={styles.drawerKnob}></View>

      <View
        style={styles.fileName}
      >
        <Text style={{ fontSize: 15, textAlign: 'center', marginBottom: 5, fontWeight: '600', color: '#737880' }}>{filename}{selectedFile && selectedFile.type ? '.' + selectedFile.type : ''}</Text>
      </View>

      <Separator />

      <View style={{ paddingBottom: 5 }}>
        <View style={styles.contentContainer}>
          <Text style={styles.contentIndex}></Text><Text style={styles.subtitle}>{strings.modals.share_modal.title}</Text>
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.contentIndex}>1.</Text>
          <View style={styles.grayBoxContainer}>
            <View style={styles.grayBox}>
              <Text style={styles.grayText}>{strings.modals.share_modal.title2}</Text>
            </View>
            <TextInput
              style={[styles.grayButton, styles.grayButtonText, { fontWeight: 'bold' }]}
              keyboardType='numeric'
              placeholder='1'
              onChangeText={handleInputChange}
              value={inputValue}
              maxLength={6}
            />
          </View>
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.contentIndex}></Text><Text style={styles.subtitle}>{strings.modals.share_modal.title3}</Text>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.contentIndex}>2.</Text>
          <View style={styles.grayBoxContainer}>
            <View style={styles.grayBox}>
              <Text numberOfLines={1} style={styles.grayText}>
                {!isLoading ? link : strings.modals.share_modal.loading }
              </Text>
            </View>
            <View style={styles.grayButton}>
              <TouchableWithoutFeedback style={styles.grayButton} disabled={isLoading} onPress={() => {
                if (!isLoading) {
                  setString(link);
                }
              }}><Text style={styles.grayButtonText}>{strings.modals.share_modal.copy}</Text>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </View>
      </View>
      <Separator />
      <View style={styles.bottomContainer}>
        <View style={styles.cancelButton}>
          <TouchableOpacity style={styles.button}
            onPress={() => {
              props.dispatch(layoutActions.closeShareModal());
            }}
            disabled={isLoading}>
            <Text style={styles.cancelText}>{strings.generic.cancel}</Text>
          </TouchableOpacity>
          <View style={{ flexGrow: 1 }}></View>
        </View>
        <View style={styles.shareButton}>
          <View style={{ flexGrow: 1 }}></View>
          <TouchableOpacity
            onPress={() => { shareFile(selectedFile) }}
            disabled={isLoading}>
            <Text style={!isLoading ? styles.shareText : styles.shareTextLoading}>{strings.modals.share_modal.share}</Text>
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
  modalContainer: {
    height: 'auto',
    borderTopRightRadius: 32,
    borderTopLeftRadius: 32
  },
  subtitle: {
    color: '#737880',
    fontSize: normalize(14),
    letterSpacing: 0.5,
    marginLeft: wp('4')
  },
  drawerKnob: {
    alignSelf: 'center',
    backgroundColor: '#0F62FE',
    borderRadius: 4,
    height: 4,
    margin: 12,
    width: 50
  },
  fileName: {
    width: wp(92),
    alignSelf: 'center',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 20,
    padding: 0 // remove default padding on Android
  },
  grayBox: {
    backgroundColor: '#F4F5F7',
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
    padding: 10,
    width: normalize(200)
  },
  grayButton: {
    backgroundColor: '#EBECF0',
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    width: normalize(50),
    textAlign: 'center',
    height: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  contentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 5
  },
  contentIndex: {
    color: '#0F62FE',
    fontSize: normalize(16),
    paddingRight: 15
  },
  grayText: {
    color: '#737880',
    fontSize: normalize(14),
    letterSpacing: 0.5,
    flexGrow: 1
  },
  grayButtonText: {
    color: '#0F62FE'
  },
  grayBoxContainer: {
    flexDirection: 'row'
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexGrow: 1,
    marginBottom: 16,
    paddingVertical: 10
  },
  cancelButton: {
    flexGrow: 1,
    flexDirection: 'row'
  },
  shareButton: {
    flexGrow: 1,
    flexDirection: 'row'
  },
  cancelText: {
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    flexGrow: 1,
    color: '#DA1E28',
    fontSize: normalize(16),
    fontFamily: 'NeueEinstellung-Regular'
  },
  shareText: {
    alignSelf: 'flex-end',
    marginHorizontal: 20,
    color: '#0F62FE',
    fontSize: normalize(16),
    fontFamily: 'NeueEinstellung-Regular'
  },
  shareTextLoading: {
    color: 'rgba(69, 133, 245, 0.7)',
    fontFamily: 'NeueEinstellung-Regular',
    alignSelf: 'flex-end',
    marginHorizontal: 20,
    fontSize: normalize(16)
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(ShareFilesModal)