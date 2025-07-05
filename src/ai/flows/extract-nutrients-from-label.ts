'use server';
/**
 * @fileOverview Extracts nutritional information from an image of a food label.
 *
 * - extractNutrientsFromLabel - A function that handles the nutrient extraction process from a label image.
 * - ExtractNutrientsFromLabelInput - The input type for the function.
 * - EstimateNutrientsOutput - The return type for the function (reusing from estimate-nutrients).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  EstimateNutrientsOutput,
  EstimateNutrientsOutputSchema,
} from './schemas';

const ExtractNutrientsFromLabelInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a food nutrition label, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractNutrientsFromLabelInput = z.infer<
  typeof ExtractNutrientsFromLabelInputSchema
>;

// Re-exporting for consistency in the calling component
export type {EstimateNutrientsOutput};

export async function extractNutrientsFromLabel(
  input: ExtractNutrientsFromLabelInput
): Promise<EstimateNutrientsOutput> {
  return extractNutrientsFromLabelFlow(input);
}

const labelPrompt = ai.definePrompt({
  name: 'extractNutrientsFromLabelPrompt',
  input: {schema: ExtractNutrientsFromLabelInputSchema},
  output: {schema: EstimateNutrientsOutputSchema},
  prompt: `You are an expert at reading nutritional labels from images using OCR.
Analyze the provided image of a nutritional label.
Extract the following information:
1.  The name of the food item ('alimento').
2.  The serving size as a string, e.g., "100g" or "1 package" ('porcion').
3.  The nutritional values per serving size:
    - Calories ('calorias')
    - Protein in grams ('proteinas')
    - Total Fats in grams ('grasas')
    - Water content in grams ('agua'). If water is not listed, estimate it based on the other ingredients or set it to 0.

Provide the response in the requested JSON format. If you cannot find a value, make a reasonable estimate. Prioritize the values from the 'per 100g' column if available.
Here is the image: {{media url=photoDataUri}}`,
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

const extractNutrientsFromLabelFlow = ai.defineFlow(
  {
    name: 'extractNutrientsFromLabelFlow',
    inputSchema: ExtractNutrientsFromLabelInputSchema,
    outputSchema: EstimateNutrientsOutputSchema,
  },
  async input => {
    const {output} = await labelPrompt(input);
    return output!;
  }
);
