import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, ScrollView, RefreshControl } from 'react-native';
import { connect } from 'react-redux';
import _ from 'lodash';

import { Reducers } from '../../store/reducers/reducers';
import { getRecents } from '../../services/recents';
import { IFile } from '../../components/FileList';
import FileItem from '../../components/FileItem';
import SkinSkeleton from '../../components/SkinSkeleton';
import strings from '../../../assets/lang/strings';
import EmptyList from '../../components/EmptyList';
import EmptyRecentsImage from '../../../assets/images/screens/empty-recents.svg';
import ScreenTitle from '../../components/ScreenTitle';
import { tailwind } from '../../helpers/designSystem';

function RecentsScreen(props: Reducers): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [recents, setRecents] = useState<IFile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reloadRecents = async (limit?: number) => {
    return getRecents()
      .then((recentFiles) => {
        setRecents(recentFiles);
      })
      .catch((err) => {
        Alert.alert('Cannot load recents', err.message);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    reloadRecents();
  }, []);

  return (
    <View style={tailwind('app-screen bg-white flex-1')}>
      <ScreenTitle text={strings.screens.recents.title} />
      {loading && (
        <View>
          {_.times(20, (n) => (
            <SkinSkeleton key={n} />
          ))}
        </View>
      )}

      {!loading && (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                reloadRecents();
              }}
            />
          }
          contentContainerStyle={styles.fileListContentsScrollView}
        >
          {recents.length === 0 && (
            <EmptyList {...strings.screens.recents.empty} image={<EmptyRecentsImage width={100} height={100} />} />
          )}
          {recents.length > 0 &&
            recents.map((item) => {
              return <FileItem totalColumns={1} {...props} key={item.id} item={item} isFolder={false} />;
            })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fileListContentsScrollView: {
    flexGrow: 1,
  },
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(RecentsScreen);
