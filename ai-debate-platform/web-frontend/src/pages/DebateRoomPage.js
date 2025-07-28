import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Card,
  CardContent,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  Analytics,
  ExitToApp,
  Feedback,
  Timer,
  Delete
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDebateById, joinDebate, deleteDebate } from '../store/slices/debatesSlice';
import LoadingScreen from '../components/common/LoadingScreen';
import toast from 'react-hot-toast';

const MotionBox = motion(Box);

const DebateRoomPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    joinDebate: joinSocketDebate,
    sendMessage,
    generateAIAgent,
    changePhase,
    endDebate,
    requestFeedback,
    currentDebate,
    debateMessages,
    realTimeAnalysis,
    typingUsers,
    connected,
    loadDebateMessages
  } = useSocket();
  
  const dispatch = useDispatch();
  const { currentDebate: reduxDebate, loading } = useSelector(state => state.debates);
  
  const [message, setMessage] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [prepTimeRemaining, setPrepTimeRemaining] = useState(null);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [speechNumber, setSpeechNumber] = useState(null);
  const [totalSpeeches, setTotalSpeeches] = useState(null);
  const [participantStats, setParticipantStats] = useState({});

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const debate = currentDebate || reduxDebate;

  useEffect(() => {
    if (id) {
      dispatch(fetchDebateById(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (debate) {
      const userId = user?.uid || `user_${Date.now()}`;
      const participant = debate.participants?.find(p => p.id === userId || p.id === user?.uid);

      if (participant) {
        setUserRole(participant.role);
        if (connected) {
          joinSocketDebate(id, participant.role);
        }
      } else if (debate.status === 'waiting' || debate.status === 'preparing') {
        setShowJoinDialog(true);
      }
    }
  }, [debate, user, id, joinSocketDebate, connected]);

  useEffect(() => {
    scrollToBottom();
  }, [debateMessages]);

  // Load messages from debate data if available (for demo mode)
  useEffect(() => {
    if (debate && debate.messages && Array.isArray(debate.messages) && debateMessages.length === 0) {
      // Convert debate messages to the format expected by the socket context
      const formattedMessages = debate.messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        speakerId: msg.speakerId,
        speakerName: msg.speakerName,
        speakerRole: msg.speakerRole,
        speakerType: msg.speakerType || 'human',
        timestamp: msg.timestamp,
        phase: msg.phase || 'debate'
      }));

      // Load messages using the socket context function
      loadDebateMessages(formattedMessages);
    }
  }, [debate, debateMessages.length, loadDebateMessages]);

  useEffect(() => {
    // Timer for preparation phase
    if (debate?.currentPhase === 'preparation' && debate?.prepTimeLimit && debate?.prepStartTime) {
      const startTime = new Date(debate.prepStartTime).getTime();
      const endTime = startTime + debate.prepTimeLimit;

      const timer = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
        setPrepTimeRemaining(remaining);

        if (remaining === 0) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [debate?.currentPhase, debate?.prepTimeLimit, debate?.prepStartTime]);

  useEffect(() => {
    // Timer for speaking time limits
    if (debate?.currentPhase === 'debate' && debate?.speechTimeRemaining) {
      setTimeRemaining(Math.floor(debate.speechTimeRemaining / 1000));

      const timer = setInterval(() => {
        setTimeRemaining(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [debate?.currentPhase, debate?.speechTimeRemaining]);

  useEffect(() => {
    // Update current speaker info
    if (debate?.currentSpeaker) {
      setCurrentSpeaker(debate.currentSpeaker);
      setSpeechNumber(debate.speechNumber);
      setTotalSpeeches(debate.totalSpeeches);
    }
  }, [debate?.currentSpeaker, debate?.speechNumber, debate?.totalSpeeches]);

  // Update participant stats based on real-time analysis
  useEffect(() => {
    if (realTimeAnalysis.length > 0) {
      const latestAnalysis = realTimeAnalysis[realTimeAnalysis.length - 1];
      if (latestAnalysis.messageId) {
        // Find the message this analysis is for
        const message = debateMessages.find(msg => msg.id === latestAnalysis.messageId);
        if (message && message.speakerType === 'human') {
          const speakerId = message.speakerId || message.userId;

          setParticipantStats(prev => {
            const currentStats = prev[speakerId] || {
              totalMessages: 0,
              averageScore: 0,
              totalScore: 0,
              bestScore: 0,
              argumentStrength: 0,
              rhetoricalDevices: [],
              recentScores: []
            };

            const newScore = latestAnalysis.overallScore || 0;
            const newRecentScores = [...currentStats.recentScores, newScore].slice(-5);
            const newTotalMessages = currentStats.totalMessages + 1;
            const newTotalScore = currentStats.totalScore + newScore;
            const newAverageScore = newTotalScore / newTotalMessages;

            return {
              ...prev,
              [speakerId]: {
                ...currentStats,
                totalMessages: newTotalMessages,
                totalScore: newTotalScore,
                averageScore: newAverageScore,
                bestScore: Math.max(currentStats.bestScore, newScore),
                argumentStrength: latestAnalysis.argumentStrength?.score || currentStats.argumentStrength,
                rhetoricalDevices: latestAnalysis.rhetoricalDevices || currentStats.rhetoricalDevices,
                recentScores: newRecentScores,
                lastUpdated: new Date().toISOString()
              }
            };
          });
        }
      }
    }
  }, [realTimeAnalysis, debateMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleJoinDebate = async (role) => {
    try {
      const userId = user?.uid || `user_${Date.now()}`;
      await dispatch(joinDebate({ debateId: id, role, userId })).unwrap();
      setUserRole(role);
      setShowJoinDialog(false);
      joinSocketDebate(id, role);
      toast.success(`Joined as ${role}`);
    } catch (error) {
      toast.error(error.message || 'Failed to join debate');
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    try {
      // Always use REST API for reliability
      const response = await fetch(`http://localhost:5000/api/debates/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message.trim(),
          phase: 'debate',
          userId: user?.uid || 'demo-user-google-id'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      const result = await response.json();
      console.log('Message sent successfully:', result);

      // Clear the input immediately
      setMessage('');
      setIsTyping(false);

      // Refresh the debate to get the new message
      await dispatch(fetchDebateById(id));

      toast.success('Message sent successfully!');

    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error.message || 'Failed to send message');
    }
  };

  const handleTyping = (value) => {
    setMessage(value);
    
    if (!isTyping) {
      setIsTyping(true);
      // startTyping(id);
    }
    
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // stopTyping(id);
    }, 1000);
  };

  const handleGenerateAI = () => {
    if (debate && connected) {
      const opposingRole = userRole === 'proposition' ? 'opposition' : 'proposition';
      generateAIAgent(id, debate.motion, opposingRole, 'intermediate');
    }
  };

  const handlePhaseChange = (newPhase) => {
    if (connected) {
      changePhase(id, newPhase);
    }
  };

  const handleAddAI = async () => {
    console.log('Adding AI opponent...', { userRole, connected, id, motion: debate.motion });

    if (!connected) {
      toast.error('Not connected to server. Please refresh the page.');
      return;
    }

    if (!userRole) {
      toast.error('Please join the debate first.');
      return;
    }

    try {
      const opposingRole = userRole === 'proposition' ? 'opposition' : 'proposition';
      console.log('Generating AI agent with role:', opposingRole);

      // Try socket-based AI generation first
      if (generateAIAgent) {
        generateAIAgent(id, debate.motion, opposingRole, 'intermediate');
        toast.loading('Adding AI opponent...', { duration: 3000 });
      } else {
        // Fallback: manually add AI participant via API
        const aiUserId = `ai_${Date.now()}`;
        await dispatch(joinDebate({ debateId: id, role: opposingRole, userId: aiUserId })).unwrap();
        toast.success('AI opponent added!');
      }
    } catch (error) {
      console.error('Error adding AI opponent:', error);
      toast.error('Failed to add AI opponent');
    }
  };

  const handleDeleteDebate = async () => {
    if (window.confirm('Are you sure you want to delete this debate? This action cannot be undone.')) {
      try {
        await dispatch(deleteDebate(id)).unwrap();
        toast.success('Debate deleted successfully');
        navigate('/debates');
      } catch (error) {
        console.error('Error deleting debate:', error);
        toast.error('Failed to delete debate');
      }
    }
  };

  const getMessageColor = (msg) => {
    if (msg.speakerType === 'ai') return 'primary.main';
    if (msg.speakerRole === 'proposition') return 'success.main';
    return 'error.main';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !debate) {
    return <LoadingScreen message="Loading debate room..." />;
  }

  if (!debate) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Debate not found
        </Typography>
        <Button variant="contained" onClick={() => navigate('/debates')}>
          Back to Debates
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Grid container spacing={3} sx={{ height: 'calc(100vh - 120px)' }}>
        {/* Main Debate Area */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Debate Header */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {debate?.motion || 'Loading...'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={debate?.status || 'Unknown'} color={debate?.status === 'active' ? 'success' : 'default'} size="small" />
                    <Chip label={debate?.format || 'Unknown'} variant="outlined" size="small" />
                    <Chip label={debate?.currentPhase || 'Unknown'} color="primary" size="small" />
                    {!connected && <Chip label="Disconnected" color="error" size="small" />}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {/* Preparation Timer */}
                  {debate?.currentPhase === 'preparation' && prepTimeRemaining !== null && (
                    <Chip
                      icon={<Timer />}
                      label={`Prep: ${formatTime(prepTimeRemaining)}`}
                      color={prepTimeRemaining < 60 ? "error" : "warning"}
                      variant="filled"
                    />
                  )}

                  {/* Speaking Timer */}
                  {debate?.currentPhase === 'debate' && timeRemaining !== null && (
                    <Chip
                      icon={<Timer />}
                      label={`Speaking: ${formatTime(timeRemaining)}`}
                      color={timeRemaining < 30 ? "error" : "warning"}
                      variant="filled"
                    />
                  )}

                  {/* Current Speaker Info */}
                  {debate?.currentPhase === 'debate' && currentSpeaker && (
                    <Chip
                      label={`${currentSpeaker} (${speechNumber}/${totalSpeeches})`}
                      color="primary"
                      variant="outlined"
                    />
                  )}

                  <IconButton onClick={() => setShowAnalysis(true)}>
                    <Analytics />
                  </IconButton>
                  <IconButton
                    onClick={handleDeleteDebate}
                    color="error"
                    title="Delete Debate"
                  >
                    <Delete />
                  </IconButton>
                  <IconButton onClick={() => navigate('/debates')}>
                    <ExitToApp />
                  </IconButton>
                </Box>
              </Box>

              {/* Phase Controls */}
              {userRole && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {/* Show participant count */}
                  <Typography variant="body2" color="text.secondary">
                    Participants: {debate.participants?.length || 0}/2
                  </Typography>

                  {/* Phase control buttons */}
                  {debate.createdBy === user?.uid && (
                    <>
                      {debate?.currentPhase === 'setup' && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handlePhaseChange('preparation')}
                        >
                          Start Preparation
                        </Button>
                      )}
                      {debate?.currentPhase === 'preparation' && debate?.participants?.length >= 2 && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handlePhaseChange('debate')}
                        >
                          Begin Debate
                        </Button>
                      )}
                      {debate?.currentPhase === 'debate' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          onClick={() => endDebate(id)}
                        >
                          End Debate Session
                        </Button>
                      )}
                    </>
                  )}

                  {/* Show waiting message if not enough participants */}
                  {debate?.currentPhase === 'preparation' && debate?.participants?.length < 2 && (
                    <>
                      <Typography variant="body2" color="warning.main">
                        Waiting for more participants to join...
                      </Typography>
                      {userRole && !debate.hasAIParticipant && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={handleAddAI}
                          sx={{ ml: 2 }}
                        >
                          Add AI Opponent
                        </Button>
                      )}
                    </>
                  )}
                </Box>
              )}
            </Box>

            {/* Messages Area */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
              {/* Show placeholder when no messages */}
              {(!debateMessages || debateMessages.length === 0) && (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  textAlign: 'center',
                  color: 'text.secondary'
                }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    🎯 Debate Room Ready
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>Motion:</strong> {debate?.motion || 'Loading...'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3 }}>
                    {debate?.status === 'preparing'
                      ? 'Waiting for participants to join and begin the debate...'
                      : 'No messages yet. Start the conversation!'
                    }
                  </Typography>
                  {!userRole && (
                    <Typography variant="body2" color="primary">
                      Click "Join Debate" to participate!
                    </Typography>
                  )}
                </Box>
              )}

              <AnimatePresence>
                {debateMessages.map((msg, index) => (
                  <MotionBox
                    key={msg.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    sx={{ mb: 2 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2,
                        flexDirection: msg.speakerId === user?.uid ? 'row-reverse' : 'row'
                      }}
                    >
                      <Avatar
                        sx={{
                          backgroundColor: getMessageColor(msg),
                          width: 40,
                          height: 40
                        }}
                      >
                        {msg.speakerType === 'ai' ? <SmartToy /> : <Person />}
                      </Avatar>
                      
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: '70%',
                          backgroundColor: msg.speakerId === user?.uid ? 'primary.light' : 'background.paper',
                          color: msg.speakerId === user?.uid ? 'primary.contrastText' : 'text.primary'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                            {msg.speakerType === 'ai' ? 'AI Agent' : 'Human'} ({msg.speakerRole})
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Box>
                        <Typography variant="body1">{msg.content}</Typography>
                        
                        {msg.speakerId !== user?.uid && (
                          <Box sx={{ mt: 1 }}>
                            <IconButton
                              size="small"
                              onClick={() => requestFeedback(id, msg.id)}
                            >
                              <Feedback fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </Paper>
                    </Box>
                  </MotionBox>
                ))}
              </AnimatePresence>
              
              {/* Typing Indicators */}
              {typingUsers.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </Typography>
                </Box>
              )}
              
              <div ref={messagesEndRef} />
            </Box>

            {/* Message Input - Always show for logged-in users */}
            {user && (
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                {!userRole && (
                  <Box sx={{ mb: 2, p: 1, backgroundColor: 'warning.light', borderRadius: 1 }}>
                    <Typography variant="body2" color="warning.dark">
                      ⚠️ Join the debate to participate in the discussion
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder={userRole ? "Enter your argument..." : "Join the debate to send messages..."}
                    value={message}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={!userRole}
                  />
                  <Button
                    variant="contained"
                    endIcon={<Send />}
                    onClick={handleSendMessage}
                    disabled={!message.trim() || !userRole}
                  >
                    Send
                  </Button>
                </Box>
                {!userRole && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleJoinDebate('proposition')}
                      size="small"
                    >
                      Join as Proposition (FOR)
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => handleJoinDebate('opposition')}
                      size="small"
                    >
                      Join as Opposition (AGAINST)
                    </Button>
                  </Box>
                )}
              </Box>
            )}

            {/* Preparation Phase Message */}
            {userRole && debate?.currentPhase === 'preparation' && (
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', backgroundColor: 'info.light' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="info.contrastText">
                    🔄 Preparation Phase - Get ready for the debate!
                    {prepTimeRemaining !== null && ` (${formatTime(prepTimeRemaining)} remaining)`}
                  </Typography>

                  <Button
                    size="small"
                    variant="contained"
                    color="secondary"
                    onClick={() => changePhase && changePhase(id, 'debate')}
                    sx={{
                      backgroundColor: 'white',
                      color: 'primary.main',
                      '&:hover': { backgroundColor: 'grey.100' }
                    }}
                  >
                    Start Debate Now
                  </Button>
                  {debate?.participants?.length < 2 && !debate?.hasAIParticipant && (
                    <Button
                      size="small"
                      variant="contained"
                      color="secondary"
                      onClick={handleAddAI}
                      sx={{
                        backgroundColor: 'white',
                        color: 'primary.main',
                        '&:hover': { backgroundColor: 'grey.100' }
                      }}
                    >
                      🤖 Add AI Opponent
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
            {/* Participants */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Participants
              </Typography>
              
              {debate.participants?.map((participant) => (
                <Box
                  key={participant.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 2,
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: participant.id === user?.uid ? 'action.selected' : 'transparent'
                  }}
                >
                  <Avatar sx={{ backgroundColor: participant.role === 'proposition' ? 'success.main' : 'error.main' }}>
                    {participant.type === 'ai' ? <SmartToy /> : <Person />}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {participant.type === 'ai' ? 'AI Agent' : 'Human'}
                      {participant.id === user?.uid && ' (You)'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {participant.role}
                    </Typography>
                  </Box>
                </Box>
              ))}

              {/* Generate AI Button */}
              {userRole && !debate?.hasAIParticipant && debate?.participants?.length < 2 && (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SmartToy />}
                  onClick={handleGenerateAI}
                  disabled={!connected}
                >
                  Generate AI Opponent
                </Button>
              )}
            </Paper>

            {/* Live Leaderboard */}
            {(debate?.leaderboard || Object.keys(participantStats).length > 0) && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  🏆 Live Leaderboard
                </Typography>

                {/* Summary Stats */}
                {(() => {
                  const leaderboardData = debate?.leaderboard || participantStats;
                  const totalParticipants = Object.keys(leaderboardData).length;
                  const totalMessages = Object.values(leaderboardData).reduce((sum, stats) => sum + (stats.totalMessages || 0), 0);
                  const avgScore = totalMessages > 0 ?
                    Object.values(leaderboardData).reduce((sum, stats) => sum + (stats.totalScore || 0), 0) / totalMessages : 0;

                  return totalParticipants > 0 && (
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      mb: 2,
                      p: 1,
                      backgroundColor: 'action.hover',
                      borderRadius: 1
                    }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Participants</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{totalParticipants}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Total Messages</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{totalMessages}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Avg Score</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{(avgScore * 10).toFixed(1)}/10</Typography>
                      </Box>
                    </Box>
                  );
                })()}

                {Object.entries(debate?.leaderboard || participantStats)
                  .sort(([,a], [,b]) => b.averageScore - a.averageScore)
                  .map(([participantId, stats], index) => {
                    const participant = debate?.participants?.find(p => p.id === participantId) ||
                                     debateMessages.find(msg => msg.speakerId === participantId || msg.userId === participantId);
                    const name = participant?.name || participant?.displayName || `Participant ${index + 1}`;
                    const isCurrentUser = participantId === user?.uid;

                    return (
                      <Card
                        key={participantId}
                        sx={{
                          mb: 1,
                          backgroundColor: isCurrentUser ? 'primary.light' : 'action.hover',
                          border: index === 0 ? '2px solid gold' : 'none'
                        }}
                      >
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h6" sx={{ mr: 1 }}>
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                              {name} {isCurrentUser && '(You)'}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption">
                              Avg: {(stats.averageScore * 10).toFixed(1)}/10
                            </Typography>
                            <Typography variant="caption">
                              Best: {(stats.bestScore * 10).toFixed(1)}/10
                            </Typography>
                          </Box>

                          <LinearProgress
                            variant="determinate"
                            value={stats.averageScore * 10}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: 'grey.300',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'
                              }
                            }}
                          />

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {stats.totalMessages} messages • {stats.rhetoricalDevices?.length || 0} devices used
                            </Typography>

                            {/* Performance trend indicator */}
                            {stats.recentScores && stats.recentScores.length > 1 && (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {(() => {
                                  const recent = stats.recentScores.slice(-2);
                                  const trend = recent[1] - recent[0];
                                  return trend > 0.1 ? (
                                    <Typography variant="caption" sx={{ color: 'success.main' }}>📈</Typography>
                                  ) : trend < -0.1 ? (
                                    <Typography variant="caption" sx={{ color: 'error.main' }}>📉</Typography>
                                  ) : (
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>➡️</Typography>
                                  );
                                })()}
                              </Box>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
              </Paper>
            )}

            {/* Real-time Analysis */}
            {realTimeAnalysis.length > 0 && (
              <Paper sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Live Analysis
                </Typography>

                {realTimeAnalysis.slice(-5).map((analysis, index) => (
                  <Card key={index} sx={{ mb: 2, backgroundColor: 'action.hover' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" color="primary">
                          {analysis?.type ? analysis.type.replace('_', ' ').toUpperCase() : 'ANALYSIS'}
                        </Typography>
                        {analysis.overallScore && (
                          <Chip
                            label={`${(analysis.overallScore * 10).toFixed(1)}/10`}
                            size="small"
                            color={analysis.overallScore > 0.7 ? 'success' : analysis.overallScore > 0.4 ? 'warning' : 'error'}
                          />
                        )}
                      </Box>

                      {analysis.feedback?.quickTips && (
                        <Typography variant="body2" sx={{ mt: 1, mb: 1 }}>
                          💡 {analysis.feedback.quickTips[0]}
                        </Typography>
                      )}

                      {analysis.argumentStrength && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Argument Strength: {(analysis.argumentStrength.score * 10).toFixed(1)}/10
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={analysis.argumentStrength.score * 10}
                            sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      )}

                      {analysis.rhetoricalDevices && analysis.rhetoricalDevices.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Rhetorical Devices:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {analysis.rhetoricalDevices.slice(0, 3).map((device, i) => (
                              <Chip key={i} label={device} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Paper>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* Join Dialog */}
      <Dialog open={showJoinDialog} onClose={() => setShowJoinDialog(false)}>
        <DialogTitle>Join Debate</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Choose your position in this debate:
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            <strong>Motion:</strong> {debate?.motion || 'Loading...'}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              color="success"
              onClick={() => handleJoinDebate('proposition')}
              disabled={debate?.participants?.some(p => p.role === 'proposition')}
            >
              Proposition (For)
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={() => handleJoinDebate('opposition')}
              disabled={debate?.participants?.some(p => p.role === 'opposition')}
            >
              Opposition (Against)
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/debates')}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Analysis Dialog */}
      <Dialog
        open={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Debate Analysis</DialogTitle>
        <DialogContent>
          {realTimeAnalysis.length > 0 ? (
            <List>
              {realTimeAnalysis.map((analysis, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={analysis?.type ? analysis.type.replace('_', ' ').toUpperCase() : 'ANALYSIS'}
                      secondary={
                        <Box>
                          {analysis.feedback?.quickTips && (
                            <Typography variant="body2">
                              Tips: {analysis.feedback.quickTips.join(', ')}
                            </Typography>
                          )}
                          {analysis.overallScore && (
                            <Typography variant="body2">
                              Score: {Math.round(analysis.overallScore * 10)}/10
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < realTimeAnalysis.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography variant="body1" color="text.secondary">
              No analysis data available yet. Start debating to see real-time feedback!
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysis(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Final Results Dialog */}
      <Dialog
        open={debate?.currentPhase === 'completed'}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            🎉 Debate Complete!
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Final Results & Analysis
          </Typography>
        </DialogTitle>

        <DialogContent>
          {debate?.finalAnalysis && debate?.finalLeaderboard && (
            <Grid container spacing={3}>
              {/* Winner Announcement */}
              {debate.winner && (
                <Grid item xs={12}>
                  <Card sx={{ backgroundColor: 'success.light', color: 'success.contrastText', mb: 2 }}>
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                        🏆 Winner: {debate.winner.participant?.name || 'Champion'}
                      </Typography>
                      <Typography variant="h6">
                        Final Score: {(debate.winner.finalScore * 10).toFixed(1)}/10
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Final Leaderboard */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                      🏆 Final Rankings
                    </Typography>

                    {Object.entries(debate.finalLeaderboard)
                      .sort(([,a], [,b]) => a.rank - b.rank)
                      .map(([participantId, stats]) => (
                        <Card key={participantId} sx={{ mb: 2, backgroundColor: 'action.hover' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Typography variant="h6" sx={{ mr: 1 }}>
                                {stats.rank === 1 ? '🥇' : stats.rank === 2 ? '🥈' : stats.rank === 3 ? '🥉' : `#${stats.rank}`}
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
                                {stats.participant?.name || `Participant ${stats.rank}`}
                              </Typography>
                              <Chip
                                label={stats.performanceGrade}
                                color={stats.rank === 1 ? 'success' : stats.rank === 2 ? 'warning' : 'default'}
                                size="small"
                              />
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="caption">
                                Final Score: {(stats.finalScore * 10).toFixed(1)}/10
                              </Typography>
                              <Typography variant="caption">
                                Messages: {stats.totalMessages}
                              </Typography>
                            </Box>

                            <LinearProgress
                              variant="determinate"
                              value={stats.finalScore * 10}
                              sx={{ height: 6, borderRadius: 3 }}
                            />

                            {stats.badges && stats.badges.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                {stats.badges.slice(0, 2).map((badge, i) => (
                                  <Chip key={i} label={badge} size="small" sx={{ mr: 0.5, fontSize: '0.7rem' }} />
                                ))}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </CardContent>
                </Card>
              </Grid>

              {/* Debate Summary */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                      📊 Debate Summary
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">Motion</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                        {debate.motion}
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Duration</Typography>
                        <Typography variant="h6">{debate.summary?.duration || 0} min</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Total Messages</Typography>
                        <Typography variant="h6">{debate.summary?.totalMessages || 0}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Participants</Typography>
                        <Typography variant="h6">{debate.summary?.participantCount || 0}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Quality Rating</Typography>
                        <Typography variant="h6">{debate.summary?.qualityRating || 'Good'}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Personal Analysis (if user participated) */}
              {(() => {
                const userStats = debate.finalLeaderboard[user?.uid];
                return userStats && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                          📈 Your Performance Analysis
                        </Typography>

                        <Grid container spacing={2}>
                          <Grid item xs={12} md={4}>
                            <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                              💪 Strengths
                            </Typography>
                            {userStats.strengths?.map((strength, i) => (
                              <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                                • {strength}
                              </Typography>
                            ))}
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <Typography variant="subtitle2" color="warning.main" sx={{ mb: 1 }}>
                              🎯 Areas for Improvement
                            </Typography>
                            {userStats.improvements?.map((improvement, i) => (
                              <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                                • {improvement}
                              </Typography>
                            ))}
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>
                              🎤 Key Arguments
                            </Typography>
                            {userStats.keyArguments?.map((argument, i) => (
                              <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                                • {argument}
                              </Typography>
                            ))}
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })()}
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/debates')}
          >
            Browse More Debates
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/dashboard')}
          >
            View Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DebateRoomPage;
