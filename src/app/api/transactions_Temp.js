export async function GET() {
  try {
    const response = await fetch('http://127.0.0.1:8000/user/transactions');
    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.detail || 'Error fetching transactions' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
