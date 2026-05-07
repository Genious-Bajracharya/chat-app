import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

export default function VoiceRecorder({ onSend, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startRecording();
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);

      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('Microphone permission denied');
    }
  };

  const stopAndSend = async () => {
    setRecording(false);
    clearInterval(timerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      setUploading(true);
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'voice.webm');

        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        onSend({ fileUrl: res.data.fileUrl, fileType: 'audio' });
      } catch {
        setError('Upload failed');
        setUploading(false);
      }
    };

    mediaRecorderRef.current.stop();
  };

  const cancel = () => {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    onCancel();
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-400 text-sm">
        <span>{error}</span>
        <button onClick={onCancel} className="text-slate-400 hover:text-white">✕</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-1 bg-[#252d3d] rounded-xl px-4 py-2.5">
      {/* Pulse dot */}
      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />

      <span className="text-slate-300 text-sm font-mono">{formatTime(seconds)}</span>

      <div className="flex-1 flex items-center gap-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="w-0.5 bg-indigo-400 rounded-full"
            style={{ height: `${8 + Math.random() * 16}px`, opacity: recording ? 1 : 0.3 }}
          />
        ))}
      </div>

      {uploading ? (
        <span className="text-slate-400 text-xs">Sending...</span>
      ) : (
        <>
          <button
            onClick={stopAndSend}
            className="text-green-400 hover:text-green-300 transition-colors"
            title="Send voice message"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
          <button onClick={cancel} className="text-red-400 hover:text-red-300 transition-colors" title="Cancel">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
