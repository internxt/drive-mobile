import React, { useEffect } from 'react'
import { View } from 'react-native';
import { connect } from 'react-redux';
import { deviceStorage } from '../../helpers';
import { userActions } from '../../redux/actions';

function EntryPointGateway (props: any): JSX.Element {
  const rootFolderId = props.authenticationState.user.root_folder_id;

  useEffect(() => {
    isLogged()
  }, [props.authenticationState.loggedIn])

  async function isLogged () {
    if (props.authenticationState.loggedIn === true) {
      props.navigation.replace('Photos', {
        folderId: rootFolderId
      })
    } else {
      const xToken = await deviceStorage.getItem('xToken')
      const xUser = await deviceStorage.getItem('xUser')

      if (xToken && xUser) {
        props.dispatch(userActions.localSignIn(xToken, xUser))
      } else {
        props.navigation.replace('Register')
      }
    }
  }

  return (
    <View>
    </View>
  )
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(EntryPointGateway)