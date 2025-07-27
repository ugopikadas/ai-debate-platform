import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  IconButton,
  useTheme
} from '@mui/material';
import {
  Add,
  TrendingUp,
  Forum,
  EmojiEvents,
  Analytics,
  SmartToy,
  Person,
  PlayArrow,
  Schedule
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';

const MotionCard = motion(Card);

const DashboardPage = () => {
  const [userStats, setUserStats] = useState(null);
  const [recentDebates, setRecentDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, debatesResponse] = await Promise.all([
        api.get('/users/stats'),
        api.get('/users/debates?limit=5')
      ]);
      
      setUserStats(statsResponse.data.data);
      setRecentDebates(debatesResponse.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDebateStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'waiting': return 'warning';
      case 'completed': return 'primary';
      default: return 'default';
    }
  };

  const getSkillLevel = (averageScore) => {
    if (averageScore >= 8) return { level: 'Expert', color: 'success.main' };
    if (averageScore >= 6) return { level: 'Advanced', color: 'info.main' };
    if (averageScore >= 4) return { level: 'Intermediate', color: 'warning.main' };
    return { level: 'Beginner', color: 'error.main' };
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  const skillInfo = getSkillLevel(userStats?.averageArgumentStrength || 0);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Welcome back, {user?.displayName || 'Debater'}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ready to challenge your mind and improve your argumentation skills?
        </Typography>
        
        {/* Connection Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: connected ? 'success.main' : 'error.main',
              mr: 1
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {connected ? 'Connected to real-time platform' : 'Connecting...'}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            sx={{ mb: 3 }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<Add />}
                    onClick={() => navigate('/debates/create')}
                    sx={{ py: 1.5 }}
                  >
                    Start New Debate
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    startIcon={<Forum />}
                    onClick={() => navigate('/debates')}
                    sx={{ py: 1.5 }}
                  >
                    Browse Debates
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </MotionCard>

          {/* Recent Debates */}
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Recent Debates
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate('/debates')}
                  endIcon={<PlayArrow />}
                >
                  View All
                </Button>
              </Box>
              
              {recentDebates.length > 0 ? (
                <List>
                  {recentDebates.map((debate, index) => (
                    <React.Fragment key={debate.id}>
                      <ListItem
                        sx={{
                          cursor: 'pointer',
                          borderRadius: 1,
                          '&:hover': { backgroundColor: 'action.hover' }
                        }}
                        onClick={() => navigate(`/debates/${debate.id}`)}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ backgroundColor: theme.palette.primary.main }}>
                            {debate.hasAIParticipant ? <SmartToy /> : <Person />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={debate.motion}
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip
                                label={debate.status}
                                size="small"
                                color={getDebateStatusColor(debate.status)}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {new Date(debate.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                        <IconButton edge="end">
                          <PlayArrow />
                        </IconButton>
                      </ListItem>
                      {index < recentDebates.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Forum sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No debates yet. Start your first debate!
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/debates/create')}
                    sx={{ mt: 2 }}
                  >
                    Create Debate
                  </Button>
                </Box>
              )}
            </CardContent>
          </MotionCard>
        </Grid>

        {/* Stats Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Profile Card */}
          <MotionCard
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            sx={{ mb: 3 }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                src={user?.photoURL}
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2,
                  fontSize: '2rem'
                }}
              >
                {user?.displayName?.[0] || user?.email?.[0]}
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                {user?.displayName || 'Anonymous Debater'}
              </Typography>
              <Chip
                label={skillInfo.level}
                sx={{
                  backgroundColor: skillInfo.color,
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/profile')}
                sx={{ mt: 2 }}
              >
                Edit Profile
              </Button>
            </CardContent>
          </MotionCard>

          {/* Stats Cards */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <MotionCard
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <TrendingUp sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {userStats?.totalDebates || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Debates
                  </Typography>
                </CardContent>
              </MotionCard>
            </Grid>
            
            <Grid item xs={6}>
              <MotionCard
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <EmojiEvents sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {Math.round((userStats?.averageArgumentStrength || 0) * 10) / 10}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Score
                  </Typography>
                </CardContent>
              </MotionCard>
            </Grid>

            <Grid item xs={6}>
              <MotionCard
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Analytics sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {userStats?.completedDebates || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </CardContent>
              </MotionCard>
            </Grid>

            <Grid item xs={6}>
              <MotionCard
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Schedule sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {userStats?.recentActivity || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This Month
                  </Typography>
                </CardContent>
              </MotionCard>
            </Grid>
          </Grid>

          {/* Quick Analytics */}
          <MotionCard
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            sx={{ mt: 2 }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Performance Overview
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Argument Strength</Typography>
                  <Typography variant="body2">
                    {Math.round((userStats?.averageArgumentStrength || 0) * 10)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(userStats?.averageArgumentStrength || 0) * 10}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/analytics')}
                startIcon={<Analytics />}
              >
                View Detailed Analytics
              </Button>
            </CardContent>
          </MotionCard>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;
