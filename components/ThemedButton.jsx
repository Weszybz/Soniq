import { Pressable, StyleSheet } from 'react-native'
import { Colors } from '../constants/Colors'

function ThemedButton({ style, ...props }) {
  return (
    <Pressable 
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, style]} 
      {...props}
    />
  )
}
const styles = StyleSheet.create({
  btn: {
    backgroundColor: Colors.button,
    paddingVertical: 16,
    paddingHorizontal: 110,
    borderRadius: 30,
    marginVertical: 16,
  },
  pressed: {
    opacity: 0.5
  },
})

export default ThemedButton