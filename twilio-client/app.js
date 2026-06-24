// Twilio Voice Client App
import { Device } from '@twilio/voice-sdk';

console.log('App initializing with Twilio Voice SDK');

// Global state
let device;
let activeCall;
let timerInterval;
let callStartTime;

// DOM elements - will be initialized when DOM is ready
let statusEl;
let phoneNumberEl;
let idleState;
let ringingState;
let callState;
let callerEl;
let callerActiveEl;
let timerEl;
let answerBtn;
let hangupBtn;

// Initialize DOM elements
function initDOM() {
    statusEl = document.getElementById('status');
    phoneNumberEl = document.getElementById('phone-number');
    idleState = document.getElementById('idle-state');
    ringingState = document.getElementById('ringing-state');
    callState = document.getElementById('call-state');
    callerEl = document.getElementById('caller');
    callerActiveEl = document.getElementById('caller-active');
    timerEl = document.getElementById('timer');
    answerBtn = document.getElementById('answer-btn');
    hangupBtn = document.getElementById('hangup-btn');
    
    // Verify all elements exist
    if (!statusEl || !answerBtn || !hangupBtn) {
        throw new Error('Required DOM elements not found');
    }
    
    // Attach event listeners
    answerBtn.addEventListener('click', handleAnswerClick);
    hangupBtn.addEventListener('click', handleHangupClick);
}

function setStatus(text, className) {
    statusEl.textContent = text;
    statusEl.className = 'status ' + className;
}

function showState(state) {
    idleState.classList.add('hidden');
    ringingState.classList.add('hidden');
    callState.classList.add('hidden');

    if (state === 'idle') idleState.classList.remove('hidden');
    if (state === 'ringing') ringingState.classList.remove('hidden');
    if (state === 'call') callState.classList.remove('hidden');
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    timerEl.textContent = `${mins}:${secs}`;
}

function startTimer() {
    callStartTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Fetch token and initialize device
async function init() {
    try {
        console.log('Fetching token from /token endpoint...');
        const response = await fetch('/token');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to get token`);
        }
        const data = await response.json();

        console.log('Got token, setting up device...');
        
        // Display phone number
        if (data.phoneNumber) {
            phoneNumberEl.textContent = `📞 ${data.phoneNumber}`;
        }

        // Create Device instance
        device = new Device(data.token, {
            codecPreferences: ['opus', 'pcmu'],
            logLevel: 'debug'
        });

        // Device ready event
        device.on('registered', function() {
            console.log('✓ Device registered and ready to receive calls');
            setStatus('🟢 Ready - Waiting for calls', 'ready');
            showState('idle');
        });

        // Connection established
        device.on('connect', function(connection) {
            console.log('Call connected');
            setStatus('🟢 On Call', 'on-call');
            startTimer();
        });

        // Connection ended
        device.on('disconnect', function(connection) {
            console.log('Call disconnected');
            setStatus('🟢 Ready - Waiting for calls', 'ready');
            showState('idle');
            stopTimer();
        });

        // Incoming call received
        device.on('incoming', function(connection) {
            console.log('📞 Incoming call from:', connection.parameters.From);
            activeCall = connection;
            const from = connection.parameters.From || 'Unknown';
            callerEl.textContent = from;

            setStatus('📞 Incoming call...', 'ringing');
            showState('ringing');
        });

        // Error handler
        device.on('error', function(error) {
            console.error('❌ Twilio error:', error);
            setStatus('❌ Error: ' + error.message, 'error');
        });

        // Device offline
        device.on('offline', function() {
            console.log('Device offline');
            setStatus('❌ Offline', 'error');
        });

        // Device unregistered
        device.on('unregistered', function() {
            console.log('Device unregistered');
            setStatus('❌ Disconnected', 'error');
        });

        console.log('Registering device with Twilio...');

        // IMPORTANT: Must call register() to connect to Twilio
        await device.register();

        console.log('Device registration initiated');

    } catch (error) {
        console.error('Init error:', error);
        setStatus('❌ Failed to connect: ' + error.message, 'error');
    }
}

// Button click handlers
function handleAnswerClick() {
    if (activeCall) {
        console.log('Accepting call from:', activeCall.parameters.From);
        activeCall.accept();
        callerActiveEl.textContent = activeCall.parameters.From || 'Caller';
        setStatus('🟢 On Call', 'on-call');
        showState('call');
        startTimer();
    }
}

function handleHangupClick() {
    if (activeCall) {
        console.log('Disconnecting call');
        activeCall.disconnect();
        activeCall = null;
    }
    setStatus('🟢 Ready - Waiting for calls', 'ready');
    showState('idle');
    stopTimer();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded - initializing Twilio client');
    try {
        initDOM();
        init();
    } catch (error) {
        console.error('Initialization error:', error);
        if (statusEl) {
            setStatus('❌ ' + error.message, 'error');
        }
    }
});

console.log('Twilio Client App Loaded');
