import Transcribe from '@/app/components/Transcribe';

export default function Home() {
  return (
    <main className="min-h-screen p-24">
      <h1 className="text-4xl font-bold mb-8">AI Voice Assistant</h1>
      <Transcribe />
    </main>
  );
}