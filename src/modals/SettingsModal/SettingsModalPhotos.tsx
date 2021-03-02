import prettysize from 'prettysize';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text } from 'react-native';
import Modal from 'react-native-modalbox';
import { connect } from 'react-redux';
import Bold from '../../components/Bold';
import ProgressBar from '../../components/ProgressBar';
import Separator from '../../components/Separator';
import { deviceStorage } from '../../helpers';
import { getHeaders } from '../../helpers/headers';
import analytics, { getLyticsUuid } from '../../helpers/lytics';
import { layoutActions, userActions } from '../../redux/actions';
import { layoutActionTypes } from '../../redux/constants';
import SettingsItem from './SettingsItem';
import SettingsItemPhotos from './SettingsItemPhotos';

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

interface SettingsModalPhotosProps {
  authenticationState?: any
  layoutState?: any
  dispatch?: any,
  navigation?: any
}

function SettingsModalPhotos(props: SettingsModalPhotosProps) {

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

  return <Modal
    isOpen={props.layoutState.showSettingsModal}
    position={'bottom'}
    style={styles.modalSettings}
    onClosed={() => {
      props.dispatch(layoutActions.closeSettings())
    }}
    backButtonClose={true}
    animationDuration={200}
    swipeToClose={true}
    swipeArea={60}
  >
    <Text
      style={styles.nameText}
    >
      {props.authenticationState.user.name}{' '}
      {props.authenticationState.user.lastname}
    </Text>

    <ProgressBar
      styleBar={{}}
      styleProgress={styles.progressHeight}
      totalValue={usageValues.limit}
      usedValue={usageValues.usage}
    />

    {isLoadingUsage ? <ActivityIndicator color={'#00f'} /> : <Text
      style={{
        fontFamily: 'Averta-Regular',
        fontSize: 15,
        paddingLeft: 24,
        paddingBottom: 0,
        color: '#8a8a8e'
      }}
    >
      <Text>Used</Text>
      <Text >
        {' '}
        {prettysize(usageValues.usage)}{' '}
      </Text>
      <Text>of</Text>
      <Text >
        {' '}
        {prettysize(usageValues.limit)}{' '}
      </Text>
    </Text>
    }

    <SettingsItemPhotos
      text="Upgrade"
      isUpgrade={true}
      onPress={() => {
        props.dispatch(layoutActions.closeSettings())
        props.navigation.replace('Storage')
      }}
    />

    <Separator />

    <SettingsItemPhotos
      text="Settings"
      isUpgrade={false}
      onPress={() => {
      }}
    />

    <SettingsItemPhotos
      text="Contact us"
      isUpgrade={false}
      onPress={() => {
        const emailUrl = 'mailto:support@internxt.zohodesk.eu'

        Linking.canOpenURL(emailUrl).then(() => {
          Linking.openURL(emailUrl)
        }).catch(() => {
          Alert.alert('Info', 'Send us an email to: support@internxt.zohodesk.')
        })
      }}
    />

    <Separator />

    <SettingsItemPhotos
      text="Sign out"
      isUpgrade={false}
      onPress={() => {
        props.dispatch(layoutActions.closeSettings())
        props.dispatch(userActions.signout())
      }}
    />
  </Modal>
}

const styles = StyleSheet.create({
  modalSettings: {
    top: '40%',
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 25,
    borderRadius: 8
  },
  nameText: {
    fontSize: 20,
    marginLeft: 26,
    marginTop: 10,
    fontFamily: 'Averta-Bold',
    color: 'black'
  },
  progressHeight: {
    height: 6
  }
})

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(SettingsModalPhotos);