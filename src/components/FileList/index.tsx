import React, { useState } from 'react'
import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { connect } from 'react-redux';
import { fileActions } from '../../redux/actions';
import EmptyFolder from '../EmptyFolder';
import FileItem from '../FileItem';

function FileList(props: any) {
    const [refreshing, setRefreshing] = useState(false)

    const { filesState } = props;
    const { loading, folderContent, selectedFile } = filesState;
    let folderList: object[] = folderContent && folderContent.children || [];
    let fileList: object[] = folderContent && folderContent.files || [];

    return <ScrollView>
        {folderList.length === 0 && fileList.length === 0
            ? <EmptyFolder />
            : <Text style={{ display: 'none' }}></Text>}
        {folderList.map((folder: any) => <FileItem
            key={folder.id}
            isFolder={true}
            item={folder} />)}
        {fileList.map((file: any) => <FileItem
            key={file.id}
            isFolder={false}
            item={file} />)}
    </ScrollView>
}

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(FileList)
