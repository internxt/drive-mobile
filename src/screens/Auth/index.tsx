import React, { useState } from 'react'
import { Text, View } from 'react-native'

export default function Auth() {

  const [loggedIn, setLoggedIn] = useState(false)
  const [screen, setScreen] = useState('SIGNIN')

  return <View><Text style={{ fontSize: 50 }}>Holas</Text></View>
}