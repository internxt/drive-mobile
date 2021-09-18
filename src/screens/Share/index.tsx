import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert, ScrollView, RefreshControl, Text } from 'react-native'
import { connect } from 'react-redux';
import { Reducers } from '../../redux/reducers/reducers';
import AppMenu from '../../components/AppMenu';
import { WaveIndicator } from 'react-native-indicators';
import { getShareList, IShare } from '../../services/shares';
import FileItem from '../../components/FileItem';
import { tailwind } from '../../helpers/designSystem';
import * as Unicons from '@iconscout/react-native-unicons'

function Share(props: Reducers): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState<IShare[]>([]);
  const [refreshing, setRefreshing] = useState(false)

  const reloadShares = async (limit?: number) => {
    return getShareList().then((shareList) => {
      const shareListFiltered = shareList.filter(s => !!s.fileInfo);

      setShares(shareListFiltered);
    }).catch(err => {
      Alert.alert('Cannot load shares', err.message);
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
    })
  }

  useEffect(() => { reloadShares() }, []);

  return <View style={styles.container}>
    <AppMenu {...props} title="Shared" hideSearch={true} hideBackPress={true} />
    {
      loading &&
      <View style={styles.activityIndicator}>
        <WaveIndicator color="#5291ff" size={80} />
      </View>
    }

    {
      !loading &&
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              reloadShares();
            }}
          />
        }
        contentContainerStyle={styles.fileListContentsScrollView}
      >
        <View>
          {shares.map((item, i) => {
            return <FileItem
              key={i}
              item={item.fileInfo}
              isFolder={false}
              subtitle={<View style={tailwind('flex flex-row items-center')}>
                <Text style={[tailwind('text-base'), { fontSize: 14, color: '#0F62FE' }]}>Left {item.views} times to share</Text>
                <View style={[tailwind('m-1 rounded-xl p-1'), { backgroundColor: '#EDF5FF' }]}>
                  <Unicons.UilEye size={16} />
                </View>
              </View>}
            />
          })}
        </View>
      </ScrollView>
    }
  </View>
}

const styles = StyleSheet.create({
  activityIndicator: {
    flex: 1,
    alignSelf: 'center'
  },
  container: {
    backgroundColor: '#fff',
    flex: 1
  },
  fileListContentsScrollView: {
    flexGrow: 1
  }
});

const mapStateToProps = (state: any) => ({ ...state });

export default connect(mapStateToProps)(Share)