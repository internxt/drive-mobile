import * as React from 'react';
import { ActivityIndicator, Dimensions, Image, Pressable, StyleSheet, TouchableHighlight, TouchableWithoutFeedback, View } from 'react-native';
import { connect, useDispatch, useSelector, useStore } from 'react-redux';
import { fileActions } from '../../redux/actions';
import { IPhoto } from '../PhotoList';


export interface PhotoProps {
    filesState?: any
    layoutState?: any
    dispatch?: any
    item?: IPhoto
    isLoading?: boolean
    source?: any
}

async function handleLongPress(props: PhotoProps, isSelected: boolean) {
    if (isSelected) {
      props.dispatch(fileActions.deselectFile(props.item))
    } else {
      props.dispatch(fileActions.selectFile(props.item))
    }
  }

function PhotoItem(props: PhotoProps) {
    const isSelectionMode = props.filesState.selectedItems.length > 0
    const isSelected = props.filesState.selectedItems.filter((x: any) => x.id === props.item.id).length > 0

    const [progress, setProgress] = React.useState(0)
    const progressPct = progress > 0 ? progress / props.item?.size : 0
    const progressWidth = Dimensions.get('screen').width * progressPct

    const [uploadProgress, setUploadProgress] = React.useState(0)
    const uploadProgressWidth = Dimensions.get('screen').width * uploadProgress

    const [isLoading, setIsLoading] = React.useState(props.isLoading ? true : false)

    const extendStyles = StyleSheet.create({
        text: { color: '#000000' },
        containerBackground: { backgroundColor: isSelected ? '#f2f5ff' : '#fff' }
    });

    React.useEffect(() => {
        setUploadProgress(props.filesState.progress)
    }, [props.filesState.progress])

    let img = '';

    if(!props.item) {
        img = props.source
    } else {
        img = props.item.uri
    }

    return (
        <View>
            <TouchableWithoutFeedback
                onLongPress={() => { handleLongPress(props, isSelected) }}
                onPress={() => {
                    setIsLoading(true)
                    /*handleClick(props, setProgress).finally(() => {
                        setProgress(0)
                        setIsLoading(false)
                    })*/
                }}>


                <View >
                    <Image
                        style={styles.bigIcon}
                        source={{ uri: props.item?.uri }}
                        resizeMode={'cover'}
                    />
                </View>
            </TouchableWithoutFeedback>

        </View>
    )
}

const mapStateToProps = (state: any) => {
    return { ...state };
};


const styles = StyleSheet.create({
    container: {
        marginBottom: 15,
        alignSelf: 'auto'
    },
    bigIcon: {
        width: 110,
        height: 110,
        marginTop: 13,
        marginLeft: 13,
        borderRadius: 6
    },
    selected: {
        width: 110,
        height: 110,
        marginTop: 13,
        marginLeft: 13,
        borderRadius: 6,
        borderWidth: 3,
        borderColor: '#0084ff',
    }
});

export default connect(mapStateToProps)(PhotoItem);