import React, { useEffect, useState } from 'react';
import { RefreshControl, View, ViewStyle } from 'react-native';
import { DataProvider, LayoutProvider, RecyclerListView } from 'recyclerlistview';

type ItemWithId = { id: string };
export interface VirtualizedListViewProps<T extends ItemWithId> {
  onScrollEnd?: () => void;
  data?: T[];
  itemSize: { width: number; height: number };
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  renderRow: (data: T, index: number) => JSX.Element | JSX.Element[] | null;
  renderEmpty?: () => React.ReactNode;
  onRefresh?: () => Promise<void>;
}

export function VirtualizedListView<T extends ItemWithId>(props: VirtualizedListViewProps<T>) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataProvider, setDataProvider] = useState(
    new DataProvider(function (r1: T, r2: T) {
      return r1.id !== r2.id;
    }),
  );

  useEffect(() => {
    if (props.data?.length) {
      setDataProvider(dataProvider.cloneWithRows(props.data));
    }
  }, [props.data]);

  function handleScrollEnd() {
    props.onScrollEnd && props.onScrollEnd();
  }

  function renderRow(_: string | number, data: T, index: number) {
    return props.renderRow(data, index);
  }

  function renderEmptyView() {
    if (props.renderEmpty) {
      return props.renderEmpty();
    }

    return <></>;
  }

  async function handleRefresh() {
    try {
      setIsRefreshing(true);
      props.onRefresh && (await props.onRefresh());
    } finally {
      setIsRefreshing(false);
    }
  }
  const layoutProvider = new LayoutProvider(
    () => 0,
    (_, dimensions) => {
      dimensions.width = props.itemSize.width;
      dimensions.height = props.itemSize.height;
    },
  );

  layoutProvider.shouldRefreshWithAnchoring = false;

  return (
    <View style={[{ flex: 1 }, props.style]}>
      {!props.data?.length && !isRefreshing ? (
        renderEmptyView()
      ) : (
        <RecyclerListView
          scrollViewProps={{
            contentContainerStyle: props.contentContainerStyle,
          }}
          refreshControl={
            props.onRefresh ? <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} /> : null
          }
          rowRenderer={renderRow}
          dataProvider={dataProvider}
          onEndReached={handleScrollEnd}
          layoutProvider={layoutProvider}
        />
      )}
    </View>
  );
}
