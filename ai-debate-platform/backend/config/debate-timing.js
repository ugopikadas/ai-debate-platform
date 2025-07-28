// Debate Timing Configuration
// Adjust these values to control debate automation timing

module.exports = {
  // Default timing settings (in milliseconds)
  defaults: {
    prepTime: 300000,        // 5 minutes preparation time
    timePerSpeech: 180000,   // 3 minutes per speech
    breakBetweenSpeeches: 5000, // 5 seconds break between speakers
    evaluationDelay: 3000    // 3 seconds before starting evaluation
  },

  // Quick test settings for development
  testing: {
    prepTime: 30000,         // 30 seconds preparation time
    timePerSpeech: 20000,    // 20 seconds per speech
    breakBetweenSpeeches: 2000, // 2 seconds break between speakers
    evaluationDelay: 1000    // 1 second before starting evaluation
  },

  // Competition settings for formal debates
  competition: {
    prepTime: 900000,        // 15 minutes preparation time
    timePerSpeech: 480000,   // 8 minutes per speech
    breakBetweenSpeeches: 10000, // 10 seconds break between speakers
    evaluationDelay: 5000    // 5 seconds before starting evaluation
  },

  // Quick demo settings for presentations
  demo: {
    prepTime: 60000,         // 1 minute preparation time
    timePerSpeech: 60000,    // 1 minute per speech
    breakBetweenSpeeches: 3000, // 3 seconds break between speakers
    evaluationDelay: 2000    // 2 seconds before starting evaluation
  },

  // Get timing configuration by mode
  getConfig: (mode = 'defaults') => {
    return module.exports[mode] || module.exports.defaults;
  },

  // Format time for display
  formatTime: (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  // Validate timing settings
  validateTiming: (settings) => {
    const errors = [];
    
    if (settings.prepTime < 30000) {
      errors.push('Preparation time must be at least 30 seconds');
    }
    if (settings.prepTime > 1800000) {
      errors.push('Preparation time cannot exceed 30 minutes');
    }
    
    if (settings.timePerSpeech < 15000) {
      errors.push('Speech time must be at least 15 seconds');
    }
    if (settings.timePerSpeech > 900000) {
      errors.push('Speech time cannot exceed 15 minutes');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
