import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Avatar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  IconButton,
  Tooltip,
  Fab
} from '@mui/material';
import {
  Add,
  SmartToy,
  Person,
  PlayArrow,
  Group,
  Schedule,
  Search,
  FilterList
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDebates, setFilters } from '../store/slices/debatesSlice';
import LoadingScreen from '../components/common/LoadingScreen';

const MotionCard = motion(Card);

const DebateListPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { debates, loading, pagination = { total: 0, limit: 20, offset: 0 }, filters } = useSelector(state => state.debates);

  useEffect(() => {
    try {
      dispatch(fetchDebates({ ...filters, limit: 12 }));
    } catch (error) {
      console.error('Error fetching debates:', error);
    }
  }, [dispatch, filters]);

  const handleFilterChange = (field, value) => {
    dispatch(setFilters({ [field]: value }));
  };

  const handlePageChange = (event, page) => {
    const offset = (page - 1) * pagination.limit;
    dispatch(fetchDebates({ ...filters, offset }));
  };

  const getDebateStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'warning';
      case 'active': return 'success';
      case 'completed': return 'primary';
      default: return 'default';
    }
  };

  const getParticipantInfo = (debate) => {
    if (!debate || !Array.isArray(debate.participants)) {
      return { humanParticipants: 0, aiParticipants: 0 };
    }
    const humanParticipants = debate.participants.filter(p => p && p.type === 'human').length || 0;
    const aiParticipants = debate.participants.filter(p => p && p.type === 'ai').length || 0;
    return { humanParticipants, aiParticipants };
  };

  const filteredDebates = Array.isArray(debates) ? debates.filter(debate =>
    debate && debate.motion &&
    (debate.motion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    debate.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  if (loading && (!Array.isArray(debates) || debates.length === 0)) {
    return <LoadingScreen message="Loading debates..." />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
            Debates
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Join ongoing debates or browse completed ones for inspiration
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/debates/create')}
          size="large"
        >
          Create Debate
        </Button>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search debates by motion or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="waiting">Waiting</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={filters.hasAIParticipant}
                    label="Type"
                    onChange={(e) => handleFilterChange('hasAIParticipant', e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="true">With AI</MenuItem>
                    <MenuItem value="false">Human Only</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Access</InputLabel>
                  <Select
                    value={filters.isPublic}
                    label="Access"
                    onChange={(e) => handleFilterChange('isPublic', e.target.value)}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="true">Public</MenuItem>
                    <MenuItem value="false">Private</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Debates Grid */}
      {filteredDebates.length > 0 ? (
        <>
          <Grid container spacing={3}>
            {filteredDebates.map((debate, index) => {
              if (!debate || !debate.id) {
                console.warn('Invalid debate object at index:', index, debate);
                return null;
              }

              const { humanParticipants, aiParticipants } = getParticipantInfo(debate);

              return (
                <Grid item xs={12} md={6} lg={4} key={debate.id}>
                  <MotionCard
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)'
                      }
                    }}
                    onClick={() => navigate(`/debates/${debate.id}`)}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      {/* Status and Type Chips */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Chip
                          label={debate.status || 'unknown'}
                          color={getDebateStatusColor(debate.status || 'unknown')}
                          size="small"
                        />
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {debate.hasAIParticipant && (
                            <Tooltip title="Has AI participant">
                              <SmartToy sx={{ fontSize: 16, color: 'primary.main' }} />
                            </Tooltip>
                          )}
                          {debate.isPublic && (
                            <Tooltip title="Public debate">
                              <Group sx={{ fontSize: 16, color: 'success.main' }} />
                            </Tooltip>
                          )}
                        </Box>
                      </Box>

                      {/* Motion */}
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{
                          fontWeight: 'bold',
                          mb: 1,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.3
                        }}
                      >
                        {debate.motion || 'No motion specified'}
                      </Typography>

                      {/* Description */}
                      {debate.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 2,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {debate.description}
                        </Typography>
                      )}

                      {/* Participants Info */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Person sx={{ fontSize: 16 }} />
                          <Typography variant="caption">
                            {humanParticipants}
                          </Typography>
                        </Box>
                        {aiParticipants > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <SmartToy sx={{ fontSize: 16 }} />
                            <Typography variant="caption">
                              {aiParticipants}
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Schedule sx={{ fontSize: 16 }} />
                          <Typography variant="caption">
                            {new Date(debate.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Format and Time */}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={debate.format}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${Math.round(debate.timePerSpeech / 60000)}min`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>

                    <CardActions sx={{ p: 2, pt: 0 }}>
                      <Button
                        fullWidth
                        variant={debate.status === 'waiting' ? 'contained' : 'outlined'}
                        startIcon={<PlayArrow />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/debates/${debate.id}`);
                        }}
                      >
                        {debate.status === 'waiting' ? 'Join Debate' : 
                         debate.status === 'active' ? 'Watch Live' : 'View Results'}
                      </Button>
                    </CardActions>
                  </MotionCard>
                </Grid>
              );
            })}
          </Grid>

          {/* Pagination */}
          {pagination && pagination.total > pagination.limit && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={Math.ceil(pagination.total / pagination.limit)}
                page={Math.floor(pagination.offset / pagination.limit) + 1}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
            No debates found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm || Object.values(filters).some(f => f) 
              ? 'Try adjusting your search or filters'
              : 'Be the first to create a debate!'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/debates/create')}
            size="large"
          >
            Create First Debate
          </Button>
        </Box>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="create debate"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: { xs: 'flex', md: 'none' }
        }}
        onClick={() => navigate('/debates/create')}
      >
        <Add />
      </Fab>
    </Container>
  );
};

export default DebateListPage;
