import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native'
import { useState } from "react";
import { connect } from 'react-redux';
import * as LocalAuthentication from 'expo-local-authentication';
import { deviceStorage } from '../../helpers';
import { checkDeviceForHardware, checkForBiometric,checkDeviceStorageShowConf, checkDeviceStorageBiometric,scanBiometrics } from './BiometricUtils'
import { ConfirmDialog } from 'react-native-simple-dialogs';


interface BiometricProps {
  goToForm?: (screenName: string) => void
  authenticationState?: any
  dispatch?: any
  navigation?: any
}
async function showBiometrics() {
  const checkHardware = await checkDeviceForHardware();
  const checkBiometrics = await checkForBiometric();
  const xBiometricStorage = await checkDeviceStorageBiometric();

  return checkBiometrics && checkHardware && xBiometricStorage
}


function Biometric(props: any) {
  const [compatible, setIsCompatible] = useState(false)
  const [biometric, setIsBiometric] = useState(false)
  const [result, setIsResult] = useState('')
  const rootFolderId = props.authenticationState.user.root_folder_id;
  const [confVisible, setconfVisible] = useState(true);
  const [showConf, setshowConf] = useState(true)

  useEffect(() => {
    console.log('USE EFFECT')
    checkForBiometric().then((res) => checkForBiometric()).then((res1) => {
      console.log(res1)
      if(res1===false){
        props.navigation.replace('FileExplorer', {
          folderId: rootFolderId
        })
      }
    })
  }, [])

  useEffect(() => {
    console.log('USEEFFCT 2')
    checkDeviceStorageBiometric().then((resu)=>{
      if(resu === true){
        scan()
        setshowConf(false)
      }
    })

    
  }, [showConf])

  useEffect(() => {
    console.log('USE EFFECT 3')
   checkDeviceStorageShowConf().then((resm)=>{
     if(resm===true){
       setshowConf(false)
       props.navigation.replace('FileExplorer', {
        folderId: rootFolderId
      })
     }
   })
    
  }, [showConf])



  const scan = () => {
    scanBiometrics().then((res2) => {
      props.navigation.replace('FileExplorer', {
        folderId: rootFolderId
      })
    })
  }

  

  return (
    <View>

      {
        showConf ? 
        <ConfirmDialog
          title="Confirm Dialog"
          message="Are you sure about that?"
          visible={confVisible}
          positiveButton={{
            title: "YES",
            onPress: () => {
              setconfVisible(false)
              setshowConf(false)
              deviceStorage.saveItem('xBiometric', 'true')
              scan()
            }
          }}
          negativeButton={{
            title: "NO",
            onPress: () => {
              setconfVisible(false)
              setshowConf(false)
              deviceStorage.saveItem('xNotShowConfBiometric', 'true')
              props.navigation.replace('FileExplorer', {
                folderId: rootFolderId
              })
            }
          }}
      />
    : <></>
    
    }

    </View>


  );
}
const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Biometric)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ecf0f1',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 150,
    height: 60,
    backgroundColor: '#056ecf',
    borderRadius: 5,
  },
  buttonText: {
    fontSize: 30,
    color: '#fff',
  },
});






