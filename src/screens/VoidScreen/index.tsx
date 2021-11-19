import React from 'react';
import { connect } from 'react-redux';

function VoidScreen() {
  return <></>;
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(VoidScreen);
