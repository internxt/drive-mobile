import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';


class SVG extends React.Component {
    constructor(props) {
        super(props);

        const defaultColor = props.color ? props.color : 'blue';

        this.state = {
            color: defaultColor.startsWith('#') ? defaultColor : props.defaultColors[defaultColor],
            width: props.width ? props.width : 29,
            height: props.height ? props.height : 38
        }
    }

    render() {
        return <View style={[StyleSheet.absoluteFill]}>
            <Svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 29 38"
                width={this.state.width}
                height={this.state.height}>
                <Path
                    fill={this.state.color}
                    d="M804.881836,11.3088393 C804.881836,7.09505074 808.29252,3.67786454 812.5,3.67786454 C816.706715,3.67786454 820.118164,7.09505074 820.118164,11.3088393 L820.118164,15.7043359 L804.881836,15.7043359 L804.881836,11.3088393 L804.881836,11.3088393 L804.881836,11.3088393 L804.881836,11.3088393 Z M824.859137,15.7043359 L823.789089,15.7043359 L823.789089,11.3088393 C823.789089,5.06329318 818.735061,0 812.5,0 C806.264939,0 801.210146,5.06329318 801.210146,11.3088393 L801.210146,15.7043359 L800.139332,15.7043359 C798.956767,15.7043359 798,16.6619454 798,17.8472651 L798,35.8555374 C798,37.0400904 798.956767,38 800.139332,38 L824.859137,38 C826.041702,38 827,37.0400904 827,35.8555374 L827,17.8472651 C827,16.6619454 826.041702,15.7043359 824.859137,15.7043359 L824.859137,15.7043359 L824.859137,15.7043359 L824.859137,15.7043359 L824.859137,15.7043359 Z"
                    transform="translate(-798)"
                    fill-rule="evenodd"
                />
            </Svg>
        </View>;
    }
}

export default SVG;
