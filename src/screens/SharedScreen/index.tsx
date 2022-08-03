import React, { useEffect, useState } from 'react';
import { View, Alert, ScrollView, RefreshControl, Text } from 'react-native';
import _ from 'lodash';

import DriveItem from '../../components/DriveItemTable';
import DriveItemSkinSkeleton from '../../components/DriveItemSkinSkeleton';
import strings from '../../../assets/lang/strings';
import EmptyList from '../../components/EmptyList';
import EmptySharesImage from '../../../assets/images/screens/empty-shares.svg';
import NoResultsImage from '../../../assets/images/screens/no-results.svg';
import { DriveItemStatus, DriveListType, DriveListViewMode } from '../../types/drive';
import driveService from '../../services/DriveService';
import { useTailwind } from 'tailwind-rn';

interface SharedScreenProps {
  searchText?: string;
}

function SharedScreen(props: SharedScreenProps): JSX.Element {
  const tailwind = useTailwind();
  const [loading, setLoading] = useState(true);
  const [sharedList, setSharedList] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const filteredSharedList = sharedList.filter((share: any) =>
    share.fileInfo.name.toLowerCase().includes((props.searchText || '').toLowerCase()),
  );
  const reloadShares = async () => {
    return driveService.share
      .getShareList()
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
            <DriveItemSkinSkeleton key={n} />
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
                    data={{
                      ...item.fileInfo,
                      updatedAt: item.fileInfo.updatedAt as unknown as string,
                      createdAt: item.fileInfo.createdAt as unknown as string,
                    }}
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
