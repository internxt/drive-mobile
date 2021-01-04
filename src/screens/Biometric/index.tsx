import React, { useEffect } from 'react'
import { Alert } from 'react-native'
import { deviceStorage } from '../../helpers';
import { checkDeviceForHardware, checkForBiometric, checkDeviceStorageShowConf, checkDeviceStorageBiometric, scanBiometrics } from './BiometricUtils'
import { connect } from 'react-redux';
import { Reducers } from '../../redux/reducers/reducers';

interface BiometricProps extends Reducers {
  navigation?: any
}

function Biometric(props: BiometricProps): JSX.Element {
  const rootFolderId = props.authenticationState.user.root_folder_id;

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
                return Alert.alert(
                  'Biometric lock',
                  'Would you like to activate biometric lock on your device?',
                  [
                    {
                      text: 'No',
                      onPress: () => {
                        deviceStorage.saveItem('xNotShowConfBiometric', 'true')
                        props.navigation.replace('FileExplorer', {
                          folderId: rootFolderId
                        })
                      },
                      style: 'cancel'
                    },
                    {
                      text: 'Yes', onPress: () => {
                        deviceStorage.saveItem('xBiometric', 'true')
                        scan()
                      }
                    }
                  ],
                  { cancelable: false }
                );
              } else if (biometricSave === true && NotShowConf === true) {
                props.navigation.replace('FileExplorer', {
                  folderId: rootFolderId
                })
              } else if (biometricSave === true && xBiometric === true) {
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

  return <></>;
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Biometric)
