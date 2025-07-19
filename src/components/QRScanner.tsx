import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Camera, CameraOff } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

export function QRScanner({ onScan, isActive, onToggle }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isActive]);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setHasPermission(true);
        
        // Start scanning for QR codes
        scanIntervalRef.current = setInterval(() => {
          scanForQRCode();
        }, 500);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasPermission(false);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const scanForQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.videoWidth === 0) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Simple QR code detection simulation
    // In a real app, you'd use a proper QR detection library
    const mockQRDetection = () => {
      // This is just for demonstration - you'd use jsQR or similar library
      // For now, we'll simulate finding QR codes in the mock data
      return null;
    };
    
    const result = mockQRDetection();
    if (result) {
      onScan(result);
    }
  };

  const handleManualInput = () => {
    // For testing purposes, let's simulate scanning a QR code
    const mockStudentIds = ['STU001', 'STU002', 'STU003', 'STU004', 'STU005'];
    const randomId = mockStudentIds[Math.floor(Math.random() * mockStudentIds.length)];
    onScan(randomId);
  };

  if (hasPermission === false) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <CameraOff className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2">Camera Permission Required</h3>
          <p className="text-muted-foreground mb-4">
            Please allow camera access to scan QR codes
          </p>
          <Button onClick={onToggle}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <h3 className="mb-2">QR Code Scanner</h3>
          <p className="text-muted-foreground">
            Point camera at student QR code to check attendance
          </p>
        </div>
        
        <div className="relative mb-4">
          {isActive ? (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-2 border-primary rounded-lg flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white bg-white/10 rounded-lg flex items-center justify-center">
                  <p className="text-white text-sm">Scan QR Code Here</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Camera className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Camera inactive</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button onClick={onToggle} variant="outline" className="flex-1">
            {isActive ? (
              <>
                <CameraOff className="mr-2 h-4 w-4" />
                Stop Scanner
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Start Scanner
              </>
            )}
          </Button>
          
          <Button onClick={handleManualInput} variant="secondary">
            Simulate Scan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}