import { NextResponse } from 'next/server';
import { z } from 'zod';
import { listTenantProducts, createTenantProduct } from '@/lib/tenant';

const schema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional(),
  sku: z.string().trim().max(80).optional(),
  price: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/),
  stock: z.number().int().min(0).max(1_000_000).default(0),
});

export async function GET() {
  try {
    const products = await listTenantProducts();
    return NextResponse.json({ products });
  } catch (error) {
    if (error instanceof Error && error.message === 'SUBSCRIPTION_SUSPENDED') return NextResponse.json({ error: 'SUBSCRIPTION_SUSPENDED', message: 'सबस्क्रिप्शन बंद आहे. सेवा पुन्हा सुरू करण्यासाठी पेमेंट करा.' }, { status: 402 });
    return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid product details.' }, { status: 400 });
  try {
    const product = await createTenantProduct(parsed.data);
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'SUBSCRIPTION_SUSPENDED') return NextResponse.json({ error: 'SUBSCRIPTION_SUSPENDED', message: 'सबस्क्रिप्शन बंद आहे. सेवा पुन्हा सुरू करण्यासाठी पेमेंट करा.' }, { status: 402 });
    return NextResponse.json({ error: 'Please log in before adding products.' }, { status: 401 });
  }
}
