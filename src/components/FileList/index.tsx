import React from 'react'
import { ScrollView, View, Text } from 'react-native';
import { connect } from 'react-redux';
import FileItem from '../FileItem';

function FileList(props: any) {
    const { filesState } = props;
    const { loading, folderContent, selectedFile } = filesState;
    let folderList = folderContent.children || [];
    let fileList = folderContent.files || [];

    return <ScrollView>
        {folderList.map((folder: any) => <FileItem
            isFolder={true}
            item={folder} />)}
        {fileList.map((file: any) => <FileItem
            isFolder={false}
            item={file} />)}
    </ScrollView>
}

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(FileList)
