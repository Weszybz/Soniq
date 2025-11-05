import { StyleSheet, Text, View, useColorScheme } from 'react-native'
import React from 'react'
import { Link, useRouter } from 'expo-router'
import { Colors } from '../constants/Colors';

// themed components
import ThemedView from '../components/ThemedView';
import ThemedText from '../components/ThemedText';
import Spacer from '../components/Spacer';
import ThemedButton from '../components/ThemedButton';

const Index = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    const router = useRouter()

    const handleSubmit = () => {
        console.log('login form submitted')
        router.push('/login')

    }
  return (
    <ThemedView style ={styles.container} safe = {true}>
      <ThemedText>Index</ThemedText>
      <Spacer />
      <ThemedButton onPress={handleSubmit}>
        <ThemedText style = {styles.buttonText}>Login</ThemedText>
      </ThemedButton>
      <Link href="/email">Sign Up</Link>
    </ThemedView>
  )
}

export default Index

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontFamily: 'inter',
        fontStyle: 'normal',
        fontWeight: 'bold',
        fontSize: 20
    }
})