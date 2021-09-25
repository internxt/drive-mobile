import React, { useEffect, useState } from 'react';
import { View, Alert, ScrollView, RefreshControl, Text } from 'react-native'
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

  return <View style={tailwind('bg-white flex-1')}>
    <AppMenu {...props} title="Shared" hideSearch={true} hideBackPress={true} />
    {
      loading &&
      <View style={tailwind('flex-1 self-center')}>
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
        contentContainerStyle={tailwind('flex-grow')}
      >
        <View>
          {shares.map((item, i) => {
            return <FileItem
              key={i}
              item={item.fileInfo}
              isFolder={false}
              subtitle={<View style={tailwind('flex flex-row items-center')}>
                <Text style={tailwind('text-base text-sm text-blue-60')}>Left {item.views} times to share</Text>
                <View style={tailwind('m-1 rounded-xl p-1 bg-blue-10')}>
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

const mapStateToProps = (state: any) => ({ ...state });

export default connect(mapStateToProps)(Share)