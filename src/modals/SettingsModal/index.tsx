import React from 'react'
import { View, Text, StyleSheet, Linking, Alert } from 'react-native';
import Modal from 'react-native-modalbox'
import { layoutActions, userActions } from '../../redux/actions';
import SettingsItem from './SettingsItem';
import prettysize from 'prettysize'
import Separator from '../../components/Separator';
import { connect } from 'react-redux';
import { getHeaders } from '../../helpers/headers';
import analytics, { getLyticsUuid } from '../../helpers/lytics';
import { Dispatch } from 'redux';
import strings from '../../../assets/lang/strings';
import { Reducers } from '../../redux/reducers/reducers';
import { tailwind } from '../../helpers/designSystem';

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
interface SettingsModalProps extends Reducers {
  user: any
  dispatch: Dispatch,
  navigation: any
}

function SettingsModal(props: SettingsModalProps) {

  return (
    <Modal
      isOpen={props.layoutState.showSettingsModal}
      position={'bottom'}
      entry={'bottom'}
      style={styles.modalSettings}
      onClosed={() => props.dispatch(layoutActions.closeSettings())}
      backButtonClose={true}
      swipeArea={50}
      animationDuration={200}
      coverScreen={true}>

      <View style={tailwind('h-1 bg-neutral-30 m-2 w-16 self-center')}></View>

      <Text style={styles.nameText}>
        {props.user.name}{' '}
        {props.user.lastname}
      </Text>

      <Separator />

      <SettingsItem
        text={strings.components.app_menu.settings.storage}
        onPress={() => {
          props.dispatch(layoutActions.closeSettings())
          props.navigation.replace('Storage')
        }}
      />

      <SettingsItem
        text={strings.components.app_menu.settings.more}
        onPress={() => Linking.openURL('https://internxt.com/drive')}
      />

      <SettingsItem
        text={strings.components.app_menu.settings.contact}
        onPress={() => {
          const contact = 'https://help.internxt.com/'

          Linking.canOpenURL(contact).then(() => {
            Linking.openURL(contact)
          }).catch(() => {
            Alert.alert('Info', 'To contact with us please go to https://help.internxt.com/')
          })
        }}
      />

      <SettingsItem
        text={strings.components.app_menu.settings.sign}
        onPress={() => {
          props.dispatch(layoutActions.closeSettings())
          props.dispatch(userActions.signout())
        }}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalSettings: {
    borderWidth: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: 350
  },
  nameText: {
    fontFamily: 'NeueEinstellung-Regular',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 26,
    marginTop: 10
  }
})

const mapStateToProps = (state: any) => {
  return {
    user: state.authenticationState.user,
    layoutState: state.layoutState
  };
};

export default connect(mapStateToProps)(SettingsModal);
