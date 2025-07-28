import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Slider,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip,
  Avatar
} from '@mui/material';
import {
  SmartToy,
  Psychology,
  Speed,
  School,
  EmojiEvents,
  ArrowBack,
  ArrowForward,
  Create
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { createDebate } from '../store/slices/debatesSlice';
import toast from 'react-hot-toast';

const MotionPaper = motion(Paper);

const schema = yup.object({
  motion: yup
    .string()
    .min(10, 'Motion must be at least 10 characters')
    .max(500, 'Motion must be less than 500 characters')
    .required('Motion is required'),
  description: yup
    .string()
    .max(1000, 'Description must be less than 1000 characters'),
  format: yup
    .string()
    .oneOf(['oxford', 'parliamentary', 'lincoln-douglas'])
    .required('Format is required'),
  timePerSpeech: yup
    .number()
    .min(60000, 'Minimum 1 minute per speech')
    .max(600000, 'Maximum 10 minutes per speech')
    .required('Time per speech is required'),
  prepTime: yup
    .number()
    .min(60000, 'Minimum 1 minute preparation time')
    .max(900000, 'Maximum 15 minutes preparation time')
    .required('Preparation time is required'),
  maxParticipants: yup
    .number()
    .min(2, 'Minimum 2 participants')
    .max(8, 'Maximum 8 participants')
    .required('Max participants is required'),
  isPublic: yup.boolean(),
  hasAIParticipant: yup.boolean(),
  aiDifficulty: yup
    .string()
    .oneOf(['beginner', 'intermediate', 'advanced', 'expert'])
    .when('hasAIParticipant', {
      is: true,
      then: (schema) => schema.required('AI difficulty is required when AI participant is enabled')
    })
});

const steps = ['Basic Information', 'Debate Settings', 'AI Configuration', 'Review & Create'];

const CreateDebatePage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    trigger
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      motion: '',
      description: '',
      format: 'oxford',
      timePerSpeech: 180000, // 3 minutes
      prepTime: 300000, // 5 minutes
      maxParticipants: 2,
      isPublic: false,
      hasAIParticipant: true,
      aiDifficulty: 'intermediate'
    }
  });

  const watchedValues = watch();
  const hasAIParticipant = watch('hasAIParticipant');

  const formatOptions = [
    {
      value: 'oxford',
      label: 'Oxford Style',
      description: 'Traditional format with opening statements, rebuttals, and closing arguments'
    },
    {
      value: 'parliamentary',
      label: 'Parliamentary',
      description: 'British Parliamentary style with government and opposition benches'
    },
    {
      value: 'lincoln-douglas',
      label: 'Lincoln-Douglas',
      description: 'One-on-one format focusing on value-based arguments'
    }
  ];

  const aiPersonalities = [
    { value: 'analytical', label: 'Analytical', icon: Psychology, description: 'Data-driven and logical' },
    { value: 'passionate', label: 'Passionate', icon: EmojiEvents, description: 'Emotionally engaging' },
    { value: 'methodical', label: 'Methodical', icon: School, description: 'Systematic and thorough' },
    { value: 'creative', label: 'Creative', icon: Speed, description: 'Innovative and original' }
  ];

  const difficultyLevels = [
    { value: 'beginner', label: 'Beginner', color: 'success' },
    { value: 'intermediate', label: 'Intermediate', color: 'warning' },
    { value: 'advanced', label: 'Advanced', color: 'error' },
    { value: 'expert', label: 'Expert', color: 'primary' }
  ];

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(activeStep);
    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const getFieldsForStep = (step) => {
    switch (step) {
      case 0:
        return ['motion', 'description'];
      case 1:
        return ['format', 'timePerSpeech', 'prepTime', 'maxParticipants', 'isPublic'];
      case 2:
        return hasAIParticipant ? ['hasAIParticipant', 'aiDifficulty'] : ['hasAIParticipant'];
      default:
        return [];
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const result = await dispatch(createDebate(data)).unwrap();
      toast.success('Debate created successfully!');
      navigate(`/debates/${result.id}`);
    } catch (error) {
      toast.error(error.message || 'Failed to create debate');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ space: 3 }}>
            <Controller
              name="motion"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Debate Motion"
                  placeholder="e.g., This house believes that artificial intelligence will benefit humanity"
                  multiline
                  rows={3}
                  error={!!errors.motion}
                  helperText={errors.motion?.message || 'Enter the main topic or statement to be debated'}
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="Description (Optional)"
                  placeholder="Provide additional context or rules for this debate..."
                  multiline
                  rows={4}
                  error={!!errors.description}
                  helperText={errors.description?.message || 'Optional: Add context, background, or specific rules'}
                />
              )}
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ space: 3 }}>
            <Controller
              name="format"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Debate Format</InputLabel>
                  <Select {...field} label="Debate Format">
                    {formatOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Box>
                          <Typography variant="body1">{option.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>Time per Speech: {Math.round(watchedValues.timePerSpeech / 60000)} minutes</Typography>
              <Controller
                name="timePerSpeech"
                control={control}
                render={({ field }) => (
                  <Slider
                    {...field}
                    min={60000}
                    max={600000}
                    step={30000}
                    marks={[
                      { value: 60000, label: '1min' },
                      { value: 180000, label: '3min' },
                      { value: 300000, label: '5min' },
                      { value: 600000, label: '10min' }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${Math.round(value / 60000)}min`}
                  />
                )}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>Preparation Time: {Math.round(watchedValues.prepTime / 60000)} minutes</Typography>
              <Controller
                name="prepTime"
                control={control}
                render={({ field }) => (
                  <Slider
                    {...field}
                    min={60000}
                    max={900000}
                    step={60000}
                    marks={[
                      { value: 60000, label: '1min' },
                      { value: 300000, label: '5min' },
                      { value: 600000, label: '10min' },
                      { value: 900000, label: '15min' }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${Math.round(value / 60000)}min`}
                  />
                )}
              />
            </Box>

            <Controller
              name="maxParticipants"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  type="number"
                  label="Maximum Participants"
                  inputProps={{ min: 2, max: 8 }}
                  error={!!errors.maxParticipants}
                  helperText={errors.maxParticipants?.message}
                  sx={{ mb: 3 }}
                />
              )}
            />

            <Controller
              name="isPublic"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Make this debate public"
                />
              )}
            />
          </Box>
        );

      case 2:
        return (
          <Box sx={{ space: 3 }}>
            <Controller
              name="hasAIParticipant"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch {...field} checked={field.value} />}
                  label="Include AI participant"
                  sx={{ mb: 3 }}
                />
              )}
            />

            {hasAIParticipant && (
              <>
                <Controller
                  name="aiDifficulty"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth sx={{ mb: 3 }}>
                      <InputLabel>AI Difficulty Level</InputLabel>
                      <Select {...field} label="AI Difficulty Level">
                        {difficultyLevels.map((level) => (
                          <MenuItem key={level.value} value={level.value}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={level.label}
                                color={level.color}
                                size="small"
                              />
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />

                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    The AI opponent will be dynamically generated based on your debate motion with a unique personality and expertise.
                  </Typography>
                </Alert>
              </>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              Review Your Debate
            </Typography>
            
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Motion
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {watchedValues.motion}
                </Typography>

                {watchedValues.description && (
                  <>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Description
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {watchedValues.description}
                    </Typography>
                  </>
                )}

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip label={`Format: ${watchedValues.format}`} />
                  <Chip label={`${Math.round(watchedValues.timePerSpeech / 60000)} min per speech`} />
                  <Chip label={`${Math.round(watchedValues.prepTime / 60000)} min prep time`} />
                  <Chip label={`Max ${watchedValues.maxParticipants} participants`} />
                  {watchedValues.isPublic && <Chip label="Public" color="success" />}
                  {watchedValues.hasAIParticipant && (
                    <Chip
                      icon={<SmartToy />}
                      label={`AI: ${watchedValues.aiDifficulty}`}
                      color="primary"
                    />
                  )}
                </Box>
              </CardContent>
            </Card>

            <Alert severity="success">
              <Typography variant="body2">
                Your debate is ready to be created! You'll be automatically joined as the proposition side.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/debates')}
          sx={{ mb: 2 }}
        >
          Back to Debates
        </Button>
        
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Create New Debate
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Set up your debate parameters and challenge others or AI opponents
        </Typography>
      </Box>

      <MotionPaper
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        sx={{ p: 4 }}
      >
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              variant="outlined"
            >
              Back
            </Button>

            {activeStep === steps.length - 1 ? (
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={<Create />}
                size="large"
              >
                {loading ? 'Creating...' : 'Create Debate'}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                variant="contained"
                endIcon={<ArrowForward />}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </MotionPaper>
    </Container>
  );
};

export default CreateDebatePage;
