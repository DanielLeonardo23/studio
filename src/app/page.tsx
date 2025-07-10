'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import Image from 'next/image';
import {
  estimateNutrients,
  estimateNutrientsFromText,
  type EstimateNutrientsOutput,
} from '@/ai/flows/estimate-nutrients';
import { extractNutrientsFromLabel } from '@/ai/flows/extract-nutrients-from-label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Leaf,
  UploadCloud,
  Flame,
  Beef,
  Droplet,
  GlassWater,
  X,
  ScanText,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type FinalNutrients = {
  calorias: number;
  proteinas: number;
  grasas: number;
  agua: number;
};

export default function Home() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [estimation, setEstimation] = useState<EstimateNutrientsOutput | null>(null);
  const [consumedGrams, setConsumedGrams] = useState('');
  const [finalNutrients, setFinalNutrients] = useState<FinalNutrients | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [activeAnalysisType, setActiveAnalysisType] = useState<'dish' | 'label' | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleFileChange = (file: File | null, analysisType: 'dish' | 'label') => {
    if (file && file.type.startsWith('image/')) {
        setImagePreview(URL.createObjectURL(file));
        setShowResults(true);
        submitImageEstimation(analysisType, file);
    } else if (file) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please select a valid image file.',
      });
    }
  };

  const submitImageEstimation = async (analysisType: 'dish' | 'label', file: File) => {
    setIsLoading(true);
    setError(null);
    setEstimation(null);
    setFinalNutrients(null);
    setConsumedGrams('');
    setTextInput('');

    const formData = new FormData();
    formData.append('photo', file);

    const endpoint = analysisType === 'dish' ? '/api/estimate/dish' : '/api/extract/label';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Request failed');
        }

        const result: EstimateNutrientsOutput = await response.json();
        setEstimation(result);
    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message || 'Failed to estimate nutrients. The AI may not recognize this. Please try again.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Estimation Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please enter a dish name.',
      });
      return;
    }

    setShowResults(true);
    setIsLoading(true);
    setError(null);
    setEstimation(null);
    setFinalNutrients(null);
    setConsumedGrams('');
    setImagePreview(null);
    
    try {
      const response = await fetch('/api/estimate/text', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ dishName: textInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      const result = await response.json();
      setEstimation(result);

    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message || 'Failed to estimate nutrients. Please try another dish name.';
      setError(errorMessage);
      toast({
        variant: 'destructive',
        title: 'Estimation Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setIsLoading(false);
    setEstimation(null);
    setConsumedGrams('');
    setFinalNutrients(null);
    setError(null);
    setTextInput('');
    setShowResults(false);
  };

  const handleRecalculate = () => {
    if (!estimation) return;
    const grams = parseFloat(consumedGrams);
    if (isNaN(grams) || grams <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please enter a valid number for grams.',
      });
      return;
    }

    const basePortion = parseInt(String(estimation.porcion).replace(/[^0-9]/g, ''), 10) || 100;
    const multiplier = grams / basePortion;

    setFinalNutrients({
      calorias: estimation.nutrientes.calorias * multiplier,
      proteinas: estimation.nutrientes.proteinas * multiplier,
      grasas: estimation.nutrientes.grasas * multiplier,
      agua: estimation.nutrientes.agua * multiplier,
    });
  };

  const openCamera = (analysisType: 'dish' | 'label') => {
    setActiveAnalysisType(analysisType);
    setHasCameraPermission(null);
    setIsCameraOpen(true);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current && activeAnalysisType) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const file = new File([blob], "camera-capture.png", { type: "image/png"});
        setImagePreview(URL.createObjectURL(file));
        setShowResults(true);
        submitImageEstimation(activeAnalysisType, file);
      }

      setIsCameraOpen(false);
    }
  };

  useEffect(() => {
    if (!isCameraOpen) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
      return;
    }

    let stream: MediaStream | null = null;
    const getCameraPermission = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions to take a photo.',
        });
        setIsCameraOpen(false);
      }
    };

    getCameraPermission();

    return () => {
        stream?.getTracks().forEach(track => track.stop());
        if (videoRef.current?.srcObject) {
             videoRef.current.srcObject = null;
        }
    };
  }, [isCameraOpen, toast]);

  const nutrientItems = useMemo(() => {
    if (!estimation) return [];
    return [
      { icon: Flame, name: 'Calories', value: estimation.nutrientes.calorias, unit: 'kcal' },
      { icon: Beef, name: 'Protein', value: estimation.nutrientes.proteinas, unit: 'g' },
      { icon: Droplet, name: 'Fats', value: estimation.nutrientes.grasas, unit: 'g' },
      { icon: GlassWater, name: 'Water', value: estimation.nutrientes.agua, unit: 'g' },
    ];
  }, [estimation]);

  const finalNutrientItems = useMemo(() => {
    if (!finalNutrients) return [];
    return [
      { icon: Flame, name: 'Calories', value: finalNutrients.calorias, unit: 'kcal' },
      { icon: Beef, name: 'Protein', value: finalNutrients.proteinas, unit: 'g' },
      { icon: Droplet, name: 'Fats', value: finalNutrients.grasas, unit: 'g' },
      { icon: GlassWater, name: 'Water', value: finalNutrients.agua, unit: 'g' },
    ];
  }, [finalNutrients]);

  const ImageUploader = ({ analysisType }: { analysisType: 'dish' | 'label' }) => {
    const uploaderFileInputRef = useRef<HTMLInputElement>(null);
    const [isUploaderDragging, setIsUploaderDragging] = useState(false);

    const title = analysisType === 'dish' ? 'Analyze a Dish Photo' : 'Analyze a Nutrition Label';
    const description = 'Take a photo or upload an image to start.';
    const Icon = analysisType === 'dish' ? UploadCloud : ScanText;

    const handleUploaderDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleUploaderDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      handleUploaderDragEvents(e);
      setIsUploaderDragging(true);
    };
    const handleUploaderDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      handleUploaderDragEvents(e);
      setIsUploaderDragging(false);
    };
    const handleUploaderDrop = (e: React.DragEvent<HTMLDivElement>) => {
      handleUploaderDragEvents(e);
      setIsUploaderDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileChange(file, analysisType);
      }
    };

    return (
      <div
        className={cn(
          'w-full border-2 border-dashed rounded-b-xl transition-colors duration-200 text-center p-8 flex flex-col items-center justify-center',
          isUploaderDragging ? 'border-primary bg-accent' : 'border-input'
        )}
        onDragEnter={handleUploaderDragEnter}
        onDragLeave={handleUploaderDragLeave}
        onDragOver={handleUploaderDragEvents}
        onDrop={handleUploaderDrop}
      >
        <Icon className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-6">{description}</p>
        <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => uploaderFileInputRef.current?.click()} size="lg">
                <UploadCloud className="mr-2" /> Upload Image
            </Button>
            <Button onClick={() => openCamera(analysisType)} size="lg">
                <Camera className="mr-2" /> Take Photo
            </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-4">or drag and drop an image</p>
        <Input
          ref={uploaderFileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0] || null, analysisType)}
        />
      </div>
    );
  };

  const renderNutrient = (item: {
    icon: React.ElementType;
    name: string;
    value: number;
    unit: string;
  }) => (
    <div key={item.name} className="flex items-start space-x-3 p-3 bg-secondary/50 rounded-lg">
      <item.icon className="w-6 h-6 text-primary mt-1" />
      <div>
        <p className="text-sm font-medium text-muted-foreground">{item.name}</p>
        <p className="text-xl font-bold">
          {item.value % 1 !== 0 ? item.value.toFixed(1) : item.value}{' '}
          <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-4 border-b">
        <div className="container mx-auto flex items-center gap-2">
          <Leaf className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold font-headline tracking-tight">
            NutriSnap Global
          </h1>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
        {!showResults ? (
          <div className="w-full max-w-2xl">
            <Tabs defaultValue="photo" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="photo">From Photo</TabsTrigger>
                <TabsTrigger value="label">From Label</TabsTrigger>
                <TabsTrigger value="text">From Text</TabsTrigger>
              </TabsList>
              <TabsContent value="photo">
                <ImageUploader analysisType="dish" />
              </TabsContent>
              <TabsContent value="label">
                <ImageUploader analysisType="label" />
              </TabsContent>
              <TabsContent value="text">
                <div className="w-full border-2 border-dashed rounded-b-xl border-input text-center p-8 flex flex-col items-center justify-center">
                  <Label htmlFor="dish-name-input" className="text-xl font-semibold mb-2 block">
                    Enter a Dish Name
                  </Label>
                  <div className="flex gap-2 w-full max-w-sm">
                    <Input
                      id="dish-name-input"
                      placeholder="e.g., Lomo Saltado"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && textInput && !isLoading) handleTextSubmit(); }}
                    />
                    <Button onClick={handleTextSubmit} disabled={!textInput || isLoading}>
                      Estimate
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="w-full max-w-5xl">
            <Card className="overflow-hidden shadow-lg">
              <div className={cn('grid', imagePreview ? 'md:grid-cols-2' : 'grid-cols-1')}>
                {imagePreview && (
                  <div className="relative aspect-square">
                    <Image
                      src={imagePreview}
                      alt="Uploaded food"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-opacity duration-300"
                      data-ai-hint="food dish"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/50 hover:bg-background rounded-full"
                      onClick={handleReset}
                    >
                      <X className="w-5 h-5" />
                      <span className="sr-only">Clear image</span>
                    </Button>
                  </div>
                )}
                <div className="p-6 flex flex-col justify-center">
                  {isLoading && (
                    <div>
                      <Skeleton className="h-8 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-6" />
                      <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-20" />
                        <Skeleton className="h-20" />
                        <Skeleton className="h-20" />
                        <Skeleton className="h-20" />
                      </div>
                    </div>
                  )}

                  {error && !isLoading && (
                     <div className="text-center">
                      <p className="text-destructive font-semibold mb-4">{error}</p>
                      <Button onClick={handleReset}>Start over</Button>
                    </div>
                  )}
                  
                  {estimation && !isLoading && (
                    <div>
                      <CardHeader className="p-0 mb-4 flex flex-row justify-between items-start gap-4">
                        <div>
                          <CardTitle className="text-3xl font-headline">{estimation.alimento}</CardTitle>
                          <CardDescription>Estimated nutrients per {estimation.porcion}</CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0"
                          onClick={handleReset}
                        >
                          <X className="w-5 h-5" />
                          <span className="sr-only">Clear results</span>
                        </Button>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                          {nutrientItems.map(renderNutrient)}
                        </div>
                        
                        <Separator className="my-6" />

                        <div>
                          <Label htmlFor="grams" className="font-semibold text-lg">How much did you eat?</Label>
                          <div className="flex gap-2 mt-2">
                            <Input
                              id="grams"
                              type="number"
                              placeholder="e.g., 150"
                              value={consumedGrams}
                              onChange={(e) => setConsumedGrams(e.target.value)}
                              className="w-full"
                            />
                            <Button onClick={handleRecalculate} disabled={!consumedGrams}>Recalculate</Button>
                          </div>
                        </div>

                        {finalNutrients && (
                          <div className="mt-6">
                            <h3 className="font-semibold mb-2 text-lg">Your Total Intake ({consumedGrams}g)</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {finalNutrientItems.map(renderNutrient)}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        <p>Powered by Google AI. For informational purposes only.</p>
      </footer>

      <canvas ref={canvasRef} className="hidden" />
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Take a Photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div className="w-full bg-muted rounded-lg overflow-hidden relative aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
               {hasCameraPermission !== true && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                    {hasCameraPermission === false ? (
                        <Alert variant="destructive" className="mx-4">
                            <AlertTitle>Camera Access Denied</AlertTitle>
                            <AlertDescription>
                                Enable permissions and try again.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <p className="text-muted-foreground">Requesting camera access...</p>
                    )}
                  </div>
              )}
            </div>
            <Button onClick={capturePhoto} className="w-full" size="lg" disabled={!hasCameraPermission}>
              <Camera className="mr-2" /> Capture Photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
