import React, { useState } from 'react'
import { View, Text, ViewProps } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'

interface SegmentedOption {
  text: string
}

interface SegmentedControlProps extends ViewProps {
  tabs: SegmentedOption[]
  selectedIndex?: number
  onChange?: (tabNumber: number) => void
}

export function SegmentedControl(props: SegmentedControlProps): JSX.Element {

  const [selectedTab, setSelectedTab] = useState(props.selectedIndex || 0)

  return <View style={[{
    flexDirection: 'row',
    padding: 2,
    justifyContent: 'space-between',
    backgroundColor: '#F4F5F7',
    borderRadius: 10
  }, props.style]}>
    {props.tabs.map((tab, n) => {
      const isTabSelected = n === selectedTab

      return <View key={n} style={{ flexGrow: 1 }}>
        <TouchableOpacity
          onPress={() => {
            setSelectedTab(n);
            props.onChange && props.onChange(n)
          }}>
          <View style={[{
            padding: 10, borderRadius: 10, borderWidth: 1,
            alignItems: 'center'
          }, isTabSelected ? {
            backgroundColor: 'white',
            borderColor: '#EBECF0'
          } : {}]}>
            <Text style={[{ paddingHorizontal: 10 }, isTabSelected ? {} : { color: '#7A869A' }]}>{tab.text}</Text>
          </View>

        </TouchableOpacity>
      </View>
    })}
  </View>
}