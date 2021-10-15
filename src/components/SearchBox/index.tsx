import React, { Fragment, useEffect, useState } from 'react';
import { StyleSheet, View, TextInput, TouchableWithoutFeedback } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons'
import { connect } from 'react-redux';
import { fileActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';
import { getColor, tailwind } from '../../helpers/designSystem';

function SearchBox(props: Reducers): JSX.Element {

  const [searchText, setSearchText] = useState('');

  const showCloseIcon = searchText !== '';

  useEffect(() => {
    props.dispatch(fileActions.setSearchString(searchText));
  }, [searchText])

  return <Fragment>
    <View style={tailwind('flex-row mx-3 my-2')}>
      <View style={styles.textInputWrapper}>
        <View style={tailwind('flex-row items-center')}>

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
              <Unicons.UilTimesCircle color={getColor('blue-60')} size={20} />
            </TouchableWithoutFeedback>
          </View>}
        </View>
      </View>
    </View>
  </Fragment>
}

const styles = StyleSheet.create({
  textInputWrapper: {
    backgroundColor: '#F4F5F7',
    borderRadius: 12,
    alignItems: 'center',
    flexGrow: 1
  },
  textInput: {
    flexGrow: 1
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
