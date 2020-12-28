import React, { useEffect } from 'react'
import { View, Alert, } from 'react-native'
import { useState } from "react";
import { deviceStorage } from '../../helpers';
import { checkDeviceForHardware, checkForBiometric, checkDeviceStorageShowConf, checkDeviceStorageBiometric, scanBiometrics } from './BiometricUtils'
import { connect } from 'react-redux';

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
          checkDeviceStorageShowConf().then((NotShowConf) => {
            checkDeviceStorageBiometric().then((xBiometric) => {
              if (biometricSave === false && NotShowConf === false && xBiometric === false) {
                props.navigation.replace('FileExplorer', {
                  folderId: rootFolderId
                })
              } else if (biometricSave === true && NotShowConf === false && xBiometric === false) {
                setshowConf(true)
                return Alert.alert(
                  "Biometric lock",
                  "Would you like to activate biometric lock on your device?",
                  [
                    {
                      text: "No",
                      onPress: () => {
                        setshowConf(false)
                        deviceStorage.saveItem('xNotShowConfBiometric', 'true')
                        props.navigation.replace('FileExplorer', {
                          folderId: rootFolderId
                        })
                      },
                      style: "cancel"
                    },
                    {
                      text: "Yes", onPress: () => {
                        setshowConf(false)
                        deviceStorage.saveItem('xBiometric', 'true')
                        scan()
                      }
                    }
                  ],
                  { cancelable: false }
                );
              } else if (biometricSave === true && NotShowConf === true) {
                setshowConf(false)
                props.navigation.replace('FileExplorer', {
                  folderId: rootFolderId
                })
              } else if (biometricSave === true && xBiometric === true) {
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
    scanBiometrics().then(() => {
      props.navigation.replace('FileExplorer', {
        folderId: rootFolderId
      })
    })
  }

  return (
    <View>

     
    </View>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Biometric)
