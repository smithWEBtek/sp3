import React, { useState, useEffect, useRef } from 'react';

// Open IndexedDB for local audio storage persistence
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("StudioRecorderDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("tracks")) {
        db.createObjectStore("tracks", { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

export default function ClientDashboard() {
  // Authentication & Recording State Rules
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('studio_auth') === 'studio_secret_2026';
  });
  const [isRecording, setIsRecording] = useState(false);
  const [recordedTracks, setRecordedTracks] = useState([]); 
  const [textNotes, setTextNotes] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Client Password Gateway Prompt
  const handleLogin = () => {
    const password = prompt("Please enter your Studio Access Password:");
    if (password === "studio_secret_2026") {
      sessionStorage.setItem('studio_auth', 'studio_secret_2026');
      setIsAuthenticated(true);
    } else if (password !== null) {
      alert("Incorrect password. Please try again.");
    }
  };

  // Pull data from browser storage when page loads
  useEffect(() => {
    if (!isAuthenticated) return;
    async function loadSavedTracks() {
      try {
        const db = await openDB();
        const tx = db.transaction("tracks", "readonly");
        const request = tx.objectStore("tracks").getAll();
        request.onsuccess = () => {
          const tracksWithUrls = request.result.map(track => ({
            ...track,
            url: URL.createObjectURL(track.blob)
          }));
          setRecordedTracks(tracksWithUrls);
        };
      } catch (err) {
        console.error("Could not load persistent tracks:", err);
      }
    }
    loadSavedTracks();
  }, [isAuthenticated]);

  // Audio Recording Engine Functions
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        const id = Date.now();
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newTrackData = { id, blob: audioBlob, name: `Arrangement Note (${timestamp})` };
        
        const db = await openDB();
        const tx = db.transaction("tracks", "readwrite");
        tx.objectStore("tracks").put(newTrackData);
        setRecordedTracks(prev => [...prev, { ...newTrackData, url: URL.createObjectURL(audioBlob) }]);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const deleteTrack = async (id, url) => {
    URL.revokeObjectURL(url);
    const db = await openDB();
    const tx = db.transaction("tracks", "readwrite");
    tx.objectStore("tracks").delete(id);
    setRecordedTracks(prev => prev.filter(track => track.id !== id));
  };

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    console.log("Submitting:", textNotes, recordedTracks);
    alert("Feedback logs saved in console!");
  };

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
        <h2>Brad Smith Piano — Secure Studio Workspace</h2>
        <button onClick={handleLogin} style={{ padding: '12px 24px', cursor: 'pointer', background: '#111', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>
          Enter Studio Password
        </button>
      </div>
    );
  }

    return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f9f9f9', color: '#333' }}>
      
      {/* Client Header Section */}
      <header style={{ borderBottom: '2px solid #111', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#111' }}>Studio Client Workspace</h1>
          <p style={{ margin: '5px 0 0 0' }}>Project: <strong>Song Title / Arrangement Draft</strong></p>
        </div>
        <a href="https://smithpiano.com" style={{ color: '#111', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Charts</a>
      </header>

      {/* Main Split Columns Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '30px' }}>
        
        {/* Left Column: PDF Viewer Frame */}
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px' }}>
          <h2 style={{ marginTop: 0 }}>1. Review Chart Draft</h2>
          <iframe 
            src="/assets/draft_chart.pdf#toolbar=0" 
            style={{ width: '100%', height: '650px', border: '1px solid #e0e0e0', borderRadius: '4px' }}
            title="Chart Preview"
          />
        </div>

        {/* Right Column: Audio System Dashboard */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Audio Tracks Reference Cards */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px' }}>
            <h2 style={{ marginTop: 0 }}>2. Reference Tracks</h2>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '0.9rem' }}>Original Reference Track</label>
              <audio src="/assets/original.mp3" controls style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', fontSize: '0.9rem' }}>MuseScore Playback Draft</label>
              <audio src="/assets/musescore_draft.mp3" controls style={{ width: '100%' }} />
            </div>
          </div>

          {/* User Feedback Deck and Voice Input Card */}
          <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '24px' }}>
            <h2 style={{ marginTop: 0 }}>3. Live Audio & Markup Notes</h2>
            
            <div style={{ marginBottom: '25px', padding: '15px', background: '#fafafa', borderRadius: '6px', border: '1px solid #eee' }}>
              <span style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Record Live Voice Correction</span>
              <p style={{ fontSize: '0.85rem', margin: '0 0 15px 0', color: '#666' }}>Sing or talk through specific arrangement changes, tempos, or transitions.</p>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {!isRecording ? (
                  <button onClick={startRecording} style={{ background: '#d4af37', color: '#111', fontWeight: 'bold', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    🎙️ Start Recording
                  </button>
                ) : (
                  <button onClick={stopRecording} style={{ background: '#cc0000', color: '#fff', fontWeight: 'bold', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    ⏹️ Stop & Save Clip
                  </button>
                )}
                {isRecording && <span style={{ color: '#cc0000', fontWeight: 'bold' }}>🔴 Recording live track...</span>}
              </div>
            </div>

            {/* Persistent Audio Loop Layout List */}
            {recordedTracks.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>Your Saved Session Audio Memos</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {recordedTracks.map((track) => (
                    <div key={track.id} style={{ background: '#f0f4f8', padding: '12px', borderRadius: '6px', border: '1px solid #dcdcdc' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>{track.name}</div>
                      <audio src={track.url} controls style={{ width: '100%', marginBottom: '8px' }} />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <a 
                          href={track.url} 
                          download={`${track.name}.mp3`}
                          style={{ textDecoration: 'none', background: '#111', color: '#fff', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold' }}
                        >
                          ⬇️ Download File
                        </a>
                        <button 
                          onClick={() => deleteTrack(track.id, track.url)}
                          style={{ background: 'none', border: '1px solid #cc0000', color: '#cc0000', fontSize: '0.8rem', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Text Correction Textarea Container */}
            <form onSubmit={handleSubmitFeedback}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Written Adjustments</label>
              <textarea 
                value={textNotes}
                onChange={(e) => setTextNotes(e.target.value)}
                placeholder="e.g., Change ending to a slow fade-out, match bar line cues..."
                style={{ width: '100%', height: '100px', padding: '10px', boxSizing: 'border-box', border: '1px solid #e0e0e0', borderRadius: '4px', resize: 'vertical', marginBottom: '15px' }}
              />
              <button type="submit" style={{ width: '100%', background: '#111', color: '#fff', padding: '12px', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                Send All Session Notes to Brad
              </button>
            </form>

          </div>
        </div>

      </div>
    </div>
  );
}
