import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// --------------------
// SAVE OBSERVATION
// --------------------
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from("observations")
      .insert([body])
      .select();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      observation: data[0],
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to save observation." },
      { status: 500 }
    );
  }
}

// --------------------
// LOAD JOURNAL
// --------------------
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const learner = searchParams.get("learner");

  if (!learner) {
    return NextResponse.json({
      entries: [],
    });
  }

  const { data, error } = await supabase
    .from("observations")
    .select("*")
    .contains("learner_ids", [learner])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    entries: data,
  });
}