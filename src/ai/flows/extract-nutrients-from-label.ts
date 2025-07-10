'use server';
/**
 * @fileOverview Extracts nutritional information from an image of a food label.
 * This flow sends the image directly to Gemini and asks it to perform OCR and data extraction.
 *
 * - extractNutrientsFromLabel - A function that handles the nutrient extraction process from a label image.
 * - ExtractNutrientsFromLabelInput - The input type for the function.
 * - UnifiedNutritionOutput - The return type for the function (reusing from schemas).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  UnifiedNutritionOutput,
  UnifiedNutritionOutputSchema,
} from './schemas';

const ExtractNutrientsFromLabelInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a food nutrition label, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type ExtractNutrientsFromLabelInput = z.infer<
  typeof ExtractNutrientsFromLabelInputSchema
>;

// Re-exporting for consistency in the calling component
export type {UnifiedNutritionOutput};

export async function extractNutrientsFromLabel(
  input: ExtractNutrientsFromLabelInput
): Promise<UnifiedNutritionOutput> {
  return extractNutrientsFromLabelFlow(input);
}

const labelPrompt = ai.definePrompt({
  name: 'extractNutrientsFromLabelPrompt',
  input: {schema: ExtractNutrientsFromLabelInputSchema},
  output: {schema: UnifiedNutritionOutputSchema},
  prompt: `You are an expert at reading nutritional information from images of food labels.
Analyze the provided image of a nutritional label. From this image, perform OCR and extract the following information.

1.  **name**: The name of the food item (e.g., "Leche Gloria Entera").
2.  **portion**: The standard portion size. Find the value for "por 100g", "por 100ml", or a similar serving size. It MUST be a string like "100g", "100ml", or "30g".
3.  The nutritional values for the specified portion, with these specific keys:
    - **energy**: The number of calories (Kcal).
    - **protein**: The protein content in grams (g).
    - **fats**: The total fat content in grams (g).
    - **water**: The water content in grams (g). If water is not listed, estimate it based on the other ingredients or assume it is the remainder to reach the portion size. If it cannot be determined, set it to 0.

It is crucial to find the values that correspond to the specified serving size in the 'portion' field.
Provide the response in the requested JSON format. Do not fail if one value is missing, make a reasonable estimate or use 0.

Here is the image:
{{media url=photoDataUri}}
`,
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
    outputSchema: UnifiedNutritionOutputSchema,
  },
  async (input) => {
    const {output} = await labelPrompt(input);
    return output!;
  }
);
