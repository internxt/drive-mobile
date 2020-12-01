import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';


class SVG extends React.Component {
    constructor(props) {
        super(props);

        const defaultColor = props.color ? props.color : '#b8b8b8';

        this.state = {
            color: defaultColor.startsWith('#') ? defaultColor : props.defaultColors[defaultColor],
            width: props.width ? props.width : 20,
            height: props.height ? props.height : 20
        }
    }

    render() {
        return <View>
            <Svg
                xmlns="http://www.w3.org/2000/svg"
                width={this.state.width}
                height={this.state.height}>
                <Path
                    fill={this.state.color}
                    d="m10,12a2,2 0 1 1 0,-4a2,2 0 0 1 0,4zm0,-6a2,2 0 1 1 0,-4a2,2 0 0 1 0,4zm0,12a2,2 0 1 1 0,-4a2,2 0 0 1 0,4z"
                    transform="rotate(-90 10,10)"
                    fill-rule="evenodd"
                />
            </Svg>
        </View>;
    }
}

export default SVG;