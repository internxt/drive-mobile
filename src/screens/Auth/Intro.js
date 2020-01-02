import React, { Component } from "react";
import AppIntroSlider from 'react-native-app-intro-slider';
import {
    View,
    Text,
    Image,
    StyleSheet,
    Alert
} from "react-native";
import { TouchableHighlight } from "react-native-gesture-handler";

const B = (props) => <Text style={{fontWeight: 'bold', color: '#2c2c2c'}}>{props.children}</Text>

const slides = [
    {
        key: 'intro001',
        text: <Text><B>X Cloud</B> is a <B>different</B> cloud storage service. A <B>better</B> place for all your files. Welcome to the <B>revolution</B>. Welcome to <B>Internxt</B>.</Text>,
        image: require('../../../assets/images/intro/intro01.png')
    },
    {
        key: 'intro002',
        text: <Text>Files are <B>encrypted</B> on your device. There is <B>no way</B> we nor any other third-party can access them. <B>Privacy</B>, as it should have always been.</Text>,
        image: require('../../../assets/images/intro/intro02.png')
    },
    {
        key: 'intro003',
        text: <Text>For every year you&apos;re <B>subscribed</B> to one of X Cloud&apos;s <B>premium</B> plans, you&apos;ll be helping deforestation by <B>planting a tree</B> across the planet.</Text>,
        image: require('../../../assets/images/intro/intro03.png')
    },
    {
        key: 'intro004',
        text: <Text>Access X Cloud from our <B>Desktop</B>, <B>Web</B> or <B>Mobile</B> app. Start using X Cloud today with <B>2 GB</B> on us. <B>Upgrade your storage</B> only if you need to, from our Web app.</Text>,
        image: require('../../../assets/images/intro/intro04.png')
    }
];

class Intro extends Component {
    constructor() {
        super()
    }

    renderItem({ item }) {
        return <View style={styles.body}>
            <Text style={styles.explanationText}>{item.text}</Text>
            <View style={styles.imageContainer}>
                <Image source={item.image} style={styles.image} />
            </View>
        </View>
    }

    renderNextButton() {
        return <TouchableHighlight style={styles.buttonSkip}>
            <Text style={styles.buttonSkipText}>Next</Text>
        </TouchableHighlight>
    }

    renderDoneButton() {
        return <TouchableHighlight style={styles.buttonSkip}>
            <Text style={styles.buttonSkipText}>Get Started</Text>
        </TouchableHighlight>
    }

    render() {
        return <AppIntroSlider
            slides={slides}
            renderItem={this.renderItem}
            renderNextButton={this.renderNextButton}
            renderDoneButton={this.renderDoneButton}
            bottomButton
            onDone={() => { this.props.onFinish() }}
            activeDotStyle={styles.activeDot}
            dotStyle={styles.inactiveDot}
        />
    }
}

const styles = StyleSheet.create({
    body: {
        margin: 41,
        flex: 1
    },
    explanationText: {
        fontFamily: 'CerebriSans-Medium',
        fontSize: 22,
        textAlign: 'center',
        lineHeight: 28,
        color: '#7e7e7e',
        marginTop: 30
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        marginBottom: 100
    },
    image: {
        width: '100%',
        height: undefined,
        aspectRatio: 1,
        justifyContent: 'center'
    },
    activeDot: {
        backgroundColor: '#a4a4a4'
    },
    inactiveDot: {
        backgroundColor: '#e8e8e8'
    },
    buttonSkip: {
        borderRadius: 23,
        backgroundColor: '#007aff',
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
        marginRight: 27,
        marginLeft: 27
    },
    buttonSkipText: {
        textAlign: 'center',
        color: 'white',
        fontSize: 18,
        fontFamily: 'CerebriSans-Regular'
    }
})

export default Intro