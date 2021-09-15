import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux';
import Accordion from 'react-native-collapsible/Accordion';
import * as Unicons from '@iconscout/react-native-unicons'

const SECTIONS = [
  {
    title: 'Starter 20GB',
    size: '20GB',
    content: {
      subscriptions: [
        {
          name: 'Monthly',
          price: '0.99'
        },
        {
          name: 'Semiannually',
          price: '0.95'
        },
        {
          name: 'Annually',
          price: '0.89'
        }
      ]
    }
  },
  {
    title: 'Starter 200GB',
    size: '200GB',
    content: {
      subscriptions: [
        {
          name: 'Monthly',
          price: '4.49'
        },
        {
          name: 'Semianually',
          price: '3.99'
        },
        {
          name: 'Annually',
          price: '3.49'
        }
      ]
    }
  },
  {
    title: 'Starter 2TB',
    size: '2TB',
    content: {
      subscriptions: [
        {
          name: 'Monthly',
          price: '9.99'
        },
        {
          name: 'Semiannually',
          price: '9.49'
        },
        {
          name: 'Annually',
          price: '8.99'
        }
      ]
    }
  }
];

const _renderHeader = (section) => {
  return (
    <View style={{
      backgroundColor: 'white', flexDirection: 'row',
      alignItems: 'center', padding: 10,
      borderBottomWidth: 1, borderColor: '#ccc'
    }}>
      <View style={{ flexGrow: 1 }}>
        <Text style={{ fontSize: 15, padding: 10 }}>{section.title}</Text>
      </View>

      <View>
        <Unicons.UilAngleDown color="gray" />
      </View>

    </View>
  );
};

const _renderContent = (section, index) => {
  return (
    <View style={{ backgroundColor: 'white', padding: 15 }}>
      <View>
        <Text style={{ fontSize: 30, fontFamily: 'NeueEinstellung-Bold' }}>{section.size}</Text>
      </View>

      {section.content.subscriptions.map((item, i) => (
        <View key={i} style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, flexDirection: 'row', margin: 5 }}>
          <View style={{ flexGrow: 1 }}>
            <Text style={{ fontSize: 20 }}>{item.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontFamily: 'NeueEinstellung-Bold' }}>{item.price}</Text>
            <Text style={{ fontSize: 15 }}>/month</Text>

          </View>
        </View>
      ))}

      <View>
        <Text>Everything in this plan</Text>
      </View>

      <View>
        <Text>All available devices</Text>
      </View>

      <View>
        <Text>Unlimited devices</Text>
      </View>

      <View>
        <Text>Secure file storing</Text>
      </View>

    </View>
  );
};

function IndividualsTab(props: any) {
  const [activeSections, setActiveSections] = useState<number[]>([]);

  return <View style={{ backgroundColor: 'white', flex: 1 }}>
    <Accordion
      sections={SECTIONS}
      activeSections={activeSections}
      renderHeader={_renderHeader}
      renderContent={_renderContent}
      onChange={setActiveSections}
    />
  </View>
}

const mapStateToProps = (state: any) => ({ ...state });

export default connect(mapStateToProps)(IndividualsTab);