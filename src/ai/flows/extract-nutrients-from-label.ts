'use server';
/**
 * @fileOverview Extracts nutritional information from an image of a food label.
 * This flow uses a two-step process:
 * 1. It uses the Google Cloud Vision API to perform OCR and extract text from the image.
 * 2. It sends the extracted text to the Gemini model to parse the nutritional information.
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
import {ImageAnnotatorClient} from '@google-cloud/vision';

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

// Define an internal schema for the text-based prompt that will be sent to Gemini.
const LabelTextPromptInputSchema = z.object({
  labelText: z.string().describe("The text extracted from a nutrition label via OCR."),
});

const labelPrompt = ai.definePrompt({
  name: 'extractNutrientsFromLabelTextPrompt',
  input: {schema: LabelTextPromptInputSchema},
  output: {schema: EstimateNutrientsOutputSchema},
  prompt: `You are an expert at reading nutritional information from OCR text.
Analyze the provided text extracted from a nutritional label and identify the main product name.
From this text, extract the following information based on a 100g or 100ml serving size. If only a different serving size is available, use it as the 'porcion' but calculate the nutrient values for 100g/ml.

1.  **alimento**: The name of the food item (e.g., "Leche Gloria Entera").
2.  **porcion**: The standard portion size, normalized to "100g" or "100ml".
3.  **nutrientes**:
    - **calorias**: The estimated calories.
    - **proteinas**: The estimated protein content in grams.
    - **grasas**: The estimated total fat content in grams.
    - **agua**: The estimated water content in grams. If water is not listed, estimate it based on the other ingredients or assume it is the remainder to reach 100g (e.g., 100 - proteinas - grasas - carbohidratos). Set to 0 if not estimable.

Provide the response in the requested JSON format. If you cannot find a specific value, make a reasonable estimate. Prioritize the values from a "por 100g" or "por 100ml" column if available.

Here is the extracted text:
---
{{{labelText}}}
---`,
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
    // This is the correct way to initialize the client within the flow
    const visionClient = new ImageAnnotatorClient();
    
    // 1. Extract text from the image using the Cloud Vision API
    const imageBuffer = Buffer.from(input.photoDataUri.split(';base64,').pop()!, 'base64');
    const [result] = await visionClient.textDetection({ image: { content: imageBuffer } });
    const detections = result.textAnnotations;
    
    let extractedText = "";
    if (detections && detections.length > 0 && detections[0]?.description) {
      extractedText = detections[0].description;
    }

    if (!extractedText.trim()) {
        throw new Error("Could not extract any text from the provided image. Please try a clearer picture.");
    }

    // 2. Call Gemini with the extracted text to parse it.
    const {output} = await labelPrompt({ labelText: extractedText });
    return output!;
  }
);
