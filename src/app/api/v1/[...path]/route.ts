import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, await params);
}

async function proxyRequest(request: Request, { path }: { path: string[] }) {
  const pathString = path.join('/');
  const url = new URL(request.url);
  const targetUrl = `http://localhost:6398/api/v1/${pathString}${url.search}`;

  const headersList = await headers();
  const proxyHeaders = new Headers();

  // Forward restricted set of headers to avoid issues with host/origin
  const headersToForward = ['authorization', 'content-type', 'accept', 'x-request-id'];
  headersToForward.forEach(h => {
    const val = headersList.get(h);
    if (val) proxyHeaders.set(h, val);
  });

  try {
    let body;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body,
      cache: 'no-store',
    });

    // Copy response headers
    const resHeaders = new Headers();
    response.headers.forEach((value, key) => {
      // Don't forward some headers that might cause issues
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });

    const blob = await response.blob();
    return new NextResponse(blob, {
      status: response.status,
      headers: resHeaders,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; cause?: { message?: string; code?: string } };
    console.error(`Proxy error for ${pathString}:`, error);
    if (err.cause) console.error('Error cause:', err.cause);

    return NextResponse.json(
      {
        error: {
          message: `Gateway Error: ${err.message ?? 'Unknown error'}`,
          code: 'GATEWAY_ERROR',
          cause: err.cause?.message || err.cause?.code || 'Unknown cause'
        }
      },
      { status: 502 }
    );
  }
}
