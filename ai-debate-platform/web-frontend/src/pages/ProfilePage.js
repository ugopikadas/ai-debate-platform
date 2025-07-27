import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  PhotoCamera,
  TrendingUp,
  EmojiEvents,
  Forum,
  Analytics,
  Settings,
  Notifications,
  Security
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const MotionCard = motion(Card);

const schema = yup.object({
  displayName: yup
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .required('Display name is required'),
  bio: yup
    .string()
    .max(500, 'Bio must be less than 500 characters'),
  preferences: yup.object({
    notifications: yup.boolean(),
    publicProfile: yup.boolean(),
    preferredDebateFormat: yup.string(),
    aiDifficulty: yup.string()
  })
});

const ProfilePage = () => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const { user, updateUserProfile } = useAuth();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      displayName: '',
      bio: '',
      preferences: {
        notifications: true,
        publicProfile: false,
        preferredDebateFormat: 'oxford',
        aiDifficulty: 'intermediate'
      }
    }
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [profileResponse, statsResponse] = await Promise.all([
        api.get('/users/profile'),
        api.get('/users/stats')
      ]);
      
      const profile = profileResponse.data.data;
      const stats = statsResponse.data.data;
      
      setUserProfile(profile);
      setUserStats(stats);
      
      // Reset form with fetched data
      reset({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        preferences: {
          notifications: profile.preferences?.notifications ?? true,
          publicProfile: profile.preferences?.publicProfile ?? false,
          preferredDebateFormat: profile.preferences?.preferredDebateFormat || 'oxford',
          aiDifficulty: profile.preferences?.aiDifficulty || 'intermediate'
        }
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Update profile via API
      await api.patch('/users/profile', data);
      
      // Update Firebase profile if display name changed
      if (data.displayName !== user.displayName) {
        await updateUserProfile({ displayName: data.displayName });
      }
      
      setUserProfile(prev => ({ ...prev, ...data }));
      setEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setEditing(false);
  };

  const getSkillLevel = (averageScore) => {
    if (averageScore >= 8) return { level: 'Expert', color: 'success', progress: 100 };
    if (averageScore >= 6) return { level: 'Advanced', color: 'info', progress: 75 };
    if (averageScore >= 4) return { level: 'Intermediate', color: 'warning', progress: 50 };
    return { level: 'Beginner', color: 'error', progress: 25 };
  };

  const skillInfo = getSkillLevel(userStats?.averageArgumentStrength || 0);

  if (loading && !userProfile) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 4 }}>
        Profile Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Personal Information
                </Typography>
                {!editing ? (
                  <Button
                    startIcon={<Edit />}
                    onClick={() => setEditing(true)}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSubmit(onSubmit)}
                      disabled={!isDirty || loading}
                    >
                      Save Changes
                    </Button>
                  </Box>
                )}
              </Box>

              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="displayName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Display Name"
                          error={!!errors.displayName}
                          helperText={errors.displayName?.message}
                          disabled={!editing}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={user?.email || ''}
                      disabled
                      helperText="Email cannot be changed"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="bio"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Bio"
                          multiline
                          rows={4}
                          placeholder="Tell others about yourself and your debate interests..."
                          error={!!errors.bio}
                          helperText={errors.bio?.message}
                          disabled={!editing}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </MotionCard>

          {/* Preferences */}
          <MotionCard
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            sx={{ mt: 3 }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Preferences
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="preferences.preferredDebateFormat"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth disabled={!editing}>
                        <InputLabel>Preferred Debate Format</InputLabel>
                        <Select {...field} label="Preferred Debate Format">
                          <MenuItem value="oxford">Oxford Style</MenuItem>
                          <MenuItem value="parliamentary">Parliamentary</MenuItem>
                          <MenuItem value="lincoln-douglas">Lincoln-Douglas</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Controller
                    name="preferences.aiDifficulty"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth disabled={!editing}>
                        <InputLabel>Default AI Difficulty</InputLabel>
                        <Select {...field} label="Default AI Difficulty">
                          <MenuItem value="beginner">Beginner</MenuItem>
                          <MenuItem value="intermediate">Intermediate</MenuItem>
                          <MenuItem value="advanced">Advanced</MenuItem>
                          <MenuItem value="expert">Expert</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="preferences.notifications"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch
                            {...field}
                            checked={field.value}
                            disabled={!editing}
                          />
                        }
                        label="Enable email notifications"
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Controller
                    name="preferences.publicProfile"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={
                          <Switch
                            {...field}
                            checked={field.value}
                            disabled={!editing}
                          />
                        }
                        label="Make profile public (visible on leaderboards)"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </MotionCard>
        </Grid>

        {/* Profile Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Profile Picture */}
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
                  width: 120,
                  height: 120,
                  mx: 'auto',
                  mb: 2,
                  fontSize: '3rem'
                }}
              >
                {user?.displayName?.[0] || user?.email?.[0]}
              </Avatar>
              
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                {userProfile?.displayName || 'Anonymous Debater'}
              </Typography>
              
              <Chip
                label={skillInfo.level}
                color={skillInfo.color}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Member since {new Date(userProfile?.createdAt).toLocaleDateString()}
              </Typography>

              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                size="small"
                disabled
              >
                Change Photo
              </Button>
            </CardContent>
          </MotionCard>

          {/* Quick Stats */}
          <MotionCard
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            sx={{ mb: 3 }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Quick Stats
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <Forum color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Total Debates"
                    secondary={userStats?.totalDebates || 0}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <TrendingUp color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Average Score"
                    secondary={`${Math.round((userStats?.averageArgumentStrength || 0) * 10) / 10}/10`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <EmojiEvents color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Completed"
                    secondary={userStats?.completedDebates || 0}
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />
              
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Skill Progress
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={skillInfo.progress}
                  color={skillInfo.color}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            </CardContent>
          </MotionCard>

          {/* Account Actions */}
          <MotionCard
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Account
              </Typography>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Security />}
                sx={{ mb: 2 }}
                disabled
              >
                Change Password
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                color="error"
                disabled
              >
                Delete Account
              </Button>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  Some features are coming soon!
                </Typography>
              </Alert>
            </CardContent>
          </MotionCard>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfilePage;
