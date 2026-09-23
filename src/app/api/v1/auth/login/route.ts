import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Direct call to the backend server
    const response = await fetch('http://localhost:6398/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { message?: string; cause?: { message?: string; code?: string } };
    console.error('Login proxy error:', error);
    if (err.cause) console.error('Error cause:', err.cause);

    return NextResponse.json(
      {
        error: {
          message: `Internal Server Error: ${err.message ?? 'Unknown error'}`,
          code: 'INTERNAL_ERROR',
          cause: err.cause?.message || err.cause?.code || 'Unknown cause'
        }
      },
      { status: 500 }
    );
  }
}
