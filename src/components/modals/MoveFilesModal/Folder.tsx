import React from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';

import { getAnalyticsData } from '../../../services/analytics';
import analytics from '../../../services/analytics';
import { filesThunks } from '../../../store/slices/storage';
import { useAppDispatch } from '../../../store/hooks';

interface FolderProps {
  isFolder: boolean;
  item: any;
  isLoading?: boolean;
}

function Folder(props: FolderProps): JSX.Element {
  const dispatch = useAppDispatch();
  const item = props.item;

  async function handleClick(props: any) {
    const userData = await getAnalyticsData();

    analytics.track('folder-opened', {
      userId: userData.uuid,
      email: userData.email,
      // eslint-disable-next-line camelcase
      folder_id: props.item.id,
    });
    dispatch(filesThunks.getFolderContentThunk({ folderId: props.item.id }));
  }

  return (
    <View style={styles.container}>
      <View style={styles.fileDetails}>
        <TouchableWithoutFeedback
          style={styles.touchableItemArea}
          onPress={() => {
            handleClick(props);
          }}
        >
          <View style={styles.itemIcon}>{/* Icon file or folder */}</View>

          <View style={styles.nameAndTime}>
            <Text style={styles.fileName} numberOfLines={1}>
              {props.item.name}
            </Text>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#e6e6e6',
    flexDirection: 'row',
    height: 80,
  },
  fileDetails: {
    flexGrow: 1,
  },
  fileName: {
    color: '#000000',
    fontFamily: 'NeueEinstellung-Bold',
    fontSize: 16,
    letterSpacing: -0.1,
  },
  itemIcon: {},
  nameAndTime: {
    flexDirection: 'column',
    width: 230,
  },
  touchableItemArea: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});

export default Folder;
