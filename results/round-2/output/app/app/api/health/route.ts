export async function GET(req: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      console.warn(`Backend health check returned status ${response.status}`);
      return new Response(JSON.stringify({
        status: 'unknown',
        error: true,
        message: `Backend returned ${response.status}`
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const healthData = await response.json();
    return new Response(JSON.stringify(healthData), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.warn('Health check failed:', error instanceof Error ? error.message : 'Unknown error');
    // Return a safe fallback response with 200 status
    return new Response(JSON.stringify({
      status: 'unknown',
      error: true,
      message: error instanceof Error ? error.message : 'Backend unreachable'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}