import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Psychology,
  Speed,
  Analytics,
  Group,
  SmartToy,
  TrendingUp
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      icon: SmartToy,
      title: 'AI-Powered Opponents',
      description: 'Debate against intelligent AI agents with unique personalities and expertise tailored to each motion.',
      color: theme.palette.primary.main
    },
    {
      icon: Speed,
      title: 'Real-time Analysis',
      description: 'Get instant feedback on argument strength, clash detection, and speaking performance as you debate.',
      color: theme.palette.secondary.main
    },
    {
      icon: Analytics,
      title: 'Performance Insights',
      description: 'Track your progress with detailed analytics and personalized recommendations for improvement.',
      color: theme.palette.success.main
    },
    {
      icon: Group,
      title: 'Multi-platform Support',
      description: 'Debate seamlessly across web and mobile platforms with synchronized real-time interactions.',
      color: theme.palette.warning.main
    },
    {
      icon: Psychology,
      title: 'Dynamic Learning',
      description: 'AI agents adapt and learn from each debate, providing increasingly challenging and realistic opponents.',
      color: theme.palette.info.main
    },
    {
      icon: TrendingUp,
      title: 'Skill Development',
      description: 'Improve your argumentation, critical thinking, and public speaking skills through structured practice.',
      color: theme.palette.error.main
    }
  ];

  const stats = [
    { label: 'Active Debaters', value: '10,000+' },
    { label: 'Debates Completed', value: '50,000+' },
    { label: 'AI Agents Generated', value: '25,000+' },
    { label: 'Success Rate', value: '95%' }
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <MotionBox
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 'bold',
                    mb: 2,
                    fontSize: { xs: '2.5rem', md: '3.5rem' }
                  }}
                >
                  Master the Art of
                  <Box component="span" sx={{ display: 'block', color: '#FFD700' }}>
                    Intelligent Debate
                  </Box>
                </Typography>
                
                <Typography
                  variant="h5"
                  sx={{
                    mb: 4,
                    opacity: 0.9,
                    lineHeight: 1.4,
                    fontSize: { xs: '1.2rem', md: '1.5rem' }
                  }}
                >
                  Challenge AI opponents, receive real-time feedback, and elevate your argumentation skills
                  in our revolutionary debate platform powered by cutting-edge AI technology.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {user ? (
                    <Button
                      variant="contained"
                      size="large"
                      onClick={() => navigate('/dashboard')}
                      sx={{
                        backgroundColor: 'white',
                        color: 'primary.main',
                        px: 4,
                        py: 1.5,
                        fontSize: '1.1rem',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.9)'
                        }
                      }}
                    >
                      Go to Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={() => navigate('/register')}
                        sx={{
                          backgroundColor: 'white',
                          color: 'primary.main',
                          px: 4,
                          py: 1.5,
                          fontSize: '1.1rem',
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.9)'
                          }
                        }}
                      >
                        Start Debating
                      </Button>
                      
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={() => navigate('/login')}
                        sx={{
                          borderColor: 'white',
                          color: 'white',
                          px: 4,
                          py: 1.5,
                          fontSize: '1.1rem',
                          '&:hover': {
                            borderColor: 'white',
                            backgroundColor: 'rgba(255,255,255,0.1)'
                          }
                        }}
                      >
                        Sign In
                      </Button>
                    </>
                  )}
                </Box>
              </MotionBox>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <MotionBox
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: { xs: 200, md: 400 }
                }}
              >
                <Box
                  sx={{
                    width: { xs: 200, md: 300 },
                    height: { xs: 200, md: 300 },
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(10px)',
                    border: '2px solid rgba(255,255,255,0.2)'
                  }}
                >
                  <SmartToy sx={{ fontSize: { xs: 80, md: 120 }, opacity: 0.8 }} />
                </Box>
              </MotionBox>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Grid container spacing={3}>
          {stats.map((stat, index) => (
            <Grid item xs={6} md={3} key={index}>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                sx={{ textAlign: 'center' }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 'bold',
                    color: 'primary.main',
                    mb: 1
                  }}
                >
                  {stat.value}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {stat.label}
                </Typography>
              </MotionBox>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Features Section */}
      <Box sx={{ backgroundColor: 'background.paper', py: 8 }}>
        <Container maxWidth="lg">
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            sx={{ textAlign: 'center', mb: 6 }}
          >
            <Typography
              variant="h3"
              component="h2"
              sx={{ fontWeight: 'bold', mb: 2 }}
            >
              Revolutionizing Debate Education
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 600, mx: 'auto' }}
            >
              Experience the future of argumentative learning with our AI-powered platform
              that adapts to your skill level and provides personalized feedback.
            </Typography>
          </MotionBox>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <MotionCard
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)'
                    }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <feature.icon
                        sx={{
                          fontSize: 40,
                          color: feature.color,
                          mr: 2
                        }}
                      />
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold' }}>
                        {feature.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 8
        }}
      >
        <Container maxWidth="md">
          <MotionBox
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            sx={{ textAlign: 'center' }}
          >
            <Typography
              variant="h4"
              component="h2"
              sx={{ fontWeight: 'bold', mb: 2 }}
            >
              Ready to Elevate Your Debate Skills?
            </Typography>
            <Typography
              variant="h6"
              sx={{ mb: 4, opacity: 0.9 }}
            >
              Join thousands of debaters who are already improving their skills with AI-powered practice.
            </Typography>
            
            {!user && (
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/register')}
                  sx={{
                    backgroundColor: 'white',
                    color: 'primary.main',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.9)'
                    }
                  }}
                >
                  Get Started Free
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/login')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.9)',
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Sign In
                </Button>
              </Box>
            )}
          </MotionBox>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
