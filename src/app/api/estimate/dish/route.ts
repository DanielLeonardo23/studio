// /api/estimate/dish
import { estimateNutrients } from '@/ai/flows/estimate-nutrients';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File | null;

    if (!photo) {
      return NextResponse.json(
        { error: 'Missing photo in form data' },
        { status: 400 }
      );
    }
    
    // Convert the file to a Buffer, then to a Base64 Data URI
    const buffer = Buffer.from(await photo.arrayBuffer());
    const photoDataUri = `data:${photo.type};base64,${buffer.toString('base64')}`;

    const result = await estimateNutrients({ photoDataUri });
    return NextResponse.json(result);
    
  } catch (e: any) {
    console.error(e);
    let status = 500;
    let message = 'An unexpected error occurred.';

    if (e.message) {
        message = e.message;
    }

    return NextResponse.json({ error: message }, { status });
  }
}
