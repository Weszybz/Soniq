import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput } from 'react-native'
import { Colors } from '../../constants/Colors';


// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';

const Discover = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light
  return (
    <ThemedView style={styles.container} safe={true}>
      <Text>Discover</Text>
    </ThemedView>
  )
}

export default Discover

const styles = StyleSheet.create({
  container: {
        flex: 1,
        alignItems: 'center',
        // justifyContent: 'center',
    },
})