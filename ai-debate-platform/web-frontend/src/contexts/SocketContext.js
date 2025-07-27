import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext({});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentDebate, setCurrentDebate] = useState(null);
  const [debateMessages, setDebateMessages] = useState([]);
  const [realTimeAnalysis, setRealTimeAnalysis] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const { user, idToken } = useAuth();

  // Initialize socket connection
  useEffect(() => {
    if (user && idToken) {
      const socketUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      console.log('Connecting to socket at:', socketUrl);
      const newSocket = io(socketUrl, {
        auth: {
          token: idToken
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
        toast.success('Connected to debate platform');
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
        toast.error('Disconnected from server');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnected(false);
        toast.error('Failed to connect to server');
      });

      // Debate-specific event listeners
      newSocket.on('debate_state', (data) => {
        setCurrentDebate(data.debate);
        setDebateMessages(data.messages || []);
      });

      newSocket.on('new_message', (message) => {
        setDebateMessages(prev => [...prev, message]);
      });

      newSocket.on('real_time_analysis', (analysis) => {
        setRealTimeAnalysis(prev => [...prev, analysis]);
        
        // Show notification for important feedback
        if (analysis.feedback?.quickTips?.length > 0) {
          toast.info(`Tip: ${analysis.feedback.quickTips[0]}`);
        }
      });

      newSocket.on('ai_agent_generated', (data) => {
        toast.success(`AI agent "${data.agent.personality}" has joined the debate!`);
        setCurrentDebate(prev => ({
          ...prev,
          aiAgent: data.agent
        }));
      });

      newSocket.on('user_joined', (data) => {
        toast.info(`${data.userId} joined the debate`);
      });

      newSocket.on('user_left', (data) => {
        toast.info(`${data.userId} left the debate`);
      });

      newSocket.on('phase_changed', (data) => {
        toast.info(`Debate phase changed to: ${data.phase}`);
        setCurrentDebate(prev => ({
          ...prev,
          currentPhase: data.phase
        }));
      });

      newSocket.on('user_typing', (data) => {
        setTypingUsers(prev => {
          if (data.typing) {
            return [...prev.filter(id => id !== data.userId), data.userId];
          } else {
            return prev.filter(id => id !== data.userId);
          }
        });
      });

      newSocket.on('feedback_generated', (feedback) => {
        setRealTimeAnalysis(prev => [...prev, feedback]);
      });

      newSocket.on('final_evaluation', (evaluation) => {
        toast.success('Debate evaluation complete!');
        setCurrentDebate(prev => ({
          ...prev,
          finalEvaluation: evaluation
        }));
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error(error.message || 'An error occurred');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setConnected(false);
      };
    }
  }, [user, idToken]);

  // Join debate room
  const joinDebate = useCallback((debateId, userRole) => {
    if (socket && connected) {
      socket.emit('join_debate', {
        debateId,
        userId: user.uid,
        userRole
      });
    }
  }, [socket, connected, user]);

  // Send message
  const sendMessage = useCallback((debateId, content, speakerType = 'human') => {
    if (socket && connected) {
      socket.emit('send_message', {
        debateId,
        content,
        speakerType
      });
    }
  }, [socket, connected]);

  // Generate AI agent
  const generateAIAgent = useCallback((debateId, motion, role, difficulty = 'intermediate') => {
    if (socket && connected) {
      socket.emit('generate_ai_agent', {
        debateId,
        motion,
        role,
        difficulty
      });
    }
  }, [socket, connected]);

  // Change debate phase
  const changePhase = useCallback((debateId, phase) => {
    if (socket && connected) {
      socket.emit('change_phase', {
        debateId,
        phase
      });
    }
  }, [socket, connected]);

  // Request feedback
  const requestFeedback = useCallback((debateId, messageId) => {
    if (socket && connected) {
      socket.emit('request_feedback', {
        debateId,
        messageId
      });
    }
  }, [socket, connected]);

  // Typing indicators
  const startTyping = useCallback((debateId) => {
    if (socket && connected) {
      socket.emit('typing_start', { debateId });
    }
  }, [socket, connected]);

  const stopTyping = useCallback((debateId) => {
    if (socket && connected) {
      socket.emit('typing_stop', { debateId });
    }
  }, [socket, connected]);

  // Clear debate state when leaving
  const leaveDebate = useCallback(() => {
    setCurrentDebate(null);
    setDebateMessages([]);
    setRealTimeAnalysis([]);
    setTypingUsers([]);
  }, []);

  const value = {
    socket,
    connected,
    currentDebate,
    debateMessages,
    realTimeAnalysis,
    typingUsers,
    joinDebate,
    sendMessage,
    generateAIAgent,
    changePhase,
    requestFeedback,
    startTyping,
    stopTyping,
    leaveDebate
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
