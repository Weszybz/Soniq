import { View } from 'react-native'

const Spacer = ({ width = "100%", height = 16, style }) => {
  return (
    <View style={[{ width, height }, style]} />
  )
}

export default Spacer