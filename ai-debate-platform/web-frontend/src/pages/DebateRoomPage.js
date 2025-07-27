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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert
} from '@mui/material';
import {
  Send,
  SmartToy,
  Person,
  Mic,
  MicOff,
  Analytics,
  ExitToApp,
  PlayArrow,
  Pause,
  Settings,
  Feedback,
  Timer
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDebateById, joinDebate } from '../store/slices/debatesSlice';
import LoadingScreen from '../components/common/LoadingScreen';
import toast from 'react-hot-toast';

const MotionPaper = motion(Paper);
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
    requestFeedback,
    currentDebate,
    debateMessages,
    realTimeAnalysis,
    typingUsers,
    connected
  } = useSocket();
  
  const dispatch = useDispatch();
  const { currentDebate: reduxDebate, loading } = useSelector(state => state.debates);
  
  const [message, setMessage] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const debate = currentDebate || reduxDebate;

  useEffect(() => {
    if (id) {
      dispatch(fetchDebateById(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (debate && user) {
      const participant = debate.participants?.find(p => p.id === user.uid);
      if (participant) {
        setUserRole(participant.role);
        joinSocketDebate(id, participant.role);
      } else if (debate.status === 'waiting') {
        setShowJoinDialog(true);
      }
    }
  }, [debate, user, id, joinSocketDebate]);

  useEffect(() => {
    scrollToBottom();
  }, [debateMessages]);

  useEffect(() => {
    // Timer for speaking time limits
    if (debate?.currentPhase === 'debate' && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [debate?.currentPhase, timeRemaining]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleJoinDebate = async (role) => {
    try {
      await dispatch(joinDebate({ debateId: id, role })).unwrap();
      setUserRole(role);
      setShowJoinDialog(false);
      joinSocketDebate(id, role);
      toast.success(`Joined as ${role}`);
    } catch (error) {
      toast.error(error.message || 'Failed to join debate');
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && connected) {
      sendMessage(id, message.trim());
      setMessage('');
      setIsTyping(false);
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
                    {debate.motion}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={debate.status} color={debate.status === 'active' ? 'success' : 'default'} size="small" />
                    <Chip label={debate.format} variant="outlined" size="small" />
                    <Chip label={debate.currentPhase} color="primary" size="small" />
                    {!connected && <Chip label="Disconnected" color="error" size="small" />}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {timeRemaining && (
                    <Chip
                      icon={<Timer />}
                      label={formatTime(timeRemaining)}
                      color="warning"
                      variant="outlined"
                    />
                  )}
                  <IconButton onClick={() => setShowAnalysis(true)}>
                    <Analytics />
                  </IconButton>
                  <IconButton onClick={() => navigate('/debates')}>
                    <ExitToApp />
                  </IconButton>
                </Box>
              </Box>

              {/* Phase Controls */}
              {userRole && debate.createdBy === user.uid && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {debate.currentPhase === 'setup' && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handlePhaseChange('preparation')}
                    >
                      Start Preparation
                    </Button>
                  )}
                  {debate.currentPhase === 'preparation' && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handlePhaseChange('debate')}
                    >
                      Begin Debate
                    </Button>
                  )}
                  {debate.currentPhase === 'debate' && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handlePhaseChange('evaluation')}
                    >
                      End Debate
                    </Button>
                  )}
                </Box>
              )}
            </Box>

            {/* Messages Area */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
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

            {/* Message Input */}
            {userRole && debate.currentPhase === 'debate' && (
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Enter your argument..."
                    value={message}
                    onChange={(e) => handleTyping(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={!connected}
                  />
                  <Button
                    variant="contained"
                    endIcon={<Send />}
                    onClick={handleSendMessage}
                    disabled={!message.trim() || !connected}
                  >
                    Send
                  </Button>
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
              {userRole && !debate.hasAIParticipant && debate.participants?.length < 2 && (
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

            {/* Real-time Analysis */}
            {realTimeAnalysis.length > 0 && (
              <Paper sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Live Analysis
                </Typography>
                
                {realTimeAnalysis.slice(-5).map((analysis, index) => (
                  <Card key={index} sx={{ mb: 2, backgroundColor: 'action.hover' }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="caption" color="primary">
                        {analysis.type.replace('_', ' ').toUpperCase()}
                      </Typography>
                      {analysis.feedback?.quickTips && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          💡 {analysis.feedback.quickTips[0]}
                        </Typography>
                      )}
                      {analysis.overallScore && (
                        <LinearProgress
                          variant="determinate"
                          value={analysis.overallScore * 10}
                          sx={{ mt: 1 }}
                        />
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
            <strong>Motion:</strong> {debate.motion}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              color="success"
              onClick={() => handleJoinDebate('proposition')}
              disabled={debate.participants?.some(p => p.role === 'proposition')}
            >
              Proposition (For)
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={() => handleJoinDebate('opposition')}
              disabled={debate.participants?.some(p => p.role === 'opposition')}
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
                      primary={analysis.type.replace('_', ' ').toUpperCase()}
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
    </Container>
  );
};

export default DebateRoomPage;
