import * as React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, TouchableHighlight, View } from 'react-native';
import { connect, useDispatch, useSelector, useStore } from 'react-redux';


export interface PhotoProps {
    source: any
    isLoading: boolean
}


function PhotoItem(props: PhotoProps) {
    const [selected, setSelected] = React.useState(false);

    return (
        <View>

            <Image
                style={styles.bigIcon}
                source={ props.source }
                resizeMode={'cover'}
            />


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