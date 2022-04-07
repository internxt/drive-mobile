import React, { useEffect, useState } from 'react';
import { View, Alert, ScrollView, RefreshControl, Text } from 'react-native';
import _ from 'lodash';

import { getShareList, IShare } from '../../services/storageShare';
import DriveItem from '../../components/DriveItem';
import { tailwind } from '../../helpers/designSystem';
import SkinSkeleton from '../../components/SkinSkeleton';
import strings from '../../../assets/lang/strings';
import EmptyList from '../../components/EmptyList';
import EmptySharesImage from '../../../assets/images/screens/empty-shares.svg';
import NoResultsImage from '../../../assets/images/screens/no-results.svg';
import { DriveItemData, DriveItemStatus, DriveListType, DriveListViewMode } from '../../types/drive';

interface SharedScreenProps {
  searchText?: string;
}

function SharedScreen(props: SharedScreenProps): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [sharedList, setSharedList] = useState<IShare[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const filteredSharedList = sharedList.filter((share: IShare) =>
    share.fileInfo.name.toLowerCase().includes((props.searchText || '').toLowerCase()),
  );
  const reloadShares = async () => {
    return getShareList()
      .then((shareList) => {
        const shareListFiltered = shareList.filter((s) => !!s.fileInfo);

        setSharedList(shareListFiltered);
      })
      .catch((err) => {
        Alert.alert('Cannot load shares', err.message);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };
  const renderNoResults = () => (
    <EmptyList {...strings.components.DriveList.noResults} image={<NoResultsImage width={100} height={100} />} />
  );

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
          {filteredSharedList?.length > 0 ? (
            <View>
              {filteredSharedList.map((item, i) => {
                return (
                  <DriveItem
                    key={i}
                    type={DriveListType.Shared}
                    status={DriveItemStatus.Idle}
                    viewMode={DriveListViewMode.List}
                    data={item.fileInfo as DriveItemData}
                    subtitle={
                      <View style={tailwind('flex flex-row items-center')}>
                        <Text style={tailwind('text-base text-sm text-blue-60')}>Left {item.views} times to share</Text>
                      </View>
                    }
                    progress={-1}
                  />
                );
              })}
            </View>
          ) : props.searchText ? (
            renderNoResults()
          ) : (
            <EmptyList {...strings.screens.shared.empty} image={<EmptySharesImage width={100} height={100} />} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

export default SharedScreen;
