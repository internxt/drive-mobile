import React, { Fragment, useEffect, useState } from 'react';
import { View, TextInput, TouchableWithoutFeedback, StyleProp, ViewStyle } from 'react-native';
import * as Unicons from '@iconscout/react-native-unicons';
import { connect } from 'react-redux';
import { fileActions } from '../../store/actions';
import { Reducers } from '../../store/reducers/reducers';
import { getColor, tailwind } from '../../helpers/designSystem';
import strings from '../../../assets/lang/strings';

interface SearchInputProps extends Reducers {
  style?: StyleProp<ViewStyle>;
}

function SearchInput(props: SearchInputProps): JSX.Element {
  const [searchText, setSearchText] = useState('');

  const showCloseIcon = searchText !== '';

  useEffect(() => {
    props.dispatch(fileActions.setSearchString(searchText));
  }, [searchText]);

  return (
    <Fragment>
      <View style={[tailwind('flex-row'), props.style]}>
        <View style={tailwind('bg-neutral-20 flex-grow rounded-xl flex-shrink')}>
          <View style={tailwind('flex-row items-center')}>
            <View style={tailwind('p-3')}>
              <Unicons.UilSearch color={getColor('neutral-60')} size={18} />
            </View>

            <TextInput
              onChangeText={(value) => setSearchText(value)}
              value={searchText}
              style={tailwind('flex-grow flex-shrink py-3')}
              placeholder={strings.screens.file_explorer.searchInThisFolder}
            />

            {showCloseIcon && (
              <View style={tailwind('p-3')}>
                <TouchableWithoutFeedback onPress={() => setSearchText('')}>
                  <Unicons.UilTimesCircle color={getColor('neutral-100')} size={18} />
                </TouchableWithoutFeedback>
              </View>
            )}
          </View>
        </View>
      </View>
    </Fragment>
  );
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect<Reducers>(mapStateToProps)(SearchInput);
