import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import React from 'react';
import { View } from 'react-native';
import { connect } from 'react-redux';
import AppMenu from '../../components/AppMenu';
import { Reducers } from '../../redux/reducers/reducers';
import BusinessTab from './BusinessTab';
import IndividualsTab from './IndividualsTab';

const Tab = createMaterialTopTabNavigator();

function BillingTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Individuals" component={IndividualsTab} />
      <Tab.Screen name="Business" component={BusinessTab} />
    </Tab.Navigator>
  );
}

function Billing(props: Reducers) {
  return <View style={{ flex: 1, backgroundColor: 'white' }}>
    <AppMenu
      {...props}
      title="Billing"
      onBackPress={() => props.navigation.goBack()} />

    <View style={{ flex: 1 }}>
      <BillingTabs />
    </View>

  </View>;
}

const mapStateToProps = (state: any) => ({ ...state });

export default connect(mapStateToProps)(Billing);