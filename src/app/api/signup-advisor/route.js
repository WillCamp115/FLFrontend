// app/api/signup-advisor/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  
  try {
    const requestBody = await req.json();
    const { firebaseUid, firstname, lastname, isNewUser } = requestBody;
    


    if (!firebaseUid) {
      console.error("Missing Firebase UID");
      return NextResponse.json(
        { error: "Firebase UID is required" },
        { status: 400 }
      );
    }

    const backendRequestBody = {
      firebase_uid: firebaseUid,
      firstname: firstname || "",
      lastname: lastname || "",
      access_token: "advisor_placeholder", // Advisors don't need real Plaid tokens
    };
    


    // Call the backend API to create user (no access token needed for advisors)
    const backendResponse = await fetch("http://localhost:8000/users/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(backendRequestBody),
    });
    


    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("Backend error response:", errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || "Unknown backend error" };
      }
      
      console.error("Parsed backend error:", errorData);
      
      // If user already exists, that's okay for returning users
      if (errorData.detail && errorData.detail.includes("User already registered")) {
        return NextResponse.json({ 
          message: "User login successful",
          user: { firebaseUid },
          redirectTo: "/advisor-dashboard" // Existing advisors go to advisor dashboard
        });
      }
      
      throw new Error(errorData.detail || errorData.error || "Failed to create user in backend");
    }

    const userData = await backendResponse.json();

    // Step 2: Register user as advisor
    try {
      const advisorResponse = await fetch("http://localhost:8000/advisors/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firebase_uid: firebaseUid
        }),
      });



      if (!advisorResponse.ok) {
        const errorData = await advisorResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error("Advisor registration failed:", errorData);
        // Continue anyway - advisor registration can be completed later
      } else {
        const advisorData = await advisorResponse.json();
      }
    } catch (advisorError) {
      console.error("Error during advisor registration:", advisorError);
      // Continue anyway - advisor registration can be completed later
    }

    // For new users, redirect to advisor dashboard
    const redirectTo = "/advisor-dashboard";

    // Return a success response
    return NextResponse.json({ 
      message: "Advisor signup successful",
      user: userData.user,
      redirectTo,
      isAdvisorSignup: true
    });
  } catch (error) {
    console.error("=== ERROR IN ADVISOR SIGNUP API ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    
    return NextResponse.json(
      { error: error.message || "Advisor signup failed" },
      { status: 500 }
    );
  }
}
