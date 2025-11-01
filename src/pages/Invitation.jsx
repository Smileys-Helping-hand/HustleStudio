import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const COUNTDOWN_TARGET = new Date('2025-12-16T15:00:00Z');

const formatTimeUnit = (value) => value.toString().padStart(2, '0');

const getCountdown = () => {
  const now = new Date();
  const diff = COUNTDOWN_TARGET - now;
  if (diff <= 0) {
    return { days: '00', hours: '00', minutes: '00', seconds: '00' };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return {
    days: formatTimeUnit(days),
    hours: formatTimeUnit(hours),
    minutes: formatTimeUnit(minutes),
    seconds: formatTimeUnit(seconds),
  };
};

const Invitation = () => {
  const [countdown, setCountdown] = useState(() => getCountdown());
  const [musicEnabled, setMusicEnabled] = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(getCountdown()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const playAudio = async () => {
      try {
        await audioElement.play();
      } catch (error) {
        console.error('Autoplay blocked', error);
      }
    };

    if (musicEnabled) {
      playAudio();
    } else {
      audioElement.pause();
    }
  }, [musicEnabled]);

  const countdownItems = useMemo(
    () => [
      { label: 'Days', value: countdown.days },
      { label: 'Hours', value: countdown.hours },
      { label: 'Minutes', value: countdown.minutes },
      { label: 'Seconds', value: countdown.seconds },
    ],
    [countdown]
  );

  return (
    <div className="invitation-page">
      <audio ref={audioRef} src="/assets/media/nasheed.mp3" loop autoPlay muted={!musicEnabled}>
        <track kind="captions" src="/assets/media/nasheed.vtt" label="Nasheed captions" />
      </audio>
      <div className="invitation-overlay" />
      <div className="invitation-content">
        <button
          type="button"
          className={clsx('music-toggle', musicEnabled && 'music-toggle--active')}
          onClick={() => setMusicEnabled((prev) => !prev)}
        >
          {musicEnabled ? '♪ Pause Nasheed' : '♪ Play Nasheed'}
        </button>

        <motion.section
          className="invitation-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="invitation-card__floral" />
          <div className="invitation-card__inner">
            <p className="invitation-greeting">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيمِ</p>
            <h1 className="invitation-names">Amina &amp; Yusuf</h1>
            <p className="invitation-subtitle">request the honour of your presence</p>

            <div className="invitation-venue">
              <div>
                <span className="invitation-venue__label">GREGORIAN</span>
                <p className="invitation-venue__value">Tuesday, 16 December 2025</p>
              </div>
              <div>
                <span className="invitation-venue__label">HIJRI</span>
                <p className="invitation-venue__value">Tuesday, Jumada II 26, 1447 AH</p>
              </div>
              <div>
                <span className="invitation-venue__label">VENUE</span>
                <p className="invitation-venue__venue">Legacy Events</p>
                <p className="invitation-venue__address">Schaapkraal Road, Ottery</p>
                <p className="invitation-venue__address">Cape Town, South Africa</p>
              </div>
              <div>
                <span className="invitation-venue__label">TIME</span>
                <p className="invitation-venue__time">Gathering from 4:30 PM</p>
                <p className="invitation-venue__time">Formal program at 5:00 PM, Insha’Allah</p>
              </div>
            </div>

            <div className="invitation-countdown">
              {countdownItems.map((item) => (
                <div key={item.label} className="invitation-countdown__item">
                  <span className="invitation-countdown__value">{item.value}</span>
                  <span className="invitation-countdown__label">{item.label}</span>
                </div>
              ))}
            </div>

            <p className="invitation-rsvp-intro">Share RSVP Details</p>
            <div className="invitation-actions">
              <button type="button" className="invitation-button invitation-button--primary">
                ACCEPT INVITATION
              </button>
              <button type="button" className="invitation-button invitation-button--secondary">
                DECLINE WITH DU’AS
              </button>
            </div>
          </div>

          <div className="wax-seal" aria-hidden="true">
            <span className="wax-seal__monogram">AY</span>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Invitation;
