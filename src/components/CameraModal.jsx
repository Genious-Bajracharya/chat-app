import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

export default function CameraModal({ onClose, onSend, recipientId }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef(null);
  const [facingMode, setFacingMode] = useState('user');

  useEffect(() => {
    const startCamera = async () => {
      try {
        // Stop any existing streams first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.stop();
          });
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: true
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setError('');
      } catch (err) {
        console.error('Camera error:', err);
        if (err.name === 'NotAllowedError') {
          setError('Please allow camera access in settings and try again');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is already in use by another app');
        } else if (err.name === 'SecurityError') {
          setError('Camera access requires HTTPS (or localhost)');
        } else {
          setError(`Camera error: ${err.message || 'Could not access camera'}`);
        }
      }
    };

    startCamera();

    return () => {
      // Properly stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
      // Stop recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      // Stop media recorder if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = async () => {
    try {
      setCapturing(true);
      const context = canvasRef.current.getContext('2d');
      const video = videoRef.current;

      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvasRef.current.toBlob(async (blob) => {
        await uploadMedia(blob, 'image/jpeg', 'photo.jpg');
      }, 'image/jpeg', 0.9);
    } catch (err) {
      setError('Failed to capture photo');
      setCapturing(false);
    }
  };

  const startRecording = () => {
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        await uploadMedia(blob, 'video/webm', 'video.webm');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setError('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const uploadMedia = async (blob, mimeType, filename) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, filename);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { fileUrl, fileType } = res.data;
      onSend({ fileUrl, fileType });
      stopCamera();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      setCapturing(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#1e2330] border-b border-slate-700/50 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <h2 className="text-white font-semibold text-lg">Capture Media</h2>
        <button
          onClick={handleClose}
          disabled={capturing || recording}
          className="text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-2"
          title="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Video Stream - Full Screen */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Recording Indicator */}
        {recording && (
          <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-600/90 text-white px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="font-semibold">{formatTime(recordingTime)}</span>
          </div>
        )}

        {/* Switch Camera Button */}
        <button
          onClick={toggleCamera}
          disabled={recording || capturing}
          className="absolute top-6 right-6 bg-slate-800/70 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-full transition-colors hover:animate-spin"
          title="Switch camera"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>

        {/* Error Message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl text-center max-w-sm">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Canvas (hidden) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls - Bottom */}
      <div className="bg-[#1e2330] border-t border-slate-700/50 px-6 py-6 flex-shrink-0">
        <div className="flex gap-3 justify-center">
          {!recording ? (
            <>
              <button
                onClick={capturePhoto}
                disabled={capturing}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white py-3 px-6 rounded-xl transition-colors font-medium"
                title="Take photo"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{capturing ? 'Capturing...' : 'Photo'}</span>
              </button>
              <button
                onClick={startRecording}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 px-6 rounded-xl transition-colors font-medium"
                title="Start recording"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="8" />
                </svg>
                <span>Record</span>
              </button>
            </>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white py-3 px-6 rounded-xl transition-colors font-medium animate-pulse"
              title="Stop recording"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
