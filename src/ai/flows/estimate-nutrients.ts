'use server';
/**
 * @fileOverview Estimates the nutritional content of a food item from an image or text.
 *
 * - estimateNutrients - A function that handles the nutrient estimation process from an image.
 * - estimateNutrientsFromText - A function that handles the nutrient estimation process from text.
 * - EstimateNutrientsInput - The input type for the estimateNutrients function.
 * - EstimateNutrientsFromTextInput - The input type for the estimateNutrientsFromText function.
 * - EstimateNutrientsOutput - The return type for the estimation functions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {
  EstimateNutrientsOutput,
  EstimateNutrientsOutputSchema,
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

export type {EstimateNutrientsOutput};

export async function estimateNutrients(
  input: EstimateNutrientsInput
): Promise<EstimateNutrientsOutput> {
  return estimateNutrientsFlow(input);
}

export async function estimateNutrientsFromText(
  input: EstimateNutrientsFromTextInput
): Promise<EstimateNutrientsOutput> {
  return estimateNutrientsFromTextFlow(input);
}

const imagePrompt = ai.definePrompt({
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
    const {output} = await imagePrompt(input);
    return output!;
  }
);

const textPrompt = ai.definePrompt({
  name: 'estimateNutrientsFromTextPrompt',
  input: {schema: EstimateNutrientsFromTextInputSchema},
  output: {schema: EstimateNutrientsOutputSchema},
  prompt: `El siguiente es el nombre de un plato de comida: {{{dishName}}}. Es muy probable que sea un plato de la gastronomía peruana.
Basándote en el nombre del plato, dime:\n
1. Confirma el nombre del plato.\n2. Cuáles son sus valores nutricionales aproximados por 100g:\n   - Calorías
   - Proteínas
   - Grasas
   - Agua

Hazlo en formato JSON. Si no estás seguro, haz una suposición razonable. Da prioridad a platos peruanos si el nombre es ambiguo. Asegurate que 'alimento' en tu respuesta sea el nombre del plato que te di.`,
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
    outputSchema: EstimateNutrientsOutputSchema,
  },
  async input => {
    const {output} = await textPrompt(input);
    return output!;
  }
);
