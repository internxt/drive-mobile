import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Accordion from 'react-native-collapsible/Accordion';
import * as Unicons from '@iconscout/react-native-unicons';
import { tailwind } from '../../helpers/designSystem';

const SECTIONS = [
  {
    title: 'Starter 20GB',
    size: '20GB',
    content: {
      subscriptions: [
        {
          name: 'Monthly',
          price: '0.99',
        },
        {
          name: 'Semiannually',
          price: '0.95',
        },
        {
          name: 'Annually',
          price: '0.89',
        },
      ],
    },
  },
  {
    title: 'Starter 200GB',
    size: '200GB',
    content: {
      subscriptions: [
        {
          name: 'Monthly',
          price: '4.49',
        },
        {
          name: 'Semianually',
          price: '3.99',
        },
        {
          name: 'Annually',
          price: '3.49',
        },
      ],
    },
  },
  {
    title: 'Starter 2TB',
    size: '2TB',
    content: {
      subscriptions: [
        {
          name: 'Monthly',
          price: '9.99',
        },
        {
          name: 'Semiannually',
          price: '9.49',
        },
        {
          name: 'Annually',
          price: '8.99',
        },
      ],
    },
  },
];

const _renderHeader = (section) => {
  return (
    <View style={tailwind('bg-white flex-row items-center p-3 border-b border-neutral-500')}>
      <View style={tailwind('flex-1')}>
        <Text>{section.title}</Text>
      </View>

      <View>
        <Unicons.UilAngleDown color="gray" />
      </View>
    </View>
  );
};

const _renderContent = (section) => {
  return (
    <View style={tailwind('bg-white p-4')}>
      <View>
        <Text>{section.size}</Text>
      </View>

      {section.content.subscriptions.map((item, i) => (
        <View key={i}>
          <View style={tailwind('flex-grow')}>
            <Text>{item.name}</Text>
          </View>
          <View style={tailwind('flex-row items-center')}>
            <Text>{item.price}</Text>
            <Text>/month</Text>
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

function IndividualsTab(): JSX.Element {
  const [activeSections, setActiveSections] = useState<number[]>([]);

  return (
    <View style={tailwind('bg-white flex-1')}>
      <Accordion
        sections={SECTIONS}
        activeSections={activeSections}
        renderHeader={_renderHeader}
        renderContent={_renderContent}
        onChange={setActiveSections}
      />
    </View>
  );
}

export default IndividualsTab;
