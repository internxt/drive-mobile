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
        <B>Internxt Drive</B> is a <B>different</B> cloud storage service. A{' '}
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
        For every year you&apos;re <B>subscribed</B> to one of Internxt
        Drive&apos;s <B>premium</B> plans, you&apos;ll be helping deforestation
        by <B>planting a tree</B> across the planet.
      </Text>
    ),
    image: require('../../../assets/images/intro/intro03.png')
  },
  {
    key: 'intro004',
    text: (
      <Text>
        Access Internxt Drive from <B>Desktop</B>, <B>Web</B> or{' '}
        <B>Mobile</B>. Start using Drive today with <B>2 GB</B> on
        us. <B>Upgrade your storage</B> when needed, free for a month, cancel anytime.
      </Text>
    ),
    image: require('../../../assets/images/intro/intro04.png')
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

function Intro(props: IntroProps) {
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
  body: {
    backgroundColor: '#fff',
    padding: normalize(31),
    flex: 1
  },
  explanationText: {
    fontFamily: 'CerebriSans-Medium',
    fontSize: normalize(22),
    textAlign: 'center',
    lineHeight: normalize(28),
    color: '#7e7e7e',
    marginTop: normalize(30)
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: 100
  },
  image: {
    width: '90%',
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
    height: normalize(46),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: normalize(40),
    marginRight: normalize(27),
    marginLeft: normalize(27)
  },
  buttonSkipText: {
    textAlign: 'center',
    color: 'white',
    fontSize: normalize(18),
    fontFamily: 'CerebriSans-Regular'
  }
});

const mapStateToProps = (state: any) => {
  return { ...state };
};

export default connect(mapStateToProps)(Intro);
