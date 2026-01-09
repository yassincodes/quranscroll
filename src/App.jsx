import React, { useState, useEffect, useRef } from 'react';
import { Heart, Share2, X, BookMarked, BarChart3, ArrowLeft, Home } from 'lucide-react';

// Surah information (total ayahs per surah)
const SURAH_DATA = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75,
  9: 129, 10: 109, 11: 123, 12: 111, 13: 43, 14: 52, 15: 99, 16: 128,
  17: 111, 18: 110, 19: 98, 20: 135, 21: 112, 22: 78, 23: 118, 24: 64,
  25: 77, 26: 227, 27: 93, 28: 88, 29: 69, 30: 60, 31: 34, 32: 30,
  33: 73, 34: 54, 35: 45, 36: 83, 37: 182, 38: 88, 39: 75, 40: 85,
  41: 54, 42: 53, 43: 89, 44: 59, 45: 37, 46: 35, 47: 38, 48: 29,
  49: 18, 50: 45, 51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96,
  57: 29, 58: 22, 59: 24, 60: 13, 61: 14, 62: 11, 63: 11, 64: 18,
  65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44, 71: 28, 72: 28,
  73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40, 79: 46, 80: 42,
  81: 29, 82: 19, 83: 36, 84: 25, 85: 22, 86: 17, 87: 19, 88: 26,
  89: 30, 90: 20, 91: 15, 92: 21, 93: 11, 94: 8, 95: 8, 96: 19,
  97: 5, 98: 8, 99: 8, 100: 11, 101: 11, 102: 8, 103: 3, 104: 9,
  105: 5, 106: 4, 107: 7, 108: 3, 109: 6, 110: 3, 111: 5, 112: 4,
  113: 5, 114: 6
};

// Simple Router Component
function Router({ children }) {
  const [currentPath, setCurrentPath] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash.slice(1) || '/');
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
  };

  return children({ currentPath, navigate });
}

