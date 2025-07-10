import {z} from 'genkit';

// Schema for Label Extraction
export const EstimateNutrientsOutputSchema = z.object({
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


// Schema for Dish Estimation
export const EstimateDishOutputSchema = z.object({
    name: z.string().describe('The name of the food dish.'),
    energy: z.number().describe('The estimated calories (energy) in kcal per 100g.'),
    protein: z.number().describe('The estimated protein content in grams per 100g.'),
    fats: z.number().describe('The estimated fat content in grams per 100g.'),
    water: z.number().describe('The estimated water content in grams per 100g.'),
});
export type EstimateDishOutput = z.infer<typeof EstimateDishOutputSchema>;
