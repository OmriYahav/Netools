
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function HomeScreen() {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [results, setResults] = useState<any>(null);
  const [clientIp, setClientIp] = useState<string | null>(null);

  useEffect(() => {
    axios.get('http://172.16.10.150:8000/my-ip')
      .then(res => setClientIp(res.data.your_ip))
      .catch(() => setClientIp("Unavailable"));
  }, []);

  const check = async () => {
    setResults(null);
    try {
      const [portRes, pingRes, geoRes] = await Promise.all([
        axios.get(`http://172.16.10.150:8000/check-port?ip=${ip}&port=${port}`),
        axios.get(`http://172.16.10.150:8000/ping?ip=${ip}`),
        axios.get(`http://172.16.10.150:8000/geolocate?ip=${ip}`),
      ]);

      setResults({
        portStatus: portRes.data.status,
        ping: pingRes.data,
        geo: geoRes.data,
      });
    } catch (err) {
      setResults({ error: "Could not fetch data. Make sure backend is reachable." });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>OmriSoft</Text>
      <Text style={styles.title}>Port Forwarding Tester</Text>
      {clientIp && <Text style={styles.myIp}>Your IP: {clientIp}</Text>}
      <TextInput style={styles.input} placeholder="IP Address" value={ip} onChangeText={setIp} />
      <TextInput style={styles.input} placeholder="Port" keyboardType="numeric" value={port} onChangeText={setPort} />
      <Button title="Check" onPress={check} />
      {results && (
        <View style={styles.results}>
          {results.error ? (
            <Text style={styles.error}>{results.error}</Text>
          ) : (
            <>
              <Text style={styles.result}>Port: {results.portStatus}</Text>
              <Text style={styles.result}>Reachable: {results.ping.reachable ? "Yes" : "No"}</Text>
              <Text style={styles.result}>Avg Latency: {results.ping.avg_latency_ms.toFixed(2)} ms</Text>
              <Text style={styles.result}>Country: {results.geo.country}</Text>
              <Text style={styles.result}>Region: {results.geo.regionName}</Text>
              <Text style={styles.result}>City: {results.geo.city}</Text>
              <Text style={styles.result}>ISP: {results.geo.isp}</Text>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f0f4f7', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  myIp: { textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#555', marginBottom: 15 },
  input: { backgroundColor: '#fff', padding: 10, marginVertical: 10, borderRadius: 8, borderColor: '#ccc', borderWidth: 1 },
  results: { marginTop: 20, backgroundColor: '#fff', padding: 15, borderRadius: 8 },
  result: { fontSize: 16, marginBottom: 5 },
  error: { color: 'red', fontWeight: 'bold' }
});
