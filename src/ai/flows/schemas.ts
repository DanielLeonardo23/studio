'use server';

import {z} from 'genkit';

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
