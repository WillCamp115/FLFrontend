// app/api/plaid/transactions/route.js
import { NextResponse } from "next/server";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";

// Initialize Firebase Admin if not already initialized
// Commented out to avoid build issues - Firebase keys handled in backend
// if (!getApps().length) {
//   initializeApp({
//     credential: cert({
//       projectId: process.env.GOOGLE_CLOUD_PROJECT,
//       privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
//       clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//     }),
//   });
// }

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

export async function GET(req) {
  try {
    // Get Firebase ID token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Authorization token required" }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    // Firebase token verification commented out - handled in backend
    // try {
    //   decodedToken = await getAuth().verifyIdToken(idToken);
    // } catch (error) {
    //   return NextResponse.json({ error: "Invalid authorization token" }, { status: 401 });
    // }

    // Use the token directly since Firebase verification is handled in backend
    const firebase_uid = idToken;

    // Get access token from backend database
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const tokenResponse = await fetch(`${backendUrl}/users/me/plaid-token`, {
      headers: {
        "Authorization": `Bearer ${firebase_uid}`,
      },
    });

    if (!tokenResponse.ok) {
      return NextResponse.json({ error: "Failed to retrieve access token" }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No Plaid connection found" },
        { status: 400 }
      );
    }

    // Fetch transactions for the current calendar month only
    const today = new Date();
    const endDate = today.toISOString().split("T")[0]; // Today
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0]; // First day of current month

    const response = await client.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: {
        count: 100, // Number of transactions to fetch
        offset: 0, // Starting point
      },
    });

    const transactions = response.data.transactions;

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error("Error fetching transactions:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    return NextResponse.json(
      {
        error: "Error fetching transactions",
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}