import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Analytics as AnalyticsIcon,
  EmojiEvents,
  Forum,
  SmartToy,
  Person,
  Speed,
  Psychology
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import LoadingScreen from '../components/common/LoadingScreen';

const MotionCard = motion(Card);

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [userStats, setUserStats] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [debatesByFormat, setDebatesByFormat] = useState([]);
  const [argumentStrengthTrend, setArgumentStrengthTrend] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch user statistics
      const statsResponse = await api.get('/users/stats');
      const stats = statsResponse.data.data;
      setUserStats(stats);

      // Mock data for charts (in a real app, this would come from the API)
      const mockPerformanceData = [
        { date: '2024-01-01', score: 6.2, debates: 2 },
        { date: '2024-01-08', score: 6.8, debates: 3 },
        { date: '2024-01-15', score: 7.1, debates: 4 },
        { date: '2024-01-22', score: 7.5, debates: 2 },
        { date: '2024-01-29', score: 7.8, debates: 5 },
        { date: '2024-02-05', score: 8.2, debates: 3 },
        { date: '2024-02-12', score: 8.0, debates: 4 }
      ];

      const mockDebatesByFormat = [
        { name: 'Oxford', value: stats?.debatesByFormat?.oxford || 15, color: '#8884d8' },
        { name: 'Parliamentary', value: stats?.debatesByFormat?.parliamentary || 8, color: '#82ca9d' },
        { name: 'Lincoln-Douglas', value: stats?.debatesByFormat?.['lincoln-douglas'] || 5, color: '#ffc658' }
      ];

      const mockArgumentTrend = [
        { week: 'Week 1', strength: 6.0, clarity: 5.8, evidence: 6.2 },
        { week: 'Week 2', strength: 6.5, clarity: 6.3, evidence: 6.8 },
        { week: 'Week 3', strength: 7.2, clarity: 7.0, evidence: 7.5 },
        { week: 'Week 4', strength: 7.8, clarity: 7.6, evidence: 8.0 },
        { week: 'Week 5', strength: 8.1, clarity: 8.0, evidence: 8.3 }
      ];

      setPerformanceData(mockPerformanceData);
      setDebatesByFormat(mockDebatesByFormat);
      setArgumentStrengthTrend(mockArgumentTrend);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSkillLevel = (score) => {
    if (score >= 8) return { level: 'Expert', color: 'success', trend: 'up' };
    if (score >= 6) return { level: 'Advanced', color: 'info', trend: 'up' };
    if (score >= 4) return { level: 'Intermediate', color: 'warning', trend: 'stable' };
    return { level: 'Beginner', color: 'error', trend: 'up' };
  };

  const skillInfo = getSkillLevel(userStats?.averageArgumentStrength || 0);

  if (loading) {
    return <LoadingScreen message="Loading analytics..." />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your debate performance and improvement over time
          </Typography>
        </Box>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 3 months</MenuItem>
            <MenuItem value="365">Last year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} md={3}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <AnalyticsIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {Math.round((userStats?.averageArgumentStrength || 0) * 10) / 10}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Average Score
              </Typography>
              <Chip
                label={skillInfo.level}
                color={skillInfo.color}
                size="small"
                icon={skillInfo.trend === 'up' ? <TrendingUp /> : <TrendingDown />}
              />
            </CardContent>
          </MotionCard>
        </Grid>

        <Grid item xs={12} md={3}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Forum sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {userStats?.totalDebates || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Total Debates
              </Typography>
              <Chip
                label={`${userStats?.completedDebates || 0} completed`}
                size="small"
                variant="outlined"
              />
            </CardContent>
          </MotionCard>
        </Grid>

        <Grid item xs={12} md={3}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <Speed sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {Math.round(userStats?.averageMessageLength || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Avg Words/Argument
              </Typography>
              <Chip
                label="Optimal range"
                size="small"
                color="success"
                variant="outlined"
              />
            </CardContent>
          </MotionCard>
        </Grid>

        <Grid item xs={12} md={3}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <CardContent sx={{ textAlign: 'center' }}>
              <EmojiEvents sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                {userStats?.recentActivity || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                This Month
              </Typography>
              <Chip
                label="Active"
                size="small"
                color="success"
              />
            </CardContent>
          </MotionCard>
        </Grid>

        {/* Performance Over Time */}
        <Grid item xs={12} lg={8}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Performance Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#8884d8"
                    strokeWidth={3}
                    dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                    name="Average Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </MotionCard>
        </Grid>

        {/* Debate Formats */}
        <Grid item xs={12} lg={4}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Debates by Format
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={debatesByFormat}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {debatesByFormat.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </MotionCard>
        </Grid>

        {/* Argument Analysis */}
        <Grid item xs={12} lg={8}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Argument Quality Breakdown
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={argumentStrengthTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="strength"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Argument Strength"
                  />
                  <Area
                    type="monotone"
                    dataKey="clarity"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="Clarity"
                  />
                  <Area
                    type="monotone"
                    dataKey="evidence"
                    stackId="3"
                    stroke="#ffc658"
                    fill="#ffc658"
                    name="Evidence Use"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </MotionCard>
        </Grid>

        {/* Insights & Recommendations */}
        <Grid item xs={12} lg={4}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                AI Insights
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <TrendingUp color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Improving Trend"
                    secondary="Your argument strength has improved by 15% this month"
                  />
                </ListItem>
                
                <Divider />
                
                <ListItem>
                  <ListItemIcon>
                    <Psychology color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Strength Area"
                    secondary="You excel at logical reasoning and structure"
                  />
                </ListItem>
                
                <Divider />
                
                <ListItem>
                  <ListItemIcon>
                    <SmartToy color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Growth Opportunity"
                    secondary="Try incorporating more diverse evidence sources"
                  />
                </ListItem>
                
                <Divider />
                
                <ListItem>
                  <ListItemIcon>
                    <Person color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Recommendation"
                    secondary="Challenge yourself with Expert-level AI opponents"
                  />
                </ListItem>
              </List>
            </CardContent>
          </MotionCard>
        </Grid>

        {/* Detailed Metrics */}
        <Grid item xs={12}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Detailed Performance Metrics
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Argument Strength
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(userStats?.averageArgumentStrength || 0) * 10}
                      sx={{ height: 8, borderRadius: 4 }}
                      color="primary"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {Math.round((userStats?.averageArgumentStrength || 0) * 10)}%
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Debate Participation
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((userStats?.totalDebates || 0) * 5, 100)}
                      sx={{ height: 8, borderRadius: 4 }}
                      color="success"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {userStats?.totalDebates || 0} debates
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Consistency
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={75}
                      sx={{ height: 8, borderRadius: 4 }}
                      color="warning"
                    />
                    <Typography variant="caption" color="text.secondary">
                      75% consistent performance
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </MotionCard>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AnalyticsPage;
