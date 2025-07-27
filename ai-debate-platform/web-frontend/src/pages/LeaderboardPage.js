import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  EmojiEvents,
  TrendingUp,
  Person,
  SmartToy,
  Star,
  Workspace,
  Visibility
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LoadingScreen from '../components/common/LoadingScreen';

const MotionCard = motion(Card);
const MotionTableRow = motion(TableRow);

const LeaderboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [sortBy, setSortBy] = useState('totalDebates');
  const [timeRange, setTimeRange] = useState('all');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchLeaderboardData();
  }, [sortBy, timeRange]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch public users for leaderboard
      const response = await api.get('/users/public', {
        params: {
          sortBy,
          limit: 50
        }
      });
      
      const users = response.data.data;
      
      // Mock additional data for demonstration
      const enhancedUsers = users.map((user, index) => ({
        ...user,
        rank: index + 1,
        winRate: Math.random() * 0.4 + 0.6, // 60-100% win rate
        avgScore: (user.debateStats?.averageScore || 0) + Math.random() * 2,
        streak: Math.floor(Math.random() * 10) + 1,
        badges: generateBadges(user.debateStats)
      }));
      
      setLeaderboardData(enhancedUsers);
      
      // Find current user's rank
      const currentUserRank = enhancedUsers.findIndex(u => u.uid === user?.uid);
      if (currentUserRank !== -1) {
        setUserRank(currentUserRank + 1);
      }
      
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBadges = (stats) => {
    const badges = [];
    if (stats?.totalDebates >= 100) badges.push({ name: 'Veteran', color: 'primary', icon: EmojiEvents });
    if (stats?.averageScore >= 8) badges.push({ name: 'Expert', color: 'success', icon: Star });
    if (stats?.totalDebates >= 50) badges.push({ name: 'Active', color: 'info', icon: TrendingUp });
    return badges;
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <EmojiEvents sx={{ color: '#FFD700', fontSize: 24 }} />;
      case 2:
        return <EmojiEvents sx={{ color: '#C0C0C0', fontSize: 24 }} />;
      case 3:
        return <EmojiEvents sx={{ color: '#CD7F32', fontSize: 24 }} />;
      default:
        return <Typography variant="h6" sx={{ fontWeight: 'bold', minWidth: 24, textAlign: 'center' }}>{rank}</Typography>;
    }
  };

  const getSkillLevel = (score) => {
    if (score >= 8) return { level: 'Expert', color: 'success' };
    if (score >= 6) return { level: 'Advanced', color: 'info' };
    if (score >= 4) return { level: 'Intermediate', color: 'warning' };
    return { level: 'Beginner', color: 'error' };
  };

  if (loading) {
    return <LoadingScreen message="Loading leaderboard..." />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
          🏆 Leaderboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          See how you rank among the debate community
        </Typography>
      </Box>

      {/* User's Current Rank */}
      {userRank && (
        <MotionCard
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <Typography variant="h6">Your Current Rank:</Typography>
              <Chip
                label={`#${userRank}`}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.1rem'
                }}
              />
            </Box>
          </CardContent>
        </MotionCard>
      )}

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tabs
              value={tabValue}
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{ minWidth: 200 }}
            >
              <Tab label="Overall" />
              <Tab label="This Month" />
              <Tab label="Rising Stars" />
            </Tabs>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="totalDebates">Total Debates</MenuItem>
                <MenuItem value="averageScore">Average Score</MenuItem>
                <MenuItem value="wins">Win Rate</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Top 3 Podium */}
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        sx={{ mb: 3 }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, textAlign: 'center' }}>
            🥇 Top Performers
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'end', gap: 2, mb: 3 }}>
            {leaderboardData.slice(0, 3).map((user, index) => {
              const skillInfo = getSkillLevel(user.avgScore);
              const heights = [120, 150, 100]; // 2nd, 1st, 3rd place heights
              const order = [1, 0, 2]; // Display order: 2nd, 1st, 3rd
              const actualIndex = order[index];
              const actualUser = leaderboardData[actualIndex];
              
              return (
                <Box
                  key={actualUser.uid}
                  sx={{
                    textAlign: 'center',
                    order: index + 1
                  }}
                >
                  <Box
                    sx={{
                      height: heights[index],
                      width: 100,
                      backgroundColor: actualIndex === 0 ? 'primary.main' : actualIndex === 1 ? 'secondary.main' : 'warning.main',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                      p: 2,
                      color: 'white',
                      position: 'relative'
                    }}
                  >
                    <Avatar
                      src={actualUser.photoURL}
                      sx={{
                        width: 50,
                        height: 50,
                        mb: 1,
                        border: '3px solid white'
                      }}
                    >
                      {actualUser.displayName?.[0]}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {actualUser.displayName}
                    </Typography>
                    <Box sx={{ position: 'absolute', top: -10 }}>
                      {getRankIcon(actualIndex + 1)}
                    </Box>
                  </Box>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={skillInfo.level}
                      color={skillInfo.color}
                      size="small"
                    />
                    <Typography variant="caption" display="block" color="text.secondary">
                      {actualUser.debateStats?.totalDebates || 0} debates
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </MotionCard>

      {/* Full Leaderboard Table */}
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
            Full Rankings
          </Typography>
          
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Debater</TableCell>
                  <TableCell align="center">Level</TableCell>
                  <TableCell align="center">Debates</TableCell>
                  <TableCell align="center">Avg Score</TableCell>
                  <TableCell align="center">Win Rate</TableCell>
                  <TableCell align="center">Streak</TableCell>
                  <TableCell align="center">Badges</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboardData.map((user, index) => {
                  const skillInfo = getSkillLevel(user.avgScore);
                  const isCurrentUser = user.uid === user?.uid;
                  
                  return (
                    <MotionTableRow
                      key={user.uid}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      sx={{
                        backgroundColor: isCurrentUser ? 'action.selected' : 'transparent',
                        '&:hover': { backgroundColor: 'action.hover' }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getRankIcon(user.rank)}
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar src={user.photoURL} sx={{ width: 40, height: 40 }}>
                            {user.displayName?.[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {user.displayName}
                              {isCurrentUser && (
                                <Chip label="You" size="small" color="primary" sx={{ ml: 1 }} />
                              )}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Member since {new Date(user.createdAt).getFullYear()}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Chip
                          label={skillInfo.level}
                          color={skillInfo.color}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {user.debateStats?.totalDebates || 0}
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {user.avgScore.toFixed(1)}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={user.avgScore * 10}
                            sx={{ width: 60, height: 4, borderRadius: 2 }}
                            color={skillInfo.color}
                          />
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {Math.round(user.winRate * 100)}%
                        </Typography>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Chip
                          label={`${user.streak} 🔥`}
                          size="small"
                          color={user.streak >= 5 ? 'error' : 'default'}
                        />
                      </TableCell>
                      
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          {user.badges.slice(0, 3).map((badge, badgeIndex) => (
                            <Tooltip key={badgeIndex} title={badge.name}>
                              <Chip
                                icon={<badge.icon />}
                                label=""
                                size="small"
                                color={badge.color}
                                sx={{ minWidth: 32, '& .MuiChip-label': { display: 'none' } }}
                              />
                            </Tooltip>
                          ))}
                        </Box>
                      </TableCell>
                      
                      <TableCell align="center">
                        <Tooltip title="View Profile">
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </MotionTableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </MotionCard>
    </Container>
  );
};

export default LeaderboardPage;
