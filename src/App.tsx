/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  MessageSquare, 
  FileText, 
  ChevronRight, 
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Loader2
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { AppState, AvatarProfile, Message } from './types';
import { AVATARS } from './constants';
import { AvatarSelector } from './components/AvatarSelector';
import { DocumentUploader } from './components/DocumentUploader';
import { AudioStreamer, getMicrophoneStream, floatTo16BitPCM, base64Encode } from './utils/audio';

export default function App() {
  const [state, setState] = useState<AppState>('WELCOME');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarProfile>(AVATARS[0]);
  const [docContent, setDocContent] = useState<string>('');
  const [docName, setDocName] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [modelResponse, setModelResponse] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const sessionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Initialize Audio Streamer
  useEffect(() => {
    audioStreamerRef.current = new AudioStreamer(24000);
    return () => {
      audioStreamerRef.current?.stop();
    };
  }, []);

  const stopAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const connectToLiveAPI = useCallback(async () => {
    if (!docContent) return;
    setAudioError(null);

    // Request microphone access IMMEDIATELY on user gesture
    let stream: MediaStream;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta el acceso al micrófono o la conexión no es segura.');
      }
      stream = await getMicrophoneStream();
      micStreamRef.current = stream;
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setAudioError('No se encontró ningún micrófono. Por favor, conecta uno e inténtalo de nuevo.');
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setAudioError('Acceso al micrófono denegado. Por favor, permite el acceso en tu navegador.');
      } else {
        setAudioError('Error al acceder al micrófono: ' + (err.message || 'Error desconocido'));
      }
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    try {
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedAvatar.voice } },
          },
          systemInstruction: `Eres ${selectedAvatar.name}, un asistente amigable. 
          Tu conocimiento se limita ESTRICTAMENTE al documento proporcionado a continuación.
          Si el usuario pregunta algo que no está en el documento, indícalo amablemente.
          Puedes enriquecer las ideas con ejemplos o conceptos adicionales SIEMPRE QUE se alineen con el contexto del documento.
          
          DOCUMENTO:
          ${docContent}`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            audioStreamerRef.current?.start();
            
            // Start processing the already acquired stream
            const audioContext = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioContext;
            
            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              if (sessionRef.current && !isMuted) {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = floatTo16BitPCM(inputData);
                const base64Data = base64Encode(pcmData);
                
                sessionRef.current.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              }
            };

            source.connect(processor);
            processor.connect(audioContext.destination);
            setIsRecording(true);
          },
          onmessage: async (message) => {
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData) {
                  audioStreamerRef.current?.addChunk(part.inlineData.data);
                }
              }
            }

            if (message.serverContent?.interrupted) {
              // Handle interruption
            }

            if (message.serverContent?.modelTurn?.parts?.[0]?.text) {
              setModelResponse(prev => prev + message.serverContent!.modelTurn!.parts[0].text);
            }
          },
          onclose: () => {
            setIsConnected(false);
            stopAudio();
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setIsConnected(false);
            stopAudio();
          }
        }
      });

      sessionRef.current = session;
    } catch (err) {
      console.error('Failed to connect:', err);
      stopAudio();
    }
  }, [docContent, selectedAvatar, stopAudio, isMuted]);

  useEffect(() => {
    // We removed the automatic connection to ensure a user gesture triggers the microphone
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close();
      }
      stopAudio();
    };
  }, [stopAudio]);

  const handleUpload = (content: string, name: string) => {
    setDocContent(content);
    setDocName(name);
    setState('CHAT');
  };

  const resetApp = () => {
    setState('WELCOME');
    setDocContent('');
    setDocName('');
    setIsConnected(false);
    if (sessionRef.current) sessionRef.current.close();
    stopAudio();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-zinc-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-bottom border-zinc-100 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">DocuTalk</span>
        </div>
        
        {state !== 'WELCOME' && (
          <button 
            onClick={resetApp}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar
          </button>
        )}
      </header>

      <main className="pt-24 pb-12 px-6">
        <AnimatePresence mode="wait">
          {state === 'WELCOME' && (
            <motion.div 
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto flex flex-col items-center text-center"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
                <img 
                  src={AVATARS[0].imageUrl} 
                  alt="Welcome Avatar" 
                  className="relative w-48 h-48 rounded-full border-4 border-white shadow-2xl object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                ¡Bienvenido a DocuTalk!
              </h1>
              <p className="text-xl text-zinc-600 mb-12 max-w-2xl leading-relaxed">
                Soy Luna, tu primera guía. Aquí podrás subir cualquier documento y conversar con nosotros para entenderlo mejor. 
                Es fácil: elige un avatar, sube tu archivo y ¡empecemos a hablar!
              </p>
              
              <button 
                onClick={() => setState('AVATAR_SELECTION')}
                className="group flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
              >
                Comenzar ahora
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {state === 'AVATAR_SELECTION' && (
            <motion.div 
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-5xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-2">Elige a tu compañero</h2>
                <p className="text-zinc-500">Cada uno tiene una personalidad y voz única para ayudarte.</p>
              </div>
              
              <AvatarSelector 
                selectedId={selectedAvatar.id}
                onSelect={(avatar) => {
                  setSelectedAvatar(avatar);
                  setState('UPLOAD');
                }} 
              />
            </motion.div>
          )}

          {state === 'UPLOAD' && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold mb-4">
                  <FileText className="w-4 h-4" />
                  Paso 2: Documentación
                </div>
                <h2 className="text-3xl font-bold mb-2">Sube el documento</h2>
                <p className="text-zinc-500">Analizaremos el contenido para que puedas preguntar lo que quieras.</p>
              </div>
              
              <DocumentUploader onUpload={handleUpload} />
              
              <button 
                onClick={() => setState('AVATAR_SELECTION')}
                className="mt-8 mx-auto flex items-center gap-2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Volver a selección de avatar
              </button>
            </motion.div>
          )}

          {state === 'CHAT' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 overflow-hidden border border-zinc-100">
                {/* Chat Header */}
                <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                  <div className="flex items-center gap-4">
                    <img 
                      src={selectedAvatar.imageUrl} 
                      alt={selectedAvatar.name} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="font-bold text-zinc-900">{selectedAvatar.name}</h3>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
                        <span className="text-xs text-zinc-500 font-medium">
                          {isConnected ? 'Conectado y escuchando' : 'Conectando...'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Documento</span>
                      <span className="text-xs font-medium text-zinc-600 truncate max-w-[150px]">{docName}</span>
                    </div>
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className={`p-3 rounded-2xl transition-all ${isMuted ? 'bg-rose-50 text-rose-500' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Chat Content */}
                <div className="h-[450px] flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
                  {/* Visualizer Background */}
                  {isConnected && isRecording && !isMuted && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{ 
                            height: [20, Math.random() * 100 + 20, 20],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            delay: i * 0.1,
                            ease: "easeInOut"
                          }}
                          className="w-2 mx-1 bg-indigo-500 rounded-full"
                        />
                      ))}
                    </div>
                  )}

                  <div className="relative z-10">
                    <div className={`w-32 h-32 rounded-full mx-auto mb-8 flex items-center justify-center transition-all duration-500 ${audioError ? 'bg-rose-100' : (isConnected && isRecording && !isMuted ? 'bg-indigo-600 scale-110 shadow-2xl shadow-indigo-200' : 'bg-zinc-100')}`}>
                      {audioError ? (
                        <MicOff className="w-12 h-12 text-rose-500" />
                      ) : isConnected ? (
                        isMuted ? (
                          <MicOff className="w-12 h-12 text-rose-500" />
                        ) : (
                          <Mic className={`w-12 h-12 text-white ${isRecording ? 'animate-pulse' : ''}`} />
                        )
                      ) : (
                        <Loader2 className="w-12 h-12 text-zinc-400 animate-spin" />
                      )}
                    </div>
                    
                    <h4 className={`text-2xl font-bold mb-4 ${audioError ? 'text-rose-600' : 'text-zinc-900'}`}>
                      {audioError ? 'Error de Audio' : (!isConnected ? 'Listo para conectar' : (isMuted ? 'Micrófono silenciado' : '¡Te escucho!'))}
                    </h4>
                    <p className="text-zinc-500 max-w-sm mx-auto leading-relaxed mb-6">
                      {audioError 
                        ? audioError
                        : (!isConnected 
                          ? 'Haz clic abajo para iniciar la conversación con tu micrófono.'
                          : (isMuted ? 'Haz clic en el icono de volumen para volver a hablar.' : `Habla con ${selectedAvatar.name} sobre "${docName}".`))}
                    </p>

                    {!isConnected && !audioError && (
                      <button 
                        onClick={connectToLiveAPI}
                        className="flex items-center gap-2 mx-auto px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                      >
                        <Mic className="w-5 h-5" />
                        Iniciar Conversación
                      </button>
                    )}

                    {audioError && (
                      <button 
                        onClick={connectToLiveAPI}
                        className="flex items-center gap-2 mx-auto px-6 py-2 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-100"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reintentar acceso
                      </button>
                    )}
                  </div>

                  {/* Subtitles/Transcript area */}
                  <div className="absolute bottom-8 left-8 right-8">
                    <div className="bg-zinc-900/5 backdrop-blur-sm rounded-2xl p-4 min-h-[60px] flex items-center justify-center">
                      <p className="text-sm font-medium text-zinc-600 italic">
                        {selectedAvatar.greeting}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat Footer */}
                <div className="p-6 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-center gap-8">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    <Sparkles className="w-3 h-3" />
                    Powered by Gemini 2.5 Live
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Decoration */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 flex justify-center pointer-events-none opacity-50">
        <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-[0.2em]">
          Conversational AI • Document Analysis • Real-time Voice
        </div>
      </footer>
    </div>
  );
}
