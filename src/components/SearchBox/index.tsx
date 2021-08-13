import React, { Fragment, useEffect, useState } from 'react';
import { Text, StyleSheet, View, TextInput, TouchableWithoutFeedback } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons'
import { connect } from 'react-redux';
import { fileActions, layoutActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import strings from '../../../assets/lang/strings';

function SearchBox(props: Reducers): JSX.Element {

  const [searchText, setSearchText] = useState('');

  const showCloseIcon = searchText !== '';

  useEffect(() => {
    props.dispatch(fileActions.setSearchString(searchText));
  }, [searchText])

  return <Fragment>
    <View style={styles.container}>
      <View style={styles.textInputWrapper}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>

          <View style={styles.searchIcon}>
            <Unicons.UilSearch color="#42526E" size={20} />
          </View>

          <TextInput
            onChangeText={(value) => setSearchText(value)}
            value={searchText}
            style={styles.textInput}
            placeholder="Search" />

          {showCloseIcon && <View style={styles.closeIcon}>
            <TouchableWithoutFeedback onPress={() => setSearchText('')} >
              <Unicons.UilTimesCircle color="#0F62FE" size={20} />
            </TouchableWithoutFeedback>
          </View>}
        </View>
      </View>
      <View>
        <TouchableWithoutFeedback
          onPress={() => {
            props.dispatch(fileActions.setSearchString(''));
            props.dispatch(layoutActions.closeSearch())
          }}
          style={styles.cancelWrapper}>
          <Text style={styles.cancelText}>{strings.generic.cancel}</Text>
        </TouchableWithoutFeedback>
      </View>
    </View>
  </Fragment>
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
    marginRight: 20
  },
  textInputWrapper: {
    backgroundColor: '#F4F5F7',
    borderRadius: 6,
    alignItems: 'center',
    flexGrow: 1
  },
  textInput: {
    flexGrow: 1
  },
  cancelWrapper: {
  },
  cancelText: {
    color: '#0F62FE',
    padding: 10,
    paddingLeft: 15
  },
  searchIcon: {
    margin: 10
  },
  closeIcon: {
    margin: 10
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect<Reducers>(mapStateToProps)(SearchBox)
