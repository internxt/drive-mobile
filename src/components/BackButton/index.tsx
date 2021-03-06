import * as React from 'react';
import {
  StyleSheet,
  Image
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

export interface BackButtonProps {
    style?: any
    navigation: any
    filesState?: any
    dispatch?: any,
    layoutState?: any
    authenticationState?: any
}

export function BackButton(props: BackButtonProps): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const backBtn = require('../../../assets/icons/icon-back.png');
  const [iconArrowBack, setIconArrowBack] = React.useState(backBtn);
  //const parentFolderId = useSelector(state => state.pic.folderContent.parentFolderId);

  const goBack = () => {
    //dispatch(onGetBucketContent(parentFolderId));
    //navigation.setParams({ folderId: parentFolderId });
    props.navigation.goBack();
  }

  return (
    <TouchableOpacity
      style={styles.buttonWrapper}
      onPress={goBack}
    >
      <Image style={styles.icon} source={iconArrowBack} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center'
  },
  icon: {
    height: 18,
    width: 11,
    tintColor: '#0084ff'
  }
});