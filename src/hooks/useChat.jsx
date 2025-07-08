import { createContext, useContext, useEffect, useState, useRef } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
const wsUrl = backendUrl.replace('http', 'ws') + '/ws';

const ChatContext = createContext();

const createAudioElement = async (base64Audio) => {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio();
      
      audio.addEventListener('canplaythrough', () => {
        console.log('Audio loaded and can play');
        resolve(audio);
      }, { once: true });

      audio.addEventListener('error', (error) => {
        console.error('Audio loading error:', error);
        reject(error);
      }, { once: true });

      // Set the source after adding event listeners
      audio.src = `data:audio/wav;base64,${base64Audio}`;
      audio.preload = 'auto';
    } catch (error) {
      reject(error);
    }
  });
};

export const ChatProvider = ({ children }) => {
  const ws = useRef(null);
  const currentAudio = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  
  // New states for stop and mute functionality
  const [isMuted, setIsMuted] = useState(false);
  const [isStopped, setIsStopped] = useState(false);

  const [audio, setAudio] = useState(null);
  const [shouldStartAudio, setShouldStartAudio] = useState(false);
  const [facialExpression, setFacialExpression] = useState("");
  const [lipsync, setLipsync] = useState("");

  useEffect(() => {
    const connectWebSocket = () => {
      console.log('Connecting to WebSocket at:', wsUrl);
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket Connected Successfully');
        setIsConnected(true);
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket Disconnected:', event);
        setIsConnected(false);
        setTimeout(connectWebSocket, 5000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };

      ws.current.onmessage = (event) => {
        try {
          const resp = JSON.parse(event.data);
          console.log('Received response:', resp);

          if (isStopped) {
            console.log('Response ignored due to stop');
            return;
          }

          if (resp?.messages?.length) {
            const receivedMessage = resp.messages[0];
            
            // Remove the processing message and add the actual AI response
            setAllMessages(prev => {
              const withoutProcessing = prev.filter(msg => !msg.isProcessing);
              return [...withoutProcessing, { 
                text: receivedMessage.text, 
                isUser: false,
                audio: receivedMessage.audio,
                lipsync: receivedMessage.lipsync,
                facialExpression: receivedMessage.facialExpression
              }];
            });
            
            // Set message without initializing audio here
            setMessage(receivedMessage);
            setMessages([receivedMessage]);
            
            setLoading(false);
            setIsStreaming(true);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
          setLoading(false);
          setAllMessages(prev => {
            const withoutProcessing = prev.filter(msg => !msg.isProcessing);
            return [...withoutProcessing, { 
              text: "Sorry, I encountered an error. Please try again.", 
              isUser: false 
            }];
          });
        }
      };
    };

    connectWebSocket();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [isStopped]);

  const startStreamingText = (messageData) => {
    const { text, wordTimings } = messageData;
    const words = text.split(' ');
    
    setIsStreaming(true);
    setStreamingText("");
    
    // Update the last message to show streaming
    setAllMessages(prev => 
      prev.map((msg, index) => 
        index === prev.length - 1 && !msg.isUser
          ? { ...msg, text: "", isStreaming: true }
          : msg
      )
    );

    // Stream words based on timing
    let currentWordIndex = 0;
    let startTime = Date.now();
    
    const streamInterval = setInterval(() => {
      // Check if stopped during streaming
      if (isStopped) {
        clearInterval(streamInterval);
        setIsStreaming(false);
        return;
      }

      const elapsed = (Date.now() - startTime) / 1000;
      
      // Find which words should be visible now
      let visibleWords = [];
      if (wordTimings && wordTimings.length > 0) {
        for (let i = 0; i < wordTimings.length; i++) {
          if (elapsed >= wordTimings[i].start) {
            visibleWords.push(wordTimings[i].word);
            currentWordIndex = i + 1;
          } else {
            break;
          }
        }
      } else {
        // Fallback: show words at regular intervals
        const wordsToShow = Math.floor(elapsed * 2); // 2 words per second
        visibleWords = words.slice(0, Math.min(wordsToShow, words.length));
        currentWordIndex = visibleWords.length;
      }
      
      const currentText = visibleWords.join(' ');
      setStreamingText(currentText);
      
      // Update the streaming message
      setAllMessages(prev => 
        prev.map((msg, index) => 
          index === prev.length - 1 && msg.isStreaming
            ? { ...msg, text: currentText }
            : msg
        )
      );
      
      // Complete streaming when all words are shown
      const totalWords = wordTimings?.length || words.length;
      if (currentWordIndex >= totalWords) {
        clearInterval(streamInterval);
        setIsStreaming(false);
        setStreamingText("");
        
        // Finalize the message
        setAllMessages(prev => 
          prev.map((msg, index) => 
            index === prev.length - 1
              ? { ...msg, text: text, isStreaming: false }
              : msg
          )
        );
      }
    }, 100); // Check every 100ms
  };

  const chat = async (message) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    // Reset states
    setLoading(true);
    setIsStopped(false);
    setIsStreaming(false);
    
    // Clear any existing audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
      setCurrentAudio(null);
    }
    
    // Add user message
    const userMessage = { text: message, isUser: true };
    setAllMessages(prev => [...prev, userMessage]);
    
    // Add processing message
    const processingMessage = { text: "", isUser: false, isProcessing: true };
    setAllMessages(prev => [...prev, processingMessage]);

    try {
      ws.current.send(JSON.stringify({ message }));
    } catch (error) {
      console.error('WebSocket send error:', error);
      setLoading(false);
      setAllMessages(prev => {
        const withoutProcessing = prev.filter(msg => !msg.isProcessing);
        return [...withoutProcessing, { 
          text: "Sorry, I encountered an error. Please try again.", 
          isUser: false 
        }];
      });
    }
  };

  const onMessagePlayed = () => {
    setMessage(null);
  };

  // Update the audio initialization effect
  useEffect(() => {
    if (!message) {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        setAudio(null);
        setCurrentAudio(null);
      }
      setShouldStartAudio(false);
      return;
    }

    const initializeAudio = async () => {
      // Only create new audio if we have new audio data
      if (message.audio && (!audio || audio.src !== `data:audio/wav;base64,${message.audio}`)) {
        try {
          // Clean up existing audio
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
            if (audio.onEndHandler) {
              audio.removeEventListener('ended', audio.onEndHandler);
            }
            setAudio(null);
            setCurrentAudio(null);
          }

          setFacialExpression(message.facialExpression);
          setLipsync(message.lipsync);

          console.log('Creating new audio element');
          
          // Create and initialize new audio
          const newAudio = await createAudioElement(message.audio);
          
          // Create event handler
          const endHandler = () => {
            console.log('Audio ended');
            setAudio(null);
            setCurrentAudio(null);
            setShouldStartAudio(false);
            onMessagePlayed();
          };
          
          newAudio.onEndHandler = endHandler;
          newAudio.addEventListener('ended', endHandler);

          // Set the new audio
          setAudio(newAudio);
          setCurrentAudio(newAudio);

          // Play immediately if not muted or stopped
          if (!isMuted && !isStopped) {
            try {
              console.log('Starting audio playback immediately');
              await newAudio.play();
              setIsStreaming(true); // Set streaming after audio starts
            } catch (playError) {
              console.error('Play error:', playError);
            }
          }
        } catch (error) {
          console.error('Audio initialization error:', error);
        }
      }
    };

    initializeAudio();
  }, [message, isMuted, isStopped]);

  // Simplify the mute/unmute logic
  useEffect(() => {
    if (!audio) return;

    if (isMuted) {
      if (!audio.paused) {
        audio.pause();
      }
    } else if (audio.paused && !isStopped) {
      audio.play().catch(console.error);
    }
  }, [audio, isMuted, isStopped]);

  // Update the stop generation function
  const stopGeneration = () => {
    console.log('Stopping generation and audio');
    setIsStopped(true);
    setLoading(false);
    setIsStreaming(false);
    setShouldStartAudio(false);
    
    // Stop and cleanup current audio
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      if (audio.onEndHandler) {
        audio.removeEventListener('ended', audio.onEndHandler);
      }
      setAudio(null);
      setCurrentAudio(null);
    }
    
    // Clear states
    setMessage(null);
    setMessages([]);
    
    // Remove processing messages
    setAllMessages(prev => prev.filter(msg => !msg.isProcessing));
    
    // Reset stopped state after cleanup
    setTimeout(() => setIsStopped(false), 200);
  };

  // Function to set current audio reference
  const setCurrentAudio = (audio) => {
    currentAudio.current = audio;
  };

  // Remove the messages effect that was causing the loop
  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]); // Only depend on messages

  // Add the missing toggleMute function
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    console.log(`Mute toggled: ${newMutedState}`);
  };

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
        allMessages,
        streamingText,
        isStreaming,
        isMuted,
        toggleMute,
        stopGeneration,
        isStopped,
        setCurrentAudio,
        isConnected,
        audio,
        shouldStartAudio,
        facialExpression,
        lipsync,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
