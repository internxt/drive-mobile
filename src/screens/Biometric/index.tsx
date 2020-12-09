import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native'
import { useState } from "react";
import Constants from 'expo-constants'
import { connect } from 'react-redux';


interface BiometricProps {
    goToForm?: (screenName: string) => void
}

function Biometric(props: any) {
    const [compatible, setIsCompatible] = useState(false)
    const [fingerprints, setIsFingerPrints] = useState(false)
    const [result, setIsResult] = useState('')
    const [sccaned, setIsSccaned] = useState(false)


    useEffect(() => {
       

    })


}







