import React, { useState } from 'react'
import { ScrollView, Pressable, StyleSheet, useColorScheme } from 'react-native'
import { Colors } from '../constants/Colors'
import ThemedText from './ThemedText'


function ThemedProfileScroller({
    options = ['Tracks', 'Collaborations', 'Feedback', 'Reposts', 'Likes'],
    initialIndex = 0,
    onChange,          // (index, value) => void
    style,             // extra style for the ScrollView container
    itemStyle,         // extra style for each option button
    textStyle,         // extra style for the text
}) {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light
    const [selectedIndex, setSelectedIndex] = useState(initialIndex)

  function handlePress(index) {
    setSelectedIndex(index)
    if (onChange) {
      onChange(index, options[index])
    }
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={styles.container}
    >
      {options.map((label, index) => {
        const isSelected = selectedIndex === index

        return (
          <Pressable
            key={label}
            onPress={() => handlePress(index)}
            style={({ pressed }) => [
              styles.item, {borderBlockColor: theme.divider},
              isSelected && styles.itemSelected,
              (pressed || isSelected) && styles.itemPressed,
              itemStyle,
            ]}
          >
            <ThemedText style={[styles.itemText, {color: theme.textPrimary}]}>
              {label}
            </ThemedText>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    // paddingHorizontal: 10,
  },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    //marginRight: 10,
    borderBottomWidth: 2,
    //alignSelf: 'center',
    //borderColor: theme.divider,        // define in your Colors
  },
  itemSelected: {
    borderBlockColor: Colors.primary,    // similar to your ThemedButton
  },
  itemPressed: {
    // opacity: 0.7,
    // transform: [{ scale: 0.97 }],
  },
  itemText: {
    fontWeight: '600',
    fontFamily: 'inter'
  },
  itemTextSelected: {
    color: Colors.onButton || 'white',
  },
})

export default ThemedProfileScroller