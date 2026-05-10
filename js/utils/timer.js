// ============================================
// VAQT HISOBLAGICH (Timer System)
// Qurilish, askar yaratish uchun
// ============================================

class TimerManager {
    constructor() {
        this.timers = []; // {id, startTime, duration, onComplete, onTick, data}
        this.nextId = 1;
    }

    // Yangi timer qo'shish
    add(duration, onComplete, onTick, data) {
        const timer = {
            id: this.nextId++,
            startTime: Date.now(),
            duration: duration * 1000, // soniyadan ms ga
            onComplete: onComplete || null,
            onTick: onTick || null,
            data: data || {}
        };
        this.timers.push(timer);
        return timer.id;
    }

    // Timerni bekor qilish
    cancel(id) {
        this.timers = this.timers.filter(t => t.id !== id);
    }

    // Timerni tezlashtirish (olmos bilan)
    instant(id) {
        const timer = this.timers.find(t => t.id === id);
        if (timer && timer.onComplete) {
            timer.onComplete(timer.data);
        }
        this.cancel(id);
    }

    // Qolgan vaqtni olish (soniyada)
    getRemaining(id) {
        const timer = this.timers.find(t => t.id === id);
        if (!timer) return 0;
        const elapsed = Date.now() - timer.startTime;
        return Math.max(0, (timer.duration - elapsed) / 1000);
    }

    // Qolgan vaqtni o'rnatish (potion uchun — soniyada)
    setRemaining(id, seconds) {
        const timer = this.timers.find(t => t.id === id);
        if (!timer) return;
        // startTime ni hozirdan seconds*1000 ms oldin qilib qo'y
        timer.startTime = Date.now() - (timer.duration - seconds * 1000);
        if (timer.startTime > Date.now()) timer.startTime = Date.now() - 1;
    }

    // Timerni darhol bajarish (book of building/research uchun)
    fireNow(id) {
        this.instant(id);
    }

    // Progress (0-1)
    getProgress(id) {
        const timer = this.timers.find(t => t.id === id);
        if (!timer) return 1;
        const elapsed = Date.now() - timer.startTime;
        return Math.min(1, elapsed / timer.duration);
    }

    // Har frame yangilash
    update() {
        const now = Date.now();
        const completed = [];

        for (const timer of this.timers) {
            const elapsed = now - timer.startTime;

            if (timer.onTick) {
                timer.onTick(timer.data, Math.min(1, elapsed / timer.duration));
            }

            if (elapsed >= timer.duration) {
                completed.push(timer);
            }
        }

        for (const timer of completed) {
            if (timer.onComplete) {
                timer.onComplete(timer.data);
            }
            this.cancel(timer.id);
        }
    }
}

const timerManager = new TimerManager();
