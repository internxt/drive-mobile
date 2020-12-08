import React from 'react'
import { View, Text, StyleSheet, Linking } from 'react-native';
import Modal from 'react-native-modalbox'
import ProgressBar from '../../components/ProgressBar';
import { layoutActions, userActions } from '../../redux/actions';
import SettingsItem from './SettingsItem';
import prettysize from 'prettysize'
import Separator from '../../components/Separator';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

function loadUsage() {

}

interface SettingsModalProps {
    isOpen: boolean
    authenticationState?: any
    dispatch: any
}

function SettingsModal(props: SettingsModalProps) {
    return <Modal
        isOpen={props.isOpen}
        position={'bottom'}
        style={styles.modalSettings}
        onClosed={() => {
            props.dispatch(layoutActions.closeSettings())
        }}
        onOpened={loadUsage}
        backButtonClose={true}
        animationDuration={200}>

        <View style={styles.drawerKnob}></View>

        <Text
            style={{
                fontSize: 20,
                fontWeight: 'bold',
                marginLeft: 26,
                marginTop: 10,
                fontFamily: 'CerebriSans-Bold'
            }}
        >
            {props.authenticationState.user.name}{' '}
            {props.authenticationState.user.lastname}
        </Text>

        <ProgressBar
            styleBar={{}}
            styleProgress={{ height: 6 }}
            totalValue={123}
            usedValue={20}
        />

        <Text
            style={{
                fontFamily: 'CerebriSans-Regular',
                fontSize: 15,
                paddingLeft: 24,
                paddingBottom: 0
            }}
        >
            <Text>Used</Text>
            <Text style={{ fontWeight: 'bold' }}>
                {' '}
                {prettysize(123)}{' '}
            </Text>
            <Text>of</Text>
            <Text style={{ fontWeight: 'bold' }}>
                {' '}
                {prettysize(123)}{' '}
            </Text>
        </Text>

        <Separator />
        <SettingsItem
            text="Storage"
            onClick={() => { }}
        />
        <SettingsItem
            text="More info"
            onClick={() => Linking.openURL('https://internxt.com/drive')}
        />
        <SettingsItem
            text="Contact"
            onClick={() => Linking.openURL('mailto:hello@internxt.com')}
        />
        <SettingsItem
            text="Sign out"
            onClick={() => props.dispatch(userActions.signout())}
        />
    </Modal>
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
        height: 380
    }
})

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(SettingsModal);
