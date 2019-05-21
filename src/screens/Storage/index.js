import React, { Component } from "react";
import { StyleSheet, Text, View, TouchableHighlight, ScrollView } from "react-native";
import { compose } from "redux";
import { connect } from "react-redux";
import prettysize from 'prettysize'

import AppMenu from "../../components/AppMenu";
import PlanListItem from "../../components/PlanListItem";
import ProgressBar from "../../components/ProgressBar";
import { userActions } from "../../actions";

import { LinearGradient } from 'expo';

class Storage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      plans: [],
      usage: {
        activePlanId: 0,
        used: 0,
        maxLimit: 1024 * 1024 * 1024,
        remaining: 2
      }
    };
  }

  componentDidMount() {
    // Get plans info
    fetch(`${process.env.REACT_APP_API_URL}/api/plans`, {
      method: "POST"
    }).then(async (response) => {
      const data = await response.json();
      this.setState({ plans: data });
    })

    //Update storage data
    this.updateStorageInfo();
  }

  updateStorageInfo = () => {
    const user = this.props.authenticationState.user.email;

    // Get storage data
    fetch(`${process.env.REACT_APP_API_URL}/api/limit`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: user
      })
    }).then(res => res.json())
      .then(res => {
        var copyUsage = this.state.usage;
        copyUsage.maxLimit = res.maxSpaceBytes;
        this.setState({ usage: copyUsage })
      }).catch(err => {
        console.log(err);
      });

    fetch(`${process.env.REACT_APP_API_URL}/api/usage`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: user })
    }).then(res => res.json())
      .then(res => {
        var copyUsage = this.state.usage;
        copyUsage.used = res.total;
        this.setState({ usage: copyUsage })
      }).catch(err => {
        console.log(err);
      });
  }

  render() {
    const { plans, usage } = this.state;
    const { navigation } = this.props;
    const breadcrumbs = {
      name: "Storage"
    };

    return (
      <ScrollView style={styles.container}>

        <View>
          <View style={[styles.marginBox, { marginTop: 5 }]} >
            <AppMenu navigation={navigation} breadcrumbs={breadcrumbs} />
          </View>
          <View style={[styles.divider, { marginTop: 5, marginBottom: 40 }]} />

          <View style={styles.marginBox}>
            <View style={styles.titleWrapper}>
              <Text style={styles.title}>Storage Space</Text>
              <Text style={styles.subtitleInline}>
                Used <Text style={styles.bold}>{prettysize(this.state.usage.used)}</Text> of <Text style={styles.bold}>{prettysize(this.state.usage.maxLimit)}</Text>
              </Text>
            </View>

            <View style={{ marginTop: 22, marginBottom: 22 }}>
              <ProgressBar totalValue={this.state.usage.maxLimit} usedValue={this.state.usage.used} />
            </View>

            <View style={{ flexDirection: 'row' }}>
              <View style={styles.legendWrapper}>
                <LinearGradient style={styles.legendFill} colors={['#096dff', '#00b1ff']} />
                <Text style={styles.textLegend}>Used space</Text>
              </View>

              <View style={{ width: 25 }} />

              <View style={styles.legendWrapper}>
                <View style={styles.legendEmpty} />
                <Text style={styles.textLegend}>Unused space</Text>
              </View>
            </View>

          </View>

          <View style={[styles.divider, { marginTop: 38, marginBottom: 20 }]} />
        </View>

        <View style={styles.marginBox}>
          <View>
            <Text style={[styles.title, { marginBottom: 25 }]}>Storage Plans</Text>
          </View>
          {this.state.plans.map(plan => (
            <PlanListItem
              plan={plan}
              key={plan.id}
              navigation={navigation}
            />
          ))}
        </View>
        <View style={[styles.marginBox, { marginBottom: 41, marginTop: 30 }]}>
          <TouchableHighlight
            style={styles.button}
            underlayColor="#FFF"
            onPress={() => this.props.dispatch(userActions.signout())}
          >
            <Text style={styles.buttonLabel}>Cancel plan</Text>
          </TouchableHighlight>
        </View>

      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF",
    display: "flex",
    flexDirection: "column",
    padding: 0
  },
  marginBox: {
    marginLeft: 20,
    marginRight: 20
  },
  titleWrapper: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    fontFamily: "CircularStd-Bold",
    fontSize: 22,
    letterSpacing: -0.7,
    color: "#000000"
  },
  subtitle: {
    fontFamily: "CircularStd-Book",
    fontSize: 18,
    letterSpacing: -0.2,
    lineHeight: 22,
    color: "#404040",
    maxWidth: 250,
    marginBottom: 20
  },
  textLegend: {
    fontFamily: "CircularStd-Book",
    fontSize: 17,
    letterSpacing: -0.2,
    color: "#7e848c"
  },
  subtitleInline: {
    fontFamily: "CircularStd-Book",
    fontSize: 15,
    letterSpacing: -0.2,
    color: "#404040"
  },
  legendWrapper: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start"
  },
  legendFill: {
    width: 16,
    height: 16,
    backgroundColor: "#4b66ff",
    borderRadius: 16,
    marginRight: 10
  },
  legendEmpty: {
    width: 16,
    height: 16,
    backgroundColor: "#e8e8e8",
    borderRadius: 16,
    marginRight: 10
  },
  divider: {
    height: 1,
    backgroundColor: "#f2f2f2"
  },
  button: {
    height: 24,
    marginBottom: 10,
    marginTop: 15
  },
  buttonLabel: {
    fontFamily: "CircularStd-Book",
    color: "#4b66ff",
    fontSize: 16,
    letterSpacing: -0.2
  },
  bold: {
    fontFamily: 'CircularStd-Bold'
  }
});

const mapStateToProps = state => {
  return {
    ...state
  };
};

export default (StorageComposed = compose(connect(mapStateToProps))(Storage));
