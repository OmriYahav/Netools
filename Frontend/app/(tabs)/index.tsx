import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet, Animated,
  TouchableOpacity, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import LottieView from 'lottie-react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import SuggestedPorts from './SuggestedPorts'; // Reuse your colorful component
import { API_BASE_URL } from './config';

interface PingResult {
  reachable: boolean;
  avg_latency_ms: number;
}

interface GeoResult {
  country: string;
  regionName: string;
  city: string;
  isp: string;
}

interface WhoisResult {
  asn: string;
  network_name: string;
  org: string;
  country: string;
  emails: string[];
}

export default function HomeScreen() {
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [clientIp, setClientIp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    portStatus: string;
    ping: PingResult;
    geo: GeoResult;
  } | null>(null);
  const [whois, setWhois] = useState<WhoisResult | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);
  const [checkStatus, setCheckStatus] = useState<'success' | 'failure' | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const errorAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const autoFilledRef = useRef(false);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/my-ip`)
      .then(res => {
        setClientIp(res.data.your_ip);
        if (!autoFilledRef.current) {
          setIp(res.data.your_ip);
          autoFilledRef.current = true;
        }
      })
      .catch(() => setClientIp("Unavailable"));
  }, []);

  const isValidHost = (host: string) => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const domainRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/;
    return ipRegex.test(host) || domainRegex.test(host);
  };

  const isValidPort = (port: string) => {
    const portNum = parseInt(port, 10);
    return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
  };

  const handleError = (msg: string) => {
    setErrorMessage(`❌ ${msg}`);
    setErrorVisible(true);
    Animated.timing(errorAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(errorAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setErrorVisible(false));
    }, 4000);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const check = async () => {
    setLoading(true);
    setErrorVisible(false);
    setResults(null);
    setWhois(null);
    setCheckStatus(null);
    fadeAnim.setValue(0);

    if (!isValidHost(ip)) {
      handleError("Invalid IP or DDNS address format.");
      setLoading(false);
      return;
    }

    if (!isValidPort(port)) {
      handleError("Port must be a number between 1 and 65535.");
      setLoading(false);
      return;
    }

    try {
      const [portRes, pingRes, geoRes, whoisRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/check-port?ip=${ip}&port=${port}`),
        axios.get(`${API_BASE_URL}/ping?ip=${ip}`),
        axios.get(`${API_BASE_URL}/geolocate?ip=${ip}`),
        axios.get(`${API_BASE_URL}/whois?ip=${ip}`),
      ]);

      const success = portRes.data.status === 'open' && pingRes.data.reachable;
      setCheckStatus(success ? 'success' : 'failure');

      setResults({
        portStatus: portRes.data.status,
        ping: pingRes.data,
        geo: geoRes.data,
      });

      setWhois(whoisRes.data);
    } catch (err: any) {
      console.warn("Check failed:", err.message);
      handleError("Something went wrong during the check.");
      setCheckStatus('failure');
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    setLoading(false);
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
        placeholder="IP Address or DDNS"
        value={ip}
        onChangeText={setIp}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Port"
        keyboardType="numeric"
        value={port}
        onChangeText={setPort}
      />

      <SuggestedPorts setPort={setPort} />

      {errorVisible && (
        <Animated.View style={[styles.errorBox, { opacity: errorAnim }]}>
          <MaterialIcons name="error-outline" size={20} color="white" style={{ marginRight: 5 }} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </Animated.View>
      )}

      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={check}
        disabled={loading}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.checkButton, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={['#4facfe', '#00f2fe']}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.gradient}
          >
            <Text style={styles.checkButtonText}>
              {loading ? "Checking..." : "Check"}
            </Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#4facfe" style={{ marginTop: 20 }} />}

      {checkStatus && (
        <LottieView
          source={
            checkStatus === 'success'
              ? require('./lottie/success.json')
              : require('./lottie/error.json')
          }
          autoPlay
          loop={false}
          style={{ width: 100, height: 100, alignSelf: 'center', marginVertical: 10 }}
        />
      )}

      {results && (
        <Animated.View style={[styles.results, { opacity: fadeAnim }]}>
          {renderStatus("Port", results.portStatus === 'open', results.portStatus)}
          {renderStatus("Pingable", results.ping.reachable, results.ping.reachable ? "Yes" : "No")}
          <Text style={styles.result}>Avg Latency: {results.ping.avg_latency_ms.toFixed(2)} ms</Text>
          <Text style={styles.result}>Country: {results.geo.country}</Text>
          <Text style={styles.result}>Region: {results.geo.regionName}</Text>
          <Text style={styles.result}>City: {results.geo.city}</Text>
          <Text style={styles.result}>ISP: {results.geo.isp}</Text>

          {whois && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>WHOIS Info:</Text>
              <Text style={styles.result}>ASN: {whois.asn}</Text>
              <Text style={styles.result}>Network: {whois.network_name}</Text>
              <Text style={styles.result}>Org: {whois.org}</Text>
              <Text style={styles.result}>Country: {whois.country}</Text>
              {whois.emails?.length > 0 && (
                <Text style={styles.result}>Email(s): {whois.emails.join(', ')}</Text>
              )}
            </View>
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#f0f4f7', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  myIp: { textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#555', marginBottom: 15 },
  input: {
    backgroundColor: '#fff', padding: 10, marginVertical: 10, borderRadius: 8,
    borderColor: '#ccc', borderWidth: 1
  },
  results: { marginTop: 20, backgroundColor: '#fff', padding: 15, borderRadius: 8 },
  result: { fontSize: 16, marginBottom: 5 },
  greenText: { color: 'green', fontWeight: 'bold' },
  redText: { color: 'red', fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  section: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 10 },
  sectionTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 5, color: '#333' },
  errorBox: {
    backgroundColor: '#ff4d4d', padding: 10, borderRadius: 6,
    marginVertical: 10, flexDirection: 'row', alignItems: 'center'
  },
  errorText: { color: '#fff', fontSize: 15, flex: 1 },
  checkButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
