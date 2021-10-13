import React from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import * as Unicons from '@iconscout/react-native-unicons';
import { Reducers } from '../../redux/reducers/reducers';
import { tailwind } from '../../helpers/designSystem';
import SearchBox from '../SearchBox';

interface AppMenuProps extends Reducers {
  title: string
  hideSearch?: boolean
  hideOptions?: boolean
  onBackPress?: () => void
  hideBackPress?: boolean
}

function AppMenu(props: AppMenuProps) {
  // Hide options menu, it is not finished yet.
  // If you enable it, test each view and compare with figma design
  props.hideOptions = undefined;

  const parentFolderId = props.filesState.folderContent?.parentId;
  const backButtonEnabled = props.layoutState.backButtonEnabled;

  return <>
    <View style={tailwind('m-3 flex-row')}>
    <View style={tailwind('w-16')}>
      <TouchableOpacity
        disabled={!backButtonEnabled}
        onPress={() => {
          if (props.onBackPress) {
            return props.onBackPress();
          }
          props.dispatch(fileActions.goBack(parentFolderId?.toString()));
        }}>
        <Unicons.UilAngleLeft color={parentFolderId || props.onBackPress ? '#0F62FE' : '#EBECF0'} size={32} />
      </TouchableOpacity>
    </View>
    <View style={tailwind('flex-grow')}>
      <Text style={styles.storageText}>{props.title}</Text>
    </View>
    <View style={tailwind('items-center w-16')}>
      {!props.hideSearch && <TouchableOpacity onPress={() => {
        props.dispatch(layoutActions.openSearch())
      }}>
        <Unicons.UilSearch color='#0F62FE' size={32} />
      </TouchableOpacity>}
    </View>
    <View>
      {props.hideOptions === false &&
        <TouchableOpacity
          onPress={() => {
            props.dispatch(layoutActions.openSettings());
          }}>
            <Unicons.UilEllipsisH color='#0F62FE' size={32} />
        </TouchableOpacity>}
    </View>
  </View>
    {props.layoutState.searchActive && <SearchBox />}

  </>
}

const styles = StyleSheet.create({
  storageText: {
    fontFamily: 'NeueEinstellung-SemiBold',
    fontSize: 24,
    color: '#42526E',
    textAlign: 'center'
  }
});

const mapStateToProps = (state: any) => ({ ...state });

export default connect<Reducers>(mapStateToProps)(AppMenu)