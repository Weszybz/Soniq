import { Pressable, TextInput, useColorScheme, View } from "react-native";
import { Colors } from "../constants/Colors";
import { Ionicons } from '@expo/vector-icons'

export default function ThemedSearchBar({ value, onChangeText, placeholder = "Search", onFocus, onClear, style, ...props}) {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    const handleClear = () => {
        if (onChangeText) {
            onChangeText('')
        }
        if (onClear) {
            onClear()
        }
    }

    return (
        <View
            style={[
                {
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.uiBackground,
                    width: '90%',
                    paddingVertical: 2,
                    paddingHorizontal: 16,
                    borderRadius: 20,
                },
                style
            ]}
        >
            <Ionicons
                name="search"
                size={24}
                color={theme.textSecondary}
                style={{ marginRight: 8 }}
            />
            <TextInput
                value={value}
                onChangeText={onChangeText}
                onFocus={onFocus}
                placeholder={placeholder}
                placeholderTextColor={theme.textSecondary}
                keyboardType="default"
                autoCapitalize="none"
                style={{
                    flex: 1,
                    color: theme.textSecondary,
                    fontFamily: 'inter',
                    fontWeight: '600',
                    paddingVertical: 12,
                    fontSize: 18,
                }}
                {...props}
            />
            {value && value.length > 0 && (
                <Pressable onPress={handleClear} hitSlop={8}>
                    <Ionicons
                        name="close-circle"
                        size={20}
                        color={theme.textSecondary}
                    />
                </Pressable>
            )}
        </View>
    )
}