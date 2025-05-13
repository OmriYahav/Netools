// SuggestedPorts.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  setPort: (port: string) => void;
}

const ports = [80, 443, 554, 8080, 5000, 9000];

export default function SuggestedPorts({ setPort }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Popular Ports</Text>
      <View style={styles.row}>
        {ports.map(p => (
          <TouchableOpacity key={p} style={styles.button} onPress={() => setPort(p.toString())}>
            <Text style={styles.text}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 10 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    backgroundColor: '#4facfe',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    margin: 4,
  },
  text: { color: 'white', fontWeight: 'bold' },
});
