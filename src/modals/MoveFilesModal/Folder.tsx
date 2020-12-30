import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import IconFolder from '../../components/IconFolder';
import Icon from '../../../assets/icons/Icon';
import { colors } from '../../redux/constants';
import { fileActions } from '../../redux/actions';
import { getLyticsData } from '../../helpers';
import analytics from '../../helpers/lytics';

interface FolderProps {
    isFolder: boolean
    item: any
    dispatch?: any
    filesState?: any
    isLoading?: boolean
}

function Folder(props: FolderProps) {
    const item = props.item

    async function handleClick(props: any) {    
        const userData = await getLyticsData()
        analytics.track('folder-opened', {
            userId: userData.uuid,
            email: userData.email,
            folder_id: props.item.id
        })
        props.dispatch(fileActions.getFolderContent(props.item.id))
    }

    return (
        <View style={styles.container}>
            <View style={styles.fileDetails}>
                <TouchableWithoutFeedback
                    style={styles.touchableItemArea}
                    onPress={() => {
                        handleClick(props)
                    }}>

                    <View style={styles.itemIcon}>
                        <IconFolder color={props.item.color} />

                        {
                            props.item.icon ? 
                            
                            <View style={styles.icon}>
                                <Icon
                                    name={props.item.icon.name}
                                    color={item.color ? colors[item.color].icon : colors['blue'].icon}
                                    width={24}
                                    height={24}
                                />
                            </View>
                            : null
                        }
                    </View>

                    <View style={styles.nameAndTime}>
                        <Text
                            style={styles.fileName}
                            numberOfLines={1}
                        >{props.item.name}</Text>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        height: 80,
        borderBottomWidth: 1,
        borderColor: '#e6e6e6',
        flexDirection: 'row',
        alignItems: 'center'
    },
    fileDetails: {
        flexGrow: 1
    },
    touchableItemArea: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    
    itemIcon: {
    },

    nameAndTime: {
        flexDirection: 'column',
        width: 230
    },

    fileName: {
        fontFamily: 'CircularStd-Bold',
        fontSize: 16,
        letterSpacing: -0.1,
        color: '#000000'
    },
    icon: {
        position: 'absolute',
        left: 35,
        top: 7
    }
});

const mapStateToProps = (state: any) => {
    return { ...state };
};

export default connect(mapStateToProps)(Folder);