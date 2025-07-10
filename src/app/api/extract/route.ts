// /api/extract
import {extractNutrientsFromLabel} from '@/ai/flows/extract-nutrients-from-label';
import {NextResponse} from 'next/server';

export async function POST(request: Request) {
  try {
    const {photoDataUri} = await request.json();

    if (!photoDataUri) {
      return NextResponse.json(
        {error: 'Missing photoDataUri in request body'},
        {status: 400}
      );
    }

    const result = await extractNutrientsFromLabel({photoDataUri});
    return NextResponse.json(result);
  } catch (e: any) {
    console.error(e);
    // Default to a 500 server error
    let status = 500;
    let message = 'An unexpected error occurred.';

    // Check if it's a JSON parsing error
    if (e instanceof SyntaxError) {
      status = 400;
      message = 'Invalid JSON in request body.';
    } else if (e.message) {
      message = e.message;
    }

    return NextResponse.json({error: message}, {status});
  }
}
