import React, { useState, useEffect } from 'react';
import { Text, View, TouchableHighlight, ScrollView } from 'react-native';
import { connect } from 'react-redux';
import { deviceStorage } from '../../helpers';
import { Reducers } from '../../store/reducers/reducers';
import Accordion from 'react-native-collapsible/Accordion';
import { tailwind } from '../../helpers/designSystem';

function DebugView(props: Reducers): JSX.Element {

  const [deviceStorageKeys, setDeviceStorageKeys] = useState<string[]>()
  const [activeSections, setActiveSections] = useState<number[]>([]);
  const [value, setValue] = useState('');

  useEffect(() => {
    deviceStorage.listItems().then(result => {
      setDeviceStorageKeys(result);
    })
  }, [])

  return <ScrollView style={tailwind('bg-white')}>
    <Text>Device Storage</Text>
    <Accordion
      activeSections={activeSections}
      sections={deviceStorageKeys || []}
      renderHeader={(section) => {
        return <View style={tailwind('p-3 border')}><Text>{section}</Text></View>
      }}
      renderContent={(section, index) => {
        return <View>
          <Text>Value:</Text>
          <Text>{value}</Text>
          <TouchableHighlight
            style={tailwind('bg-blue-60 p-3 items-center self-center rounded')}
            onPress={() => {
              deviceStorage.getItem(section).then(setValue).catch(() => { })
            }}>
            <Text style={tailwind('text-white')}>Update</Text>
          </TouchableHighlight>
        </View>
      }}
      onChange={(sectionIndexes) => {
        if (sectionIndexes.length === 0) {
          return setActiveSections([]);
        }
        const key = deviceStorageKeys[sectionIndexes[0]];

        deviceStorage.getItem(key).then(value => {
          try {
            setValue(JSON.stringify(JSON.parse(value), null, 2));
          } catch {
            setValue(value);
          }
          setActiveSections(sectionIndexes)
        })
      }}
    />
  </ScrollView>
}

const mapStateToProps = (state: any) => ({ ...state });

export default connect(mapStateToProps)(DebugView);