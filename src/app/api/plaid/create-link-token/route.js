// app/api/plaid/create-link-token/route.js
import { NextResponse } from "next/server";
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

// Debug log to check environment variables
// console.log("Environment variables:", {
//   PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID,
//   PLAID_SECRET: process.env.PLAID_SECRET,
//   PLAID_ENV: process.env.PLAID_ENV,
// });

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
    const { client_user_id, include_liabilities = true } = await req.json();
    if (!client_user_id) {
      return NextResponse.json({ error: "client_user_id is required" }, { status: 400 });
    }

    // Build products array based on context
    const products = [Products.Transactions];
    if (include_liabilities) {
      products.push(Products.Liabilities);
    }

    // console.log("Creating link token for NEW bank connection with client_user_id:", client_user_id);
    // console.log("Including liabilities:", include_liabilities);
    
    const response = await client.linkTokenCreate({
      user: { client_user_id },
      client_name: "FreedomLedger",
      products,
      country_codes: [CountryCode.Us],
      language: "en",
    });
    
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error) {
    console.error("Error generating link token:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    return NextResponse.json(
      {
        error: "Error generating link token",
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}