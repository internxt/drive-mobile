import React, { useEffect, useState } from 'react';
import { View, Alert, ScrollView, RefreshControl, Text } from 'react-native';
import _ from 'lodash';

import { getShareList, IShare } from '../../services/shares';
import FileItem from '../../components/FileItem';
import { tailwind } from '../../helpers/designSystem';
import SkinSkeleton from '../../components/SkinSkeleton';
import strings from '../../../assets/lang/strings';
import EmptyList from '../../components/EmptyList';
import EmptySharesImage from '../../../assets/images/screens/empty-shares.svg';
import ScreenTitle from '../../components/ScreenTitle';

function SharedScreen(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState<IShare[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reloadShares = async () => {
    return getShareList()
      .then((shareList) => {
        const shareListFiltered = shareList.filter((s) => !!s.fileInfo);

        setShares(shareListFiltered);
      })
      .catch((err) => {
        Alert.alert('Cannot load shares', err.message);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    reloadShares();
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
                reloadShares();
              }}
            />
          }
          contentContainerStyle={tailwind('flex-grow')}
        >
          {shares?.length > 0 && (
            <View>
              {shares.map((item, i) => {
                return (
                  <FileItem
                    key={i}
                    item={item.fileInfo}
                    isFolder={false}
                    totalColumns={1}
                    subtitle={
                      <View style={tailwind('flex flex-row items-center')}>
                        <Text style={tailwind('text-base text-sm text-blue-60')}>Left {item.views} times to share</Text>
                      </View>
                    }
                  />
                );
              })}
            </View>
          )}
          {shares?.length === 0 && (
            <EmptyList {...strings.screens.shared.empty} image={<EmptySharesImage width={100} height={100} />} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

export default SharedScreen;
