import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Linking, ActivityIndicator, Alert, Platform } from 'react-native';
import Modal from 'react-native-modalbox'
import ProgressBar from '../../components/ProgressBar';
import { layoutActions, photoActions, userActions } from '../../redux/actions';
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
import strings from '../../../assets/lang/strings';

function identifyPlanName(bytes: number): string {
  return bytes === 0 ? 'Free 10GB' : prettysize(bytes)
}

async function loadUsage(): Promise<number> {
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/usage`, {
    method: 'get',
    headers: await getHeaders()
  }).then(res => {
    if (res.status !== 200) { throw Error('Cannot load usage') }
    return res
  }).then(res => res.json()).then(res => { return res.total; })
}

async function loadLimit(): Promise<number> {
  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/limit`, {
    method: 'get',
    headers: await getHeaders()
  }).then(res => {
    if (res.status !== 200) { throw Error('Cannot load limit') }
    return res
  }).then(res => res.json()).then(res => { return res.maxSpaceBytes })
}

export async function loadValues(): Promise<{ usage: number, limit: number }> {
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

  return fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/initialize`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({
      email: email,
      mnemonic: mnemonic
    })
  }).then(res => {
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

  return fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/user`, {
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
  user: any
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
      }).catch(() => { })
        .finally(() => {
          setIsLoadingUpdate(false)
        })
    }
  }, [props.layoutState.showSettingsModal])

  const putLimitUsage = () => {
    if (usageValues.limit > 0) {
      if (usageValues.limit < 108851651149824) {
        return prettysize(usageValues.limit);
      } else if (usageValues.limit >= 108851651149824) {
        return '\u221E';
      } else {
        return '...';
      }
    }
  }

  // Check current screen to change settings Photos/Drive text
  useEffect(() => {
    if (props.navigation.state.routeName === 'PhotoGallery' || props.navigation.state.routeName === 'FileExplorer') {
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
        {props.user.name}{' '}
        {props.user.lastname}
      </Text>

      <ProgressBar
        styleProgress={styles.progressHeight}
        totalValue={usageValues.limit}
        usedValue={usageValues.usage}
      />

      {isLoadingUsage ?
        <ActivityIndicator color={'#00f'} />
        :
        <Text style={styles.usageText}>
          <Text>{strings.screens.storage.space.used.used} </Text>
          <Bold>{prettysize(usageValues.usage)}</Bold>
          <Text> {strings.screens.storage.space.used.of} </Text>
          <Bold>{putLimitUsage()}</Bold>
        </Text>
      }

      <Separator />

      {/* {<SettingsItem
        text={strings.components.app_menu.settings.storage}
        onPress={() => {
          props.dispatch(layoutActions.closeSettings())
          props.navigation.replace('Storage')
        }}
      />} */}

      <SettingsItem
        text={strings.components.app_menu.settings.more}
        onPress={() => Linking.openURL('https://internxt.com/drive')}
      />

      <SettingsItem
        text={props.layoutState.currentApp === 'PhotoGallery' ? strings.components.app_menu.settings.drive : strings.components.app_menu.settings.photos}
        onPress={async () => {

          props.dispatch(layoutActions.closeSettings())

          if (props.layoutState.currentApp === 'PhotoGallery') {
            props.navigation.replace('FileExplorer')
          } else {
            props.navigation.replace('PhotoGallery')
          }
        }}
      />

      <SettingsItem
        text={strings.components.app_menu.settings.contact}
        onPress={() => {
          const emailUrl = 'mailto:idajggytsuz7jivosite@jivo-mail.com'

          Linking.canOpenURL(emailUrl).then(() => {
            Linking.openURL(emailUrl)
          }).catch(() => {
            Alert.alert('Info', 'Send us an email to: idajggytsuz7jivosite@jivo-mail.com.')
          })
        }}
      />

      <SettingsItem
        text={strings.components.app_menu.settings.sign}
        onPress={() => {
          props.dispatch(layoutActions.closeSettings())
          props.dispatch(userActions.signout())
          props.dispatch(photoActions.clearPhotosToRender());
        }}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  drawerKnob: {
    alignSelf: 'center',
    backgroundColor: '#d8d8d8',
    borderRadius: 4,
    height: 7,
    marginTop: 10,
    width: 56
  },
  modalSettings: {
    height: 'auto',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0
  },
  nameText: {
    fontFamily: 'CerebriSans-Bold',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 26,
    marginTop: 10
  },
  progressHeight: {
    height: 6
  },
  usageText: {
    fontFamily: 'CerebriSans-Regular',
    fontSize: 15,
    paddingBottom: 0,
    paddingLeft: 24
  }
})

const mapStateToProps = (state: any) => {
  return {
    user: state.authenticationState.user,
    layoutState: state.layoutState
  };
};

export default connect(mapStateToProps)(SettingsModal);
