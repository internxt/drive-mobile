import { UseCaseStatus, useUseCase } from '@internxt-mobile/hooks/common';
import errorService from '@internxt-mobile/services/ErrorService';
import { SharedFiles, SharedFolders } from '@internxt-mobile/types/drive/shared';
import { DriveListType, DriveListViewMode } from '@internxt-mobile/types/drive/ui';
import { TabExplorerScreenProps } from '@internxt-mobile/types/navigation';
import * as driveUseCases from '@internxt-mobile/useCases/drive';
import EmptySharesImage from 'assets/images/screens/empty-shares.svg';
import NoResultsImage from 'assets/images/screens/no-results.svg';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import AppScreen from 'src/components/AppScreen';
import { SearchInput } from 'src/components/SearchInput';
import { useTailwind } from 'tailwind-rn';
import strings from '../../../../assets/lang/strings';
import ScreenTitle from '../../../components/AppScreenTitle';
import DriveItem from '../../../components/drive/lists/items';
import DriveItemSkinSkeleton from '../../../components/DriveItemSkinSkeleton';
import EmptyList from '../../../components/EmptyList';
import useGetColor from '../../../hooks/useColor';
import { DriveItemStatus } from '../../../types/drive/item';

type SharedItem = SharedFolders & SharedFiles;
export const SharedScreen: React.FC<TabExplorerScreenProps<'Shared'>> = (props) => {
  const tailwind = useTailwind();
  const getColor = useGetColor();
  const { loading: sharedLoading, executeUseCase: getSharedItems } = useUseCase(driveUseCases.getSharedItems);

  const [sharedItemsPage, setSharedItemsPage] = useState(1);
  const [shouldGetMoreSharedFiles, setShouldGetMoreSharedFiles] = useState(true);
  const [shouldGetMoreSharedFolders, setShouldGetMoreSharedFolders] = useState(true);
  const [sharedItems, setSharedItems] = useState<SharedItem[]>([]);
  const [searchText, setSearchText] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    refreshSharedItems();
    const unsubscribe = driveUseCases.onSharedLinksUpdated(() => {
      refreshSharedItems();
    });

    return unsubscribe;
  }, []);
  const renderNoResults = () => (
    <EmptyList {...strings.components.DriveList.noResults} image={<NoResultsImage width={100} height={100} />} />
  );

  const renderEmpty = () => (
    <EmptyList {...strings.screens.shared.empty} image={<EmptySharesImage width={100} height={100} />} />
  );

  const refreshSharedItems = async () => {
    try {
      setSharedItems([]);
      setShouldGetMoreSharedFiles(true);
      setShouldGetMoreSharedFolders(true);
      setSharedItemsPage(1);
      const result = await getSharedItems({ page: 0, shouldGetFiles: true, shouldGetFolders: true });

      if (!result?.data?.hasMoreFiles) {
        setShouldGetMoreSharedFiles(false);
      }

      if (!result?.data?.hasMoreFolders) {
        setShouldGetMoreSharedFolders(false);
      }

      if (!result?.data?.items.length) return;

      setSharedItems(result.data.items);
    } catch (error) {
      errorService.reportError(error);
    }
  };
  const getStatus = () => {
    if (sharedLoading && !sharedItems?.length) {
      return UseCaseStatus.LOADING;
    }

    if (!sharedLoading && sharedItems) {
      return UseCaseStatus.SUCCESS;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSharedItems();
    setRefreshing(false);
  };

  const onEndOfListReached = async () => {
    try {
      if (shouldGetMoreSharedFiles || shouldGetMoreSharedFolders) {
        setSharedItemsPage(sharedItemsPage + 1);
      }
      const result = await getSharedItems({
        page: sharedItemsPage,
        shouldGetFiles: shouldGetMoreSharedFiles,
        shouldGetFolders: shouldGetMoreSharedFolders,
      });

      if (!result?.data?.hasMoreFiles) {
        setShouldGetMoreSharedFiles(false);
      }

      if (!result?.data?.hasMoreFolders) {
        setShouldGetMoreSharedFolders(false);
      }

      if (!result?.data?.items.length) return;

      setSharedItems(sharedItems.concat(result.data.items));
    } catch (error) {
      errorService.reportError(error);
    }
  };

  const handleOnEndOfListReached = () => {
    if (sharedLoading) return;

    onEndOfListReached();
  };

  const renderContent = () => {
    if (!sharedItems?.length) {
      return renderEmpty();
    }

    const sharedItemsToRender = searchText ? driveUseCases.filterSharedLinks(sharedItems, searchText) : sharedItems;

    if (searchText && !sharedItemsToRender.length) {
      return renderNoResults();
    }

    if (sharedItemsToRender.length > 0) {
      return sharedItemsToRender.map((sharedLink, i: React.Key) => {
        return (
          <DriveItem
            key={i}
            onPress={() => {
              props.navigation.navigate('Drive');
            }}
            type={DriveListType.Shared}
            status={DriveItemStatus.Idle}
            viewMode={DriveListViewMode.List}
            data={{
              ...sharedLink,
              token: sharedLink.token === null ? undefined : sharedLink.token,
              name: sharedLink?.plainName,
              type: 'folderId' in sharedLink ? sharedLink.type : undefined,
              shareId: sharedLink.id.toString(),
              thumbnails: [],
              currentThumbnail: null,
              code: (sharedLink as unknown as { code: string }).code,
              updatedAt: sharedLink.updatedAt,
              createdAt: sharedLink.createdAt,
              isFolder: sharedLink.type === 'folder',
            }}
            progress={-1}
            shareLink={sharedLink}
          />
        );
      });
    }
  };

  return (
    <AppScreen safeAreaTop style={tailwind('flex-1 flex-grow')}>
      <ScreenTitle text={strings.screens.shared.title} showBackButton={false} />
      <SearchInput value={searchText} onChangeText={setSearchText} placeholder={strings.inputs.searchInShared} />
      <View style={[tailwind('flex-1'), { backgroundColor: getColor('bg-surface') }]}>
        {getStatus() === UseCaseStatus.LOADING && !sharedItems?.length && (
          <View>
            {_.times(20, (n) => (
              <DriveItemSkinSkeleton key={n} />
            ))}
          </View>
        )}

        {(getStatus() === UseCaseStatus.SUCCESS || sharedItems) && (
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            contentContainerStyle={tailwind('flex-grow')}
            onTouchEnd={handleOnEndOfListReached}
          >
            {renderContent()}
          </ScrollView>
        )}
      </View>
    </AppScreen>
  );
};
