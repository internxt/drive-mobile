import React, { ReactNode } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import AppIntroSlider from 'react-native-app-intro-slider';
import { TouchableHighlight } from 'react-native-gesture-handler';
import { connect } from 'react-redux';
import { normalize } from '../../helpers';
import B from '../../components/Bold'
interface IntroProps {
  onFinish: () => void
  navigation?: any
}

const slides = [
  {
    key: 'intro001',
    text: (
      <Text>
        <B>Internxt</B> is a <B>different</B> cloud storage service. A{' '}
        <B>better</B> place for all your files. Welcome to the <B>revolution</B>
        . Welcome to <B>Internxt</B>.
      </Text>
    ),
    image: require('../../../assets/images/intro/intro01.png')
  },
  {
    key: 'intro002',
    text: (
      <Text>
        Files are <B>encrypted</B> on your device. There is <B>no way</B> we nor
        any other third-party can access them. <B>Privacy</B>, as it should have
        always been.
      </Text>
    ),
    image: require('../../../assets/images/intro/intro02.png')
  },
  {
    key: 'intro003',
    text: (
      <Text>
        Access Internxt from <B>Desktop</B>, <B>Web</B> or{' '}
        <B>Mobile</B>. Start using Drive today with <B>2 GB</B> on
        us. <B>Upgrade your storage</B> when needed, free for a month, cancel anytime.
      </Text>
    ),
    image: require('../../../assets/images/intro/intro03.png')
  }
];

function renderItem({ item }: any) {
  return (
    <View style={styles.body}>
      <Text style={styles.explanationText}>{item.text}</Text>
      <View style={styles.imageContainer}>
        <Image source={item.image} style={styles.image} />
      </View>
    </View>
  );
}

function renderNextButton(): ReactNode {
  return (
    <TouchableHighlight style={styles.buttonSkip}
      activeOpacity={1}
      underlayColor="#007aff">
      <Text style={styles.buttonSkipText}>Next</Text>
    </TouchableHighlight>
  );
}

function renderDoneButton() {
  return (
    <TouchableHighlight style={styles.buttonSkip}
      activeOpacity={1}
      underlayColor="#007aff">
      <Text style={styles.buttonSkipText}>Get Started</Text>
    </TouchableHighlight>
  );
}

function Intro(props: IntroProps): JSX.Element {
  return <AppIntroSlider
    data={slides}
    renderItem={renderItem}
    renderNextButton={renderNextButton}
    renderDoneButton={renderDoneButton}
    bottomButton
    onDone={() => {
      props.onFinish()
    }}
    activeDotStyle={styles.activeDot}
    dotStyle={styles.inactiveDot}
  />

}

const styles = StyleSheet.create({
  activeDot: {
    backgroundColor: '#a4a4a4'
  },
  body: {
    backgroundColor: '#fff',
    flex: 1,
    padding: normalize(31)
  },
  buttonSkip: {
    alignItems: 'center',
    backgroundColor: '#007aff',
    borderRadius: 23,
    height: normalize(46),
    justifyContent: 'center',
    marginBottom: normalize(40),
    marginLeft: normalize(27),
    marginRight: normalize(27)
  },
  buttonSkipText: {
    color: 'white',
    fontFamily: 'CerebriSans-Regular',
    fontSize: normalize(18),
    textAlign: 'center'
  },
  explanationText: {
    color: '#7e7e7e',
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(22),
    lineHeight: normalize(28),
    marginTop: normalize(30),
    textAlign: 'center'
  },
  image: {
    aspectRatio: 1,
    height: undefined,
    justifyContent: 'center',
    width: '90%'
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 100
  },
  inactiveDot: {
    backgroundColor: '#e8e8e8'
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Intro);
