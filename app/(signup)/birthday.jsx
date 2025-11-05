import { StyleSheet, Text, View, useColorScheme, Pressable, Platform, TouchableWithoutFeedback } from 'react-native'
import { React, useState } from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker'

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const Birthday = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    const router = useRouter()
    
    const handleSubmit = () => {
        router.push('/username')
        console.log('DoB:', date)
    }

    const [date, setDate] = useState(null);
    const [show, setShow] = useState(false);

    // get today's date in the desired format
    const todayString = new Date().toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // handles when a date is selected
    const onChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShow(Platform.OS === 'ios'); // keep open on iOS
        setDate(currentDate);
    };

    return (
        <TouchableWithoutFeedback onPress={() => setShow(false)}>
            <ThemedView style = {styles.container} safe = {true}>
                <Pressable 
                    onPress={() => router.back()}
                    style={{
                        position: 'absolute',
                        top: 50,          // adjust for status bar / safe area
                        left: 20,
                        zIndex: 10,       // keep it above page content
                        padding: 8,
                    }}
                >
                    <Text style={{ fontSize: 40, color: theme.textPrimary }}>←</Text>
                </Pressable>

                
                <ThemedText style={styles.title}>What's your date of birth?</ThemedText>
                <Spacer />
                <ThemedTextInput
                    placeholder={todayString}
                    keyboardType="default"
                    editable={false}
                    onChangeText={date}
                    value={
                        date
                            ? date.toLocaleDateString('en-GB', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })
                            : ''
                        }
                    onPressIn={() => setShow(true)}
                />
                <Text style={[styles.textSecondary, {color: theme.textSecondary}]}>
                    Your birthday won't be shown publicly
                </Text>
                <ThemedButton style={{
                    position: 'absolute',
                    top: '61.8%',
                }} 
                onPress={handleSubmit}>
                        <ThemedText style = {styles.buttonText}>Continue {'-->'}</ThemedText>
                </ThemedButton>


                {show && (
                    <View style={[styles.datePicker, {borderTopColor: theme.divider, backgroundColor: theme.dateBackground}]}>
                        <DateTimePicker
                        value={date || new Date}
                        mode="date"
                        display="spinner"
                        onChange={onChange}
                        minimumDate={new Date(1900, 0, 1)} // optional
                        maximumDate={new Date()} // optional
                        style={{
                            transform: [{ scaleY: 1.0}, {scaleX: 1.15 }],
                        }}
                        />
                    </View>
                )}
            </ThemedView>
        </TouchableWithoutFeedback>
    )
}

export default Birthday

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        // justifyContent: 'center',
    },
    title: {
        fontFamily: 'inter',
        fontWeight: 'bold',
        fontSize: 24,
        paddingTop: '35%'
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
        width: '75%',
        textAlign: 'center'
    },
    datePicker: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0, // 👈 stick to bottom
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 24,
    alignItems: 'center'
  },
})