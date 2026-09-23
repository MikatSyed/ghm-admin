import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    // Proxy the request to the backend server with the same Authorization header
    const response = await fetch('http://localhost:6398/api/v1/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const err = error as { message?: string; cause?: { message?: string; code?: string } };
    console.error('Auth-Me proxy error:', error);
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
