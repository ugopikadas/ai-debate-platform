import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper
} from '@mui/material';
import {
  Home,
  ArrowBack,
  SearchOff
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const MotionPaper = motion(Paper);

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <MotionPaper
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        elevation={0}
        sx={{
          textAlign: 'center',
          p: 6,
          backgroundColor: 'transparent'
        }}
      >
        <SearchOff
          sx={{
            fontSize: 120,
            color: 'text.secondary',
            mb: 3
          }}
        />
        
        <Typography
          variant="h1"
          sx={{
            fontSize: '6rem',
            fontWeight: 'bold',
            color: 'primary.main',
            mb: 2
          }}
        >
          404
        </Typography>
        
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 'bold',
            mb: 2
          }}
        >
          Page Not Found
        </Typography>
        
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}
        >
          The page you're looking for doesn't exist or has been moved.
          Let's get you back to debating!
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Home />}
            onClick={() => navigate('/')}
            sx={{ px: 4 }}
          >
            Go Home
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{ px: 4 }}
          >
            Go Back
          </Button>
        </Box>
      </MotionPaper>
    </Container>
  );
};

export default NotFoundPage;
