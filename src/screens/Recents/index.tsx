import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, ScrollView, RefreshControl } from 'react-native'
import { connect } from 'react-redux';
import { Reducers } from '../../redux/reducers/reducers';
import AppMenu from '../../components/AppMenu';
import { getRecents } from '../../services/recents';
import { IFile } from '../../components/FileList';
import FileItem from '../../components/FileItem';
import SkinSkeleton from '../../components/SkinSkeleton';
import _ from 'lodash'
import EmptyRecents from '../StaticScreens/EmptyRecents';

function Recents(props: Reducers): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [recents, setRecents] = useState<IFile[]>([]);
  const [refreshing, setRefreshing] = useState(false)

  const reloadRecents = async (limit?: number) => {
    return getRecents(20).then((recentFiles) => {
      setRecents(recentFiles);
    }).catch(err => {
      Alert.alert('Cannot load recents', err.message);
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
    })
  }

  useEffect(() => { reloadRecents() }, []);

  return <View style={styles.container}>
    <AppMenu {...props}
      title="Recents"
      hideBackPress={true}
      hideSearch={true}
      hideOptions={true}
      hideNavigation={true}
      hideSortBar={true} />
    {
      loading &&
      <View>
        {_.times(20, (n) => <SkinSkeleton key={n} />)}
      </View>
    }

    {
      !loading &&
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              reloadRecents();
            }}
          />
        }
        contentContainerStyle={styles.fileListContentsScrollView}
      >
        {recents.length === 0 && <EmptyRecents />}
        {recents.length > 0 && recents.map(item => {
          return <FileItem
            totalColumns={1}
            {...props}
            key={item.id}
            item={item}
            isFolder={false}
          />
        })}
      </ScrollView>
    }
  </View>
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1
  },
  fileListContentsScrollView: {
    flexGrow: 1
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Recents)
