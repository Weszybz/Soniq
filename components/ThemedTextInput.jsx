import { TextInput, useColorScheme } from 'react-native'
import { Colors } from '../constants/Colors'

export default function ThemedTextInput({ style, ...props }) {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  return (
    <TextInput 
      style={[
        {
          backgroundColor: theme.uiBackground, 
          color: theme.textSecondary,
          width: '90%',
          paddingVertical: 18,
          paddingHorizontal: 16,
          borderRadius: 20,
          marginBottom: 16,
          fontFamily: 'inter',
          fontSize: 16,
          fontWeight: '600',
        }, 
        style
      ]}
      {...props}
    />
  )
}