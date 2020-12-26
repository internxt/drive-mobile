import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native'
import { useState } from "react";
import { connect } from 'react-redux';
import * as LocalAuthentication from 'expo-local-authentication';
import { deviceStorage } from '../../helpers';
import { checkDeviceForHardware, checkForBiometric, checkDeviceStorageShowConf, checkDeviceStorageBiometric, scanBiometrics } from './BiometricUtils'
import { ConfirmDialog } from 'react-native-simple-dialogs';


interface BiometricProps {
  goToForm?: (screenName: string) => void
  authenticationState?: any
  dispatch?: any
  navigation?: any
}

function Biometric(props: any) {
  const rootFolderId = props.authenticationState.user.root_folder_id;
  const [showConf, setshowConf] = useState(false)

  const showConfig = () => {
    checkDeviceForHardware().then((isCompatible) => {
      if (isCompatible === false) {
        props.navigation.replace('FileExplorer', {
          folderId: rootFolderId
        })
      } else if (isCompatible === true) {
        checkForBiometric().then((biometricSave) => {
          checkDeviceStorageShowConf().then((NotShowConf)=>{
            checkDeviceStorageBiometric().then((xBiometric)=>{
              if(biometricSave === false && NotShowConf === false && xBiometric ===false){
                props.navigation.replace('FileExplorer', {
                  folderId: rootFolderId
                })
              } else if(biometricSave===true && NotShowConf === false && xBiometric === false){
                setshowConf(true)
              }else if(biometricSave === true && NotShowConf === true){
                setshowConf(false)
                props.navigation.replace('FileExplorer', {
                  folderId: rootFolderId
                })
              }else if(biometricSave === true && xBiometric ===true){
                setshowConf(false)
                scan()
              }
            })
          })  
        })
      }
    })
  }

  useEffect(() => {
    showConfig();
  }, [])


  const scan = () => {
    scanBiometrics().then((res2) => {
      props.navigation.replace('FileExplorer', {
        folderId: rootFolderId
      })
    })
  }



  return (
    <View>
      <ConfirmDialog
        title="Confirm Dialog"
        message="Are you sure about that?"
        visible={showConf}
        positiveButton={{
          title: "YES",
          onPress: () => {
            setshowConf(false)
            deviceStorage.saveItem('xBiometric', 'true')
            scan()
          }
        }}
        negativeButton={{
          title: "NO",
          onPress: () => {
            setshowConf(false)
            deviceStorage.saveItem('xNotShowConfBiometric', 'true')
            props.navigation.replace('FileExplorer', {
              folderId: rootFolderId
            })
          }
        }}
      />
    </View>
  );
}
const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Biometric)








