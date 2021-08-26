import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, ScrollView, RefreshControl } from 'react-native'
import { connect } from 'react-redux';
import { Reducers } from '../../redux/reducers/reducers';
import AppMenu from '../../components/AppMenu';
import { getRecents } from '../../services/recents';
import { IFile } from '../../components/FileList';
import FileItem from '../../components/FileItem';
import ItemSkeleton from '../../components/ItemSkeleton';

function Recents(props: Reducers): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [recents, setRecents] = useState<IFile[]>([]);
  const [refreshing, setRefreshing] = useState(false)

  const reloadRecents = async (limit?: number) => {
    setLoading(true);
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
    <AppMenu {...props} title="Recents" hideBackPress={true} hideSearch={true}/>
    {
      loading? <ItemSkeleton/> :
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
          {recents.map(item => {
            return <FileItem {...props} key={item.id} item={item} isFolder={false} />
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