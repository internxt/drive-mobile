import _ from 'lodash';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import strings from '../../../assets/lang/strings';

import AppMenu from '../../components/AppMenu';
import SkinSkeleton from '../../components/SkinSkeleton';

const HomeScreen = () => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <View style={styles.container}>
      <AppMenu
        title={strings.screens.home.title}
        hideBackPress={true}
        hideSearch={true}
        hideOptions={true}
        hideNavigation={true}
        hideSortBar={true}
      />
      {isLoading && (
        <View>
          {_.times(20, (n) => (
            <SkinSkeleton key={n} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
  },
  fileListContentsScrollView: {
    flexGrow: 1,
  },
});

export default HomeScreen;
