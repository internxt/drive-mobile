import React, { Fragment, useState, useRef, useEffect } from 'react'
import { View, StyleSheet, Platform, TextInput, Image, SafeAreaView } from 'react-native'
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { getIcon } from '../../helpers/getIcon';
import { PhotoActions, layoutActions } from '../../redux/actions';
import MenuItem from '../MenuItem';

interface AppMenuProps {
  navigation?: any
  filesState?: any
  photosState?: any
  dispatch?: any,
  layoutState?: any
  authenticationState?: any
}

function AppMenuPhotos(props: AppMenuProps) {
  const [activeSearchBox, setActiveSearchBox] = useState(false)
  const [hasSpace, setHasSpace] = useState(true)
  const selectedItems = props.photosState.selectedItems;
  const textInput = useRef<TextInput>(null)

  useEffect(() => {
    if (!hasSpace) {
      props.navigation.replace('OutOfSpace')
    }
  }, [hasSpace])

  return <SafeAreaView
    style={styles.container}>

    <View style={[styles.searchContainer, { display: activeSearchBox ? 'flex' : 'none' }]}>
      <Image
        style={{ marginLeft: 20, marginRight: 10 }}
        source={getIcon('search')}
      />

      <TextInput
        ref={textInput}
        style={styles.searchInput}
        placeholder="Search"
        value={props.filesState.searchString}
        onChange={e => {
          props.dispatch(PhotoActions.setSearchString(e.nativeEvent.text))
        }}
      />

      <TouchableWithoutFeedback
        onPress={() => {
          props.dispatch(PhotoActions.setSearchString(''));
          props.dispatch(layoutActions.closeSearch());
          setActiveSearchBox(false)
        }}
      >
        <Image
          style={{ marginLeft: 10, marginRight: 20, height: 16, width: 16 }}
          source={getIcon('close')}
        />
      </TouchableWithoutFeedback>
    </View>

    <Fragment>
      <View style={[styles.buttonContainer, { display: activeSearchBox ? 'none' : 'flex' }]}>
        <MenuItem
          name="settings"
          onClickHandler={() => {
            props.dispatch(layoutActions.openSettings());
          }} />
      </View>
    </Fragment>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: 17,
    marginRight: 10
  },
  /* commonButtons: {
    flexDirection: 'row',
    flexGrow: 1
  }, */
  container: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    height: 54,
    justifyContent: 'flex-start',
    marginTop: Platform.OS === 'ios' ? 50 : 0,
    paddingTop: 3,
    position: 'absolute',
    width: '100%'
  },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 30,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 20,
    marginRight: 20,
    position: 'relative'
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Averta-Regular',
    fontSize: 17,
    marginLeft: 15,
    marginRight: 15
  }
  /* mr10: {
    marginRight: 10
  } */
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(AppMenuPhotos)