/**
 * Web Audio API synthesized medical queue chime
 * Uses oscillator nodes to produce a clean, melodious dual-tone hospital chime
 */

class HospitalChimeService {
  constructor() {
    this.audioCtx = null;
    this.isMuted = false;
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playChime() {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Note 1: High crisp chime (D5: 587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.85);

      // Note 2: Harmonious chime (A5: 880 Hz) after 0.25s
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.25);

      gain2.gain.setValueAtTime(0, now + 0.25);
      gain2.gain.linearRampToValueAtTime(0.3, now + 0.3);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.25);
      osc2.stop(now + 1.25);
    } catch (e) {
      console.warn('Unable to play audio chime:', e);
    }
  }

  speakAnnouncement(tokenNumber, roomNumber) {
    if (this.isMuted) return;
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        const text = `Token ${tokenNumber.split('').join(' ')}, please proceed to ${roomNumber}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 0.9;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  }

  announceCall(tokenNumber, roomNumber) {
    this.playChime();
    setTimeout(() => {
      this.speakAnnouncement(tokenNumber, roomNumber);
    }, 600);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

export const chimeService = new HospitalChimeService();
