import { StyleSheet, Text, View, useColorScheme } from 'react-native'
import React from 'react'
import { Colors } from '../constants/Colors';

const email = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light
  return (
    <View style = {[styles.container, { backgroundColor: theme.background }]}>
      <Text style = {{ color: theme.textPrimary }}>email</Text>
    </View>
  )
}

export default email

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    }
})