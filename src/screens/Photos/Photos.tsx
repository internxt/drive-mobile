import React from 'react';
import { Text } from 'react-native';
import { connect } from 'react-redux';
import { Reducers } from '../../redux/reducers/reducers';

function Photos(props: Reducers): JSX.Element {
  return <>
    <Text>Photos</Text>
  </>;
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Photos)
