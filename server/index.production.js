// Production server entry point
import('./index.js').catch(err => {
  console.error('Failed to start production server:', err);
  process.exit(1);
});