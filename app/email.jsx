import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const email = () => {
  return (
    <View style = {styles.container}>
      <Text>email</Text>
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