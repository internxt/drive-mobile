import React, { useEffect, useState } from 'react';
import { View, Alert, ScrollView, RefreshControl, Text } from 'react-native'
import { connect } from 'react-redux';
import { Reducers } from '../../redux/reducers/reducers';
import AppMenu from '../../components/AppMenu';
import { getShareList, IShare } from '../../services/shares';
import FileItem from '../../components/FileItem';
import { tailwind } from '../../helpers/designSystem';
import SkinSkeleton from '../../components/SkinSkeleton';
import _ from 'lodash'

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
        {_.times(20, () => <SkinSkeleton />)}
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