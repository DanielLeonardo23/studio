'use server';
/**
 * @fileOverview Estimates the nutritional content of a food item from an image or text.
 *
 * - estimateNutrients - A function that handles the nutrient estimation process from an image.
 * - estimateNutrientsFromText - A function that handles the nutrient estimation process from text.
 * - EstimateNutrientsInput - The input type for the estimateNutrients function.
 * - EstimateNutrientsFromTextInput - The input type for the estimateNutrientsFromText function.
 * - UnifiedNutritionOutput - The return type for the estimation functions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  UnifiedNutritionOutput,
  UnifiedNutritionOutputSchema,
} from './schemas';

const EstimateNutrientsInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a food item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type EstimateNutrientsInput = z.infer<
  typeof EstimateNutrientsInputSchema
>;

const EstimateNutrientsFromTextInputSchema = z.object({
  dishName: z.string().describe('The name of the food dish.'),
});
export type EstimateNutrientsFromTextInput = z.infer<
  typeof EstimateNutrientsFromTextInputSchema
>;

export type {UnifiedNutritionOutput};

export async function estimateNutrients(
  input: EstimateNutrientsInput
): Promise<UnifiedNutritionOutput> {
  return estimateNutrientsFlow(input);
}

export async function estimateNutrientsFromText(
  input: EstimateNutrientsFromTextInput
): Promise<UnifiedNutritionOutput> {
  return estimateNutrientsFromTextFlow(input);
}

const imagePrompt = ai.definePrompt({
  name: 'estimateDishPrompt',
  input: {schema: EstimateNutrientsInputSchema},
  output: {schema: UnifiedNutritionOutputSchema},
  prompt: `Analyze the image of a food dish provided. It is likely a dish from Peruvian cuisine.
Based on what you see, provide the following information in JSON format:
1.  **name**: What the dish appears to be.
2.  The approximate nutritional values per 100g, with these specific keys:
    - **energy**: Calories (in kcal)
    - **protein**: Protein (in g)
    - **fats**: Total Fat (in g)
    - **water**: Water (in g)

Do NOT include a 'portion' field in the output. The values should always be for 100g.
If you are unsure, make a reasonable guess. Prioritize Peruvian dishes if the image is ambiguous.
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

const estimateNutrientsFlow = ai.defineFlow(
  {
    name: 'estimateNutrientsFlow',
    inputSchema: EstimateNutrientsInputSchema,
    outputSchema: UnifiedNutritionOutputSchema,
  },
  async input => {
    const {output} = await imagePrompt(input);
    return output!;
  }
);

const textPrompt = ai.definePrompt({
  name: 'estimateDishFromTextPrompt',
  input: {schema: EstimateNutrientsFromTextInputSchema},
  output: {schema: UnifiedNutritionOutputSchema},
  prompt: `The following is the name of a food dish: {{{dishName}}}. It is very likely a dish from Peruvian cuisine.
Based on the dish name, provide the following information in JSON format:
1.  **name**: Confirm the name of the dish.
2.  The approximate nutritional values per 100g, with these specific keys:
    - **energy**: Calories (in kcal)
    - **protein**: Protein (in g)
    - **fats**: Total Fat (in g)
    - **water**: Water (in g)

Do NOT include a 'portion' field in the output. The values should always be for 100g.
If you are unsure, make a reasonable guess. Prioritize Peruvian dishes if the name is ambiguous. Ensure the 'name' in your response is the dish name I provided.`,
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

const estimateNutrientsFromTextFlow = ai.defineFlow(
  {
    name: 'estimateNutrientsFromTextFlow',
    inputSchema: EstimateNutrientsFromTextInputSchema,
    outputSchema: UnifiedNutritionOutputSchema,
  },
  async input => {
    const {output} = await textPrompt(input);
    return output!;
  }
);
