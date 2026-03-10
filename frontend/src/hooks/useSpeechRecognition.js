import { useState, useEffect, useRef, useCallback } from 'react';

const useSpeechRecognition = () => {
  const [listening,   setListening]   = useState(false);
  const [transcript,  setTranscript]  = useState('');
  const [supported,   setSupported]   = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setSupported(true);
    const recognition        = new SpeechRecognition();
    recognition.continuous   = false;
    recognition.interimResults = true;
    recognition.lang         = 'en-US';

    recognition.onresult = (event) => {
      const current  = event.results[event.results.length - 1];
      const text     = current[0].transcript;
      setTranscript(text);
    };

    recognition.onend  = () => setListening(false);
    recognition.onerror = (err) => {
      console.error('[Speech]', err.error);
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setListening(true);
    recognitionRef.current.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const resetTranscript = useCallback(() => setTranscript(''), []);

  return { supported, listening, transcript, startListening, stopListening, resetTranscript };
};

export default useSpeechRecognition;