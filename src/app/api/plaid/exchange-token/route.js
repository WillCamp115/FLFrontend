// app/api/plaid/exchange-token/route.js
import { NextResponse } from "next/server";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(config);

export async function POST(req) {
  try {
    // Get the Authorization header with Firebase ID token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const { public_token, firebase_uid } = await req.json();
    
    if (!public_token || !firebase_uid) {
      return NextResponse.json({ error: "public_token and firebase_uid are required" }, { status: 400 });
    }

    // Exchange public token for access token
    const response = await client.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = response.data;

    // Store access token securely in database via backend using proper Firebase ID token
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const backendResponse = await fetch(`${backendUrl}/users/me/plaid-connection`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        access_token: access_token
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(errorData.detail || "Failed to store access token");
    }

    // Return success without exposing access_token
    return NextResponse.json({ success: true, item_id });
  } catch (error) {
    console.error("Error exchanging public token:", error.message);
    return NextResponse.json({ error: "Error exchanging public token" }, { status: 500 });
  }
}