// Surah Page Component
function SurahPage({ surahNumber, navigate }) {
  const [verses, setVerses] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [liked, setLiked] = useState({});
  const viewedAyahs = useRef(new Set());
  const [surahInfo, setSurahInfo] = useState(null);

  const storage = {
    async get(key) {
      try {
        if (window.storage) {
          return await window.storage.get(key);
        } else {
          const value = localStorage.getItem(key);
          return value ? { key, value } : null;
        }
      } catch (err) {
        return null;
      }
    },
    async set(key, value) {
      try {
        if (window.storage) {
          return await window.storage.set(key, value);
        } else {
          localStorage.setItem(key, value);
          return { key, value };
        }
      } catch (err) {
        return null;
      }
    }
  };

  useEffect(() => {
    loadSurahVerses();
    loadLikedStatus();
  }, [surahNumber]);

  const loadLikedStatus = async () => {
    try {
      const result = await storage.get('liked-ayah-ids');
      if (result && result.value) {
        const likedIds = JSON.parse(result.value);
        const likedMap = {};
        likedIds.forEach(id => likedMap[id] = true);
        setLiked(likedMap);
      }
    } catch (err) {
      console.log('Error loading liked status:', err);
    }
  };

  const loadSurahVerses = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.asad`
      );
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        const arabicSurah = data.data[0];
        const englishSurah = data.data[1];
        
        setSurahInfo({
          name: arabicSurah.englishName,
          nameArabic: arabicSurah.name,
          number: arabicSurah.number
        });
        
        const formattedVerses = arabicSurah.ayahs.map((ayah, index) => ({
          id: `${ayah.number}`,
          textArabic: ayah.text,
          textEnglish: englishSurah.ayahs[index].text,
          reference: `${arabicSurah.englishName} ${arabicSurah.number}:${ayah.numberInSurah}`,
          surahName: arabicSurah.englishName,
          surahNameArabic: arabicSurah.name,
          surahNumber: arabicSurah.number,
          ayahNumber: ayah.numberInSurah
        }));
        
        setVerses(formattedVerses);
      }
    } catch (err) {
      console.error('Error loading surah:', err);
    }
    setLoading(false);
  };

  const handleScroll = (e) => {
    const container = e.target;
    const scrollPosition = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollPosition / itemHeight);
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      
      if (verses[newIndex]) {
        trackAyahView(verses[newIndex]);
      }
    }
  };

  const trackAyahView = async (verse) => {
    const ayahKey = `${verse.surahNumber}:${verse.ayahNumber}`;
    
    if (viewedAyahs.current.has(ayahKey)) {
      return;
    }
    
    viewedAyahs.current.add(ayahKey);
    
    try {
      const result = await storage.get('reading-stats');
      let stats = {};
      
      if (result && result.value) {
        stats = JSON.parse(result.value);
      }
      
      const surahKey = `surah_${verse.surahNumber}`;
      
      if (!stats[surahKey]) {
        stats[surahKey] = {
          surahNumber: verse.surahNumber,
          surahName: verse.surahName,
          surahNameArabic: verse.surahNameArabic,
          ayahsRead: [],
          totalReads: 0
        };
      }
      
      const ayahsArray = Array.isArray(stats[surahKey].ayahsRead) 
        ? stats[surahKey].ayahsRead 
        : [];
      
      if (!ayahsArray.includes(verse.ayahNumber)) {
        ayahsArray.push(verse.ayahNumber);
      }
      
      stats[surahKey].ayahsRead = ayahsArray;
      stats[surahKey].totalReads += 1;
      stats[surahKey].lastRead = new Date().toISOString();
      
      await storage.set('reading-stats', JSON.stringify(stats));
    } catch (err) {
      console.error('Error tracking ayah view:', err);
    }
  };

  const toggleLike = async (verse) => {
    const isLiked = liked[verse.id];
    
    try {
      if (isLiked) {
        await storage.set(`liked-ayah:${verse.id}`, '');
        const result = await storage.get('liked-ayah-ids');
        let likedIds = result && result.value ? JSON.parse(result.value) : [];
        likedIds = likedIds.filter(id => id !== verse.id);
        await storage.set('liked-ayah-ids', JSON.stringify(likedIds));
        
        setLiked(prev => {
          const newLiked = {...prev};
          delete newLiked[verse.id];
          return newLiked;
        });
      } else {
        await storage.set(`liked-ayah:${verse.id}`, JSON.stringify(verse));
        const result = await storage.get('liked-ayah-ids');
        let likedIds = result && result.value ? JSON.parse(result.value) : [];
        if (!likedIds.includes(verse.id)) {
          likedIds.push(verse.id);
        }
        await storage.set('liked-ayah-ids', JSON.stringify(likedIds));
        
        setLiked(prev => ({...prev, [verse.id]: true}));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const shareVerse = (verse) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1080;
    canvas.height = 1920;
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0f4c3a');
    gradient.addColorStop(0.5, '#1a5c4a');
    gradient.addColorStop(1, '#0d3d2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.beginPath();
    ctx.arc(200, 300, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(900, 1500, 500, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    
    const maxWidth = 900;
    const wordsArabic = verse.textArabic.split(' ');
    let line = '';
    let y = 500;
    const lineHeight = 80;
    
    for (let i = 0; i < wordsArabic.length; i++) {
      const testLine = line + wordsArabic[i] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, canvas.width / 2, y);
        line = wordsArabic[i] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, canvas.width / 2, y);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '400 32px Arial';
    ctx.direction = 'ltr';
    
    y += 100;
    const wordsEnglish = verse.textEnglish.split(' ');
    line = '';
    
    for (let i = 0; i < wordsEnglish.length; i++) {
      const testLine = line + wordsEnglish[i] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, canvas.width / 2, y);
        line = wordsEnglish[i] + ' ';
        y += 50;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, canvas.width / 2, y);
    
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 40px Arial';
    ctx.fillText('— ' + verse.reference, canvas.width / 2, y + 100);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '500 28px Arial';
    ctx.fillText('QuranScroll App', canvas.width / 2, canvas.height - 100);
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${verse.reference.replace(/[: ]/g, '-')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingFullScreen}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading Surah...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{cssStyles}</style>
      
      {/* Back Button */}
      <button 
        style={styles.backButton}
        onClick={() => navigate('/')}
        className="back-button"
      >
        <ArrowLeft size={24} color="white" />
      </button>

      {/* Surah Header */}
      {surahInfo && (
        <div style={styles.surahHeader}>
          <div style={styles.surahHeaderContent}>
            <span style={styles.surahHeaderNumber}>Surah {surahInfo.number}</span>
            <span style={styles.surahHeaderName}>{surahInfo.name}</span>
            <span style={styles.surahHeaderNameArabic}>{surahInfo.nameArabic}</span>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef}
        style={styles.scrollContainer}
        onScroll={handleScroll}
      >
        {verses.map((verse) => (
          <div key={verse.id} style={styles.verseSlide}>
            <div style={styles.verseContent}>
              <div style={styles.textContainer}>
                <p style={styles.ayahNumber}>Ayah {verse.ayahNumber}</p>
                <p style={styles.verseTextArabic}>{verse.textArabic}</p>
                <p style={styles.verseTextEnglish}>{verse.textEnglish}</p>
              </div>
              
              <div style={styles.sidebar}>
                <button 
                  style={styles.iconButton} 
                  onClick={() => toggleLike(verse)}
                  className="icon-button"
                  type="button"
                >
                  <Heart 
                    size={32} 
                    fill={liked[verse.id] ? '#d4af37' : 'none'}
                    color={liked[verse.id] ? '#d4af37' : 'white'}
                  />
                  <span style={styles.iconLabel}>
                    {liked[verse.id] ? 'Liked' : 'Like'}
                  </span>
                </button>
                
                <button 
                  style={styles.iconButton} 
                  onClick={() => shareVerse(verse)}
                  className="icon-button"
                  type="button"
                >
                  <Share2 size={32} color="white" />
                  <span style={styles.iconLabel}>Share</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Home Component
function HomePage({ navigate }) {
  const [verses, setVerses] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);
  const [liked, setLiked] = useState({});
  const [showLikedModal, setShowLikedModal] = useState(false);
  const [likedVerses, setLikedVerses] = useState([]);
  const [readingStats, setReadingStats] = useState({});
  const [showStatsModal, setShowStatsModal] = useState(false);
  const viewedAyahs = useRef(new Set());

  const storage = {
    async get(key) {
      try {
        if (window.storage) {
          return await window.storage.get(key);
        } else {
          const value = localStorage.getItem(key);
          return value ? { key, value } : null;
        }
      } catch (err) {
        return null;
      }
    },
    async set(key, value) {
      try {
        if (window.storage) {
          return await window.storage.set(key, value);
        } else {
          localStorage.setItem(key, value);
          return { key, value };
        }
      } catch (err) {
        return null;
      }
    },
    async delete(key) {
      try {
        if (window.storage) {
          return await window.storage.delete(key);
        } else {
          localStorage.removeItem(key);
          return { key, deleted: true };
        }
      } catch (err) {
        return null;
      }
    },
    async list(prefix) {
      try {
        if (window.storage) {
          return await window.storage.list(prefix);
        } else {
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              keys.push(key);
            }
          }
          return { keys };
        }
      } catch (err) {
        return { keys: [] };
      }
    }
  };

  useEffect(() => {
    loadLikedVerses();
    loadReadingStats();
    loadMultipleVerses(10);
  }, []);

  const loadLikedVerses = async () => {
    try {
      const result = await storage.list('liked-ayah:');
      if (result && result.keys) {
        const versesData = [];
        for (const key of result.keys) {
          try {
            const verseResult = await storage.get(key);
            if (verseResult && verseResult.value) {
              const verse = JSON.parse(verseResult.value);
              versesData.push(verse);
              setLiked(prev => ({...prev, [verse.id]: true}));
            }
          } catch (err) {
            console.log('Error loading verse:', err);
          }
        }
        setLikedVerses(versesData);
      }
    } catch (err) {
      console.log('Error loading liked verses:', err);
    }
  };

  const loadReadingStats = async () => {
    try {
      const result = await storage.get('reading-stats');
      if (result && result.value) {
        const stats = JSON.parse(result.value);
        setReadingStats(stats);
      }
    } catch (err) {
      console.log('Error loading stats:', err);
    }
  };

  const trackAyahView = async (verse) => {
    const ayahKey = `${verse.surahNumber}:${verse.ayahNumber}`;
    
    if (viewedAyahs.current.has(ayahKey)) {
      return;
    }
    
    viewedAyahs.current.add(ayahKey);
    
    try {
      const result = await storage.get('reading-stats');
      let stats = {};
      
      if (result && result.value) {
        stats = JSON.parse(result.value);
      }
      
      const surahKey = `surah_${verse.surahNumber}`;
      
      if (!stats[surahKey]) {
        stats[surahKey] = {
          surahNumber: verse.surahNumber,
          surahName: verse.surahName,
          surahNameArabic: verse.surahNameArabic,
          ayahsRead: [],
          totalReads: 0
        };
      }
      
      const ayahsArray = Array.isArray(stats[surahKey].ayahsRead) 
        ? stats[surahKey].ayahsRead 
        : [];
      
      if (!ayahsArray.includes(verse.ayahNumber)) {
        ayahsArray.push(verse.ayahNumber);
      }
      
      stats[surahKey].ayahsRead = ayahsArray;
      stats[surahKey].totalReads += 1;
      stats[surahKey].lastRead = new Date().toISOString();
      
      await storage.set('reading-stats', JSON.stringify(stats));
      setReadingStats(stats);
    } catch (err) {
      console.error('Error tracking ayah:', err);
    }
  };

  const fetchRandomVerse = async () => {
    try {
      const randomAyahNumber = Math.floor(Math.random() * 6236) + 1;
      
      const response = await fetch(
        `https://api.alquran.cloud/v1/ayah/${randomAyahNumber}/editions/quran-uthmani,en.asad`
      );
      const data = await response.json();
      
      if (data.code === 200 && data.data) {
        const arabicAyah = data.data[0];
        const englishAyah = data.data[1];
        
        return {
          id: `${arabicAyah.number}`,
          textArabic: arabicAyah.text,
          textEnglish: englishAyah.text,
          reference: `${arabicAyah.surah.englishName} ${arabicAyah.surah.number}:${arabicAyah.numberInSurah}`,
          surahName: arabicAyah.surah.englishName,
          surahNameArabic: arabicAyah.surah.name,
          surahNumber: arabicAyah.surah.number,
          ayahNumber: arabicAyah.numberInSurah
        };
      }
    } catch (err) {
      console.error('Error fetching verse:', err);
    }
    
    return null;
  };

  const loadMultipleVerses = async (count) => {
    setLoading(true);
    const newVerses = [];
    
    for (let i = 0; i < count; i++) {
      const verse = await fetchRandomVerse();
      if (verse) {
        newVerses.push(verse);
      }
    }
    
    setVerses(prev => [...prev, ...newVerses]);
    setLoading(false);
  };

  const handleScroll = (e) => {
    const container = e.target;
    const scrollPosition = container.scrollTop;
    const itemHeight = container.clientHeight;
    const newIndex = Math.round(scrollPosition / itemHeight);
    
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      
      if (verses[newIndex]) {
        trackAyahView(verses[newIndex]);
      }
      
      if (newIndex >= verses.length - 2 && !loading) {
        loadMultipleVerses(5);
      }
    }
  };

  const toggleLike = async (verse) => {
    const isLiked = liked[verse.id];
    
    try {
      if (isLiked) {
        await storage.delete(`liked-ayah:${verse.id}`);
        setLiked(prev => {
          const newLiked = {...prev};
          delete newLiked[verse.id];
          return newLiked;
        });
        setLikedVerses(prev => prev.filter(v => v.id !== verse.id));
      } else {
        await storage.set(`liked-ayah:${verse.id}`, JSON.stringify(verse));
        setLiked(prev => ({...prev, [verse.id]: true}));
        setLikedVerses(prev => [...prev, verse]);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const shareVerse = (verse) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 1080;
    canvas.height = 1920;
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0f4c3a');
    gradient.addColorStop(0.5, '#1a5c4a');
    gradient.addColorStop(1, '#0d3d2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.beginPath();
    ctx.arc(200, 300, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(900, 1500, 500, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    
    const maxWidth = 900;
    const wordsArabic = verse.textArabic.split(' ');
    let line = '';
    let y = 500;
    const lineHeight = 80;
    
    for (let i = 0; i < wordsArabic.length; i++) {
      const testLine = line + wordsArabic[i] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, canvas.width / 2, y);
        line = wordsArabic[i] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, canvas.width / 2, y);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '400 32px Arial';
    ctx.direction = 'ltr';
    
    y += 100;
    const wordsEnglish = verse.textEnglish.split(' ');
    line = '';
    
    for (let i = 0; i < wordsEnglish.length; i++) {
      const testLine = line + wordsEnglish[i] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, canvas.width / 2, y);
        line = wordsEnglish[i] + ' ';
        y += 50;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, canvas.width / 2, y);
    
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 40px Arial';
    ctx.fillText('— ' + verse.reference, canvas.width / 2, y + 100);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '500 28px Arial';
    ctx.fillText('QuranScroll App', canvas.width / 2, canvas.height - 100);
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${verse.reference.replace(/[: ]/g, '-')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleVerseClick = (verse) => {
    navigate(`/surah/${verse.surahNumber}`);
  };

  return (
    <div style={styles.container}>
      <style>{cssStyles}</style>
      
      <button 
        style={styles.floatingButton}
        onClick={() => setShowLikedModal(true)}
        className="floating-button"
      >
        <BookMarked size={24} color="white" />
        {likedVerses.length > 0 && (
          <span style={styles.badge}>{likedVerses.length}</span>
        )}
      </button>

      <button 
        style={{...styles.floatingButton, top: '90px'}}
        onClick={() => setShowStatsModal(true)}
        className="floating-button"
      >
        <BarChart3 size={24} color="white" />
      </button>

      {showLikedModal && (
        <div style={styles.modalOverlay} onClick={() => setShowLikedModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                <Heart size={28} fill="#d4af37" color="#d4af37" />
                Liked Ayahs
              </h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowLikedModal(false)}
                className="close-button"
                type="button"
              >
                <X size={24} color="white" strokeWidth={2} />
              </button>
            </div>
            
            <div style={styles.modalContent}>
              {likedVerses.length === 0 ? (
                <div style={styles.emptyState}>
                  <Heart size={64} color="#666" />
                  <p style={styles.emptyText}>No liked ayahs yet</p>
                  <p style={styles.emptySubtext}>Start liking ayahs to save them here</p>
                </div>
              ) : (
                <div style={styles.likedList}>
                  {likedVerses.map((verse) => (
                    <div key={verse.id} style={styles.likedCard} className="liked-card">
                      <p style={styles.likedVerseTextArabic}>{verse.textArabic}</p>
                      <p style={styles.likedVerseText}>{verse.textEnglish}</p>
                      <div style={styles.likedVerseFooter}>
                        <span style={styles.likedReference}>{verse.reference}</span>
                        <button
                          style={styles.unlikeButton}
                          onClick={() => toggleLike(verse)}
                          className="unlike-button"
                        >
                          <Heart size={20} fill="#d4af37" color="#d4af37" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showStatsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowStatsModal(false)}>
          <div style={{...styles.modal, maxWidth: '900px'}} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                <BarChart3 size={28} color="#d4af37" />
                Reading Progress
              </h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowStatsModal(false)}
                className="close-button"
                type="button"
              >
                <X size={24} color="white" strokeWidth={2} />
              </button>
            </div>
            
            <div style={styles.modalContent}>
              {Object.keys(readingStats).length === 0 ? (
                <div style={styles.emptyState}>
                  <BarChart3 size={64} color="#666" />
                  <p style={styles.emptyText}>No reading history yet</p>
                  <p style={styles.emptySubtext}>Start scrolling to track your progress</p>
                </div>
              ) : (
                <div style={styles.statsGrid}>
                  {Object.values(readingStats)
                    .sort((a, b) => a.surahNumber - b.surahNumber)
                    .map((stat) => {
                      const totalAyahs = SURAH_DATA[stat.surahNumber] || 0;
                      const ayahsReadCount = Array.isArray(stat.ayahsRead) ? stat.ayahsRead.length : 0;
                      const percentage = totalAyahs > 0 ? Math.round((ayahsReadCount / totalAyahs) * 100) : 0;
                      
                      return (
                        <div 
                          key={stat.surahNumber} 
                          style={styles.statGridCard} 
                          className="stat-grid-card clickable"
                          onClick={() => navigate(`/surah/${stat.surahNumber}`)}
                        >
                          <div style={styles.statCardTop}>
                            <div style={styles.statNumber}>{stat.surahNumber}</div>
                            <div style={styles.statCardContent}>
                              <p style={styles.statCardSurahName}>{stat.surahName}</p>
                              <p style={styles.statCardSurahNameArabic}>{stat.surahNameArabic}</p>
                            </div>
                          </div>
                          
                          <div style={styles.progressContainer}>
                            <div style={styles.progressBar}>
                              <div 
                                style={{
                                  ...styles.progressFill,
                                  width: `${percentage}%`
                                }}
                              />
                            </div>
                            <div style={styles.progressText}>
                              {ayahsReadCount}/{totalAyahs} ayahs • {percentage}%
                            </div>
                          </div>
                          
                          <div style={styles.statCardFooter}>
                            <span style={styles.statCardViews}>{stat.totalReads} views</span>
                            {stat.lastRead && (
                              <span style={styles.statCardDate}>
                                {new Date(stat.lastRead).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef}
        style={styles.scrollContainer}
        onScroll={handleScroll}
      >
        {verses.map((verse) => (
          <div 
            key={verse.id} 
            style={styles.verseSlide}
            onClick={() => handleVerseClick(verse)}
          >
            <div style={styles.verseContent}>
              <div style={styles.textContainer}>
                <p style={styles.surahName}>{verse.surahNameArabic}</p>
                <p style={styles.verseTextArabic}>{verse.textArabic}</p>
                <p style={styles.verseTextEnglish}>{verse.textEnglish}</p>
                <p style={styles.reference}>{verse.reference}</p>
                <p style={styles.tapHint}>Tap to view full surah</p>
              </div>
              
              <div style={styles.sidebar} onClick={(e) => e.stopPropagation()}>
                <button 
                  style={styles.iconButton} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleLike(verse);
                  }}
                  className="icon-button"
                  type="button"
                >
                  <Heart 
                    size={32} 
                    fill={liked[verse.id] ? '#d4af37' : 'none'}
                    color={liked[verse.id] ? '#d4af37' : 'white'}
                  />
                  <span style={styles.iconLabel}>
                    {liked[verse.id] ? 'Liked' : 'Like'}
                  </span>
                </button>
                
                <button 
                  style={styles.iconButton} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    shareVerse(verse);
                  }}
                  className="icon-button"
                  type="button"
                >
                  <Share2 size={32} color="white" />
                  <span style={styles.iconLabel}>Share</span>
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div style={styles.verseSlide}>
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading more ayahs...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  return (
    <Router>
      {({ currentPath, navigate }) => {
        if (currentPath.startsWith('/surah/')) {
          const surahNumber = parseInt(currentPath.split('/')[2]);
          if (surahNumber >= 1 && surahNumber <= 114) {
            return <SurahPage surahNumber={surahNumber} navigate={navigate} />;
          }
        }
        
        return <HomePage navigate={navigate} />;
      }}
    </Router>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    background: '#000'
  },
  scrollContainer: {
    width: '100%',
    height: '100%',
    overflowY: 'scroll',
    scrollSnapType: 'y mandatory',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
    touchAction: 'pan-y'
  },
  verseSlide: {
    width: '100%',
    height: '100vh',
    scrollSnapAlign: 'start',
    scrollSnapStop: 'always',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f4c3a 0%, #1a5c4a 50%, #0d3d2e 100%)',
    padding: '20px',
    cursor: 'pointer'
  },
  verseContent: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  textContainer: {
    maxWidth: '700px',
    padding: '40px',
    textAlign: 'center',
    color: 'white',
    flex: 1
  },
  surahName: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#d4af37',
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
    direction: 'rtl'
  },
  ayahNumber: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#d4af37',
    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
  },
  verseTextArabic: {
    fontSize: '26px',
    lineHeight: '1.8',
    fontWeight: '600',
    marginBottom: '20px',
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
    direction: 'rtl',
    fontFamily: "'Traditional Arabic', 'Arabic Typesetting', Arial"
  },
  verseTextEnglish: {
    fontSize: '16px',
    lineHeight: '1.6',
    fontWeight: '400',
    marginBottom: '20px',
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
    opacity: 0.9,
    fontFamily: "'Georgia', serif"
  },
  reference: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#d4af37',
    textShadow: '0 2px 5px rgba(0,0,0,0.5)'
  },
  tapHint: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: '10px',
    fontStyle: 'italic'
  },
  sidebar: {
    position: 'absolute',
    right: '20px',
    bottom: '100px',
    display: 'flex',
    flexDirection: 'column',
    gap: '25px',
    zIndex: 10
  },
  iconButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    userSelect: 'none',
    background: 'transparent',
    border: 'none',
    padding: '10px',
    touchAction: 'manipulation'
  },
  iconLabel: {
    fontSize: '12px',
    color: 'white',
    fontWeight: '600',
    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
    pointerEvents: 'none'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px'
  },
  loadingFullScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '20px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    color: 'white',
    fontSize: '16px'
  },
  floatingButton: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #d4af37 0%, #aa8c2a 100%)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(212, 175, 55, 0.5)',
    zIndex: 1000,
    transition: 'transform 0.2s',
    touchAction: 'manipulation'
  },
  backButton: {
    position: 'fixed',
    top: '20px',
    left: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #d4af37 0%, #aa8c2a 100%)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(212, 175, 55, 0.5)',
    zIndex: 1000,
    transition: 'transform 0.2s',
    touchAction: 'manipulation'
  },
  surahHeader: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    background: 'rgba(15, 76, 58, 0.9)',
    backdropFilter: 'blur(10px)',
    padding: '12px 24px',
    borderRadius: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
  },
  surahHeaderContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  surahHeaderNumber: {
    color: '#d4af37',
    fontSize: '12px',
    fontWeight: '600'
  },
  surahHeaderName: {
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  surahHeaderNameArabic: {
    color: '#d4af37',
    fontSize: '14px',
    fontWeight: '600',
    direction: 'rtl'
  },
  badge: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    background: '#fff',
    color: '#0f4c3a',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '2px solid #0f4c3a'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '20px'
  },
  modal: {
    background: 'linear-gradient(135deg, #0f4c3a 0%, #1a5c4a 100%)',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  modalTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    margin: 0
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    minWidth: '40px',
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s',
    padding: '0',
    flexShrink: 0
  },
  modalContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px'
  },
  emptyText: {
    color: 'white',
    fontSize: '20px',
    fontWeight: '600',
    margin: 0
  },
  emptySubtext: {
    color: '#999',
    fontSize: '14px',
    margin: 0
  },
  likedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  likedCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'transform 0.2s, background 0.2s'
  },
  likedVerseTextArabic: {
    color: 'white',
    fontSize: '24px',
    lineHeight: '1.8',
    marginBottom: '12px',
    direction: 'rtl',
    fontWeight: '600',
    textAlign: 'right'
  },
  likedVerseText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '12px',
    fontFamily: "'Georgia', serif"
  },
  likedVerseFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  likedReference: {
    color: '#d4af37',
    fontSize: '14px',
    fontWeight: '600'
  },
  unlikeButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    padding: '4px'
  },
  statGridCard: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  statCardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px'
  },
  statNumber: {
    background: 'linear-gradient(135deg, #d4af37 0%, #aa8c2a 100%)',
    color: 'white',
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)'
  },
  statCardContent: {
    flex: 1,
    minWidth: 0
  },
  statCardSurahName: {
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  statCardSurahNameArabic: {
    color: '#d4af37',
    fontSize: '14px',
    direction: 'rtl',
    fontWeight: '600',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  progressContainer: {
    marginBottom: '12px'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #d4af37 0%, #f4cf67 100%)',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
    boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)'
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '12px',
    fontWeight: '500'
  },
  statCardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  statCardViews: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '12px',
    fontWeight: '500'
  },
  statCardDate: {
    color: '#d4af37',
    fontSize: '12px',
    fontWeight: '600'
  }
};

const cssStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    overscroll-behavior: none;
    overflow: hidden;
    position: fixed;
    width: 100%;
    height: 100%;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .icon-button:hover {
    transform: scale(1.1);
  }

  .icon-button:active {
    transform: scale(0.95);
  }

  .floating-button:hover, .back-button:hover {
    transform: scale(1.1);
  }

  .floating-button:active, .back-button:active {
    transform: scale(0.95);
  }

  .close-button:hover {
    background: rgba(255, 255, 255, 0.2) !important;
  }

  .liked-card:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.08) !important;
  }

  .stat-grid-card:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.08) !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .unlike-button:hover {
    background: rgba(212, 175, 55, 0.2) !important;
  }

  *::-webkit-scrollbar {
    display: none;
  }
  
  * {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  @media (max-width: 768px) {
    .verseTextArabic {
      font-size: 28px !important;
    }
    
    .verseTextEnglish {
      font-size: 18px !important;
    }
    
    .textContainer {
      padding: 20px !important;
    }
  }
`;