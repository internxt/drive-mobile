import React from 'react'
import { Text } from 'react-native'

/**
 * Bold text component, HTML-like
 * @param props 
 */
export default function Bold(props: any) {
  return <Text style={{ fontWeight: 'bold', color: '#2c2c2c' }}>{props.children}</Text>
}