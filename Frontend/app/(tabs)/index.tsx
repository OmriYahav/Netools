import axios from 'axios';
import React, { useEffect, useState, useRef } from 'react';
import { Animated, Button, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function HomeScreen() {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [results, setResults] = useState<any>(null);
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [whois, setWhois] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const autoFilledRef = useRef(false);

  useEffect(() => {
    axios.get('http://172.16.16.25:8000/my-ip')
      .then(res => {
        setClientIp(res.data.your_ip);
        if (!autoFilledRef.current) {
          setIp(res.data.your_ip);
          autoFilledRef.current = true;
        }
      })
      .catch(() => setClientIp("Unavailable"));
  }, []);

  const isValidIP = (ip: string) =>
    /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
    ip.split('.').every(num => parseInt(num) >= 0 && parseInt(num) <= 255);

  const isValidPort = (port: string) => {
    const portNum = parseInt(port, 10);
    return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
  };

  const check = async () => {
    setResults(null);
    setErrorMessage('');
    setErrorVisible(false);
    setWhois(null);
    fadeAnim.setValue(0);
    setLoading(true);

    if (!isValidIP(ip)) {
      setErrorMessage("❌ Invalid IP address format.");
      setErrorVisible(true);
      setLoading(false);
      setTimeout(() => setErrorVisible(false), 4000);
      return;
    }

    if (!isValidPort(port)) {
      setErrorMessage("❌ Port must be a number between 1 and 65535.");
      setErrorVisible(true);
      setLoading(false);
      setTimeout(() => setErrorVisible(false), 4000);
      return;
    }

    try {
      const [portRes, pingRes, geoRes, whoisRes] = await Promise.all([
        axios.get(`http://172.16.16.25:8000/check-port?ip=${ip}&port=${port}`, { timeout: 6000 }),
        axios.get(`http://172.16.16.25:8000/ping?ip=${ip}`, { timeout: 6000 }),
        axios.get(`http://172.16.16.25:8000/geolocate?ip=${ip}`, { timeout: 6000 }),
        axios.get(`http://172.16.16.25:8000/whois?ip=${ip}`, { timeout: 6000 })
      ]);

      setResults({
        portStatus: portRes.data.status,
        ping: pingRes.data,
        geo: geoRes.data,
      });

      setWhois(whoisRes.data);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
        setLoading(false);
    } catch (err: any) {
  console.error("Error occurred:", err);

if (err.response) {
  if (err.response.data?.detail) {
    setErrorMessage(`❌ ${err.response.data.detail}`);
  } else {
    setErrorMessage(`❌ Server error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
  }
} else if (err.request) {
  setErrorMessage("❌ No response from server. Is the backend reachable?");
} else {
  setErrorMessage(`❌ Unexpected error: ${err.message}`);
}


  setErrorVisible(true);
  setLoading(false);
}

  };

  const renderStatus = (label: string, isPositive: boolean, value: string) => (
    <View style={styles.statusRow}>
      <MaterialIcons
        name={isPositive ? 'check-circle' : 'cancel'}
        size={20}
        color={isPositive ? 'green' : 'red'}
        style={{ marginRight: 8 }}
      />
      <Text style={[styles.result, isPositive ? styles.greenText : styles.redText]}>
        {label}: {value}
      </Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>OmriSoft</Text>
      <Text style={styles.title}>Port Forwarding Tester</Text>
      {clientIp && <Text style={styles.myIp}>Your IP: {clientIp}</Text>}

      <TextInput
        style={styles.input}
        placeholder="IP Address"
        value={ip}
        onChangeText={setIp}
        keyboardType="numeric"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Port"
        keyboardType="numeric"
        value={port}
        onChangeText={setPort}
      />

      {errorVisible && (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={20} color="white" style={{ marginRight: 5 }} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <Button title={loading ? "Checking..." : "Check"} onPress={check} disabled={loading} />

      {loading && <ActivityIndicator size="large" color="#007bff" style={{ marginTop: 20 }} />}

      {results && (
        <Animated.View style={[styles.results, { opacity: fadeAnim }]}>
          {renderStatus("Port", results.portStatus === 'open', results.portStatus)}
          {renderStatus("Pingable", results.ping.reachable, results.ping.reachable ? "Yes" : "No")}
          <Text style={styles.result}>Avg Latency: {results.ping.avg_latency_ms.toFixed(2)} ms</Text>
          <Text style={styles.result}>Country: {results.geo.country}</Text>
          <Text style={styles.result}>Region: {results.geo.regionName}</Text>
          <Text style={styles.result}>City: {results.geo.city}</Text>
          <Text style={styles.result}>ISP: {results.geo.isp}</Text>

          {whois && !whois.error && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>WHOIS Info:</Text>
              <Text style={styles.result}>ASN: {whois.asn}</Text>
              <Text style={styles.result}>Network: {whois.network_name}</Text>
              <Text style={styles.result}>Org: {whois.org}</Text>
              <Text style={styles.result}>Country: {whois.country}</Text>
              <Text style={styles.result}>Email(s): {whois.emails?.join(', ')}</Text>
            </View>
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f0f4f7',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  myIp: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    marginVertical: 10,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  results: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
  },
  result: {
    fontSize: 16,
    marginBottom: 5,
  },
  greenText: {
    color: 'green',
    fontWeight: 'bold',
  },
  redText: {
    color: 'red',
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  section: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 10,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 5,
    color: '#333',
  },
  errorBox: {
    backgroundColor: '#ff4d4d',
    padding: 10,
    borderRadius: 6,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
});
