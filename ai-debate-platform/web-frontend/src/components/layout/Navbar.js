import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  Dashboard,
  Forum,
  Leaderboard,
  Analytics,
  Settings,
  Logout
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

const Navbar = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleMenuClose();
  };

  const navigationItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Dashboard },
    { label: 'Debates', path: '/debates', icon: Forum },
    { label: 'Leaderboard', path: '/leaderboard', icon: Leaderboard },
    { label: 'Analytics', path: '/analytics', icon: Analytics },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <AppBar position="fixed" elevation={1}>
      <Toolbar>
        {/* Logo and Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 'bold',
              cursor: 'pointer',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
            onClick={() => navigate('/')}
          >
            AI Debate Platform
          </Typography>
          
          {/* Connection Status Indicator */}
          {user && (
            <Box
              sx={{
                ml: 2,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: connected ? 'success.main' : 'error.main',
                animation: connected ? 'pulse 2s infinite' : 'none',
                '@keyframes pulse': {
                  '0%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                  '100%': { opacity: 1 },
                },
              }}
              title={connected ? 'Connected' : 'Disconnected'}
            />
          )}
        </Box>

        {/* Desktop Navigation */}
        {user && !isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                color="inherit"
                startIcon={<item.icon />}
                onClick={() => navigate(item.path)}
                sx={{
                  backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        )}

        {/* User Actions */}
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notifications */}
            <IconButton color="inherit">
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>

            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                color="inherit"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Profile Menu */}
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              {user.photoURL ? (
                <Avatar src={user.photoURL} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="inherit" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => navigate('/register')}
            >
              Register
            </Button>
          </Box>
        )}

        {/* Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
            <Settings sx={{ mr: 1 }} />
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <Logout sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>

        {/* Mobile Navigation Menu */}
        {user && isMobile && mobileMenuOpen && (
          <Box
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'primary.main',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              zIndex: 1000,
            }}
          >
            {navigationItems.map((item) => (
              <Button
                key={item.path}
                fullWidth
                color="inherit"
                startIcon={<item.icon />}
                onClick={() => {
                  navigate(item.path);
                  setMobileMenuOpen(false);
                }}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.5,
                  px: 2,
                  backgroundColor: isActive(item.path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
