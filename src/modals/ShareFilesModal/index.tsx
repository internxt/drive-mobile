import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share, Platform } from 'react-native';
import { TextInput, TouchableOpacity, TouchableWithoutFeedback } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import Separator from '../../components/Separator';
import { layoutActions } from '../../redux/actions';
import { getHeaders } from '../../helpers/headers';
import { Reducers } from '../../redux/reducers/reducers';
import { IFile, IFolder } from '../../components/FileList';

interface ShareFilesModalProps extends Reducers {
  dispatch?: any,
}

function ShareFilesModal(props: ShareFilesModalProps) {
  const [isOpen, setIsOpen] = useState(props.layoutState.showShareModal)
  const [selectedFile, setSelectedFile] = useState<IFile & IFolder>()
  const [filename, setFileName] = useState('')
  const [link, setLink] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [inputValue, setInputValue] = useState('1')
  const xToken = props.authenticationState.token
  const mnemonic = props.authenticationState.user.mnemonic;

  const handleInputChange = (e: string) => {
    setInputValue(e.replace(/[^0-9]/g, ''))
  }

  useEffect(() => {
    setIsOpen(props.layoutState.showShareModal === true)

    if (props.layoutState.showShareModal && props.filesState.selectedFile) {
      setSelectedFile(props.filesState.selectedFile)
      setFileName(props.filesState.selectedFile.name)
      getLink(props.filesState.selectedFile, parseInt(inputValue))
    }
  }, [props.layoutState.showShareModal])

  useEffect(() => {
    setIsLoading(true)
    const delay = setTimeout(() => {
      getLink(selectedFile, parseInt(inputValue)).finally(() => setIsLoading(false))
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
      message: `Hello, \nHow are things going? I’m using Internxt Drive, a secure, simple, private and eco-friendly cloud storage service https://internxt.com/drive \nI wanted to share a file (${file.name}) with you through this private link (${inputValue} total uses) -no sign up required: ${link}`
    });
  };

  const getFileToken = async (file: IFile, views: number) => {
    const fileId = file.fileId;

    return fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/share/file/${fileId}`, {
      method: 'POST',
      headers: getHeaders(xToken, mnemonic),
      body: JSON.stringify({ 'isFolder': false, 'views': views })
    }).then(res => {
      if (res.status !== 200) {
        throw Error('Cannot download file')
      }
      return res.json()
    }).then(data => data.token);
  };

  return (
    <Modal
      isOpen={isOpen}
      swipeArea={2}
      onClosed={() => {
        setInputValue('1')
        props.dispatch(layoutActions.closeShareModal())
        setIsOpen(false)
      }}
      position='bottom'
      style={styles.modalContainer}>
      <Text style={styles.title}>{filename}</Text>

      <Separator />

      <View>
        <Text style={styles.subtitle}>Share your Drive file with this private link</Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.subtitle, styles.short]}>or enter the number of times you would like the link to be valid: </Text>
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
          <TouchableWithoutFeedback onPress={() => {
            // TODO: Handle clipboard, @react-native-community/clipboard
            // WARNING: Cannot be implemented until next release
          }}>
            <Text style={styles.link}>
              {!isLoading ? link : 'Loading link...'}
            </Text>
          </TouchableWithoutFeedback>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button}
            onPress={() => { shareFile(selectedFile) }}
            disabled={isLoading}>
            <Text style={!isLoading ? styles.buttonText : styles.buttonTextLoading}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    height: 'auto',
    paddingTop: 20
  },
  title: {
    fontSize: 18,
    color: 'black',
    fontFamily: 'CircularStd-Bold',
    marginHorizontal: wp('6')
  },
  subtitle: {
    fontSize: 16,
    letterSpacing: 0.5,
    lineHeight: 25,
    color: '#737880',
    marginLeft: wp('6')
  },
  short: {
    width: '70%'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end'
  },
  input: {
    width: '17%',
    height: 37,
    backgroundColor: '#f2f2f2',
    fontSize: 12,
    color: '#737880',
    paddingLeft: 10
  },
  shareContainer: {
    flexDirection: 'row',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    height: Platform.OS === 'ios' ? wp('19') : wp('15')
  },
  linkContainer: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  link: {
    fontSize: 14,
    marginHorizontal: wp('2'),
    color: '#737880'
  },
  buttonContainer: {
    flex: 0.2,
    borderLeftWidth: 1,
    height: '100%',
    justifyContent: 'center',
    borderColor: 'rgba(151, 151, 151, 0.2)',
    padding: 20
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 18,
    color: '#4585f5',
    fontFamily: 'CerebriSans-Bold'
  },
  buttonTextLoading: {
    fontSize: 18,
    color: 'rgba(69, 133, 245, 0.7)',
    fontFamily: 'CircularStd-Bold'
  }
})

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(ShareFilesModal)