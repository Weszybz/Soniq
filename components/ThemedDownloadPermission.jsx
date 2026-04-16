import { StyleSheet, View, Text, Pressable, Modal, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';


const ThemedDownloadPermission = ({
  visible,
  recipientUsername,
  fileName,
  currentPermission,
  onConfirm,
  onCancel,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const isEditing = currentPermission !== undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.container} onPress={onCancel}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.navBackground }]}
          onPress={() => {}}
        >
          <View style={[styles.iconWrap, { backgroundColor: theme.uiBackground }]}>
            <Ionicons name="musical-note" size={28} color={Colors.primary} />
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {isEditing ? 'Download Permission' : 'Allow Download?'}
          </Text>

          {fileName ? (
            <Text style={[styles.fileName, { color: theme.textSecondary }]} numberOfLines={1}>
              {fileName}
            </Text>
          ) : null}

          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {isEditing
              ? `Should ${recipientUsername} be allowed to download this audio file?`
              : `Do you want to allow ${recipientUsername} to download this audio snippet?\n\nYou can change this at any time after sending.`}
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.denyBtn,
                { backgroundColor: isEditing && currentPermission === false ? Colors.primary : theme.uiBackground, opacity: pressed ? 0.75 : 1 }]}
              onPress={() => onConfirm(false)}
            >
              <Ionicons name="lock-closed-outline" size={18}
                color={ isEditing && currentPermission === false ? '#fff' : theme.textPrimary }
              />
              <Text style={[ styles.btnText, { color: isEditing && currentPermission === false ? '#fff' : theme.textPrimary, }]}
              >
                No Download
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.allowBtn,
                { backgroundColor: isEditing && currentPermission === true ? Colors.primary : Colors.primary, opacity: pressed ? 0.75 : 1 }]}
              onPress={() => onConfirm(true)}
            >
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={[styles.btnText, { color: '#fff' }]}>Allow Download</Text>
            </Pressable>
          </View>

          {/* Cancel */}
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default ThemedDownloadPermission;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'inter',
    marginBottom: 6,
    textAlign: 'center',
  },
  fileName: {
    fontSize: 13,
    fontFamily: 'inter',
    marginBottom: 10,
    maxWidth: '90%',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    fontFamily: 'inter',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: '90%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  denyBtn: {},
  allowBtn: {},
  btnText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'inter',
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'inter',
  },
});
