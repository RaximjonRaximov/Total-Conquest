// ============================================
// AUDIO MANAGER - Sintezlangan ovoz effektlari
// ============================================

const AudioManager = {
    ctx: null,
    enabled: true,

    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // Foydalanuvchi birinchi marta ekranga bosganda context ni ochish
            const startAudio = () => {
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
                document.removeEventListener('click', startAudio);
            };
            document.addEventListener('click', startAudio);
            
            // Sozlamalardan saqlangan holatni o'qish
            const saved = localStorage.getItem('totalConquest_audio');
            if (saved !== null) {
                this.enabled = saved === 'true';
            }
        } catch (e) {
            console.warn('Web Audio API qo\'llab quvvatlanmaydi', e);
            this.enabled = false;
        }
    },

    toggle() {
        this.enabled = !this.enabled;
        localStorage.setItem('totalConquest_audio', this.enabled);
        if (this.enabled && this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.enabled;
    },

    _playTone(freq, type, duration, vol, slideToFreq = null) {
        if (!this.enabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        
        osc.frequency.setValueAtTime(freq, now);
        if (slideToFreq) {
            osc.frequency.exponentialRampToValueAtTime(slideToFreq, now + duration);
        }

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    },

    playClick() {
        this._playTone(600, 'sine', 0.1, 0.1, 800);
    },

    playBuild() {
        // Bolg'a ovozi (chunky noise)
        this._playTone(150, 'square', 0.15, 0.2, 50);
        setTimeout(() => this._playTone(200, 'square', 0.15, 0.2, 50), 100);
    },

    playCoin() {
        // Tangalar jarangi
        this._playTone(1200, 'sine', 0.1, 0.1, 2000);
        setTimeout(() => this._playTone(1500, 'sine', 0.2, 0.1, 2500), 50);
    },

    playError() {
        // Xato (past ohang)
        this._playTone(200, 'sawtooth', 0.2, 0.2, 100);
    },

    playSword() {
        // Qilich ovozi
        this._playTone(800, 'triangle', 0.1, 0.1, 1500);
    },

    playArrow() {
        // Kamon o'qi vizillashi
        this._playTone(400, 'sine', 0.15, 0.1, 1000);
    },

    playExplosion() {
        // Bino vayron bo'lishi
        this._playTone(100, 'square', 0.4, 0.3, 20);
    },
    
    playVictory() {
        // G'alaba musiqasi (kichik akkord)
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [440, 554, 659, 880]; // A major

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            gain.gain.setValueAtTime(0, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.15 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.5);

            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.5);
        });
    },

    // Yutuq/daraja oshishi uchun qisqa fanfar
    playSuccess() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        // Rising arpeggio: C5 E5 G5 C6
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            const t = now + i * 0.1;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.12, t + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
            osc.start(t);
            osc.stop(t + 0.46);
        });
    },

    // Offline daromad yig'ilganda
    playCollect() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        // Short coin jingle
        [1200, 1600, 2000].forEach((freq, i) => {
            const osc  = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            const t = now + i * 0.06;
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
            osc.start(t);
            osc.stop(t + 0.3);
        });
    }
};
