// /api/estimate/text
import { estimateNutrientsFromText } from '@/ai/flows/estimate-nutrients';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { dishName } = await request.json();

    if (!dishName) {
      return NextResponse.json(
        { error: 'Missing dishName in request body' },
        { status: 400 }
      );
    }

    const result = await estimateNutrientsFromText({ dishName });
    return NextResponse.json(result);

  } catch (e: any) {
    console.error(e);
    // Default to a 500 server error
    let status = 500;
    let message = 'An unexpected error occurred.';

    // Check if it's a JSON parsing error
    if (e instanceof SyntaxError) {
        status = 400;
        message = 'Invalid JSON in request body.'
    } else if (e.message) {
        message = e.message;
    }
    
    return NextResponse.json({ error: message }, { status });
  }
}
