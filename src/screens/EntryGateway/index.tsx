import React, { useEffect } from 'react'
import { connect } from 'react-redux';
import { deviceStorage } from '../../helpers';
import { userActions } from '../../redux/actions';
import { Reducers } from '../../redux/reducers/reducers';

function EntryPointGateway(props: Reducers): JSX.Element {
  const rootFolderId = props.authenticationState.user.root_folder_id;

  useEffect(() => {
    isLogged()
  }, [props.authenticationState.loggedIn])

  async function isLogged() {
    if (props.authenticationState.loggedIn === true) {
      props.navigation.replace('FileExplorer', {
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

  return <></>;
}

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(EntryPointGateway)