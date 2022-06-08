import React, { useEffect, useState } from 'react';
import { View, Alert, ScrollView, RefreshControl } from 'react-native';
import _ from 'lodash';

import DriveItem from '../../components/DriveItemTable';
import DriveItemSkinSkeleton from '../../components/DriveItemSkinSkeleton';
import strings from '../../../assets/lang/strings';
import EmptyList from '../../components/EmptyList';
import EmptyRecentsImage from '../../../assets/images/screens/empty-recents.svg';
import NoResultsImage from '../../../assets/images/screens/no-results.svg';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { DriveItemStatus, DriveListType, DriveListViewMode } from '../../types/drive';
import DriveService from '../../services/DriveService';
import { useTailwind } from 'tailwind-rn';

interface RecentsScreenProps {
  searchText?: string;
}

function RecentsScreen(props: RecentsScreenProps): JSX.Element {
  const tailwind = useTailwind();
  const [isLoading, setIsLoading] = useState(true);
  const [recents, setRecents] = useState<DriveFileData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const filteredRecents = recents.filter((file) =>
    file.name.toLowerCase().includes((props.searchText || '').toLowerCase()),
  );
  const loadRecents = async () => {
    return DriveService.instance.recents
      .getRecents()
      .then((recentFiles) => {
        setRecents(recentFiles);
      })
      .catch((err) => {
        Alert.alert('Cannot load recents', err.message);
      })
      .finally(() => {
        setIsLoading(false);
        setRefreshing(false);
      });
  };
  const renderNoResults = () => (
    <EmptyList {...strings.components.DriveList.noResults} image={<NoResultsImage width={100} height={100} />} />
  );

  useEffect(() => {
    loadRecents();
  }, []);

  return (
    <View style={tailwind('flex-1')}>
      {isLoading && (
        <View>
          {_.times(20, (n) => (
            <DriveItemSkinSkeleton key={n} />
          ))}
        </View>
      )}

      {!isLoading && (
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
          contentContainerStyle={tailwind('flex-grow')}
        >
          {filteredRecents.length > 0 ? (
            filteredRecents.map((item) => {
              return (
                <DriveItem
                  key={item.id}
                  status={DriveItemStatus.Idle}
                  type={DriveListType.Drive}
                  viewMode={DriveListViewMode.List}
                  data={item}
                  progress={-1}
                />
              );
            })
          ) : props.searchText ? (
            renderNoResults()
          ) : (
            <EmptyList {...strings.screens.recents.empty} image={<EmptyRecentsImage width={100} height={100} />} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

export default RecentsScreen;
