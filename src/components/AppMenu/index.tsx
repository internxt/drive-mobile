import React, { Fragment } from 'react'
import { View, StyleSheet, Text, TouchableWithoutFeedback } from 'react-native'
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import * as Unicons from '@iconscout/react-native-unicons';
import { Reducers } from '../../redux/reducers/reducers';

interface AppMenuProps extends Reducers {
  title: string
  hideSearch?: boolean
  hideOptions?: boolean
  onBackPress?: () => void
  hideBackPress?: boolean
}

function AppMenu(props: AppMenuProps) {
  // Hide options menu, it is not finished yet.
  props.hideOptions = undefined;

  const parentFolderId = props.filesState.folderContent?.parentId;
  const backButtonEnabled = props.layoutState.backButtonEnabled;

  return <View style={styles.container}>
    <Fragment>
      <View style={styles.buttonContainer}>
        <View style={styles.commonButtons}>
          <View style={styles.w50}>
            <TouchableWithoutFeedback disabled={!backButtonEnabled} onPress={() => {
              if (props.onBackPress) {
                return props.onBackPress();
              }
              props.dispatch(fileActions.goBack(parentFolderId));
            }}>
              <Unicons.UilArrowLeft color={parentFolderId || props.onBackPress ? '#0F62FE' : '#EBECF0'} size={32} />
            </TouchableWithoutFeedback>
          </View>
          <View style={styles.fGrow}>
            <Text style={styles.storageText}>{props.title}</Text>
          </View>
          <View style={[styles.w50, { alignItems: 'center' }]}>
            {!props.hideSearch && <TouchableWithoutFeedback onPress={() => {
              props.dispatch(layoutActions.openSearch())
            }}>
              <Unicons.UilSearch color='#0F62FE' size={32} />
            </TouchableWithoutFeedback>}
          </View>
          <View>
            {props.hideOptions === true &&
              <TouchableWithoutFeedback
                onPress={() => {
                  props.dispatch(layoutActions.openSettings());
                }}>
                <Unicons.UilEllipsisV color='#0F62FE' size={32} />
              </TouchableWithoutFeedback>}
          </View>
        </View>
      </View>
    </Fragment>
  </View>
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    marginLeft: 17,
    marginRight: 17,
    marginTop: 10,
    marginBottom: 10
  },
  commonButtons: {
    flexDirection: 'row',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 10,
    marginBottom: 10
  },
  storageText: {
    fontFamily: 'NeueEinstellung-SemiBold',
    fontSize: 24,
    color: '#42526E',
    textAlign: 'center'
  },
  w50: { width: 50 },
  fGrow: { flexGrow: 1 }
});

const mapStateToProps = (state: any) => ({ ...state });

export default connect<Reducers>(mapStateToProps)(AppMenu)