import React, { useState, useEffect, useCallback } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';

/**
 * BarcodeScanner Component
 * 
 * This component provides an input field that automatically focuses and listens for
 * barcode scanner input (which typically acts as a keyboard).
 * 
 * Props:
 * - onScan: (code: string) => void - Callback when a barcode is scanned/entered
 * - label: string - Input label
 * - autoFocus: boolean - Whether to auto-focus the input (default: true)
 */
const BarcodeScanner = ({ onScan, label = "Scan Barcode", autoFocus = true }) => {
  const [value, setValue] = useState('');
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState(0);

  // Handle manual change
  const handleChange = (e) => {
    setValue(e.target.value);
  };

  // Handle enter key (scanners usually send Enter after the code)
  const handleKeyDown = (e) => {
    const now = Date.now();
    
    // Logic to detect scanner vs manual typing could go here if needed
    // For now, we just rely on Enter key
    
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        onScan(value.trim());
        setValue(''); // Clear after scan
      }
    }
    setLastKeystrokeTime(now);
  };

  return (
    <TextField
      fullWidth
      label={label}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      autoFocus={autoFocus}
      placeholder="Scan or type barcode..."
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <QrCodeScannerIcon color="action" />
          </InputAdornment>
        ),
      }}
    />
  );
};

export default BarcodeScanner;
