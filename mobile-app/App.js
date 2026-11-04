import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  TextInput,
  Alert, 
  ActivityIndicator, 
  Platform,
  SafeAreaView,
  StatusBar,
  Modal,
  LogBox,
  NativeModules
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Suppress known non-breaking React Native / Expo library warnings
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'CameraView: barcodeScannerSettings'
]);

// Multi-Platform API Host Detection
// 1. Web browser: window.location.hostname
// 2. Expo Development: inspects Expo Constants hostUri (dynamically extracts PC LAN IP across Wi-Fi / Hotspot)
// 3. Native Metro Packager: inspects NativeModules.SourceCode.scriptURL
// 4. Android Emulator: 10.0.2.2 (standard Android SDK virtual router loopback to host PC)
// 5. iOS Simulator / Web: localhost
const getInitialHost = () => {
  // 1. Configured environment variables (Production / CI / Custom Expo Build)
  try {
    const envApiUrl = (typeof process !== 'undefined' && process.env) ? (process.env.EXPO_PUBLIC_API_URL || process.env.REACT_APP_API_URL) : null;
    if (envApiUrl) {
      const cleanHost = envApiUrl.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
      if (cleanHost) return cleanHost;
    }
  } catch (e) {}

  // 2. Web browser live origin
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }

  // 3. Expo Constants hostUri (dynamically extracts PC LAN IP across Wi-Fi / Hotspot)
  try {
    const Constants = require('expo-constants')?.default || require('expo-constants');
    const extraApiUrl = Constants?.expoConfig?.extra?.apiUrl || Constants?.manifest?.extra?.apiUrl;
    if (extraApiUrl) {
      const clean = extraApiUrl.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
      if (clean) return clean;
    }
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoGo?.debuggerHost || Constants?.manifest?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
  } catch (e) {}

  // 4. Native Metro Packager scriptURL
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch (e) {}

  // 5. Context-aware virtual router / development emulator fallbacks
  //    Uses EXPO_PUBLIC_API_HOST env var to override emulator defaults for production builds
  if (typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_HOST) {
    const cleanHost = process.env.EXPO_PUBLIC_API_HOST.replace(/^https?:\/\//, '').split(':')[0].split('/')[0];
    if (cleanHost) return cleanHost;
  }
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }
  if (Platform.OS === 'ios') {
    return 'localhost';
  }
  return 'localhost';
};

const getInitialScheme = (host) => {
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:') {
    return 'https';
  }
  if (!host || host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2') {
    return 'http';
  }
  // Public FQDN, ngrok, Render, or cloud tunnel
  if (host.includes('.') && !host.startsWith('192.168.') && !host.startsWith('10.') && !host.startsWith('172.')) {
    return 'https';
  }
  return 'http';
};

// Pure JavaScript RFC 6234 Compliant SHA-256 Digest Engine
// Architecture Note: Self-contained zero-dependency implementation ensuring deterministic offline PIN hashing
// across heterogeneous runtimes (Expo Go, React Native Web, physical devices) without native module linking issues.
const sha256 = (ascii) => {
  function rightRotate(val, amt) { return (val >>> amt) | (val << (32 - amt)); }
  const words = [];
  const asciiBitLength = ascii.length * 8;
  let hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  let compLen = ((asciiBitLength + 64 >>> 9) << 4) + 15;
  for (let i = 0; i <= compLen; i++) words[i] = 0;
  for (let i = 0; i < ascii.length; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 255) << (8 * (3 - (i % 4)));
  }
  words[ascii.length >> 2] |= 128 << (8 * (3 - (ascii.length % 4)));
  words[compLen] = asciiBitLength;

  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
          w[i - 16]
          + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
          + w[i - 7]
          + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
        ) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0, a, hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  let res = '';
  for (let i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (8 * b)) & 255;
      res += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return res;
};

const hashKioskPin = (pin) => {
  if (!pin) return null;
  return `sha256_${sha256(`kiosk_salt_2026_${pin}`)}`;
};

const DEV_HOST = getInitialHost();
const DEFAULT_SCHEME = getInitialScheme(DEV_HOST);
const CLOUD_API_URL = `${DEFAULT_SCHEME}://${DEV_HOST}:8000`;
let currentServerHost = DEV_HOST;
let LOCAL_API_URL = `${DEFAULT_SCHEME}://${currentServerHost}:8000`;
let API_BASE_URL = LOCAL_API_URL;

