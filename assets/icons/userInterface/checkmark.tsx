import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';


function SVG(props: any) {

    const defaultColor = props.color ? props.color : '#FFF';

    const options = {
        color: defaultColor.startsWith('#') ? defaultColor : props.defaultColors[defaultColor],
        width: props.width ? props.width : 38,
        height: props.height ? props.height : 38
    }
    return <View>
        <Svg
            viewBox="0 0 24 24"
            width={options.width}
            height={options.height}>
            <Path
                fill={options.color}
                d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"
                fill-rule="evenodd"
            />
        </Svg>
    </View>;
}

export default SVG;
