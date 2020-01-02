import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';


class SVG extends React.Component {
    constructor(props) {
        super(props);

        const defaultColor = props.color ? props.color : '#FFF';

        this.state = {
            color: defaultColor.startsWith('#') ? defaultColor : props.defaultColors[defaultColor],
            width: props.width ? props.width : 38,
            height: props.height ? props.height : 38
        }
    }

    render() {
        return <View>
            <Svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width={this.state.width}
                height={this.state.height}>
                <Path
                    fill={this.state.color}
                    d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"
                    fill-rule="evenodd"
                    viewBox="0 0 24 24"
                />
            </Svg>
        </View>;
    }
}

export default SVG;
