import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Linking, ActivityIndicator, Alert, Platform } from 'react-native';
import Modal from 'react-native-modalbox'
import ProgressBar from '../../components/ProgressBar';
import { layoutActions, userActions } from '../../redux/actions';
import SettingsItem from './SettingsItem';
import prettysize from 'prettysize'
import Separator from '../../components/Separator';
import { connect } from 'react-redux';
import { getHeaders } from '../../helpers/headers';
import { deviceStorage } from '../../helpers';
import analytics, { getLyticsUuid } from '../../helpers/lytics';
import Bold from '../../components/Bold';
import { AuthenticationState } from '../../redux/reducers/authentication.reducer';
import { Dispatch } from 'redux';
import { LayoutState } from '../../redux/reducers/layout.reducer';

function identifyPlanName(bytes: number): string {
  return bytes === 0 ? 'Free 2GB' : prettysize(bytes)
}

async function loadUsage(): Promise<number> {
  const xToken = await deviceStorage.getItem('xToken') || undefined

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/usage`, {
    method: 'get',
    headers: getHeaders(xToken)
  }).then(res => {
    if (res.status !== 200) { throw Error('Cannot load usage') }
    return res
  }).then(res => res.json()).then(res => res.total)
}

async function loadLimit(): Promise<number> {
  const xToken = await deviceStorage.getItem('xToken') || undefined

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/limit`, {
    method: 'get',
    headers: getHeaders(xToken)
  }).then(res => {
    if (res.status !== 200) { throw Error('Cannot load limit') }
    return res
  }).then(res => res.json()).then(res => res.maxSpaceBytes)
}

export async function loadValues(): Promise<{ usage: number, limit: number}> {
  const limit = await loadLimit()
  const usage = await loadUsage()

  const uuid = await getLyticsUuid()

  analytics.identify(uuid, {
    platform: 'mobile',
    storage: usage,
    plan: identifyPlanName(limit),
    userId: uuid
  }).catch(() => { })

  return { usage, limit }
}

async function initializePhotosUser(token: string, mnemonic: string): Promise<any> {
  const xUser = await deviceStorage.getItem('xUser')
  const xUserJson = JSON.parse(xUser || '{}')
  const email = xUserJson.email

  //console.log('body =>', email, mnemonic)
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/initialize`, {
    method: 'POST',
    headers: getHeaders(token, mnemonic),
    body: JSON.stringify({
      email: email,
      mnemonic: mnemonic
    })
  }).then(res => {
    //console.log('res', res)
    return res.json()
  })
}

async function photosUserData(authenticationState: AuthenticationState): Promise<any> {
  const token = authenticationState.token;
  const mnemonic = authenticationState.user.mnemonic;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'internxt-mnemonic': mnemonic,
    'Content-Type': 'application/json; charset=utf-8'
  };

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/user`, {
    method: 'GET',
    headers
  }).then(res => {
    if (res.status === 400) {
      return initializePhotosUser(token, mnemonic)
    }
    return res.json()
  }).then(res => {
    return res
  })
}

interface SettingsModalProps {
  authenticationState: AuthenticationState
  layoutState: LayoutState
  dispatch: Dispatch,
  navigation: any
}

function SettingsModal(props: SettingsModalProps) {

  const [usageValues, setUsageValues] = useState({ usage: 0, limit: 0 })
  const [isLoadingUsage, setIsLoadingUpdate] = useState(false)

  useEffect(() => {
    if (props.layoutState.showSettingsModal) {
      setIsLoadingUpdate(true)
      loadValues().then(values => {
        setUsageValues(values)
      }).catch(() => {

      }).finally(() => {
        setIsLoadingUpdate(false)
      })
    }
  }, [props.layoutState.showSettingsModal])

  // Check current screen to change settings Photos/Drive text
  useEffect(() => {
    if (props.navigation.state.routeName === 'Home' || props.navigation.state.routeName === 'FileExplorer') {
      props.dispatch(layoutActions.setCurrentApp(props.navigation.state.routeName))
    }
  }, [props.navigation.state])

  return (
    <Modal
      isOpen={props.layoutState.showSettingsModal}
      position={'bottom'}
      swipeArea={20}
      style={styles.modalSettings}
      onClosed={() => {
        props.dispatch(layoutActions.closeSettings())
      }}
      backButtonClose={true}
      animationDuration={200}>

      <View style={styles.drawerKnob}></View>

      <Text style={styles.nameText}>
        {props.authenticationState.user.name}{' '}
        {props.authenticationState.user.lastname}
      </Text>

      <ProgressBar
        styleBar={{}}
        styleProgress={styles.progressHeight}
        totalValue={usageValues.limit}
        usedValue={usageValues.usage}
      />

      {isLoadingUsage ?
        <ActivityIndicator color={'#00f'} />
        :
        <Text style={styles.usageText}>
          <Text>Used </Text>
          <Bold>{prettysize(usageValues.usage)}</Bold>
          <Text> of </Text>
          <Bold>{prettysize(usageValues.limit)}</Bold>
        </Text>
      }

      <Separator />

      <SettingsItem
        text="More info"
        onPress={() => Linking.openURL('https://internxt.com/drive')}
      />

      <SettingsItem
        text={props.layoutState.currentApp === 'Home' ? 'Drive' : 'Photos'}
        onPress={() => {
          props.dispatch(layoutActions.closeSettings())

          if (props.layoutState.currentApp === 'Home') {
            props.navigation.replace('FileExplorer')
          } else {
            photosUserData(props.authenticationState).then(res => {
              //console.log('res =>', res)
            }).catch(err => {
              //console.log('err =>', err)
            })
            props.navigation.replace('Home')
          }
        }}
      />

      <SettingsItem
        text="Storage"
        onPress={() => {
          props.dispatch(layoutActions.closeSettings())
          props.navigation.replace('Storage')
        }}
      />

      <SettingsItem
        text="Contact"
        onPress={() => {
          const emailUrl = 'mailto:support@internxt.zohodesk.eu'

          Linking.canOpenURL(emailUrl).then(() => {
            Linking.openURL(emailUrl)
          }).catch(() => {
            Alert.alert('Info', 'Send us an email to: support@internxt.zohodesk.')
          })
        }}
      />

      <SettingsItem
        text="Sign out"
        onPress={() => {
          props.dispatch(layoutActions.closeSettings())
          props.dispatch(userActions.signout())
        }}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  drawerKnob: {
    backgroundColor: '#d8d8d8',
    width: 56,
    height: 7,
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: 10
  },
  modalSettings: {
    height: 'auto',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 26,
    marginTop: 10,
    fontFamily: 'CerebriSans-Bold'
  },
  progressHeight: {
    height: 6
  },
  usageText: {
    fontFamily: 'CerebriSans-Regular',
    fontSize: 15,
    paddingLeft: 24,
    paddingBottom: 0
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(SettingsModal);
