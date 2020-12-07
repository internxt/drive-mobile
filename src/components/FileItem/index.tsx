import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TouchableHighlight } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import IconFolder from '../IconFolder';
import TimeAgo from 'react-native-timeago';
import Icon from '../../../assets/icons/Icon';
import IconFile from '../IconFile';

interface FileItemProps {
    isFolder: boolean
    item: any
}

function FileItem(props: FileItemProps) {
    const isSelected = false
    const extendStyles = StyleSheet.create({
        text: { color: '#000000' },
        containerBackground: { backgroundColor: isSelected ? '#f2f5ff' : '#fff' }
    });

    return <TouchableHighlight style={[styles.container, extendStyles.containerBackground]}>
        <View style={styles.fileDetails}>
            <View
                style={styles.itemIcon}>
                {props.isFolder
                    ? <>
                        <IconFolder
                            color={props.item.color} />
                        {props.item.icon
                            ? <View style={{
                                position: 'absolute',
                                left: 35,
                                top: 7
                            }}>
                                <Icon
                                    name={props.item.icon} />
                            </View>
                            : <></>}
                    </>
                    : <IconFile
                        label={props.item.type} />}
            </View>
            <View style={styles.nameAndTime}>
                <Text
                    style={[styles.fileName, extendStyles.text]}
                    numberOfLines={1}
                >{props.item.name}</Text>
                {!props.isFolder && <TimeAgo time={props.item.created_at} />}
            </View>
            <View>
                <TouchableHighlight
                    style={styles.buttonDetails}
                    underlayColor="#f2f5ff"
                >
                    <Text>iii</Text>
                </TouchableHighlight>
            </View>
        </View>
    </TouchableHighlight>
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        height: 80,
        borderBottomWidth: 1,
        borderColor: '#e6e6e6'
    },
    fileDetails: {
        flexDirection: 'row'
    },
    itemIcon: {},
    nameAndTime: {
        justifyContent: 'center',
        flex: 7
    },
    fileName: {
        fontFamily: 'CircularStd-Bold',
        fontSize: 16,
        letterSpacing: -0.1,
        color: '#000000'
    },
    fileUpdated: {
        fontFamily: 'CircularStd-Book',
        fontSize: 13,
        color: '#2a5fc9',
        marginTop: 2
    },
    buttonDetails: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 51,
        height: 51,
        marginRight: 10,
        borderRadius: 25.5,
        flex: 1
    }
});



const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(FileItem);