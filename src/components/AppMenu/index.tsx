import React from 'react'
import { View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native'
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../store/actions';
import * as Unicons from '@iconscout/react-native-unicons';
import { Reducers } from '../../store/reducers/reducers';
import { getColor, tailwind } from '../../helpers/designSystem';
import SearchBox from '../SearchBox';
import globalStyle from '../../styles/global.style';
import strings from '../../../assets/lang/strings';
interface AppMenuProps extends Reducers {
  title: string
  hideSearch?: boolean
  hideOptions?: boolean
  onBackPress?: () => void
  hideBackPress?: boolean
  hideSortBar?: boolean
  hideNavigation?: boolean
  lightMode?: boolean
  centerTitle?: boolean
}

function AppMenu(props: AppMenuProps) {
  // Hide options menu, it is not finished yet.
  // If you enable it, test each view and compare with figma design
  props.hideOptions = undefined;

  const parentFolderId = props.filesState.folderContent && props?.filesState?.folderContent?.parentId;
  const backButtonEnabled = props.layoutState.backButtonEnabled;

  const isRootFolder = props.filesState.folderContent && props.filesState.folderContent.id === props.authenticationState.user.root_folder_id

  return <>
    <View style={tailwind('px-5 pt-4')}>
      <View style={[tailwind('flex-row items-center justify-between my-2'), (props.hideNavigation || isRootFolder) && tailwind('hidden')]}>
        <View>
          <TouchableOpacity
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
        <View style={tailwind('flex-row -m-2')}>
          <View style={tailwind('items-center justify-center')}>
            {!props.hideSearch &&
              <TouchableOpacity
                style={tailwind('p-2')}
                onPress={() => {
                  if (props.layoutState.searchActive) {
                    props.dispatch(layoutActions.closeSearch())
                  } else {
                    props.dispatch(layoutActions.openSearch())
                  }
                }}>
                <Unicons.UilSearch color={getColor('blue-60')} size={22} />
              </TouchableOpacity>}
          </View>
          <View style={tailwind('items-center justify-center')}>
            {props.hideOptions === false &&
              <TouchableOpacity
                style={tailwind('p-2')}
                onPress={() => {
                  props.dispatch(layoutActions.openSettings());
                }}>
                <Unicons.UilEllipsisH color={getColor('blue-60')} size={22} />
              </TouchableOpacity>}
          </View>

        </View>
      </View>

      <View style={tailwind('flex-row justify-center items-center')}>
        {props.lightMode && <TouchableOpacity
          style={tailwind('w-4')}
          disabled={!backButtonEnabled}
          onPress={() => {
            if (props.onBackPress) {
              return props.onBackPress();
            }
            props.dispatch(fileActions.goBack(parentFolderId?.toString()));
          }}>
          <View style={[tailwind('flex-row items-center'), tailwind(!(parentFolderId || props.onBackPress) && 'opacity-50')]}>
            <Unicons.UilAngleLeft color={getColor('blue-60')} style={tailwind('-ml-2 -mr-1')} size={32} />
          </View>
        </TouchableOpacity>
        }
        <View style={[tailwind('flex-row my-2 flex-grow'), props.centerTitle && tailwind('justify-center')]}>
          <Text
            numberOfLines={1}
            style={[tailwind('text-neutral-700 text-3xl'), globalStyle.fontWeight.medium]}>
            {
              props.title === 'Drive' && !isRootFolder && props.filesState.folderContent
                ?
                props.filesState.folderContent.name
                :
                props.title
            }
          </Text>
        </View>

        {props.lightMode &&
          <View style={tailwind('w-4')}>

          </View>
        }

      </View>
      {
        ((props.layoutState.searchActive && !props.hideSearch) || (isRootFolder && !props.hideSearch))
        &&
        <SearchBox style={tailwind('my-2')} />
      }

      <View style={[tailwind('flex-row justify-between my-2'), props.hideSortBar && tailwind('hidden')]}>
        <TouchableWithoutFeedback
          onPress={() => {
            props.dispatch(layoutActions.openSortModal());
          }}
        >
          <View style={tailwind('flex-row items-center')}>
            <Text style={tailwind('text-neutral-100')}>{strings.screens.file_explorer.sort[props.filesState.sortType]}</Text>
            <Unicons.UilAngleDown size={20} color={getColor('neutral-100')} />
          </View>
        </TouchableWithoutFeedback>
        <View>
          <TouchableOpacity
            onPress={() => {
              props.dispatch(layoutActions.switchFileViewMode());
            }}>
            <>
              {
                props.layoutState.fileViewMode === 'list'
                  ?
                  <Unicons.UilApps size={22} color={getColor('neutral-100')} />
                  :
                  <Unicons.UilListUl size={22} color={getColor('neutral-100')} />
              }
            </>
          </TouchableOpacity>
        </View>
      </View>
    </View>
    <View style={tailwind('border-t border-neutral-20')} />
  </>
}

const mapStateToProps = (state: any) => ({ ...state });

export default connect<Reducers>(mapStateToProps)(AppMenu)