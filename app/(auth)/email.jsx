import { StyleSheet, Text, View, useColorScheme } from 'react-native'
import React from 'react'
import { Colors } from '../../constants/Colors';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';

const email = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light
    
    const handleSubmit = () => {
        console.log('login form submitted')
    }

    return (
        <ThemedView style = {styles.container}>
        <Text style={[styles.textSecondary, {color: theme.textSecondary}]}>
            By tapping Continue, you are agreeing to our{' '}
            <Text style={{fontWeight: 'bold'}}>Terms of Service</Text> and{' '}
            <Text style={{fontWeight: 'bold'}}>Privacy Policy</Text>
        </Text>
        <ThemedButton onPress={handleSubmit}>
                <ThemedText style = {styles.buttonText}>Continue {'-->'}</ThemedText>
        </ThemedButton>
        </ThemedView>
    )
}

export default email

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
    },
    textSecondary: {
        fontFamily: 'inter',
        fontStyle: 'normal',
        fontWeight: '600',
        fontSize: 14,
        marginHorizontal: 70,
        textAlign: 'center'
    },
})