import React from 'react'
import { Text, StyleSheet } from 'react-native'

interface BoldProps {
  children?: string
}

/**
 * Bold text component, HTML-like
 * @param props
 */
export default function Bold(props: BoldProps): JSX.Element {
  return <Text style={styles.boldComponent}>{props.children}</Text>
}

const styles = StyleSheet.create({
  boldComponent: {
    color: '#2c2c2c', fontWeight: 'bold'
  }
})