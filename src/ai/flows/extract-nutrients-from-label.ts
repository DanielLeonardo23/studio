'use server';
/**
 * @fileOverview Extracts nutritional information from an image of a food label.
 * This flow sends the image directly to Gemini and asks it to perform OCR and data extraction.
 *
 * - extractNutrientsFromLabel - A function that handles the nutrient extraction process from a label image.
 * - ExtractNutrientsFromLabelInput - The input type for the function.
 * - EstimateNutrientsOutput - The return type for the function (reusing from schemas).
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
      "A photo of a food nutrition label, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
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
  prompt: `You are an expert at reading nutritional information from images of food labels.
Analyze the provided image of a nutritional label. From this image, perform OCR and extract the following information.

1.  **alimento**: The name of the food item (e.g., "Leche Gloria Entera").
2.  **porcion**: The standard portion size. Find the value for "por 100g" or "por 100ml". If it's not available, find the portion size specified (e.g., "30g") and use that. It MUST be a string like "100g" or "30g".
3.  **nutrientes**: A JSON object with the nutritional values.
    - **calorias**: The number of calories (Kcal).
    - **proteinas**: The protein content in grams (g).
    - **grasas**: The total fat content in grams (g).
    - **agua**: The water content in grams (g). If water is not listed, estimate it based on the other ingredients or assume it is the remainder to reach 100g. If it cannot be determined, set it to 0.

It is crucial to find the values corresponding to a 100g or 100ml serving. If that column is not available, use the values from the available serving size column but still report the nutrients for that serving.

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
    outputSchema: EstimateNutrientsOutputSchema,
  },
  async (input) => {
    const {output} = await labelPrompt(input);
    return output!;
  }
);
