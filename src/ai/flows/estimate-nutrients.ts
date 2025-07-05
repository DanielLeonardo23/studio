// estimate-nutrients.ts
'use server';
/**
 * @fileOverview Estimates the nutritional content of a food item from an image.
 *
 * - estimateNutrients - A function that handles the nutrient estimation process.
 * - EstimateNutrientsInput - The input type for the estimateNutrients function.
 * - EstimateNutrientsOutput - The return type for the estimateNutrients function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const EstimateNutrientsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a food item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type EstimateNutrientsInput = z.infer<typeof EstimateNutrientsInputSchema>;

const EstimateNutrientsOutputSchema = z.object({
  alimento: z.string().describe('The name of the food item.'),
  porcion: z.string().describe('The standard portion size (e.g., "100g").'),
  nutrientes: z.object({
    calorias: z.number().describe('The estimated calories per portion.'),
    proteinas: z.number().describe('The estimated protein content in grams per portion.'),
    grasas: z.number().describe('The estimated fat content in grams per portion.'),
    agua: z.number().describe('The estimated water content in grams per portion.'),
  }).describe('Nutritional information per standard portion.'),
});
export type EstimateNutrientsOutput = z.infer<typeof EstimateNutrientsOutputSchema>;

export async function estimateNutrients(input: EstimateNutrientsInput): Promise<EstimateNutrientsOutput> {
  return estimateNutrientsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateNutrientsPrompt',
  input: {schema: EstimateNutrientsInputSchema},
  output: {schema: EstimateNutrientsOutputSchema},
  prompt: `Esta es una imagen de un plato de comida. Es muy probable que sea un plato de la gastronomía peruana.
Basándote en lo que ves, dime:\n
1. Qué plato parece ser.\n2. Cuáles son sus valores nutricionales aproximados por 100g:\n   - Calorías
   - Proteínas
   - Grasas
   - Agua

Hazlo en formato JSON. Si no estás seguro, haz una suposición razonable. Da prioridad a platos peruanos si la imagen es ambigua.\n
Aquí está la imagen: {{media url=photoDataUri}}`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const estimateNutrientsFlow = ai.defineFlow(
  {
    name: 'estimateNutrientsFlow',
    inputSchema: EstimateNutrientsInputSchema,
    outputSchema: EstimateNutrientsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
