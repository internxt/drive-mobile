import React, { useState, useEffect } from 'react';
import { Alert, Text, TouchableHighlight, View } from 'react-native';
import { connect } from 'react-redux';
import { tailwind } from '../../helpers/designSystem';
import { Reducers } from '../../redux/reducers/reducers';
import PackageJson from '../../../package.json'
import * as Updates from 'expo-updates'

function VersionUpdate(props: Reducers): JSX.Element {
  const [debugText, setDebugText] = useState('');
  const [checkingUpdates, setCheckingUpdates] = useState(true);
  const [newVersionAvailable, setNewVersionAvailable] = useState(false)
  const [newVersionDownloaded, setNewVersionDownloaded] = useState(false);

  const isAlberto = false;

  useEffect(() => {
    if (!isAlberto) {
      setTimeout(() => {
        setCheckingUpdates(false);
      }, 1000)
      return;
    }
    Updates.checkForUpdateAsync().then((updateResult) => {
      setNewVersionAvailable(updateResult.isAvailable);
    }).catch(() => {
      // Won't show any error.
    }).finally(() => {
      setCheckingUpdates(false);
    })

    Updates.addListener((updateInfo) => {
      setDebugText(JSON.stringify(updateInfo))
    })

  }, [])

  return <>
    {
      isAlberto &&
      <View style={tailwind('border')}>
        <Text>DEBUG: {debugText}</Text>
        <Text>Is emergency launch: {Updates.isEmergencyLaunch}</Text>
        <Text>{debugText}</Text>
        {
          newVersionAvailable && !newVersionDownloaded && <TouchableHighlight
            style={tailwind('btn btn-primary')}
            onPress={() => {
              Updates.fetchUpdateAsync().then((x) => {

                if (x.isNew) {
                  setNewVersionDownloaded(true)
                } else {
                  Alert.alert('Downloaded version is not new')
                }

              }).catch(() => {
                Alert.alert('Error downloading update')
              })
            }}>
            <Text>Download update</Text>
          </TouchableHighlight>
        }
        {
          newVersionDownloaded && <TouchableHighlight
            style={tailwind('btn btn-primary')}
            onPress={() => {
              Updates.reloadAsync().catch(err => {
                Alert.alert('Cannot restart app, error: ' + err.message)
              })
            }}>
            <Text>Restart and apply update</Text>
          </TouchableHighlight>
        }
      </View>
    }
    <View>
      <Text style={tailwind('text-center text-base text-sm text-gray-50')}>
        Internxt Drive v{PackageJson.version} (11)
      </Text>
    </View>
  </>

}

const mapStateToProps = (state: any) => {
  return { ...state }
};

export default connect(mapStateToProps)(VersionUpdate);
