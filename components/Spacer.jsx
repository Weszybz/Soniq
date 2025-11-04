import { View } from 'react-native'

const Spacer = ({ width = "100%", height = 16 }) => {
  return (
    <View style={{ width, height }} />
  )
}

export default Spacer