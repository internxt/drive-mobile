import * as React from 'react';
import {
  StyleSheet,
  Image
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

interface BackButtonProps {
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
    alignItems: 'center',
    height: 45,
    justifyContent: 'center',
    width: 45
  },
  icon: {
    height: 18,
    tintColor: '#0084ff',
    width: 11
  }
});