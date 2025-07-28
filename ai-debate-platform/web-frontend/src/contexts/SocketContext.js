import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// Safe toast wrapper to prevent errors
const safeToast = {
  success: (message, options) => {
    try {
      return toast.success(message, options);
    } catch (error) {
      console.error('Toast error:', error);
      console.log('Toast message:', message);
    }
  },
  error: (message, options) => {
    try {
      return toast.error(message, options);
    } catch (error) {
      console.error('Toast error:', error);
      console.log('Toast message:', message);
    }
  },
  info: (message, options) => {
    try {
      return toast(message, { icon: 'ℹ️', ...options });
    } catch (error) {
      console.error('Toast error:', error);
      console.log('Toast message:', message);
    }
  },
  loading: (message, options) => {
    try {
      return toast.loading(message, options);
    } catch (error) {
      console.error('Toast error:', error);
      console.log('Toast message:', message);
    }
  }
};

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
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
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
        safeToast.success('Connected to debate platform');
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
        // Only show disconnect toast if user was previously connected
        if (connected) {
          safeToast.error('Disconnected from server');
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnected(false);
        // Only show connection error toast if user is authenticated and expects to be connected
        if (user && idToken) {
          safeToast.error('Failed to connect to server');
        }
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
        console.log('Received real-time analysis:', analysis);
        setRealTimeAnalysis(prev => [...prev, analysis]);

        // Show notification for important feedback
        if (analysis.feedback?.quickTips?.length > 0) {
          safeToast.info(`Tip: ${analysis.feedback.quickTips[0]}`);
        }
      });

      newSocket.on('leaderboard_updated', (data) => {
        console.log('Leaderboard updated:', data);

        // Calculate rank changes
        const oldLeaderboard = currentDebate?.leaderboard || {};
        const newLeaderboard = data.leaderboard;

        // Get old and new rankings
        const oldRankings = Object.entries(oldLeaderboard)
          .sort(([,a], [,b]) => b.averageScore - a.averageScore)
          .map(([id], index) => ({ id, rank: index + 1 }));

        const newRankings = Object.entries(newLeaderboard)
          .sort(([,a], [,b]) => b.averageScore - a.averageScore)
          .map(([id], index) => ({ id, rank: index + 1 }));

        // Update current debate with new leaderboard data
        setCurrentDebate(prev => ({
          ...prev,
          leaderboard: data.leaderboard,
          leaderboardUpdated: data.timestamp
        }));

        // Show notification for leaderboard changes
        if (data.updatedUserId === user?.uid) {
          const userStats = data.leaderboard[data.updatedUserId];
          const oldRank = oldRankings.find(r => r.id === user.uid)?.rank;
          const newRank = newRankings.find(r => r.id === user.uid)?.rank;

          if (userStats) {
            const score = (userStats.averageScore * 10).toFixed(1);
            let message = `Performance updated! Score: ${score}/10`;

            if (oldRank && newRank && oldRank !== newRank) {
              if (newRank < oldRank) {
                message += ` 🎉 Moved up to #${newRank}!`;
              } else {
                message += ` Rank: #${newRank}`;
              }
            }

            safeToast.success(message);
          }
        }
      });

      newSocket.on('ai_agent_generated', (data) => {
        console.log('AI agent generated:', data);
        safeToast.success(`AI opponent has joined the debate!`);

        // Update the current debate with the new data
        if (data.debate) {
          setCurrentDebate(data.debate);
        } else {
          setCurrentDebate(prev => ({
            ...prev,
            aiAgent: data.agent,
            hasAIParticipant: true
          }));
        }
      });

      newSocket.on('user_joined', (data) => {
        // Only show toast for other users, not yourself
        if (data.userId !== user?.uid) {
          const displayName = data.userRole ? `${data.userRole} participant` : 'User';
          safeToast.info(`${displayName} joined the debate`);
        }
      });

      newSocket.on('user_left', (data) => {
        // Only show toast for other users, not yourself
        if (data.userId !== user?.uid) {
          const displayName = data.userRole ? `${data.userRole} participant` : 'User';
          safeToast.info(`${displayName} left the debate`);
        }
      });

      newSocket.on('debate_updated', (data) => {
        console.log('Debate updated:', data);
        setCurrentDebate(data);
      });

      newSocket.on('phase_changed', (data) => {
        safeToast.info(`Debate phase changed to: ${data.phase}`);
        setCurrentDebate(prev => ({
          ...prev,
          currentPhase: data.phase
        }));
      });

      newSocket.on('debate_completed', (data) => {
        console.log('Debate completed:', data);
        safeToast.success('🎉 Debate completed! Final results are ready.');

        setCurrentDebate(prev => ({
          ...prev,
          currentPhase: 'completed',
          status: 'completed',
          finalAnalysis: data.finalAnalysis,
          finalLeaderboard: data.finalLeaderboard,
          winner: data.winner,
          summary: data.summary,
          completedAt: data.timestamp
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
        safeToast.success('Debate evaluation complete!');
        setCurrentDebate(prev => ({
          ...prev,
          finalEvaluation: evaluation
        }));
      });

      // New timing events
      newSocket.on('preparation_resources', (data) => {
        safeToast.info(`Preparation phase started! You have ${Math.floor(data.timeLimit / 60000)} minutes.`);
        setCurrentDebate(prev => ({
          ...prev,
          prepTimeLimit: data.timeLimit,
          prepStartTime: data.startTime
        }));
      });

      newSocket.on('debate_started', (data) => {
        safeToast.success('Debate phase started!');
        setCurrentDebate(prev => ({
          ...prev,
          currentSpeaker: data.currentSpeaker,
          speechNumber: data.speechNumber,
          totalSpeeches: data.totalSpeeches,
          timePerSpeech: data.timePerSpeech
        }));
      });

      newSocket.on('speech_timer_start', (data) => {
        safeToast.info(`${data.speaker} is now speaking (Speech ${data.speechNumber})`);
        setCurrentDebate(prev => ({
          ...prev,
          currentSpeaker: data.speaker,
          speechNumber: data.speechNumber,
          speechTimeRemaining: data.timeRemaining
        }));
      });

      newSocket.on('speech_time_up', (data) => {
        toast(`⏰ Time's up for ${data.speaker}!`, {
          icon: '⚠️',
          style: {
            background: '#ff9800',
            color: 'white',
          },
        });
      });

      newSocket.on('speaker_changed', (data) => {
        safeToast.info(`Now speaking: ${data.currentSpeaker} (Speech ${data.speechNumber}/${data.totalSpeeches})`);
        setCurrentDebate(prev => ({
          ...prev,
          currentSpeaker: data.currentSpeaker,
          speechNumber: data.speechNumber
        }));
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        safeToast.error(error.message || 'An error occurred');
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
      console.log('Sending message:', { debateId, content, speakerType });
      socket.emit('send_message', {
        debateId,
        content,
        speakerType
      });
    } else {
      console.log('Cannot send message - socket not connected:', { socket: !!socket, connected });
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

  // End debate manually
  const endDebate = useCallback((debateId) => {
    if (socket && connected) {
      socket.emit('end_debate', { debateId });
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
    endDebate,
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
