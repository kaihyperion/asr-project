import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

interface TimelineEntry {
  filename: string;
  tc_in: string;
  tc_out: string;
  speaker: string;
  dialogue: string;
}

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (retries >= maxRetries || !(error instanceof Error) || !error.message?.includes('429')) {
        throw error;
      }
      const delay = initialDelay * Math.pow(2, retries);
      console.log(`Rate limited. Retrying in ${delay}ms...`);
      await wait(delay);
      retries++;
    }
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No video file provided' },
        { status: 400 }
      );
    }

    // Create a unique filename
    const filename = `${uuidv4()}-${file.name}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create tmp directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'tmp');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Initialize Gemini Pro with 2.5 version
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" });

    // Prepare the prompt for Gemini
    const prompt = `You are a professional video transcription service specializing in raw, unedited footage. Your task is to:

    1. Extract the timecode display from the bottom right corner of the video frame
    2. Use this exact timecode for timing each speech segment
    3. Transcribe all spoken dialogue with high accuracy
    4. Identify and number different speakers sequentially (Speaker 1, Speaker 2, etc.)

    For each speech segment, provide:
    - tc_in: The exact timecode from the bottom right corner when speech starts (HH:MM:SS:FF format)
    - tc_out: The exact timecode from the bottom right corner when speech ends (HH:MM:SS:FF format)
    - speaker: Number the speakers sequentially (Speaker 1, Speaker 2, etc.)
    - dialogue: The exact transcription of what was said

    Important guidelines:
    - Focus on the timecode display in the bottom right corner of the frame
    - Use the exact timecode numbers you see, don't estimate or calculate
    - Number speakers sequentially based on their first appearance
    - Maintain consistent speaker numbers throughout the timeline
    - Include all speech, even if it's unclear
    - Mark unclear speech with [unclear]
    - If multiple speakers are talking, separate their dialogue into different entries
    - Include non-verbal sounds like [laughter], [applause], etc.
    - Preserve the exact wording of the dialogue
    - Note any significant pauses or breaks in speech
    - Pay attention to speaker identification through voice characteristics

    Format the response as a JSON array of objects like this:
    [
      {
        "tc_in": "10:46:53:03",
        "tc_out": "10:47:00:08",
        "speaker": "Speaker 1",
        "dialogue": "Hello, how are you?"
      },
      {
        "tc_in": "10:47:00:09",
        "tc_out": "10:47:05:15",
        "speaker": "Speaker 2",
        "dialogue": "I'm doing well, thank you!"
      }
    ]`;

    // Send the video to Gemini with retry logic
    const result = await retryWithBackoff(async () => {
      return await model.generateContent([
        {
          inlineData: {
            mimeType: file.type,
            data: buffer.toString('base64')
          }
        },
        prompt
      ]);
    });

    const response = await result.response;
    const text = response.text();

    // Parse the response into timeline entries
    let timeline: TimelineEntry[] = [];
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        timeline = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      return NextResponse.json(
        { error: 'Failed to parse transcription response' },
        { status: 500 }
      );
    }

    // Add filename to each entry
    timeline = timeline.map(entry => ({
      ...entry,
      filename: file.name
    }));

    // Clean up: delete the temporary file
    try {
      await unlink(filePath);
    } catch (error) {
      console.error('Error deleting temporary file:', error);
    }

    return NextResponse.json(timeline);
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process video' },
      { status: 500 }
    );
  }
} 