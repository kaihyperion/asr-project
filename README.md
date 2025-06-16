# Audio Speech Recognition (ASR) Project

A modern web application built with Next.js and Google's Gemini API for transcribing video content and generating detailed timelines with speaker identification.

## Features

- 🎥 Video file upload and processing
- 🎯 Accurate speech-to-text transcription
- 👥 Automatic speaker identification
- ⏱️ Precise timecode tracking
- 📝 Timeline generation with speaker dialogue
- 💾 JSON export functionality
- 🎨 Modern, responsive UI with animations

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **UI Components**: Shadcn/ui
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **AI/ML**: Google Gemini API (Gemini Pro 2.5)
- **Development**: Node.js, npm

## Prerequisites

- Node.js 18.0 or later
- npm or yarn
- Google Cloud account with Gemini API access
- API key for Gemini

## Getting Started

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd asr-project
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload Video**:
   - Click the file input or drag and drop a video file
   - Supported formats: MP4, MOV, AVI, etc.

2. **Transcribe**:
   - Click the "Transcribe" button to start processing
   - Wait for the transcription to complete

3. **View Timeline**:
   - The timeline will display automatically after processing
   - Each entry shows:
     - Speaker identification
     - Timecode (in/out)
     - Dialogue content

4. **Export**:
   - Click the "Download JSON" button to export the timeline
   - The file will be saved as `ASR_[filename]_[timestamp].json`

## Project Structure

```
asr-project/
├── app/
│   ├── api/
│   │   └── transcribe/
│   │       └── route.ts    # API endpoint for transcription
│   ├── components/
│   │   └── ui/            # UI components
│   └── page.tsx           # Main application page
├── public/
├── styles/
└── package.json
```

## API Response Format

The transcription API returns a JSON array of timeline entries:

```typescript
interface TimelineEntry {
  filename: string;    // Original video filename
  tc_in: string;      // Timecode in (HH:MM:SS:FF)
  tc_out: string;     // Timecode out (HH:MM:SS:FF)
  speaker: string;    // Speaker identification (e.g., "Speaker 1")
  dialogue: string;   // Transcribed dialogue
}
```
