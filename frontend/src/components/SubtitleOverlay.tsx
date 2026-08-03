import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAudio } from '../context/AudioContext';

export const SubtitleOverlay: React.FC = () => {
  const { subtitle } = useAudio();

  if (!subtitle) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.card}>
        <Text style={styles.text}>{subtitle}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});
export default SubtitleOverlay;
