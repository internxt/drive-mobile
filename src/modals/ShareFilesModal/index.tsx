import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Share, Alert } from 'react-native';
import { TextInput, TouchableOpacity } from 'react-native-gesture-handler';
import Modal from 'react-native-modalbox';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';
import Separator from '../../components/Separator';
import { layoutActions } from '../../redux/actions';
import { getHeaders } from '../../helpers/headers';
export interface ShareFilesModalProps {
    dispatch?: any,
    filesState?: any,
    fileActions?: any,
    layoutState?: any,
    authenticationState?: any
}

function ShareFilesModal(props: ShareFilesModalProps) {
    const [ isOpen, setIsOpen ] = useState(props.layoutState.showShareModal)
    const [ selectedfile, setSelectedFile ] = useState()
    const [ filename, setFileName ] = useState('')
    const [ link, setLink ] = useState('')
    const [ isloading, setIsLoading ] = useState(true)
    const [ inputvalue, setInputValue ] = useState('1')

    const handleInputChange = (e: string) => {
        setInputValue(e.replace(/[^0-9]/g, ''))
    }

    useEffect(() => {
        props.layoutState.showShareModal === true ? setIsOpen(true) : null
        
        if ( props.layoutState.showShareModal === true && props.filesState.selectedFile ) {
            setSelectedFile(props.filesState.selectedFile)
            setFileName(props.filesState.selectedFile.name)
            getLink(selectedfile, parseInt(inputvalue))
        }
    }, [props.layoutState.showShareModal])

    useEffect(() => {
        setIsLoading(true)
        const delaySearch = setTimeout(() => {
            getLink(selectedfile, parseInt(inputvalue)).finally(() => setIsLoading(false))
        }, 1000);
7
        return () => { clearTimeout(delaySearch); }
    }, [inputvalue])

    const getLink = async (file: any, views: number) => {
        const tokenLink = await getFileToken(file, views);
        const url = `https://drive.internxt.com/${tokenLink}`;
        setLink(url)
    }

    const shareFile = async (file: any) => {
        // Share link on native share system
        await Share.share({
            title: 'Internxt Drive file sharing',
            message: `Hello, \nHow are things going? I’m using Internxt Drive, a secure, simple, private and eco-friendly cloud storage service https://internxt.com/drive \nI wanted to share a file (${file.name}) with you through this single-use private link -no sign up required: ${link}`
        });
    };

    const getFileToken = async (file: any, views: number) => {
        try {
            const fileId = file ? file.fileId : props.filesState.selectedFile.fileId;

            // Generate token
            const res = await fetch(`${(process && process.env && process.env.REACT_APP_API_URL) || 'https://drive.internxt.com'}/api/storage/share/file/${fileId}`,
            {
                method: 'POST',
                headers: getHeaders(
                    props.authenticationState.token,
                    props.authenticationState.user.mnemonic
                ),
                body: JSON.stringify({
                    'isFolder': 'false',
                    'views': inputvalue === '' || inputvalue === '0' || inputvalue === null ? 1 : inputvalue
                })
            }
            );
            const data = await res.json();
            if (res.status != 200) {
                const errMsg = data.error ? data.error : 'Cannot download file';
                Alert.alert('Error', errMsg);
            } else {
                return data.token;
            }
        } catch (error) {
        }
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
            style={styles.modal_container}
        >
            <Text style={styles.title}>
                {filename}
            </Text>

            <Separator />

            <View>
                <Text style={styles.subtitle}>Share your Drive file with this private link</Text>

                <View style={styles.input_container}>
                    <Text style={[styles.subtitle, {width: '70%'}]}>or enter the number of times you would like the link to be valid: </Text>
                    <TextInput
                        style={styles.input}
                        keyboardType='numeric'
                        placeholder='1'
                        onChangeText={e => handleInputChange(e)}
                        value={inputvalue}
                        maxLength={6}
                    />
                </View>
            </View>

            <View style={styles.share_container}>
                <Text style={styles.link}>
                    {!isloading ? link : 'Loading link...'}
                </Text>
                
                <View style={styles.button_container}>
                    <TouchableOpacity style={styles.button}
                        onPress={() => {
                            shareFile(selectedfile)    
                        }}
                        disabled={isloading}
                    >
                        <Text style={!isloading ? styles.button_text : styles.button_text_loading}>Share</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modal_container: {
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

    input_container: {
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
    
    share_container: {
        flexDirection: 'row',
        borderColor: 'rgba(151, 151, 151, 0.2)',
        alignItems: 'center',
        marginTop: 12,
        borderWidth: 1
    },

    link: {
        flex: 0.8,
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: 14,
        marginHorizontal: wp('2'),
        color: '#737880',
        height: 45
    }, 

    button_container: {
        flex: 0.2,
        borderLeftWidth: 1,
        borderColor: 'rgba(151, 151, 151, 0.2)',
        padding: 20
    },
    
    button: {
        justifyContent: 'center',
        alignItems: 'center'
    },

    button_text: {
        fontSize: 18, 
        color: '#4585f5',     
        fontFamily: 'CerebriSans-Bold'
    },

    button_text_loading: {
        fontSize: 18, 
        color: 'rgba(69, 133, 245, 0.7)',     
        fontFamily: 'CircularStd-Bold'
    }
})

const mapStateToProps = (state: any) => {
    return { ...state }
};

export default connect(mapStateToProps)(ShareFilesModal)