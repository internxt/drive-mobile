import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, ScrollView, RefreshControl } from 'react-native';
import { connect } from 'react-redux';
import _ from 'lodash';

import { getRecents } from '../../services/recents';
import { IFile } from '../../components/FileList';
import FileItem from '../../components/FileItem';
import SkinSkeleton from '../../components/SkinSkeleton';
import strings from '../../../assets/lang/strings';
import EmptyList from '../../components/EmptyList';
import EmptyRecentsImage from '../../../assets/images/screens/empty-recents.svg';
import { tailwind } from '../../helpers/designSystem';

function RecentsScreen(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [recents, setRecents] = useState<IFile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecents = async (limit?: number) => {
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
    loadRecents();
  }, []);

  return (
    <View style={tailwind('bg-white flex-1')}>
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
                loadRecents();
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
              return <FileItem totalColumns={1} key={item.id} item={item} isFolder={false} />;
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