export default function App() {
  // Camera & Device Permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('front');
  const [torch, setTorch] = useState(false);
  const cameraRef = useRef(null);

  // In-App Backend Server IP Configurator States
  const [serverHostInput, setServerHostInput] = useState(DEV_HOST);
  const [serverPortInput, setServerPortInput] = useState('8000');
  const [isServerModalVisible, setIsServerModalVisible] = useState(false);
  const [pingStatus, setPingStatus] = useState('idle');
  const [pingMessage, setPingMessage] = useState('');

  // 🏝️ Apple Dynamic Island State & Animation
  const [islandState, setIslandState] = useState({
    type: 'idle', // 'idle' | 'attendance' | 'holiday' | 'warning'
    title: '',
    subtitle: '',
    tag: '',
    icon: ''
  });
  const islandWidthAnim = useRef(new Animated.Value(140)).current;
  const islandHeightAnim = useRef(new Animated.Value(34)).current;
  const islandTimeoutRef = useRef(null);

  const triggerDynamicIsland = (type, title, subtitle, durationMs = 2000, tag = '', icon = '') => {
    if (islandTimeoutRef.current) clearTimeout(islandTimeoutRef.current);
    setIslandState({ type, title, subtitle, tag, icon });
    
    if (Platform.OS !== 'web') {
      try {
        if (type === 'attendance') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (type === 'holiday') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (e) {}
    }

    const targetWidth = type === 'holiday' ? 345 : (type === 'attendance' ? 335 : 320);
    const targetHeight = type === 'holiday' ? 70 : 64;

    Animated.parallel([
      Animated.spring(islandWidthAnim, {
        toValue: targetWidth,
        friction: 7,
        tension: 65,
        useNativeDriver: false
      }),
      Animated.spring(islandHeightAnim, {
        toValue: targetHeight,
        friction: 7,
        tension: 65,
        useNativeDriver: false
      })
    ]).start();

    islandTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.spring(islandWidthAnim, {
          toValue: 140,
          friction: 8,
          tension: 70,
          useNativeDriver: false
        }),
        Animated.spring(islandHeightAnim, {
          toValue: 34,
          friction: 8,
          tension: 70,
          useNativeDriver: false
        })
      ]).start(() => {
        setIslandState({ type: 'idle', title: '', subtitle: '', tag: '', icon: '' });
      });
    }, durationMs);
  };

  // 🏝️ Apple Dynamic Island Component
  const renderDynamicIsland = () => (
    <Animated.View 
      style={[
        styles.islandContainer,
        {
          width: islandWidthAnim,
          height: islandHeightAnim,
        }
      ]}
    >
      <TouchableOpacity 
        activeOpacity={0.9} 
        style={styles.islandInner}
        onPress={() => {
          if (islandState.type !== 'idle') {
            Animated.parallel([
              Animated.spring(islandWidthAnim, { toValue: 140, useNativeDriver: false }),
              Animated.spring(islandHeightAnim, { toValue: 34, useNativeDriver: false })
            ]).start(() => setIslandState({ type: 'idle', title: '', subtitle: '', tag: '', icon: '' }));
          } else {
            triggerDynamicIsland('attendance', 'Campus Biometrics Active', 'Institutional Server Connected', 2500, 'LIVE', '●');
          }
        }}
      >
        {islandState.type === 'idle' ? (
          <View style={styles.islandIdleRow}>
            <View style={styles.islandPulseDot} />
            <Text style={styles.islandIdleText}>Smart • Live</Text>
          </View>
        ) : islandState.type === 'attendance' ? (
          <View style={styles.islandExpandedRow}>
            <View style={styles.islandCheckBadge}>
              <Text style={styles.islandCheckText}>✓</Text>
            </View>
            <View style={styles.islandTextCol}>
              <Text style={styles.islandTitleText} numberOfLines={1}>{islandState.title}</Text>
              <Text style={styles.islandSubText} numberOfLines={1}>{islandState.subtitle}</Text>
            </View>
            <View style={styles.islandTagBadge}>
              <Text style={styles.islandTagText}>PRESENT</Text>
            </View>
          </View>
        ) : islandState.type === 'holiday' ? (
          <View style={styles.islandExpandedRow}>
            <View style={[styles.islandCheckBadge, { backgroundColor: 'rgba(245, 158, 11, 0.25)' }]}>
              <Text style={{ fontSize: 18 }}>🎉</Text>
            </View>
            <View style={styles.islandTextCol}>
              <Text style={[styles.islandTitleText, { color: '#FBBF24' }]} numberOfLines={1}>{islandState.title}</Text>
              <Text style={styles.islandSubText} numberOfLines={1}>{islandState.subtitle}</Text>
            </View>
            <View style={[styles.islandTagBadge, { backgroundColor: 'rgba(245, 158, 11, 0.25)' }]}>
              <Text style={[styles.islandTagText, { color: '#FDE68A' }]}>HOLIDAY</Text>
            </View>
          </View>
        ) : (
          <View style={styles.islandExpandedRow}>
            <View style={[styles.islandCheckBadge, { backgroundColor: 'rgba(239, 68, 68, 0.25)' }]}>
              <Text style={{ fontSize: 16 }}>⚠️</Text>
            </View>
            <View style={styles.islandTextCol}>
              <Text style={[styles.islandTitleText, { color: '#F87171' }]} numberOfLines={1}>{islandState.title}</Text>
              <Text style={styles.islandSubText} numberOfLines={1}>{islandState.subtitle}</Text>
            </View>
            <View style={[styles.islandTagBadge, { backgroundColor: 'rgba(239, 68, 68, 0.25)' }]}>
              <Text style={[styles.islandTagText, { color: '#FCA5A5' }]}>ALERT</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );


  // Connectivity & Offline Storage
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Authentication State
  const [authTab, setAuthTab] = useState('faculty'); // 'faculty' | 'student' | 'signup'
  const [teacher, setTeacher] = useState(null);
  const [studentUser, setStudentUser] = useState(null);
  const [studentMetrics, setStudentMetrics] = useState(null);

  // Faculty Login States
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Student Login States
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  // Student Signup States
  const [regFullName, setRegFullName] = useState('');
  const [regRollNumber, setRegRollNumber] = useState('');
  const [regBranch, setRegBranch] = useState('Computer Science & Engineering');
  const [regSemester, setRegSemester] = useState('1');
  const [regSection, setRegSection] = useState('A');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Student QR Scanner State
  const [isStudentScanning, setIsStudentScanning] = useState(false);

  // Forgot Password Modal States
  const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'verify'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotDevOtp, setForgotDevOtp] = useState(null);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  // Teacher Profile & Preferences Modal States
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDetails, setProfileDetails] = useState({
    employee_id: 'FACULTY',
    full_name: 'Faculty Member',
    department: 'Faculty Department',
    email: '',
    phone: '',
    assigned_subjects: []
  });
  const [prefCamera, setPrefCamera] = useState('front');
  const [prefHaptics, setPrefHaptics] = useState(true);
  const [prefAutoSync, setPrefAutoSync] = useState(true);
  const [profilePhone, setProfilePhone] = useState('');
  const [profCurrentPass, setProfCurrentPass] = useState('');
  const [profNewPass, setProfNewPass] = useState('');
  const [profConfirmPass, setProfConfirmPass] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState(null);

  // Kiosk Exit PIN Security States (Default: null / No PIN)
  const [kioskExitPin, setKioskExitPin] = useState(null);
  const [currentKioskPinInput, setCurrentKioskPinInput] = useState('');
  const [newKioskPinInput, setNewKioskPinInput] = useState('');
  const [confirmKioskPinInput, setConfirmKioskPinInput] = useState('');
  const [kioskPinSuccessMsg, setKioskPinSuccessMsg] = useState(null);
  const [kioskPinErrorMsg, setKioskPinErrorMsg] = useState(null);

  // Kiosk Exit Prompt Modal States (Live Camera Scanner)
  const [isExitPinModalVisible, setIsExitPinModalVisible] = useState(false);
  const [enteredExitPin, setEnteredExitPin] = useState('');
  const [exitPinError, setExitPinError] = useState(null);

  // Active Session & View State
  // Views: 'hub', 'scanner', 'review'
  const [currentView, setCurrentView] = useState('hub');
  const [activeSession, setActiveSession] = useState(null);

  // Walk-Up Scanning States
  const [isCapturing, setIsCapturing] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState({
    message: 'Align student face in the frame',
    type: 'idle' // 'idle' | 'processing' | 'success' | 'error'
  });
  
  // Student Roster States
  const [scannedStudents, setScannedStudents] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all' | 'present' | 'absent'

  // Manual Entry & Pre-Submission Summary States
  const [isManualModalVisible, setIsManualModalVisible] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);

  // Natural Roll Number Sorter Function (Vidyalaya ERP Standard)
  const sortStudentsByRoll = (list) => {
    return [...(list || [])].sort((a, b) => 
      (a.roll || a.roll_number || '').localeCompare(
        b.roll || b.roll_number || '', 
        undefined, 
        { numeric: true, sensitivity: 'base' }
      )
    );
  };

  // Real Student Roster dynamically loaded from Database

  // Dynamic Teacher's Schedule (loaded dynamically from database metadata)
  const [lectures, setLectures] = useState([]);

  const fetchLiveRoster = async () => {
    try {
      // 1. Fetch live department & subject metadata
      let metaRes = await fetch(`${API_BASE_URL}/attendance/departments-meta`).catch(() => null);
      if (!metaRes || !metaRes.ok) {
        metaRes = await fetch(`${CLOUD_API_URL}/attendance/departments-meta`).catch(() => null);
      }
      let subjectsList = [];
      let targetBranch = teacher?.department || 'Computer Science';
      let targetSem = 3;
      let targetSec = 'C';
      if (metaRes && metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData.subjects && metaData.subjects.length > 0) {
          subjectsList = metaData.subjects;
        }
        if (metaData.branches && metaData.branches.length > 0) {
          const matchedBranch = metaData.branches.find(b => 
            targetBranch && b && b.toLowerCase().includes(targetBranch.toLowerCase())
          );
          targetBranch = matchedBranch || metaData.branches[0];
        }
        if (metaData.semesters && metaData.semesters.length > 0) {
          targetSem = metaData.semesters.includes(3) ? 3 : metaData.semesters[0];
        }
        if (metaData.sections && metaData.sections.length > 0) {
          targetSec = metaData.sections.includes('C') ? 'C' : metaData.sections[0];
        }
      }

      // 2. Fetch enrolled students from SQLite database dynamically
      const rosterQuery = `/attendance/class-students?branch=${encodeURIComponent(targetBranch)}&semester=${targetSem}&section=${targetSec}`;
      let res = await fetch(`${API_BASE_URL}${rosterQuery}`).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${CLOUD_API_URL}${rosterQuery}`).catch(() => null);
      }
      
      let liveRoster = [];
      if (res && res.ok) {
        const data = await res.json();
        if (data.students && Array.isArray(data.students)) {
          liveRoster = data.students.map((s, idx) => ({
            id: s.id || (idx + 1),
            name: s.name || s.full_name,
            roll: s.roll_number,
            email: s.email || `${(s.roll_number || '').toLowerCase()}@college.edu`
          }));
        }
      }

      // 3. First Priority: Pull live daily schedule from registered college Timetable
      const ttQuery = `/timetable/today?branch=${encodeURIComponent(targetBranch)}&semester=${targetSem}&section=${targetSec}`;
      let ttRes = await fetch(`${API_BASE_URL}${ttQuery}`).catch(() => null);
      if (!ttRes || !ttRes.ok) {
        ttRes = await fetch(`${CLOUD_API_URL}${ttQuery}`).catch(() => null);
      }

      let timetableSlots = [];
      if (ttRes && ttRes.ok) {
        const ttData = await ttRes.json();
        if (ttData.is_holiday && ttData.holiday) {
          triggerDynamicIsland(
            'holiday',
            'Official Holiday Recess',
            `${ttData.holiday.title} • Lectures Suspended`,
            4000,
            'HOLIDAY',
            '🎉'
          );
        }
        if (ttData.slots && Array.isArray(ttData.slots) && ttData.slots.length > 0) {
          timetableSlots = ttData.slots;
        }
      }

      if (timetableSlots.length > 0) {
        const dynamicLectures = timetableSlots.map((slot) => {
          const isOngoing = Boolean(slot.is_ongoing);
          const isPast = Boolean(slot.is_past);
          return {
            id: slot.id,
            code: slot.subject_code || `CS${targetSem}01`,
            name: slot.subject_name || 'Classroom Lecture',
            semester: `Semester ${targetSem}`,
            section: `Section ${targetSec}`,
            room: slot.room_number || 'LH-301',
            time: `${slot.start_time} - ${slot.end_time}`,
            status: isOngoing ? 'Live Now' : (isPast ? 'Concluded' : 'Upcoming'),
            enrolled: liveRoster.length,
            roster: liveRoster,
            teacher_name: slot.teacher_name || teacher?.name || 'Faculty Member'
          };
        });
        setLectures(dynamicLectures);
        console.log(`[Roster Sync] Configured ${dynamicLectures.length} timetable sessions with ${liveRoster.length} students.`);
      } else {
        // Production Mode: Do not fabricate fake time slots. Real schedule only.
        setLectures([]);
        console.log(`[Roster Sync] Loaded ${liveRoster.length} students from database!`);
      }
    } catch (e) {
      console.log('Error synchronizing live schedule & roster:', e);
    }
  };

  // Initialize Network & Cached Session
  useEffect(() => {
    checkSavedAuth();
    updateOfflineCount();
    fetchLiveRoster();

    const unsubscribe = NetInfo.addEventListener(state => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      if (!offline) syncOfflineQueue();
    });
    return () => unsubscribe();
  }, []);

  // Re-fetch live classes and schedule when faculty profile is authenticated
  useEffect(() => {
    if (teacher) {
      fetchLiveRoster();
    }
  }, [teacher]);

  const checkSavedAuth = async () => {
    try {
      const savedHost = await AsyncStorage.getItem('@custom_server_host');
      if (savedHost && savedHost.trim()) {
        const cleanSaved = savedHost.trim().replace(/\/+$/, '');
        if (cleanSaved.startsWith('http://') || cleanSaved.startsWith('https://')) {
          currentServerHost = cleanSaved;
          API_BASE_URL = cleanSaved;
        } else {
          currentServerHost = cleanSaved;
          API_BASE_URL = `http://${currentServerHost}:8000`;
        }
        setServerHostInput(cleanSaved);
      }
      const saved = await AsyncStorage.getItem('@teacher_user');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Purge invalid sessions without proper credentials
          if (!parsed?.token || !parsed?.email) {
            await AsyncStorage.removeItem('@teacher_user');
            setTeacher(null);
          } else {
            // Verify token with backend
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(`${API_BASE_URL}/management/teacher/profile`, {
              headers: { 'Authorization': `Bearer ${parsed.token}` },
              signal: controller.signal
            }).catch(() => null);
            clearTimeout(timeoutId);

            if (res && res.ok) {
              const liveProfile = await res.json();
              const refreshed = {
                ...parsed,
                name: liveProfile.full_name || parsed.name || 'Faculty Member',
                department: liveProfile.department || parsed.department || 'Academic Department'
              };
              setTeacher(refreshed);
              await AsyncStorage.setItem('@teacher_user', JSON.stringify(refreshed));
            } else if (res && (res.status === 401 || res.status === 403)) {
              await AsyncStorage.removeItem('@teacher_user');
              setTeacher(null);
            } else {
              // Server unreachable: preserve offline session if valid token exists
              if (parsed.email && parsed.token) {
                setTeacher(parsed);
              } else {
                await AsyncStorage.removeItem('@teacher_user');
                setTeacher(null);
              }
            }
          }
        } catch {
          await AsyncStorage.removeItem('@teacher_user');
          setTeacher(null);
        }
      }

      // Restore Student Session if present
      const savedStudent = await AsyncStorage.getItem('@student_user');
      if (savedStudent) {
        try {
          const parsedStudent = JSON.parse(savedStudent);
          if (parsedStudent && parsedStudent.token) {
            setStudentUser(parsedStudent);
          }
        } catch {}
      }

      const savedKioskPin = await AsyncStorage.getItem('@kiosk_exit_pin');
      if (savedKioskPin) {
        setKioskExitPin(savedKioskPin);
      }
    } catch (e) {
      console.log('Error reading auth cache:', e);
    }
  };

  const handleHardResetCache = async () => {
    try {
      await AsyncStorage.multiRemove([
        '@teacher_user', 
        '@kiosk_exit_pin', 
        '@offline_queue',
        '@offline_attendance_queue',
        '@custom_server_host'
      ]);
      setTeacher(null);
      setOfflineQueueCount(0);
      setLectures([]);
      Alert.alert(
        "Session Purged",
        "Local session cache, stored teacher profiles, and offline data have been cleared. You can now log in fresh."
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Reset Error", "Could not clear all cache items.");
    }
  };

  const handlePingServer = async () => {
    setPingStatus('testing');
    let target = serverHostInput.trim().replace(/\/+$/, '');
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `http://${target}:${serverPortInput.trim()}`;
    }
    setPingMessage(`Pinging backend at ${target}...`);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(`${target}/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        setPingStatus('success');
        setPingMessage('✓ FastAPI Backend is online and responding!');
      } else {
        setPingStatus('failed');
        setPingMessage(`Server responded with HTTP ${res.status}`);
      }
    } catch (e) {
      setPingStatus('failed');
      setPingMessage('✕ Connection timed out. Check IP/Ngrok URL and Wi-Fi.');
    }
  };

  const handleSaveServerConfig = async () => {
    let cleanHost = serverHostInput.trim().replace(/\/+$/, '');
    if (!cleanHost.startsWith('http://') && !cleanHost.startsWith('https://')) {
      cleanHost = `http://${cleanHost}:${serverPortInput.trim()}`;
    }
    currentServerHost = cleanHost;
    API_BASE_URL = cleanHost;
    await AsyncStorage.setItem('@custom_server_host', cleanHost);
    setIsServerModalVisible(false);
    triggerDynamicIsland('attendance', 'Server Configured', `Connected to backend`, 2500, 'Online');
    fetchLiveRoster();
  };

  const renderServerConfigModal = () => (
    <Modal
      visible={isServerModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsServerModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.forgotModalCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={styles.forgotModalTitle}>Backend Server Config</Text>
            <TouchableOpacity onPress={() => setIsServerModalVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.forgotModalDesc}>
            Enter your PC local Wi-Fi IPv4 address (e.g. 192.168.1.155) OR your public Ngrok HTTPS URL.
          </Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Server IP / Ngrok URL</Text>
            <TextInput 
              style={styles.textInput}
              value={serverHostInput}
              onChangeText={(val) => { setServerHostInput(val); setPingStatus('idle'); }}
              placeholder="e.g. 192.168.1.155 or https://xxxx.ngrok-free.app"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Port</Text>
            <TextInput 
              style={styles.textInput}
              value={serverPortInput}
              onChangeText={setServerPortInput}
              placeholder="8000"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
            />
          </View>

          {pingStatus !== 'idle' && (
            <View style={{
              padding: 10,
              borderRadius: 12,
              backgroundColor: pingStatus === 'success' ? '#ECFDF5' : pingStatus === 'failed' ? '#FEF2F2' : '#F3F4F6',
              borderWidth: 1,
              borderColor: pingStatus === 'success' ? '#A7F3D0' : pingStatus === 'failed' ? '#FECACA' : '#E5E7EB',
              marginBottom: 12
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: pingStatus === 'success' ? '#065F46' : pingStatus === 'failed' ? '#991B1B' : '#374151'
              }}>
                {pingMessage}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity 
              style={[styles.primaryButton, { flex: 1, backgroundColor: '#475569' }]} 
              onPress={handlePingServer}
              disabled={pingStatus === 'testing'}
            >
              {pingStatus === 'testing' ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Ping Server</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.primaryButton, { flex: 1 }]} 
              onPress={handleSaveServerConfig}
            >
              <Text style={styles.primaryButtonText}>Save & Connect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const safeParseOfflineQueue = (raw) => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const updateOfflineCount = async () => {
    try {
      const queue = await AsyncStorage.getItem('@offline_queue');
      const items = safeParseOfflineQueue(queue);
      setOfflineQueueCount(items.length);
    } catch {
      setOfflineQueueCount(0);
    }
  };

  const syncOfflineQueue = async () => {
    try {
      const queue = await AsyncStorage.getItem('@offline_queue');
      const items = safeParseOfflineQueue(queue);
      if (items.length > 0) {
        const remainingItems = [];
        let successCount = 0;
        for (const item of items) {
          let syncRes = await fetch(`${API_BASE_URL}/attendance/submit_final/${item.sessionId}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${teacher?.token || ''}`
            },
            body: JSON.stringify(item)
          }).catch(() => null);

          if (!syncRes || !syncRes.ok) {
            syncRes = await fetch(`${CLOUD_API_URL}/attendance/submit_final/${item.sessionId}`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${teacher?.token || ''}`
              },
              body: JSON.stringify(item)
            }).catch(() => null);
          }

          if (syncRes && syncRes.ok) {
            successCount++;
          } else {
            remainingItems.push(item);
          }
        }

        if (remainingItems.length === 0) {
          await AsyncStorage.removeItem('@offline_queue');
          setOfflineQueueCount(0);
          Alert.alert("Auto-Sync Complete", "All stored offline attendance records were successfully committed to the database.");
        } else {
          await AsyncStorage.setItem('@offline_queue', JSON.stringify(remainingItems));
          setOfflineQueueCount(remainingItems.length);
          if (successCount > 0) {
            Alert.alert("Partial Sync", `${successCount} records synced successfully. ${remainingItems.length} records remain offline and will retry.`);
          }
        }
      }
    } catch (e) {
      console.log("Offline sync will retry on next connection window.");
    }
  };

  const registerPushToken = async (authToken) => {
    try {
      let pushToken = await AsyncStorage.getItem('@device_push_token');
      if (!pushToken) {
        pushToken = `ExponentPushToken[mobile_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}]`;
        await AsyncStorage.setItem('@device_push_token', pushToken);
      }
      await fetch(`${API_BASE_URL}/notifications/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          token: pushToken,
          platform: 'expo',
          device_name: 'Faculty Mobile Kiosk'
        })
      }).catch(() => null);
    } catch (e) {
      // Non-critical push token registration failure
    }
  };

  // Teacher Login Handler
  const handleTeacherLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });

      if (res.ok) {
        const data = await res.json();
        const teacherProfile = {
          name: data.user?.full_name || 'Faculty Member',
          email: data.user?.email || authEmail,
          department: data.user?.department || 'Faculty Department',
          token: data.access_token
        };
        setTeacher(teacherProfile);
        await AsyncStorage.setItem('@teacher_user', JSON.stringify(teacherProfile));
        registerPushToken(data.access_token);
        setTimeout(() => fetchLiveRoster(), 100);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert("Authentication Failed", errData.detail || "Invalid faculty credentials. Please check your email and password.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      Alert.alert("Connection Error", "Could not connect to faculty authentication service. Please verify backend is reachable.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleTeacherLogout = async () => {
    await AsyncStorage.removeItem('@teacher_user');
    setTeacher(null);
    setActiveSession(null);
    setCurrentView('hub');
  };

  // Student Login Handler
  const handleStudentLogin = async () => {
    const cleanId = studentIdentifier.trim();
    const cleanPwd = studentPassword.trim();
    if (!cleanId || !cleanPwd) {
      Alert.alert("Missing Fields", "Please enter your roll number / email and password.");
      return;
    }
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identifier: cleanId, 
          email: cleanId,
          password: cleanPwd 
        })
      });

      if (res.ok) {
        const data = await res.json();
        const token = data.access_token;
        
        let studentData = {
          name: data.user?.full_name || cleanId.toUpperCase(),
          roll_number: data.user?.roll_number || cleanId.toUpperCase(),
          branch: data.user?.branch || 'Academic Department',
          semester: data.user?.semester || 1,
          section: data.user?.section || 'A',
          token: token,
          overall_percentage: '0.0%',
          attended: 0,
          total: 0
        };

        try {
          const metricsRes = await fetch(`${API_BASE_URL}/portal/metrics`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (metricsRes.ok) {
            const m = await metricsRes.json();
            studentData.name = m.student_name || studentData.name;
            studentData.roll_number = m.roll_number || studentData.roll_number;
            studentData.branch = m.branch || studentData.branch;
            studentData.semester = m.semester || studentData.semester;
            studentData.section = m.section || studentData.section;
            studentData.overall_percentage = `${m.overall_percentage || 0}%`;
            studentData.attended = m.total_attended || 0;
            studentData.total = m.total_classes || 0;
            setStudentMetrics(m);
          }
        } catch {}

        setStudentUser(studentData);
        await AsyncStorage.setItem('@student_user', JSON.stringify(studentData));
        setCurrentView('student_home');
        triggerDynamicIsland('attendance', 'Student Authenticated', `Welcome, ${studentData.name}`, 2500, 'Student');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const errData = await res.json().catch(() => ({}));
        Alert.alert("Authentication Failed", errData.detail || "Invalid roll number or password.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      Alert.alert("Connection Error", `Could not connect to backend at ${API_BASE_URL}. Ensure your phone is connected to the same Wi-Fi.`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Student Registration (Sign Up) Handler
  const handleStudentRegister = async () => {
    const cleanName = regFullName.trim();
    const cleanRoll = regRollNumber.trim().toUpperCase();
    const cleanBranch = regBranch.trim() || 'Computer Science & Engineering';
    const cleanSem = regSemester.trim() || '1';
    const cleanSec = (regSection.trim() || 'A').toUpperCase();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPwd = regPassword.trim();

    if (!cleanName || !cleanRoll || !cleanPwd) {
      Alert.alert("Required Fields Missing", "Please enter your Full Name, Roll Number, and Password.");
      return;
    }
    if (cleanPwd !== regConfirmPassword.trim()) {
      Alert.alert("Password Mismatch", "Passwords do not match. Please verify.");
      return;
    }

    setIsRegistering(true);
    try {
      const formData = new FormData();
      formData.append('full_name', cleanName);
      formData.append('roll_number', cleanRoll);
      formData.append('branch', cleanBranch);
      formData.append('semester', cleanSem);
      formData.append('section', cleanSec);
      if (cleanEmail) formData.append('email', cleanEmail);
      formData.append('password', cleanPwd);

      const res = await fetch(`${API_BASE_URL}/students/register`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        Alert.alert(
          "Registration Successful! 🎉",
          `Account created for ${cleanName} (${cleanRoll}). You can now sign in with your roll number and password!`,
          [
            {
              text: "Sign In Now",
              onPress: () => {
                setStudentIdentifier(cleanRoll);
                setStudentPassword(cleanPwd);
                setAuthTab('student');
              }
            }
          ]
        );
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert("Registration Failed", err.detail || "Could not register student account. Please verify roll number is unique.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      Alert.alert("Connection Error", `Could not connect to ${API_BASE_URL}. Ensure your phone is on the same Wi-Fi.`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleStudentLogout = async () => {
    await AsyncStorage.removeItem('@student_user');
    setStudentUser(null);
    setStudentMetrics(null);
    setCurrentView('hub');
  };

  const handleStudentQrScanned = async ({ data }) => {
    if (isCapturing || !data) return;
    setIsCapturing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await fetch(`${API_BASE_URL}/attendance/qr/verify-and-mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentUser?.token || ''}`
        },
        body: JSON.stringify({ token: data })
      });

      if (res.ok) {
        const result = await res.json();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        triggerDynamicIsland('attendance', 'Attendance Marked! ✓', result.message || 'Lecture verified.', 3000, 'Success');
        Alert.alert("Attendance Confirmed! ✓", result.message || "Your attendance for this session has been recorded successfully.");
        setIsStudentScanning(false);
      } else {
        const err = await res.json().catch(() => ({}));
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Scan Rejected", err.detail || "Invalid or expired 10-second QR token.");
      }
    } catch (e) {
      Alert.alert("Network Error", "Could not verify QR code with the central server.");
    } finally {
      setTimeout(() => setIsCapturing(false), 2000);
    }
  };

  // Teacher Profile & Settings Handlers
  const loadTeacherProfile = async () => {
    setProfileLoading(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);
    try {
      if (!teacher?.token) return;
      const res = await fetch(`${API_BASE_URL}/management/teacher/profile`, {
        headers: { 'Authorization': `Bearer ${teacher.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileDetails(data);
        if (data.phone) setProfilePhone(data.phone);
        if (data.full_name) {
          setTeacher(prev => ({ ...prev, name: data.full_name }));
        }
      }
    } catch (e) {
      console.log("Teacher profile fallback to local cache");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveTeacherProfile = async () => {
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    if (profNewPass || profConfirmPass || profCurrentPass) {
      if (!profCurrentPass) {
        setProfileErrorMsg("Current password is required to change password.");
        return;
      }
      if (profNewPass !== profConfirmPass) {
        setProfileErrorMsg("New password and confirmation do not match.");
        return;
      }
      if (profNewPass.length < 6) {
        setProfileErrorMsg("New password must be at least 6 characters.");
        return;
      }
    }

    setProfileSaving(true);
    try {
      const payload = {
        phone: profilePhone
      };
      if (profNewPass) {
        payload.current_password = profCurrentPass;
        payload.new_password = profNewPass;
      }

      const res = await fetch(`${API_BASE_URL}/management/teacher/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${teacher?.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update profile.");
      }

      setFacing(prefCamera);
      setProfileSuccessMsg("Profile & preferences updated successfully!");
      setProfCurrentPass('');
      setProfNewPass('');
      setProfConfirmPass('');
      if (prefHaptics) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => setProfileSuccessMsg(null), 3000);
    } catch (err) {
      setProfileErrorMsg(err.message || "Failed to save profile changes.");
      if (prefHaptics) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setProfileSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // KIOSK EXIT PIN SECURITY HANDLERS
  // --------------------------------------------------------------------------
  const handleSaveKioskPin = async () => {
    setKioskPinErrorMsg(null);
    setKioskPinSuccessMsg(null);

    // If PIN is already active, teacher must enter current/old PIN
    if (kioskExitPin) {
      if (!currentKioskPinInput) {
        setKioskPinErrorMsg("Please enter your current PIN (purani PIN).");
        if (prefHaptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      if (hashKioskPin(currentKioskPinInput) !== kioskExitPin && currentKioskPinInput !== kioskExitPin) {
        setKioskPinErrorMsg("Incorrect Current PIN! Purani PIN sahi nahi hai.");
        if (prefHaptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    // Validate New PIN
    if (!newKioskPinInput || newKioskPinInput.trim().length === 0) {
      setKioskPinErrorMsg("Please enter a new 4-digit PIN.");
      if (prefHaptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (newKioskPinInput.length < 4) {
      setKioskPinErrorMsg("New PIN must be at least 4 digits.");
      if (prefHaptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (newKioskPinInput !== confirmKioskPinInput) {
      setKioskPinErrorMsg("New PIN and Confirm PIN do not match.");
      if (prefHaptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    try {
      const hashed = hashKioskPin(newKioskPinInput);
      await AsyncStorage.setItem('@kiosk_exit_pin', hashed);
      const wasUpdate = !!kioskExitPin;
      setKioskExitPin(hashed);
      setCurrentKioskPinInput('');
      setNewKioskPinInput('');
      setConfirmKioskPinInput('');
      setKioskPinSuccessMsg(
        wasUpdate 
          ? "✓ Kiosk Exit PIN updated successfully!" 
          : "✓ Kiosk Exit PIN set successfully! Scanner is now locked."
      );
      if (prefHaptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setKioskPinSuccessMsg(null), 4000);
    } catch (e) {
      setKioskPinErrorMsg("Storage error: Failed to save PIN.");
    }
  };

  const handleRemoveKioskPin = async () => {
    setKioskPinErrorMsg(null);
    setKioskPinSuccessMsg(null);

    if (!currentKioskPinInput) {
      setKioskPinErrorMsg("Enter your current PIN to remove lock.");
      if (prefHaptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (hashKioskPin(currentKioskPinInput) !== kioskExitPin && currentKioskPinInput !== kioskExitPin) {
      setKioskPinErrorMsg("Incorrect Current PIN. Cannot remove.");
      if (prefHaptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    try {
      await AsyncStorage.removeItem('@kiosk_exit_pin');
      setKioskExitPin(null);
      setCurrentKioskPinInput('');
      setNewKioskPinInput('');
      setConfirmKioskPinInput('');
      setKioskPinSuccessMsg("✓ Kiosk Exit PIN removed. Default (No PIN) restored.");
      if (prefHaptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setKioskPinSuccessMsg(null), 4000);
    } catch (e) {
      setKioskPinErrorMsg("Storage error: Failed to remove PIN.");
    }
  };

  const handleRequestKioskExit = () => {
    if (!kioskExitPin) {
      // Default: No PIN configured -> direct exit to hub
      setCurrentView('hub');
    } else {
      // PIN configured -> Challenge with secure exit PIN modal
      setEnteredExitPin('');
      setExitPinError(null);
      setIsExitPinModalVisible(true);
    }
  };

  const handleVerifyExitPin = async () => {
    if (hashKioskPin(enteredExitPin) === kioskExitPin || enteredExitPin === kioskExitPin) {
      setIsExitPinModalVisible(false);
      setEnteredExitPin('');
      setExitPinError(null);
      setCurrentView('hub');
      if (prefHaptics) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } else {
      setExitPinError("Incorrect Security PIN. Access Denied.");
      setEnteredExitPin('');
      if (prefHaptics) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  // Forgot Password Recovery Handlers
  const handleForgotRequestOtp = async () => {
    setIsForgotSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not send recovery code');
      // Production Mode: OTP dispatched strictly to real email. Auto-fill disabled.
      setForgotStep('verify');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Recovery Notice", e.message || "Could not dispatch code. Check server connection.");
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const handleForgotResetPassword = async () => {
    if (forgotNewPassword !== forgotConfirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (forgotNewPassword.length < 4) {
      Alert.alert("Error", "Password must be at least 4 characters.");
      return;
    }
    setIsForgotSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotEmail,
          otp: forgotOtp,
          new_password: forgotNewPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Reset failed');
      setAuthPassword(forgotNewPassword);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Password reset successfully! You can now sign in.");
      setIsForgotModalVisible(false);
      setForgotStep('request');
    } catch (e) {
      Alert.alert("Reset Error", e.message || "Invalid or expired code.");
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  // Launch a Lecture Session
  const launchSession = (lec) => {
    if (!teacher?.token) {
      Alert.alert(
        "Faculty Authentication Required",
        "Please log in with your faculty credentials before launching a biometric attendance session.",
        [
          { text: "Log In", onPress: () => setCurrentView('auth') },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }
    setActiveSession(lec);
    const sortedRoster = sortStudentsByRoll(lec.roster);
    setPendingStudents(sortedRoster);
    setScannedStudents([]);
    setCurrentView('scanner');
    setLivenessStatus({
      message: `Ready for ${lec.code} (${lec.section}). Align face.`,
      type: 'idle'
    });
  };

  // Capture & Liveness Facial Verification
  const handleCaptureAndVerify = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      setLivenessStatus({
        message: "Checking liveness & extracting 128-d vector...",
        type: 'processing'
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (!photo) throw new Error("Could not capture frame");

      if (isOffline) {
        if (prefHaptics) await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        triggerDynamicIsland('warning', 'Offline Mode', 'Database connection required for facial scan', 2500, 'OFFLINE', '⚠️');
        setLivenessStatus({
          message: "⚠️ Offline Mode: Live facial recognition requires database connection. Please use manual checklist below or connect to Wi-Fi.",
          type: 'error'
        });
        return;
      }

      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        name: 'scan.jpg',
        type: 'image/jpeg',
      });

      // Try LOCAL_API_URL first, then fallback to CLOUD_API_URL
      if (!activeSession?.id) {
        Alert.alert("Session Required", "Please select an active lecture from your timetable schedule first.");
        setIsCapturing(false);
        return;
      }
      let response = null;
      try {
        response = await fetch(`${API_BASE_URL}/attendance/verify_single/${activeSession.id}`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${teacher?.token || ''}`,
          },
        });
      } catch (err) {
        response = await fetch(`${CLOUD_API_URL}/attendance/verify_single/${activeSession.id}`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${teacher?.token || ''}`,
          },
        });
      }

      const result = await response.json();

      if (result.success && result.student) {
        const matched = result.student;
        // 1. STRICT DUPLICATE SCAN PREVENTION
        const existing = scannedStudents.find(s => (s.roll || s.roll_number) === (matched.roll_number || matched.roll));
        if (existing) {
          if (prefHaptics) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          setLivenessStatus({
            message: `⚠️ Already Marked: ${existing.name} (${existing.roll || existing.roll_number}) recorded earlier`,
            type: 'error'
          });
          triggerDynamicIsland('warning', 'Already Marked', `${existing.name} already recorded`, 2000, 'EXISTS', 'ℹ️');
          return;
        }

        const studentItem = { 
          id: matched.id, 
          name: matched.name, 
          roll: matched.roll_number, 
          status: 'Present',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setScannedStudents(prev => [...prev, studentItem]);
        setPendingStudents(prev => prev.filter(s => (s.roll || s.roll_number) !== matched.roll_number));
        
        if (prefHaptics) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        triggerDynamicIsland('attendance', 'Attendance Marked!', matched.name + ' (' + matched.roll_number + ')', 2000, 'PRESENT', '✓');
        setLivenessStatus({
          message: `Match Confirmed: ${matched.name} (${matched.roll_number})`,
          type: 'success'
        });
      } else {
        // NO MOCK FALLBACK: Real failure feedback
        if (prefHaptics) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
        const errMsg = result.error || "Biometric match not found. Please position student face in frame.";
        triggerDynamicIsland('warning', 'Not Recognized', errMsg, 2500, 'RETRY', '⚠️');
        setLivenessStatus({
          message: `⚠️ ${errMsg}`,
          type: 'error'
        });
      }
    } catch (err) {
      // NO MOCK FALLBACK: Real error feedback
      if (prefHaptics) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      triggerDynamicIsland('warning', 'Scan Error', err.message || 'Verification failed', 2500, 'ERROR', '⚠️');
      setLivenessStatus({
        message: `⚠️ Scan verification error: ${err.message || 'Could not reach attendance database'}`,
        type: 'error'
      });
    } finally {
      setIsCapturing(false);
    }
  };

  // Remove / Undo Attendance (for any accidental / duplicate / extra student scan)
  const handleRemoveAttendance = async (student) => {
    if (prefHaptics) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setScannedStudents(prev => prev.filter(s => s.roll !== student.roll));
    setPendingStudents(prev => {
      if (prev.some(s => s.roll === student.roll)) return prev;
      return sortStudentsByRoll([...prev, { id: student.id, name: student.name, roll: student.roll, email: student.email }]);
    });
    setLivenessStatus({
      message: `Removed: ${student.name} (${student.roll}) marked Absent`,
      type: 'error'
    });
  };

  // Manually Add Student to Attendance (when camera/face scan fails)
  const handleManualAddStudent = async (student) => {
    if (scannedStudents.some(s => s.roll === student.roll)) {
      if (prefHaptics) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      Alert.alert("Already Present", `${student.name} (${student.roll}) is already registered.`);
      return;
    }

    if (prefHaptics) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setScannedStudents(prev => sortStudentsByRoll([...prev, { 
      ...student, 
      status: 'Present', 
      isManual: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }]));
    setPendingStudents(prev => prev.filter(s => s.roll !== student.roll));
    setLivenessStatus({
      message: `Manually Added: ${student.name} (${student.roll})`,
      type: 'success'
    });
  };

  // Pre-Submission Check Trigger
  const handleRequestSubmit = () => {
    setIsSummaryModalVisible(true);
  };

  // Submit Final Attendance Record
  const confirmAndSubmitFinalAttendance = async () => {
    setIsSummaryModalVisible(false);
    const sortedPresent = [...scannedStudents].sort((a, b) => 
      (a.roll || a.roll_number || '').localeCompare(b.roll || b.roll_number || '', undefined, { numeric: true, sensitivity: 'base' })
    );
    const sortedAbsent = [...pendingStudents].sort((a, b) => 
      (a.roll || a.roll_number || '').localeCompare(b.roll || b.roll_number || '', undefined, { numeric: true, sensitivity: 'base' })
    );
    const payload = {
      sessionId: activeSession?.id,
      sessionCode: activeSession?.code,
      conducted_by_name: teacher?.full_name || teacher?.name || profileDetails?.full_name || 'Faculty In-Charge',
      custom_subject_name: activeSession?.name || null,
      session_type: activeSession?.isGuest ? 'guest_lecture' : (activeSession?.session_type || 'lecture'),
      duration_minutes: activeSession?.duration_minutes || (activeSession?.session_type === 'practical' ? 120 : 60),
      credit_weight: activeSession?.credit_weight || (activeSession?.session_type === 'practical' ? 2 : 1),
      notes: activeSession?.notes || null,
      present: sortedPresent,
      absent: sortedAbsent,
      submittedAt: new Date().toISOString()
    };
    
    if (isOffline) {
      const queue = await AsyncStorage.getItem('@offline_queue');
      const newQueue = safeParseOfflineQueue(queue);
      newQueue.push(payload);
      await AsyncStorage.setItem('@offline_queue', JSON.stringify(newQueue));
      updateOfflineCount();
      if (prefHaptics) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert(
        "Stored in Offline Vault", 
        "Device is offline. Attendance cached locally and will sync automatically when online."
      );
    } else {
      try {
        let res = await fetch(`${API_BASE_URL}/attendance/submit_final/${activeSession.id}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${teacher?.token || ''}`
          },
          body: JSON.stringify(payload)
        }).catch(() => null);

        if (!res || !res.ok) {
          res = await fetch(`${CLOUD_API_URL}/attendance/submit_final/${activeSession.id}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${teacher?.token || ''}`
            },
            body: JSON.stringify(payload)
          });
        }

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.detail || errJson.error || `Server responded with status ${res.status}`);
        }

        if (prefHaptics) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        triggerDynamicIsland('attendance', 'Session Finalized', `Committed ${scannedStudents.length} Present to Database`, 3000, 'COMMITTED', '✓');
        Alert.alert(
          "Session Submitted", 
          `Attendance successfully committed to institutional records!\n\nPresent: ${scannedStudents.length} Students\nAbsent: ${pendingStudents.length} Students`
        );
      } catch {
        const queue = await AsyncStorage.getItem('@offline_queue');
        const newQueue = safeParseOfflineQueue(queue);
        newQueue.push(payload);
        await AsyncStorage.setItem('@offline_queue', JSON.stringify(newQueue));
        updateOfflineCount();
        Alert.alert("Notice", "Network timeout. Attendance queued locally for auto-sync.");
      }
    }
    
    setCurrentView('hub');
    setActiveSession(null);
    setScannedStudents([]);
    setPendingStudents([]);
  };

  // Toggle Student Attendance Manually
  const handleToggleAttendance = async (student, currentStatus) => {
    if (currentStatus === 'Present') {
      await handleRemoveAttendance(student);
    } else {
      await handleManualAddStudent(student);
    }
  };

  // Camera Permission Guard
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Initializing Teacher Kiosk...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <View style={styles.permissionIconBadge}>
            <Text style={styles.permissionIconText}>📷</Text>
          </View>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionDesc}>
            The Teacher Mobile Kiosk needs camera access to perform walk-up facial verification and real-time anti-spoofing checks in the classroom.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 1: TEACHER SIGN-IN (If not authenticated)
  // --------------------------------------------------------------------------
  if (!teacher) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.loginScroll}>
          <View style={styles.loginHeader}>
            <View style={styles.emblemBadge}>
              <Text style={styles.emblemText}>🎓</Text>
            </View>
            <Text style={styles.loginAppTitle}>Faculty Kiosk</Text>
            <Text style={styles.loginAppSubtitle}>Smart Attendance • Teacher Tablet Engine</Text>

            {/* In-App Server IP Quick Configurator Button */}
            <TouchableOpacity
              style={{
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#E2E8F0',
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                marginTop: 8,
                gap: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 2,
                elevation: 1
              }}
              onPress={() => { setIsServerModalVisible(true); setPingStatus('idle'); }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1e293b' }}>📡 Server: {currentServerHost}:8000</Text>
              <Text style={{ fontSize: 10, color: '#2563eb', fontWeight: 'bold' }}>⚙️ Config</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardContainer}>
            {/* 3-Way Role / Action Tab Selector */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 3, marginBottom: 18 }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  paddingVertical: 9, 
                  alignItems: 'center', 
                  borderRadius: 10, 
                  backgroundColor: authTab === 'faculty' ? '#FFFFFF' : 'transparent',
                  shadowColor: authTab === 'faculty' ? '#000' : 'transparent',
                  shadowOpacity: 0.06,
                  shadowRadius: 2,
                  elevation: authTab === 'faculty' ? 2 : 0
                }}
                onPress={() => setAuthTab('faculty')}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: authTab === 'faculty' ? '#0F172A' : '#64748B' }}>
                  👨‍🏫 Faculty
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  paddingVertical: 9, 
                  alignItems: 'center', 
                  borderRadius: 10, 
                  backgroundColor: authTab === 'student' ? '#FFFFFF' : 'transparent',
                  shadowColor: authTab === 'student' ? '#000' : 'transparent',
                  shadowOpacity: 0.06,
                  shadowRadius: 2,
                  elevation: authTab === 'student' ? 2 : 0
                }}
                onPress={() => setAuthTab('student')}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: authTab === 'student' ? '#0F172A' : '#64748B' }}>
                  🎓 Student
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  paddingVertical: 9, 
                  alignItems: 'center', 
                  borderRadius: 10, 
                  backgroundColor: authTab === 'signup' ? '#FFFFFF' : 'transparent',
                  shadowColor: authTab === 'signup' ? '#000' : 'transparent',
                  shadowOpacity: 0.06,
                  shadowRadius: 2,
                  elevation: authTab === 'signup' ? 2 : 0
                }}
                onPress={() => setAuthTab('signup')}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: authTab === 'signup' ? '#0F172A' : '#64748B' }}>
                  📝 Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: FACULTY SIGN IN */}
            {authTab === 'faculty' && (
              <View>
                <Text style={styles.cardTitle}>Faculty Sign In</Text>
                <Text style={styles.cardSubtitle}>Authenticate to access today's classroom sessions.</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Institutional Faculty Email</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={authEmail}
                    onChangeText={setAuthEmail}
                    placeholder="faculty@college.edu"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TouchableOpacity onPress={() => { setIsForgotModalVisible(true); setForgotStep('request'); }}>
                      <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '700' }}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput 
                    style={styles.textInput}
                    value={authPassword}
                    onChangeText={setAuthPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity 
                  style={styles.primaryButton} 
                  onPress={handleTeacherLogin}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In to Classroom Hub →</Text>
                  )}
                </TouchableOpacity>

{/* Production Mode: Demo login pills removed */}

                {/* Purge Local Cache Button */}
                <TouchableOpacity 
                  style={{ marginTop: 14, paddingVertical: 8, alignItems: 'center' }} 
                  onPress={handleHardResetCache}
                >
                  <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>
                    🔄 Purge Stale Session & Reset Cache
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 2: STUDENT SIGN IN */}
            {authTab === 'student' && (
              <View>
                <Text style={styles.cardTitle}>Student Sign In</Text>
                <Text style={styles.cardSubtitle}>Inspect your attendance metrics and scan classroom QR codes.</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Roll Number or Email</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={studentIdentifier}
                    onChangeText={setStudentIdentifier}
                    placeholder="e.g. CS2023001 or roll@student.edu"
                    placeholderTextColor="#64748b"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={studentPassword}
                    onChangeText={setStudentPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: '#2563EB' }]} 
                  onPress={handleStudentLogin}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Sign In as Student →</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ marginTop: 16, alignItems: 'center' }}
                  onPress={() => setAuthTab('signup')}
                >
                  <Text style={{ color: '#64748B', fontSize: 12 }}>
                    New to the institution? <Text style={{ color: '#2563EB', fontWeight: '700' }}>Create an Account</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB 3: STUDENT SIGN UP (REGISTRATION) */}
            {authTab === 'signup' && (
              <View>
                <Text style={styles.cardTitle}>Student Registration</Text>
                <Text style={styles.cardSubtitle}>Create your verified academic account.</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={regFullName}
                    onChangeText={setRegFullName}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor="#64748b"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>University Roll Number *</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={regRollNumber}
                    onChangeText={setRegRollNumber}
                    placeholder="e.g. CS2023055"
                    placeholderTextColor="#64748b"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Department / Branch</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={regBranch}
                    onChangeText={setRegBranch}
                    placeholder="Computer Science & Engineering"
                    placeholderTextColor="#64748b"
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Academic Semester</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={regSemester}
                      onChangeText={setRegSemester}
                      placeholder="1"
                      placeholderTextColor="#64748b"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Section (A/B/C)</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={regSection}
                      onChangeText={setRegSection}
                      placeholder="A"
                      placeholderTextColor="#64748b"
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email (Optional)</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={regEmail}
                    onChangeText={setRegEmail}
                    placeholder="student@college.edu"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Set Password *</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={regPassword}
                    onChangeText={setRegPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <TextInput 
                    style={styles.textInput}
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: '#059669', marginTop: 6 }]} 
                  onPress={handleStudentRegister}
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Create Student Account ✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ marginTop: 14, alignItems: 'center' }}
                  onPress={() => setAuthTab('student')}
                >
                  <Text style={{ color: '#64748B', fontSize: 12 }}>
                    Already have an account? <Text style={{ color: '#059669', fontWeight: '700' }}>Sign In here</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Creator Credit Footer */}
            <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
              <View style={{ backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: 'rgba(2, 132, 199, 0.25)', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 }}>
                <Text style={{ color: '#0284c7', fontSize: 11, fontWeight: '700' }}>Created by Ronak Agrawal</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Forgot Password Recovery Modal */}
        <Modal
          visible={isForgotModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsForgotModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.forgotModalCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={styles.forgotModalTitle}>Faculty Password Reset</Text>
                <TouchableOpacity onPress={() => setIsForgotModalVisible(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {forgotStep === 'request' ? (
                <View>
                  <Text style={styles.forgotModalDesc}>
                    Enter your institutional faculty email. A 6-digit verification code will be dispatched via Resend.
                  </Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Faculty Email</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      placeholder="faculty@university.ac.in"
                      placeholderTextColor="#64748b"
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                  <TouchableOpacity 
                    style={[styles.primaryButton, { marginTop: 12 }]} 
                    onPress={handleForgotRequestOtp}
                    disabled={isForgotSubmitting}
                  >
                    {isForgotSubmitting ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send Recovery Code →</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
{/* Production: User enters OTP from real email */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>6-Digit Verification Code</Text>
                    <TextInput 
                      style={[styles.textInput, { textAlign: 'center', letterSpacing: 6, fontSize: 18, fontWeight: 'bold' }]}
                      value={forgotOtp}
                      onChangeText={setForgotOtp}
                      placeholder="123456"
                      placeholderTextColor="#64748b"
                      maxLength={6}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={forgotNewPassword}
                      onChangeText={setForgotNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#64748b"
                      secureTextEntry
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={forgotConfirmPassword}
                      onChangeText={setForgotConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#64748b"
                      secureTextEntry
                    />
                  </View>
                  <TouchableOpacity 
                    style={[styles.primaryButton, { marginTop: 12 }]} 
                    onPress={handleForgotResetPassword}
                    disabled={isForgotSubmitting}
                  >
                    {isForgotSubmitting ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Update Password & Sign In</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ marginTop: 12, alignItems: 'center' }}
                    onPress={() => setForgotStep('request')}
                  >
                    <Text style={{ color: '#78716C', fontSize: 12 }}>← Change Email</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Server Config Modal */}
        {renderServerConfigModal()}
      </SafeAreaView>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 1.5: STUDENT ACADEMIC HUB & QR SCANNER (When student authenticated)
  // --------------------------------------------------------------------------
  if (studentUser) {
    if (isStudentScanning) {
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#000000' }]}>
          <StatusBar barStyle="light-content" />
          <View style={{ paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800' }}>Classroom QR Scanner</Text>
              <Text style={{ color: '#94A3B8', fontSize: 11 }}>Point at your professor's projector screen</Text>
            </View>
            <TouchableOpacity 
              style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }}
              onPress={() => setIsStudentScanning(false)}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', marginVertical: 8 }}>
            <CameraView 
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={isCapturing ? undefined : handleStudentQrScanned}
            />
            <View style={styles.reticleContainer} pointerEvents="none">
              <View style={[styles.faceOvalTarget, { borderRadius: 24, width: 220, height: 220 }]}>
                <View style={[styles.reticleCorner, styles.cornerTL]} />
                <View style={[styles.reticleCorner, styles.cornerTR]} />
                <View style={[styles.reticleCorner, styles.cornerBL]} />
                <View style={[styles.reticleCorner, styles.cornerBR]} />
              </View>
              <Text style={styles.reticleSubtext}>Align the rotating QR code inside box</Text>
            </View>
          </View>

          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center' }}>
              QR codes rotate cryptographically every 10 seconds to prevent proxy attendance.
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {/* Student Top App Bar */}
        <View style={styles.appBar}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.facultyGreeting}>Student Academic Hub</Text>
            <Text style={styles.facultyName} numberOfLines={1}>{studentUser.name}</Text>
            <Text style={styles.facultyDept} numberOfLines={1}>
              {studentUser.roll_number} • {studentUser.branch}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity 
              style={[styles.profilePill, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', paddingHorizontal: 10 }]} 
              onPress={() => { setIsServerModalVisible(true); setPingStatus('idle'); }}
            >
              <Text style={styles.profilePillText}>📡 Server</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.logoutPill, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]} 
              onPress={handleStudentLogout}
            >
              <Text style={[styles.logoutText, { color: '#DC2626', fontWeight: '700' }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.hubContent}>
          {/* Attendance KPI Card */}
          <View style={[styles.lectureCard, { backgroundColor: '#0F172A', marginTop: 12, padding: 20 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                Overall Attendance
              </Text>
              <View style={{ backgroundColor: parseFloat(studentUser.overall_percentage) >= 75 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: parseFloat(studentUser.overall_percentage) >= 75 ? '#34D399' : '#F87171', fontSize: 11, fontWeight: '700' }}>
                  {parseFloat(studentUser.overall_percentage) >= 75 ? '✓ Safe Standing' : '⚠ Debarment Risk'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '900' }}>
                {studentUser.overall_percentage}
              </Text>
              <Text style={{ color: '#64748B', fontSize: 13 }}>
                ({studentUser.attended || 0} of {studentUser.total || 0} lectures)
              </Text>
            </View>
            <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>
              Minimum 75.0% required under AICTE / UGC academic regulations.
            </Text>
          </View>

          {/* Action: Scan Dynamic QR */}
          <View style={{ marginVertical: 16 }}>
            <TouchableOpacity 
              style={[styles.primaryButton, { paddingVertical: 16, backgroundColor: '#2563EB', shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }]}
              onPress={() => setIsStudentScanning(true)}
            >
              <Text style={[styles.primaryButtonText, { fontSize: 16, fontWeight: '800' }]}>
                📷 Scan Attendance QR Code
              </Text>
            </TouchableOpacity>
            <Text style={{ color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
              Point camera at your teacher's 10-second rotating projector code
            </Text>
          </View>

          {/* Academic Info Card */}
          <View style={[styles.lectureCard, { padding: 16, backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }]}>
            <Text style={{ color: '#0F172A', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>
              Academic Enrollment Profile
            </Text>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#64748B', fontSize: 12 }}>Roll Number:</Text>
                <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '700' }}>{studentUser.roll_number}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#64748B', fontSize: 12 }}>Department:</Text>
                <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '600' }}>{studentUser.branch}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#64748B', fontSize: 12 }}>Semester & Section:</Text>
                <Text style={{ color: '#0F172A', fontSize: 12, fontWeight: '600' }}>Semester {studentUser.semester} • Sec {studentUser.section}</Text>
              </View>
            </View>
          </View>

          {/* Creator Credit Footer */}
          <View style={{ alignItems: 'center', marginTop: 28, marginBottom: 24 }}>
            <View style={{ backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: 'rgba(2, 132, 199, 0.25)', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 }}>
              <Text style={{ color: '#0284c7', fontSize: 11, fontWeight: '700' }}>Created by Ronak Agrawal</Text>
            </View>
          </View>
        </ScrollView>

        {renderServerConfigModal()}
      </SafeAreaView>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 2: FACULTY CLASSROOM HUB (Lecture Schedule & Dashboard)
  // --------------------------------------------------------------------------
  if (currentView === 'hub') {
    if (!teacher) {
      return null;
    }
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        {/* Top App Bar */}
        <View style={styles.appBar}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.facultyGreeting}>Welcome back,</Text>
            <Text style={styles.facultyName} numberOfLines={1}>{teacher?.name || 'Faculty Member'}</Text>
            <Text style={styles.facultyDept} numberOfLines={1}>{teacher?.department || 'Academic Department'}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity 
              style={[styles.profilePill, { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', paddingHorizontal: 10 }]} 
              onPress={() => { setIsServerModalVisible(true); setPingStatus('idle'); }}
            >
              <Text style={styles.profilePillText}>📡 Server</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.profilePill, { paddingHorizontal: 10 }]} 
              onPress={() => {
                setIsProfileModalVisible(true);
                loadTeacherProfile();
              }}
            >
              <Text style={styles.profilePillText}>⚙️</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.logoutPill, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]} 
              onPress={handleTeacherLogout}
            >
              <Text style={[styles.logoutText, { color: '#DC2626', fontWeight: '700' }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline Vault & Status Bar */}
        <View style={styles.statusBarRow}>
          <View style={[styles.networkBadge, isOffline ? styles.bgOffline : styles.bgOnline]}>
            <Text style={styles.networkBadgeText}>
              {isOffline ? '● OFFLINE VAULT ACTIVE' : '● ONLINE (LIVE SYNC)'}
            </Text>
          </View>
          {offlineQueueCount > 0 && (
            <TouchableOpacity style={styles.syncBadge} onPress={syncOfflineQueue}>
              <Text style={styles.syncBadgeText}>🔄 {offlineQueueCount} Cached to Sync</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.hubContent}>
          <Text style={styles.sectionHeaderTitle}>Today's Lecture Schedule</Text>
          <Text style={styles.sectionHeaderSubtitle}>Select a session to start walk-up facial attendance:</Text>

          {lectures.length === 0 ? (
            <View style={[styles.lectureCard, { alignItems: 'center', paddingVertical: 32 }]}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>📚</Text>
              <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
                No Lectures Scheduled Today
              </Text>
              <Text style={{ color: '#64748B', fontSize: 13, textAlign: 'center', paddingHorizontal: 16 }}>
                There are no classes scheduled for your faculty profile today. Add subjects in the HOD Portal or check back later.
              </Text>
            </View>
          ) : (
            lectures.map((lec) => {
              const isLive = lec.status === 'Live Now';
              return (
                <TouchableOpacity 
                  key={lec.id} 
                  style={[styles.lectureCard, isLive && styles.lectureCardLive]}
                  onPress={() => launchSession(lec)}
                  activeOpacity={0.8}
                >
                  <View style={styles.lectureCardHeader}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{lec.code}</Text>
                    </View>
                    <View style={[styles.statusTag, isLive ? styles.tagLive : styles.tagUpcoming]}>
                      <Text style={[styles.statusTagText, isLive ? styles.textLive : styles.textUpcoming]}>
                        {lec.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.lectureName}>{lec.name}</Text>
                  
                  <View style={styles.lectureMetaGrid}>
                    <Text style={styles.metaItem}>🏛️ {lec.room}</Text>
                    <Text style={styles.metaItem}>👥 {lec.semester} • {lec.section}</Text>
                    <Text style={styles.metaItem}>⏰ {lec.time}</Text>
                    <Text style={styles.metaItem}>📋 {lec.enrolled} Registered</Text>
                  </View>

                  <View style={[styles.actionBanner, isLive ? styles.actionBannerLive : styles.actionBannerDefault]}>
                    <Text style={[styles.actionBannerText, isLive ? styles.actionTextLive : styles.actionTextDefault]}>
                      {isLive ? '🚀 Launch Walk-Up Scanner' : 'Start Attendance Session'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Creator Credit Footer */}
          <View style={{ alignItems: 'center', paddingVertical: 20, marginTop: 8 }}>
            <View style={{ backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: 'rgba(2, 132, 199, 0.25)', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 }}>
              <Text style={{ color: '#0284c7', fontSize: 11, fontWeight: '700' }}>Created by Ronak Agrawal</Text>
            </View>
          </View>
        </ScrollView>

        {/* Teacher Profile & Preferences Modal */}
        <Modal
          visible={isProfileModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsProfileModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.profileModalCard}>
              <View style={styles.profileModalHeader}>
                <View>
                  <Text style={styles.profileModalTitle}>Faculty Profile & Settings</Text>
                  <Text style={styles.profileModalSubtitle}>Identity, Hardware Preferences & Security</Text>
                </View>
                <TouchableOpacity onPress={() => setIsProfileModalVisible(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                {profileSuccessMsg && (
                  <View style={styles.profileSuccessBanner}>
                    <Text style={styles.profileSuccessText}>✓ {profileSuccessMsg}</Text>
                  </View>
                )}
                {profileErrorMsg && (
                  <View style={styles.profileErrorBanner}>
                    <Text style={styles.profileErrorText}>⚠ {profileErrorMsg}</Text>
                  </View>
                )}

                {/* Section 1: Teacher Identity */}
                <View style={styles.profileSectionBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.profileSectionTitle}>Teacher Identity</Text>
                    <View style={styles.empIdBadge}>
                      <Text style={styles.empIdBadgeText}>{profileDetails.employee_id || (teacher?.id ? `FAC-${String(teacher.id).padStart(4, '0')}` : 'FACULTY')}</Text>
                    </View>
                  </View>

                  <View style={styles.profileMetaRow}>
                    <Text style={styles.profileMetaLabel}>Name:</Text>
                    <Text style={styles.profileMetaValue}>{profileDetails.full_name || teacher?.name || 'Faculty Member'}</Text>
                  </View>
                  <View style={styles.profileMetaRow}>
                    <Text style={styles.profileMetaLabel}>Department:</Text>
                    <Text style={styles.profileMetaValue}>{profileDetails.department || teacher?.department || 'Department Faculty'}</Text>
                  </View>
                  <View style={styles.profileMetaRow}>
                    <Text style={styles.profileMetaLabel}>Email:</Text>
                    <Text style={styles.profileMetaValue}>{profileDetails.email || teacher?.email || 'N/A'}</Text>
                  </View>

                  <Text style={[styles.profileMetaLabel, { marginTop: 8, marginBottom: 4 }]}>Assigned Lecture Courses:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {(profileDetails.assigned_subjects && profileDetails.assigned_subjects.length > 0) ? (
                      profileDetails.assigned_subjects.map((sub, idx) => (
                        <View key={idx} style={styles.assignedSubjectPill}>
                          <Text style={styles.assignedSubjectText}>📚 {sub}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={{ fontSize: 12, color: '#8E8E93', fontStyle: 'italic' }}>Curriculum active across department</Text>
                    )}
                  </View>
                </View>

                {/* Section 2: Hardware & Scanner Preferences */}
                <View style={styles.profileSectionBox}>
                  <Text style={styles.profileSectionTitle}>Scanner & Device Preferences</Text>

                  {/* Camera Preference */}
                  <View style={{ marginTop: 10 }}>
                    <Text style={styles.prefLabel}>Default Scanning Camera</Text>
                    <View style={styles.prefToggleRow}>
                      <TouchableOpacity
                        style={[styles.prefToggleBtn, prefCamera === 'front' && styles.prefToggleBtnActive]}
                        onPress={() => setPrefCamera('front')}
                      >
                        <Text style={[styles.prefToggleBtnText, prefCamera === 'front' && styles.prefToggleBtnTextActive]}>
                          🤳 Front (Selfie)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.prefToggleBtn, prefCamera === 'back' && styles.prefToggleBtnActive]}
                        onPress={() => setPrefCamera('back')}
                      >
                        <Text style={[styles.prefToggleBtnText, prefCamera === 'back' && styles.prefToggleBtnTextActive]}>
                          📷 Back (Classroom)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Haptics Preference */}
                  <View style={styles.prefSwitchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prefSwitchTitle}>Haptic Feedback on Match</Text>
                      <Text style={styles.prefSwitchDesc}>Vibrate device when student face is authenticated</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.switchPill, prefHaptics ? styles.switchPillOn : styles.switchPillOff]}
                      onPress={() => setPrefHaptics(!prefHaptics)}
                    >
                      <Text style={styles.switchPillText}>{prefHaptics ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Auto-Sync Preference */}
                  <View style={styles.prefSwitchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prefSwitchTitle}>Offline Vault Auto-Sync</Text>
                      <Text style={styles.prefSwitchDesc}>Automatically upload queued rosters when online</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.switchPill, prefAutoSync ? styles.switchPillOn : styles.switchPillOff]}
                      onPress={() => setPrefAutoSync(!prefAutoSync)}
                    >
                      <Text style={styles.switchPillText}>{prefAutoSync ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Section 3: Contact & Security Credentials */}
                <View style={styles.profileSectionBox}>
                  <Text style={styles.profileSectionTitle}>Contact & Credential Update</Text>

                  <View style={[styles.inputGroup, { marginTop: 10 }]}>
                    <Text style={styles.inputLabel}>Contact Phone Number</Text>
                    <TextInput 
                      style={styles.textInput}
                      value={profilePhone}
                      onChangeText={setProfilePhone}
                      placeholder="e.g. +91 Mobile Number"
                      placeholderTextColor="#64748b"
                      keyboardType="phone-pad"
                    />
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: 8 }]}>Change Account Password (Optional)</Text>
                  
                  <View style={[styles.inputGroup, { marginTop: 4 }]}>
                    <TextInput 
                      style={styles.textInput}
                      value={profCurrentPass}
                      onChangeText={setProfCurrentPass}
                      placeholder="Current Password"
                      placeholderTextColor="#64748b"
                      secureTextEntry
                    />
                  </View>

                  <View style={[styles.inputGroup, { marginTop: 4 }]}>
                    <TextInput 
                      style={styles.textInput}
                      value={profNewPass}
                      onChangeText={setProfNewPass}
                      placeholder="New Password (min 6 chars)"
                      placeholderTextColor="#64748b"
                      secureTextEntry
                    />
                  </View>

                  <View style={[styles.inputGroup, { marginTop: 4 }]}>
                    <TextInput 
                      style={styles.textInput}
                      value={profConfirmPass}
                      onChangeText={setProfConfirmPass}
                      placeholder="Confirm New Password"
                      placeholderTextColor="#64748b"
                      secureTextEntry
                    />
                  </View>
                </View>

                {/* Section 4: Kiosk Mode Exit Security PIN */}
                <View style={styles.profileSectionBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={styles.profileSectionTitle}>🔒 Kiosk Exit Security PIN</Text>
                    <View style={{
                      backgroundColor: kioskExitPin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      borderColor: kioskExitPin ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)',
                      borderWidth: 1,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 12
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: kioskExitPin ? '#34d399' : '#fbbf24'
                      }}>
                        {kioskExitPin ? '● PIN Protected' : '○ No PIN (Default)'}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 11, color: '#78716C', marginBottom: 12, lineHeight: 16 }}>
                    {kioskExitPin 
                      ? "Kiosk scanner is locked. To change your PIN, enter your current (purani) PIN first."
                      : "Default is set to No PIN (open exit). Set a custom 4-digit PIN below so students cannot exit or cancel the walk-up attendance scanner."}
                  </Text>

                  {kioskPinSuccessMsg && (
                    <View style={styles.profileSuccessBanner}>
                      <Text style={styles.profileSuccessText}>{kioskPinSuccessMsg}</Text>
                    </View>
                  )}
                  {kioskPinErrorMsg && (
                    <View style={styles.profileErrorBanner}>
                      <Text style={styles.profileErrorText}>⚠ {kioskPinErrorMsg}</Text>
                    </View>
                  )}

                  {kioskExitPin ? (
                    // Update PIN Flow: requires current/old PIN
                    <View>
                      <View style={[styles.inputGroup, { marginTop: 4 }]}>
                        <Text style={styles.inputLabel}>Current PIN (Purani PIN)</Text>
                        <TextInput 
                          style={styles.textInput}
                          value={currentKioskPinInput}
                          onChangeText={setCurrentKioskPinInput}
                          placeholder="Enter your existing PIN"
                          placeholderTextColor="#64748b"
                          keyboardType="number-pad"
                          secureTextEntry
                          maxLength={8}
                        />
                      </View>

                      <View style={[styles.inputGroup, { marginTop: 6 }]}>
                        <Text style={styles.inputLabel}>New Kiosk Exit PIN (4 digits)</Text>
                        <TextInput 
                          style={styles.textInput}
                          value={newKioskPinInput}
                          onChangeText={setNewKioskPinInput}
                          placeholder="New 4-digit PIN"
                          placeholderTextColor="#64748b"
                          keyboardType="number-pad"
                          secureTextEntry
                          maxLength={8}
                        />
                      </View>

                      <View style={[styles.inputGroup, { marginTop: 6 }]}>
                        <Text style={styles.inputLabel}>Confirm New PIN</Text>
                        <TextInput 
                          style={styles.textInput}
                          value={confirmKioskPinInput}
                          onChangeText={setConfirmKioskPinInput}
                          placeholder="Re-enter New PIN"
                          placeholderTextColor="#64748b"
                          keyboardType="number-pad"
                          secureTextEntry
                          maxLength={8}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                        <TouchableOpacity 
                          style={[styles.primaryButton, { flex: 1, marginTop: 0, backgroundColor: '#0284c7' }]}
                          onPress={handleSaveKioskPin}
                        >
                          <Text style={styles.primaryButtonText}>Update Kiosk PIN</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            borderColor: 'rgba(239, 68, 68, 0.35)',
                            borderWidth: 1,
                            borderRadius: 12,
                            paddingHorizontal: 12,
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                          onPress={handleRemoveKioskPin}
                        >
                          <Text style={{ color: '#f87171', fontSize: 11, fontWeight: '700' }}>Remove PIN</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    // Set New PIN Flow: No old PIN needed because default is no PIN
                    <View>
                      <View style={[styles.inputGroup, { marginTop: 4 }]}>
                        <Text style={styles.inputLabel}>Set New Kiosk Exit PIN (4 digits)</Text>
                        <TextInput 
                          style={styles.textInput}
                          value={newKioskPinInput}
                          onChangeText={setNewKioskPinInput}
                          placeholder="e.g. 2468"
                          placeholderTextColor="#64748b"
                          keyboardType="number-pad"
                          secureTextEntry
                          maxLength={8}
                        />
                      </View>

                      <View style={[styles.inputGroup, { marginTop: 6 }]}>
                        <Text style={styles.inputLabel}>Confirm New PIN</Text>
                        <TextInput 
                          style={styles.textInput}
                          value={confirmKioskPinInput}
                          onChangeText={setConfirmKioskPinInput}
                          placeholder="Re-enter 4-digit PIN"
                          placeholderTextColor="#64748b"
                          keyboardType="number-pad"
                          secureTextEntry
                          maxLength={8}
                        />
                      </View>

                      <TouchableOpacity 
                        style={[styles.primaryButton, { marginTop: 12, backgroundColor: '#0284c7' }]}
                        onPress={handleSaveKioskPin}
                      >
                        <Text style={styles.primaryButtonText}>Set Kiosk Exit PIN</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Save Button */}
                <TouchableOpacity 
                  style={[styles.primaryButton, { marginTop: 10, marginBottom: 10 }]} 
                  onPress={handleSaveTeacherProfile}
                  disabled={profileSaving}
                >
                  {profileSaving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Save Preferences & Profile</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 3: LIVE HARDWARE CAMERA SCANNING KIOSK
  // --------------------------------------------------------------------------
  if (currentView === 'scanner') {
    return (
      <View style={styles.scannerRoot}>
        <StatusBar hidden />
        
        {/* Floating Top Controls */}
        <View style={styles.scannerTopBar}>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={handleRequestKioskExit}
          >
            <Text style={styles.iconButtonText}>{kioskExitPin ? '🔒 Exit' : '✕ Exit'}</Text>
          </TouchableOpacity>

          <View style={styles.scannerTitleBox}>
            <Text style={styles.scannerSessionCode}>{activeSession?.code} • {activeSession?.section}</Text>
            <Text style={styles.scannerSessionSub}>{activeSession?.room}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => setTorch(!torch)}
            >
              <Text style={styles.iconButtonText}>{torch ? '🔦 On' : '🔦 Off'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}
            >
              <Text style={styles.iconButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Liveness Feedback Bar */}
        <View style={[
          styles.livenessAlertBar, 
          livenessStatus.type === 'success' && styles.livenessSuccess,
          livenessStatus.type === 'error' && styles.livenessError,
          livenessStatus.type === 'processing' && styles.livenessProcessing,
        ]}>
          <Text style={styles.livenessAlertText}>{livenessStatus.message}</Text>
        </View>

        {/* Real-time Hardware Camera Feed */}
        <View style={styles.cameraFrame}>
          <CameraView 
            style={StyleSheet.absoluteFillObject} 
            facing={facing} 
            enableTorch={torch}
            ref={cameraRef}
          />
          
          {/* Oval Alignment Guide with Sci-Fi Reticle Corners */}
          <View style={styles.reticleContainer} pointerEvents="none">
            <View style={styles.faceOvalTarget}>
              <View style={[styles.reticleCorner, styles.cornerTL]} />
              <View style={[styles.reticleCorner, styles.cornerTR]} />
              <View style={[styles.reticleCorner, styles.cornerBL]} />
              <View style={[styles.reticleCorner, styles.cornerBR]} />
            </View>
            <Text style={styles.reticleSubtext}>Walk up & look directly at camera</Text>
          </View>

          {/* Shutter Capture Button */}
          <View style={styles.shutterRow}>
            <TouchableOpacity 
              style={[styles.captureShutter, isCapturing && styles.captureShutterActive]} 
              onPress={handleCaptureAndVerify}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.shutterCore} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Scan Strip with 1-Click Remove / Undo */}
        {scannedStudents.length > 0 && (
          <View style={styles.recentScansBar}>
            <View style={styles.recentScansLeft}>
              <View style={styles.recentStatusDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.recentScansLabel}>Last Recorded:</Text>
                <Text style={styles.recentScansName} numberOfLines={1}>
                  {scannedStudents[scannedStudents.length - 1].name} ({scannedStudents[scannedStudents.length - 1].roll})
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.undoRecentBtn}
              onPress={() => handleRemoveAttendance(scannedStudents[scannedStudents.length - 1])}
            >
              <Text style={styles.undoRecentBtnText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Attendance Gauge & Finish Action */}
        <View style={styles.scannerFooter}>
          <View style={styles.counterGroup}>
            <View style={styles.counterBadgeGreen}>
              <Text style={styles.counterNum}>{scannedStudents.length}</Text>
              <Text style={styles.counterLabel}>Present</Text>
            </View>
            <View style={styles.counterBadgeSlate}>
              <Text style={styles.counterNum}>{pendingStudents.length}</Text>
              <Text style={styles.counterLabel}>Pending</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'flex-end' }}>
            <TouchableOpacity 
              style={styles.manualEntryBtn} 
              onPress={() => setIsManualModalVisible(true)}
            >
              <Text style={styles.manualEntryBtnText}>👤 + Manual</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.reviewButton} 
              onPress={() => setCurrentView('review')}
            >
              <Text style={styles.reviewButtonText}>
                Review ({scannedStudents.length}) →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Manual Student Attendance Add / Override Modal in Scanner */}
        <Modal
          visible={isManualModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsManualModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.manualModalCard}>
              <View style={styles.manualModalHeader}>
                <View>
                  <Text style={styles.manualModalTitle}>Manual Attendance Entry</Text>
                  <Text style={styles.manualModalSubtitle}>
                    Mark or remove students if camera face scan failed
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsManualModalVisible(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Search */}
              <View style={[styles.searchBarContainer, { marginHorizontal: 0, marginBottom: 12 }]}>
                <TextInput 
                  style={styles.searchInput}
                  value={manualSearchQuery}
                  onChangeText={setManualSearchQuery}
                  placeholder="Search by student name or roll number..."
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* Students List in Modal */}
              <ScrollView style={{ maxHeight: 380 }}>
                {sortStudentsByRoll([...scannedStudents, ...pendingStudents])
                  .filter(s => 
                    (s.name || '').toLowerCase().includes((manualSearchQuery || '').toLowerCase()) || 
                    (s.roll || '').toLowerCase().includes((manualSearchQuery || '').toLowerCase())
                  )
                  .map(student => {
                    const isPresent = scannedStudents.some(p => p.roll === student.roll);
                    return (
                      <View key={student.roll} style={styles.manualRosterRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.manualStudentName}>{student.name}</Text>
                          <Text style={styles.manualStudentRoll}>{student.roll}</Text>
                        </View>
                        {isPresent ? (
                          <TouchableOpacity 
                            style={styles.manualRemoveBtn}
                            onPress={() => handleRemoveAttendance(student)}
                          >
                            <Text style={styles.manualRemoveBtnText}>✕ Remove</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity 
                            style={styles.manualAddBtn}
                            onPress={() => handleManualAddStudent(student)}
                          >
                            <Text style={styles.manualAddBtnText}>+ Mark Present</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
              </ScrollView>

              <TouchableOpacity 
                style={[styles.primaryButton, { marginTop: 14 }]} 
                onPress={() => setIsManualModalVisible(false)}
              >
                <Text style={styles.primaryButtonText}>Done ({scannedStudents.length} Marked Present)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Kiosk Exit Security PIN Authentication Modal */}
        <Modal
          visible={isExitPinModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsExitPinModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.forgotModalCard, { borderTopColor: '#38bdf8', borderTopWidth: 3 }]}>
              <View style={{ alignItems: 'center', marginBottom: 14 }}>
                <View style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: 'rgba(14, 165, 233, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10
                }}>
                  <Text style={{ fontSize: 24 }}>🔒</Text>
                </View>
                <Text style={styles.forgotModalTitle}>Faculty Exit Verification</Text>
                <Text style={[styles.forgotModalDesc, { textAlign: 'center', marginTop: 4, marginBottom: 0 }]}>
                  This Kiosk session is locked. Enter your Teacher Security PIN to exit.
                </Text>
              </View>

              {exitPinError && (
                <View style={[styles.profileErrorBanner, { marginBottom: 12 }]}>
                  <Text style={styles.profileErrorText}>⚠ {exitPinError}</Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teacher Security PIN</Text>
                <TextInput 
                  style={[styles.textInput, { textAlign: 'center', fontSize: 22, letterSpacing: 8, fontWeight: '700' }]}
                  value={enteredExitPin}
                  onChangeText={(val) => {
                    setEnteredExitPin(val);
                    setExitPinError(null);
                  }}
                  placeholder="••••"
                  placeholderTextColor="#64748b"
                  keyboardType="number-pad"
                  secureTextEntry
                  autoFocus
                  maxLength={8}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity 
                  style={[styles.primaryButton, { flex: 1, marginTop: 0, backgroundColor: '#0284c7' }]}
                  onPress={handleVerifyExitPin}
                >
                  <Text style={styles.primaryButtonText}>Verify & Exit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E8E3DA',
                    borderWidth: 1,
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    setIsExitPinModalVisible(false);
                    setEnteredExitPin('');
                    setExitPinError(null);
                  }}
                >
                  <Text style={{ color: '#78716C', fontSize: 13, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 4: PRE-SUBMISSION REVIEW & MANUAL OVERRIDE ROSTER
  // --------------------------------------------------------------------------
  const allList = sortStudentsByRoll(sortStudentsByRoll([...scannedStudents, ...pendingStudents]));
  const filteredList = allList.filter(s => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch = (s.name || '').toLowerCase().includes(q) || 
                          (s.roll || '').toLowerCase().includes(q);
    const isPresent = scannedStudents.some(p => p.roll === s.roll);
    if (!matchesSearch) return false;
    if (activeFilterTab === 'present') return isPresent;
    if (activeFilterTab === 'absent') return !isPresent;
    return true;
  });

  const turnoutPercentage = allList.length > 0 
    ? ((scannedStudents.length / allList.length) * 100).toFixed(1) 
    : '0.0';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {renderDynamicIsland()}
      
      {/* Review Header with Complete Turnout HUD */}
      <View style={styles.reviewHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewTitle}>Attendance Verification</Text>
          <Text style={styles.reviewSubtitle}>{activeSession?.code} • {activeSession?.name}</Text>
          <Text style={styles.reviewMetaNotice}>
            Present: <Text style={{ color: '#34d399', fontWeight: '800' }}>{scannedStudents.length}</Text> / Total: <Text style={{ color: '#f8fafc', fontWeight: '800' }}>{allList.length}</Text> Students
          </Text>
        </View>
        <View style={styles.turnoutGaugeBox}>
          <Text style={styles.turnoutPctText}>{turnoutPercentage}%</Text>
          <Text style={styles.turnoutLabel}>Turnout</Text>
        </View>
      </View>

      {/* Roster Search Bar & Quick Manual Add Action */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 12, gap: 8 }}>
        <View style={[styles.searchBarContainer, { flex: 1, marginHorizontal: 0, marginTop: 0 }]}>
          <TextInput 
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search student by name or roll number..."
            placeholderTextColor="#64748b"
          />
        </View>
        <TouchableOpacity 
          style={styles.reviewManualBtn} 
          onPress={() => setIsManualModalVisible(true)}
        >
          <Text style={styles.reviewManualBtnText}>👤 + Add</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabRow}>
        <TouchableOpacity 
          style={[styles.filterTab, activeFilterTab === 'all' && styles.filterTabActive]}
          onPress={() => setActiveFilterTab('all')}
        >
          <Text style={[styles.filterTabText, activeFilterTab === 'all' && styles.filterTabTextActive]}>
            All ({allList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterTab, activeFilterTab === 'present' && styles.filterTabActive]}
          onPress={() => setActiveFilterTab('present')}
        >
          <Text style={[styles.filterTabText, activeFilterTab === 'present' && styles.filterTabTextActive]}>
            Present ({scannedStudents.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterTab, activeFilterTab === 'absent' && styles.filterTabActive]}
          onPress={() => setActiveFilterTab('absent')}
        >
          <Text style={[styles.filterTabText, activeFilterTab === 'absent' && styles.filterTabTextActive]}>
            Absent ({pendingStudents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Students List with Clear Name, Roll Number, and Add/Remove Buttons */}
      <ScrollView style={styles.studentRosterScroll}>
        {filteredList.map((student) => {
          const isPresent = scannedStudents.some(p => p.roll === student.roll);
          const scannedItem = scannedStudents.find(p => p.roll === student.roll);

          return (
            <View key={student.roll} style={styles.rosterCard}>
              <View style={styles.rosterInfo}>
                <View style={[styles.avatarCircle, isPresent ? styles.avatarPresent : styles.avatarAbsent]}>
                  <Text style={styles.avatarInitial}>{student.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.rosterStudentName}>{student.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={styles.rosterRollNumber}>{student.roll}</Text>
                    {isPresent && scannedItem?.isManual && (
                      <Text style={styles.manualTag}>Manual</Text>
                    )}
                  </View>
                  {isPresent && scannedItem?.time && (
                    <Text style={styles.rosterTimestamp}>✓ Marked at {scannedItem.time}</Text>
                  )}
                </View>
              </View>

              {/* Instant Add or Remove Actions */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {isPresent ? (
                  <TouchableOpacity 
                    style={styles.rosterRemoveBtn}
                    onPress={() => handleRemoveAttendance(student)}
                  >
                    <Text style={styles.rosterRemoveBtnText}>✕ Remove</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.rosterAddBtn}
                    onPress={() => handleManualAddStudent(student)}
                  >
                    <Text style={styles.rosterAddBtnText}>+ Mark Present</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Pre-Submission Summary Review Modal */}
      <Modal
        visible={isSummaryModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsSummaryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.summaryModalCard}>
            <View style={styles.summaryModalHeader}>
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>📋 FINAL SUBMISSION REVIEW</Text>
              </View>
              <Text style={styles.summaryModalTitle}>Session Turnout Summary</Text>
              <Text style={styles.summaryModalSubtitle}>
                {activeSession?.code} • {activeSession?.name} ({activeSession?.section})
              </Text>
            </View>

            {/* Turnout KPI Grid (Present / Total Students) */}
            <View style={styles.summaryKpiRow}>
              <View style={styles.summaryKpiBoxGreen}>
                <Text style={styles.summaryKpiNumGreen}>{scannedStudents.length}</Text>
                <Text style={styles.summaryKpiLabel}>Present</Text>
              </View>
              <View style={styles.summaryKpiBoxSlate}>
                <Text style={styles.summaryKpiNumSlate}>{allList.length}</Text>
                <Text style={styles.summaryKpiLabel}>Total</Text>
              </View>
              <View style={styles.summaryKpiBoxAmber}>
                <Text style={styles.summaryKpiNumAmber}>{turnoutPercentage}%</Text>
                <Text style={styles.summaryKpiLabel}>Turnout</Text>
              </View>
            </View>

            {/* Attendance Progress Bar */}
            <View style={styles.summaryProgressContainer}>
              <View style={[styles.summaryProgressBar, { width: `${Math.min(100, Math.max(0, Number(turnoutPercentage)))}%` }]} />
            </View>

            {/* Headcount Breakdown & Absent List */}
            <Text style={styles.summaryAbsentHeader}>
              Absent Students ({pendingStudents.length})
            </Text>
            <ScrollView style={styles.summaryAbsentScroll}>
              {pendingStudents.length === 0 ? (
                <Text style={styles.allPresentText}>🎉 100% Attendance! All students present.</Text>
              ) : (
                pendingStudents.map((st) => (
                  <View key={st.roll} style={styles.summaryAbsentRow}>
                    <Text style={styles.summaryAbsentName}>{st.name}</Text>
                    <Text style={styles.summaryAbsentRoll}>{st.roll}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.summaryActionRow}>
              <TouchableOpacity 
                style={styles.summaryCancelBtn}
                onPress={() => setIsSummaryModalVisible(false)}
              >
                <Text style={styles.summaryCancelBtnText}>← Edit Roster</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.summaryConfirmBtn}
                onPress={confirmAndSubmitFinalAttendance}
              >
                <Text style={styles.summaryConfirmBtnText}>✓ Lock & Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Actions */}
      <View style={styles.reviewFooter}>
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => setCurrentView('scanner')}
        >
          <Text style={styles.secondaryButtonText}>← Back to Scanner</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.commitButton} 
          onPress={handleRequestSubmit}
        >
          <Text style={styles.commitButtonText}>
            Submit Attendance ({scannedStudents.length}/{allList.length}) →
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ----------------------------------------------------------------------------
// STYLESHEET (Ultra-Premium Modern Dark Theme)
// ----------------------------------------------------------------------------
const styles = StyleSheet.create({

  // 🏝️ Apple Dynamic Island Styles
  islandContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 12,
    alignSelf: 'center',
    zIndex: 999999,
    elevation: 99,
    backgroundColor: '#000000',
    borderRadius: 33,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    overflow: 'hidden',
  },
  islandInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  islandIdleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  islandPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  islandIdleText: {
    color: '#F4F4F5',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  islandExpandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  islandCheckBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  islandCheckText: {
    color: '#34D399',
    fontSize: 18,
    fontWeight: '900',
  },
  islandTextCol: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  islandTitleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  islandSubText: {
    color: '#A1A1AA',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  islandTagBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  islandTagText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Interactive Demo Bar in Hub
  islandDemoBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E3DA',
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  islandDemoInfo: {
    marginBottom: 10,
  },
  islandDemoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  islandDemoSub: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  islandDemoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  islandDemoBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  islandDemoBtnGreen: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  islandDemoBtnGreenText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  islandDemoBtnAmber: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  islandDemoBtnAmberText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '700',
  },
  islandDemoBtnBlue: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  islandDemoBtnBlueText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },

  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#78716C',
    fontSize: 14,
  },

  // Permission Box
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionIconText: {
    fontSize: 36,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1917',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionDesc: {
    fontSize: 14,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },

  // Sign In Screen
  loginScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emblemBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  emblemText: {
    fontSize: 32,
  },
  loginAppTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.5,
  },
  loginAppSubtitle: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 4,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E8E3DA',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1917',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 4,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#78716C',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: '#E8E3DA',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: '#1C1917',
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  demoPillContainer: {
    marginTop: 18,
    padding: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoPillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  demoPillValue: {
    fontSize: 11,
    color: '#1C1917',
    fontWeight: '600',
    marginTop: 2,
  },
  demoFillBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  demoFillBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Faculty Hub Screen
  appBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FAF7F2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3DA',
  },
  facultyGreeting: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '600',
  },
  facultyName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1917',
    marginTop: 1,
  },
  facultyDept: {
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 2,
    fontWeight: '600',
  },
  logoutPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  logoutText: {
    color: '#78716C',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBarRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FAF7F2',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  networkBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bgOnline: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  bgOffline: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  networkBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  syncBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  syncBadgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '700',
  },
  hubContent: {
    flex: 1,
    padding: 20,
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1917',
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
    marginBottom: 16,
  },
  lectureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E3DA',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  lectureCardLive: {
    borderColor: '#0284c7',
    backgroundColor: '#F0F9FF',
  },
  lectureCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeBadgeText: {
    color: '#0284c7',
    fontWeight: '800',
    fontSize: 12,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagLive: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  tagUpcoming: { backgroundColor: 'rgba(148, 163, 184, 0.15)' },
  statusTagText: { fontSize: 11, fontWeight: '700' },
  textLive: { color: '#059669' },
  textUpcoming: { color: '#78716C' },
  lectureName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 12,
  },
  lectureMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaItem: {
    fontSize: 12,
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBanner: {
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBannerLive: { backgroundColor: '#0284c7' },
  actionBannerDefault: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBannerText: { fontWeight: '700', fontSize: 13 },
  actionTextLive: { color: '#ffffff' },
  actionTextDefault: {
    color: '#1C1917',
  },

  // Live Camera Scanner Screen
  scannerRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerTopBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  scannerTitleBox: {
    alignItems: 'center',
  },
  scannerSessionCode: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  scannerSessionSub: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  livenessAlertBar: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    zIndex: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  livenessSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    borderColor: '#34d399',
  },
  livenessError: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderColor: '#f87171',
  },
  livenessProcessing: {
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    borderColor: '#60a5fa',
  },
  livenessAlertText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  cameraFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOvalTarget: {
    width: 260,
    height: 350,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#38bdf8',
    borderStyle: 'dashed',
    position: 'relative',
  },
  reticleCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38bdf8',
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 12 },
  reticleSubtext: {
    color: '#78716C',
    fontSize: 12,
    marginTop: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shutterRow: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    zIndex: 20,
  },
  captureShutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  captureShutterActive: {
    opacity: 0.5,
  },
  shutterCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
  },
  scannerFooter: {
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E8E3DA',
  },
  counterGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  counterBadgeGreen: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  counterBadgeSlate: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  counterNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1917',
  },
  counterLabel: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '600',
    marginTop: 2,
  },
  reviewButton: {
    backgroundColor: '#10b981',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Review Screen
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3DA',
    backgroundColor: '#FAF7F2',
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1917',
  },
  reviewSubtitle: {
    fontSize: 12,
    color: '#0284c7',
    marginTop: 2,
    fontWeight: '600',
  },
  turnoutGaugeBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  turnoutPctText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  turnoutLabel: {
    fontSize: 10,
    color: '#78716C',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FAF7F2',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E3DA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#1C1917',
    fontSize: 13,
  },
  filterTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#FAF7F2',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#2563eb',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  filterTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  studentRosterScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  rosterCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  rosterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPresent: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  avatarAbsent: { backgroundColor: '#FFFFFF' },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  rosterStudentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
  },
  rosterRollNumber: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 1,
  },
  rosterTimestamp: {
    fontSize: 10,
    color: '#10b981',
    marginTop: 2,
    fontWeight: '600',
  },
  toggleStatusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnPresent: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  btnAbsent: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textPresent: { color: '#10b981' },
  textAbsent: { color: '#78716C' },
  reviewFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#FAF7F2',
    borderTopWidth: 1,
    borderTopColor: '#E8E3DA',
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#78716C',
    fontWeight: '700',
    fontSize: 13,
  },
  commitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  commitButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  forgotModalCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E3DA',
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  forgotModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1917',
  },
  forgotModalDesc: {
    fontSize: 12,
    color: '#78716C',
    marginBottom: 16,
    lineHeight: 18,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  closeBtnText: {
    color: '#78716C',
    fontSize: 13,
    fontWeight: '700',
  },

  // Teacher Profile Modal Styles
  profilePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.25)',
  },
  profilePillText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '700',
  },
  profileModalCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8E3DA',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  profileModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3DA',
  },
  profileModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1917',
  },
  profileModalSubtitle: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 1,
  },
  profileSectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  profileSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  empIdBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
  },
  empIdBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
  },
  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileMetaLabel: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '600',
    width: 90,
  },
  profileMetaValue: {
    fontSize: 12,
    color: '#1C1917',
    fontWeight: '700',
    flex: 1,
  },
  assignedSubjectPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assignedSubjectText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '600',
  },
  prefLabel: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '600',
    marginBottom: 6,
  },
  prefToggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prefToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E3DA',
    alignItems: 'center',
  },
  prefToggleBtnActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284c7',
  },
  prefToggleBtnText: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '700',
  },
  prefToggleBtnTextActive: {
    color: '#0284c7',
  },
  prefSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8E3DA',
  },
  prefSwitchTitle: {
    fontSize: 12,
    color: '#1C1917',
    fontWeight: '700',
  },
  prefSwitchDesc: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 1,
  },
  switchPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  switchPillOn: {
    backgroundColor: '#10b981',
  },
  switchPillOff: {
    backgroundColor: '#94A3B8',
  },
  switchPillText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '800',
  },
  profileSuccessBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  profileSuccessText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  profileErrorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  profileErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },

  // Recent Scan Strip (Scanner View)
  recentScansBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  recentScansLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  recentStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  recentScansLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  recentScansName: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  undoRecentBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  undoRecentBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
  },

  // Manual Entry Button in Scanner Footer
  manualEntryBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualEntryBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
  },

  // Manual Attendance Modal
  manualModalCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: 24,
    padding: 20,
    width: '92%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#E8E3DA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  manualModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  manualModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1C1917',
  },
  manualModalSubtitle: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  manualRosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8E3DA',
  },
  manualStudentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
  },
  manualStudentRoll: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#0284c7',
    marginTop: 2,
  },
  manualRemoveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  manualRemoveBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  manualAddBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  manualAddBtnText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },

  // Review View Elements
  reviewMetaNotice: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 4,
    fontWeight: '500',
  },
  reviewManualBtn: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewManualBtnText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '800',
  },
  manualTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  rosterRemoveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  rosterRemoveBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
  },
  rosterAddBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  rosterAddBtnText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },

  // Pre-Submission Summary Review Modal
  summaryModalCard: {
    backgroundColor: '#FAF7F2',
    borderRadius: 24,
    padding: 22,
    width: '92%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#E8E3DA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  summaryModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.25)',
    marginBottom: 8,
  },
  summaryBadgeText: {
    color: '#0284c7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryModalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
    textAlign: 'center',
  },
  summaryModalSubtitle: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 3,
    textAlign: 'center',
  },
  summaryKpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  summaryKpiBoxGreen: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  summaryKpiNumGreen: {
    fontSize: 22,
    fontWeight: '900',
    color: '#059669',
  },
  summaryKpiBoxSlate: {
    flex: 1,
    backgroundColor: 'rgba(100, 116, 139, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.25)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  summaryKpiNumSlate: {
    fontSize: 22,
    fontWeight: '900',
    color: '#334155',
  },
  summaryKpiBoxAmber: {
    flex: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  summaryKpiNumAmber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#D97706',
  },
  summaryKpiLabel: {
    fontSize: 10,
    color: '#78716C',
    fontWeight: '700',
    marginTop: 2,
  },
  summaryProgressContainer: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  summaryProgressBar: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  summaryAbsentHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#57534E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryAbsentScroll: {
    maxHeight: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E8E3DA',
    marginBottom: 16,
  },
  summaryAbsentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3DA',
  },
  summaryAbsentName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  summaryAbsentRoll: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#78716C',
  },
  allPresentText: {
    fontSize: 12,
    color: '#059669',
    textAlign: 'center',
    paddingVertical: 10,
    fontWeight: '700',
  },
  summaryActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCancelBtn: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  summaryCancelBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryConfirmBtn: {
    flex: 1.5,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  summaryConfirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
