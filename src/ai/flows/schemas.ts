import {z} from 'genkit';

// Unified Schema for all nutrient estimations
export const UnifiedNutritionOutputSchema = z.object({
  name: z.string().describe('The name of the food item or dish.'),
  portion: z
    .string()
    .optional()
    .describe(
      'The standard portion size (e.g., "100g", "30g"). This is only present for label extractions.'
    ),
  energy: z
    .number()
    .describe('The estimated calories (energy) in kcal per portion.'),
  protein: z
    .number()
    .describe('The estimated protein content in grams per portion.'),
  fats: z
    .number()
    .describe('The estimated fat content in grams per portion.'),
  water: z
    .number()
    .describe('The estimated water content in grams per portion.'),
});

export type UnifiedNutritionOutput = z.infer<
  typeof UnifiedNutritionOutputSchema
>;
