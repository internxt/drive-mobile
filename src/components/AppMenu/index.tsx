import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import * as Unicons from '@iconscout/react-native-unicons';
import { Reducers } from '../../redux/reducers/reducers';
import { getColor, tailwind } from '../../helpers/designSystem';
import SearchBox from '../SearchBox';
import globalStyle from '../../styles/global.style';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';

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
    <View>
      <View style={tailwind('flex-row')}>
        <View>
          <TouchableOpacity
            style={tailwind('p-3')}
            disabled={!backButtonEnabled}
            onPress={() => {
              if (props.onBackPress) {
                return props.onBackPress();
              }
              props.dispatch(fileActions.goBack(parentFolderId?.toString()));
            }}>
            <View style={[tailwind('flex-row items-center'), tailwind(!(parentFolderId || props.onBackPress) && 'opacity-50')]}>
              <Unicons.UilAngleLeft color={getColor('blue-60')} style={tailwind('-ml-2 -mr-1')} size={32} />
              <Text style={[tailwind('text-blue-60 text-lg'), globalStyle.fontWeight.medium]}>Back</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={tailwind('flex-grow')}>
        </View>
        <View style={tailwind('items-center justify-center')}>
          {!props.hideSearch &&
            <TouchableOpacity
              style={tailwind('p-3')}
              onPress={() => {
                props.dispatch(layoutActions.openSearch())
              }}>
              <Unicons.UilSearch color={getColor('blue-60')} size={22} />
            </TouchableOpacity>}
        </View>
        <View style={tailwind('items-center justify-center')}>
          {props.hideOptions === false &&
            <TouchableOpacity
              style={tailwind('p-3')}
              onPress={() => {
                props.dispatch(layoutActions.openSettings());
              }}>
              <Unicons.UilEllipsisH color={getColor('blue-60')} size={22} />
            </TouchableOpacity>}
        </View>
      </View>

      <View style={tailwind('flex-row px-3 -mt-3')}>
        <Text style={[tailwind('text-neutral-700 text-2xl'), globalStyle.fontWeight.medium]}>{props.title}</Text>
      </View>
      {props.layoutState.searchActive && !props.hideSearch && <SearchBox />}

      <View style={tailwind('flex-row justify-between px-3')}>
        <View style={tailwind('flex-row items-center')}>
          <Text style={tailwind('text-neutral-100')}>Name</Text>
          <Unicons.UilAngleDown size={20} color={getColor('neutral-100')} />
        </View>
        <View>
          <TouchableWithoutFeedback onPress={() => {
            props.dispatch(layoutActions.switchFileViewMode());
          }}>
            {props.layoutState.fileViewMode === 'list'
              ?
              <Unicons.UilApps size={22} color={getColor('neutral-100')} />
              :
              <Unicons.UilListUl size={22} color={getColor('neutral-100')} />
            }
          </TouchableWithoutFeedback>
        </View>
      </View>

      <View style={tailwind('border border-neutral-20 mt-1')} />
    </View>
  </>
}

const mapStateToProps = (state: any) => ({ ...state });

export default connect<Reducers>(mapStateToProps)(AppMenu)