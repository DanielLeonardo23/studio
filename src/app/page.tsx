'use client';

import { useState, useRef, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import Image from 'next/image';
import {
  estimateNutrients,
  type EstimateNutrientsOutput,
} from '@/ai/flows/estimate-nutrients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Leaf,
  UploadCloud,
  Flame,
  Beef,
  Droplet,
  GlassWater,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FinalNutrients = {
  calorias: number;
  proteinas: number;
  grasas: number;
  agua: number;
};

export default function Home() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [estimation, setEstimation] = useState<EstimateNutrientsOutput | null>(null);
  const [consumedGrams, setConsumedGrams] = useState('');
  const [finalNutrients, setFinalNutrients] = useState<FinalNutrients | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setImageDataUri(dataUri);
        setImagePreview(URL.createObjectURL(file));
        submitEstimation(dataUri);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please select a valid image file.',
      });
    }
  };

  const submitEstimation = async (dataUri: string) => {
    setIsLoading(true);
    setError(null);
    setEstimation(null);
    setFinalNutrients(null);
    setConsumedGrams('');

    try {
      const result = await estimateNutrients({ photoDataUri: dataUri });
      setEstimation(result);
    } catch (e) {
      console.error(e);
      const errorMessage = 'Failed to estimate nutrients. The AI may not recognize this food. Please try another image.';
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

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e);
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFileChange(file);
  };

  const handleReset = () => {
    setImagePreview(null);
    setImageDataUri(null);
    setIsLoading(false);
    setEstimation(null);
    setConsumedGrams('');
    setFinalNutrients(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

    const basePortion = parseInt(estimation.porcion.replace(/[^0-9]/g, ''), 10) || 100;
    const multiplier = grams / basePortion;

    setFinalNutrients({
      calorias: estimation.nutrientes.calorias * multiplier,
      proteinas: estimation.nutrientes.proteinas * multiplier,
      grasas: estimation.nutrientes.grasas * multiplier,
      agua: estimation.nutrientes.agua * multiplier,
    });
  };

  const nutrientItems = useMemo(() => {
    if (!estimation) return [];
    return [
      {
        icon: Flame,
        name: 'Calories',
        value: estimation.nutrientes.calorias,
        unit: 'kcal',
      },
      {
        icon: Beef,
        name: 'Protein',
        value: estimation.nutrientes.proteinas,
        unit: 'g',
      },
      {
        icon: Droplet,
        name: 'Fats',
        value: estimation.nutrientes.grasas,
        unit: 'g',
      },
      {
        icon: GlassWater,
        name: 'Water',
        value: estimation.nutrientes.agua,
        unit: 'g',
      },
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
        {!imagePreview ? (
          <div
            className={cn(
              'w-full max-w-2xl border-2 border-dashed rounded-xl transition-colors duration-200 text-center p-8 md:p-16 flex flex-col items-center justify-center cursor-pointer',
              isDragging ? 'border-primary bg-accent' : 'border-border hover:border-primary/50'
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragEvents}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Upload an Image</h2>
            <p className="text-muted-foreground">Click to browse or drag and drop your food photo here.</p>
            <Input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
          </div>
        ) : (
          <div className="w-full max-w-5xl">
            <Card className="overflow-hidden shadow-lg">
              <div className="grid md:grid-cols-2">
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
                      <Button onClick={handleReset}>Try another image</Button>
                    </div>
                  )}
                  
                  {estimation && !isLoading && (
                    <div>
                      <CardHeader className="p-0 mb-4">
                        <CardTitle className="text-3xl font-headline">{estimation.alimento}</CardTitle>
                        <CardDescription>Estimated nutrients per {estimation.porcion}</CardDescription>
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
    </div>
  );
}
