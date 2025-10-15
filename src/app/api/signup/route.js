// app/api/signup/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { firebaseUid, itemId, clientUserId, firstname, lastname, isNewUser } = await req.json();

    if (!firebaseUid || !itemId || !clientUserId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call the backend API to create user (access_token already stored via exchange-token route)
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const backendResponse = await fetch(`${backendUrl}/users/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firebase_uid: firebaseUid,
        firstname: firstname || "",
        lastname: lastname || "",
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      
      // If user already exists, still respect the isNewUser flag for onboarding
      if (errorData.detail && errorData.detail.includes("User already registered")) {
        const redirectTo = isNewUser ? "/onboarding" : "/dashboard";
        return NextResponse.json({ 
          message: "User login successful",
          user: { firebaseUid },
          redirectTo
        });
      }
      
      throw new Error(errorData.detail || "Failed to create user in backend");
    }

    const userData = await backendResponse.json();


    // For new users, redirect to onboarding; for existing users, go to dashboard
    const redirectTo = isNewUser ? "/onboarding" : "/dashboard";

    // Return a success response
    return NextResponse.json({ 
      message: "Signup successful",
      user: userData.user,
      redirectTo,
      isClientSignup: true
    });
  } catch (error) {
    console.error("Error during signup:", error);
    return NextResponse.json(
      { error: error.message || "Signup failed" },
      { status: 500 }
    );
  }
}